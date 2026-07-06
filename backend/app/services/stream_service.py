"""
stream_service.py
-----------------
Handles live camera streams: RTSP/IP cameras and browser webcam (base64 frames).

Architecture:
  - RTSP: A dedicated background coroutine reads frames from cv2.VideoCapture
    and submits them to the CameraManager pipeline (which runs YOLO + OCR in threads).
  - Webcam: base64-encoded frames arrive via WebSocket and are decoded here,
    then submitted to the CameraManager pipeline for the session.
  - All heavy processing (YOLO, OCR, DB writes) runs in background threads
    inside CameraPipeline — this coroutine only does I/O-bound work.
"""

import asyncio
import base64
import logging
import time

import cv2
import numpy as np

from app.config import settings
from app.services.camera_manager import camera_manager
from app.services.websocket_service import ws_manager
from app.database.repositories.session_repository import session_repo
from app.models.detection import SourceInfo

logger = logging.getLogger("trinethra.stream")

# Max reconnect attempts before giving up on an RTSP stream
_MAX_RETRIES = 5


class StreamService:
    def __init__(self):
        # Maps session_id -> stop flag
        self.stop_flags: dict[str, bool] = {}
        # Maps session_id -> webcam frame counter
        self.webcam_counters: dict[str, int] = {}

    def stop_session(self, session_id: str) -> None:
        self.stop_flags[session_id] = True
        logger.info(f"Stop stream signal for session: {session_id}")

    # ── Webcam (browser) ──────────────────────────────────────────────────────

    async def process_webcam_frame(
        self, base64_frame: str, session_id: str, source_id: str
    ) -> None:
        """
        Decodes a base64-encoded frame from the browser webcam WebSocket
        and submits it to the camera pipeline for processing.
        """
        if session_id not in self.webcam_counters:
            self.webcam_counters[session_id] = 0

        frame_idx = self.webcam_counters[session_id]
        self.webcam_counters[session_id] += 1

        # Decode base64 frame
        try:
            _, encoded = (
                base64_frame.split(",", 1)
                if "," in base64_frame
                else ("", base64_frame)
            )
            frame_data = base64.b64decode(encoded)
            np_arr = np.frombuffer(frame_data, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

            if frame is None:
                logger.error(f"[{session_id}] Webcam frame decoding produced None.")
                return
        except Exception as exc:
            logger.error(f"[{session_id}] Base64 decode error: {exc}")
            return

        source_info = SourceInfo(
            type="webcam",
            source_id=source_id,
            name="Live Webcam Feed",
        )

        try:
            pipeline = camera_manager.start_camera(
                camera_id=source_id,
                session_id=session_id,
                source_info=source_info,
                source_type="webcam",
            )
            pipeline.submit_frame(frame, frame_idx)
        except RuntimeError as re_err:
            logger.error(f"[{session_id}] Cannot start camera pipeline: {re_err}")
            return

        # Broadcast frame-level stats (FPS is approximate for webcam)
        await ws_manager.broadcast(
            session_id,
            "frame_processed",
            {"fps": 15, "latency": 0},
        )

    # ── RTSP / IP Camera ──────────────────────────────────────────────────────

    async def start_rtsp_stream(
        self,
        rtsp_url: str,
        session_id: str,
        source_id: str,
        camera_name: str,
    ) -> None:
        """
        Background coroutine that continuously reads frames from an RTSP URL
        and feeds them into the CameraManager pipeline.

        Includes exponential-backoff reconnect logic up to _MAX_RETRIES attempts.
        """
        logger.info(f"Starting RTSP stream: session={session_id} url={rtsp_url}")
        self.stop_flags[session_id] = False

        source_info = SourceInfo(
            type="rtsp",
            source_id=source_id,
            name=camera_name,
        )

        # Start the camera pipeline (creates threads for YOLO/OCR)
        try:
            camera_manager.start_camera(
                camera_id=source_id,
                session_id=session_id,
                source_info=source_info,
                source_type="rtsp",
            )
        except RuntimeError as re_err:
            logger.error(f"[{session_id}] Cannot start camera pipeline: {re_err}")
            await session_repo.update_session(session_id, status="error",
                                               error_message=str(re_err))
            return

        frame_idx = 0
        retry_delay = 1.0

        try:
            for attempt in range(_MAX_RETRIES):
                if self.stop_flags.get(session_id, False):
                    break

                status = "connecting" if attempt == 0 else "reconnecting"
                await session_repo.update_session(session_id, status=status)
                await ws_manager.broadcast(session_id, "source_status", {"status": status})
                logger.info(f"[{session_id}] RTSP connect attempt {attempt+1}/{_MAX_RETRIES}...")

                cap = cv2.VideoCapture(rtsp_url)

                if not cap.isOpened():
                    logger.warning(f"[{session_id}] Could not open RTSP stream.")
                    cap.release()
                    if attempt < _MAX_RETRIES - 1:
                        logger.info(f"[{session_id}] Retrying in {retry_delay:.1f}s...")
                        await asyncio.sleep(retry_delay)
                        retry_delay = min(30.0, retry_delay * 2)
                    continue

                logger.info(f"[{session_id}] RTSP connected.")
                await session_repo.update_session(session_id, status="live")
                await ws_manager.broadcast(session_id, "source_status", {"status": "live"})

                stream_fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
                retry_delay = 1.0  # Reset on successful connection

                try:
                    while cap.isOpened():
                        # Yield to the event loop between frames
                        await asyncio.sleep(0)

                        if self.stop_flags.get(session_id, False):
                            break

                        ret, frame = cap.read()
                        if not ret:
                            logger.warning(f"[{session_id}] RTSP read failed — disconnected.")
                            await ws_manager.broadcast(
                                session_id, "source_status", {"status": "disconnected"}
                            )
                            break

                        current_idx = frame_idx
                        frame_idx += 1

                        # Skip frames per config
                        if current_idx % settings.FRAME_SKIP != 0:
                            continue

                        submitted = camera_manager.submit_frame(
                            source_id, frame, current_idx
                        )
                        if not submitted:
                            logger.debug(f"[{session_id}] Frame dropped (pipeline queue full).")

                        # Broadcast frame-level stats
                        await ws_manager.broadcast(
                            session_id,
                            "frame_processed",
                            {"fps": int(stream_fps), "latency": 0},
                        )

                except Exception as loop_err:
                    logger.error(
                        f"[{session_id}] Error in RTSP read loop: {loop_err}",
                        exc_info=True,
                    )
                finally:
                    cap.release()

                if self.stop_flags.get(session_id, False):
                    break

                # Retry after disconnect
                if attempt < _MAX_RETRIES - 1:
                    logger.info(f"[{session_id}] Reconnecting in {retry_delay:.1f}s...")
                    await asyncio.sleep(retry_delay)
                    retry_delay = min(30.0, retry_delay * 2)

            # After all retries
            status = "stopped" if self.stop_flags.get(session_id, False) else "error"
            await session_repo.update_session(session_id, status=status)
            await ws_manager.broadcast(session_id, "source_status", {"status": status})
            logger.info(f"[{session_id}] RTSP stream ended with status: {status}")

        except Exception as exc:
            logger.error(f"[{session_id}] Severe RTSP error: {exc}", exc_info=True)
            await session_repo.update_session(
                session_id, status="error", error_message=str(exc)
            )
            await ws_manager.broadcast(
                session_id, "session_error", {"message": str(exc)}
            )
        finally:
            self.stop_flags.pop(session_id, None)
            camera_manager.stop_cameras_by_session(session_id)


stream_service = StreamService()
