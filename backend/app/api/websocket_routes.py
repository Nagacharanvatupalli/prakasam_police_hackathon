import logging
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.services.websocket_service import ws_manager
from app.services.stream_service import stream_service

logger = logging.getLogger("trinethra.api.ws")
router = APIRouter(tags=["websocket"])

@router.websocket("/ws/live/{session_id}")
async def live_websocket_endpoint(websocket: WebSocket, session_id: str):
    """
    WebSocket endpoint for real-time detection events and webcam frame uploads.
    Handles 'all' keyword for receiving all events.
    """
    await ws_manager.connect(websocket, session_id)
    
    # Calculate a source_id matching how we generate it in routes
    source_id = f"WBC-{session_id[:8].upper()}" if session_id != "all" else "all"

    try:
        while True:
            # Wait for messages from client
            message_str = await websocket.receive_text()
            try:
                message = json.loads(message_str)
                msg_type = message.get("type")
                
                if msg_type == "webcam_frame":
                    frame_data = message.get("data")
                    if frame_data and session_id != "all":
                        # Process webcam frame asynchronously in background
                        await stream_service.process_webcam_frame(
                            base64_frame=frame_data,
                            session_id=session_id,
                            source_id=source_id
                        )
                elif msg_type == "ping":
                    await websocket.send_text(json.dumps({"type": "pong"}))
                    
            except json.JSONDecodeError:
                logger.warning("Received invalid JSON over WebSocket.")
            except Exception as loop_err:
                logger.error(f"Error handling WebSocket message: {loop_err}", exc_info=True)
                
    except WebSocketDisconnect:
        logger.info(f"WebSocket client disconnected for session: {session_id}")
    finally:
        ws_manager.disconnect(websocket, session_id)
