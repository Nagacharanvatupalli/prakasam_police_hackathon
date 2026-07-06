import logging
import json
from datetime import datetime
from fastapi import WebSocket
from fastapi.encoders import jsonable_encoder
from typing import Dict, List

logger = logging.getLogger("trinethra.websocket")

class ConnectionManager:
    def __init__(self):
        # Map: session_id -> list of WebSockets
        self.active_connections: Dict[str, List[WebSocket]] = {}
        # Special listener for all events (e.g. general dashboard view)
        self.global_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket, session_id: str = "all"):
        await websocket.accept()
        if session_id == "all":
            self.global_connections.append(websocket)
            logger.info("New global WebSocket connection accepted.")
        else:
            if session_id not in self.active_connections:
                self.active_connections[session_id] = []
            self.active_connections[session_id].append(websocket)
            logger.info(f"New WebSocket connection accepted for session: {session_id}")

    def disconnect(self, websocket: WebSocket, session_id: str = "all"):
        if session_id == "all":
            if websocket in self.global_connections:
                self.global_connections.remove(websocket)
                logger.info("Global WebSocket connection removed.")
        else:
            if session_id in self.active_connections:
                if websocket in self.active_connections[session_id]:
                    self.active_connections[session_id].remove(websocket)
                if not self.active_connections[session_id]:
                    del self.active_connections[session_id]
                logger.info(f"WebSocket connection removed for session: {session_id}")

    async def broadcast(self, session_id: str, event_type: str, data: dict):
        """Sends an event to all subscribers of a specific session, and also broadcasts globally."""
        payload = {
            "type": event_type,
            "data": jsonable_encoder(data),
            "timestamp": datetime.utcnow().isoformat()
        }
        try:
            message_str = json.dumps(jsonable_encoder(payload))
        except TypeError as exc:
            logger.error(f"WebSocket payload serialization failed for event {event_type}: {exc}")
            fallback_payload = {
                "type": event_type,
                "data": str(data),
                "timestamp": datetime.utcnow().isoformat()
            }
            message_str = json.dumps(fallback_payload)
        
        # 1. Send to session-specific listeners
        if session_id in self.active_connections:
            disconnected_sockets = []
            for ws in self.active_connections[session_id]:
                try:
                    await ws.send_text(message_str)
                except Exception as e:
                    logger.warning(f"Error sending message to session {session_id} socket: {e}")
                    disconnected_sockets.append(ws)
            
            for ws in disconnected_sockets:
                self.disconnect(ws, session_id)

        # 2. Send to global listeners (like the main live monitoring panel)
        disconnected_globals = []
        for ws in self.global_connections:
            try:
                await ws.send_text(message_str)
            except Exception as e:
                logger.warning(f"Error sending message to global socket: {e}")
                disconnected_globals.append(ws)
                
        for ws in disconnected_globals:
            self.disconnect(ws, "all")

    async def broadcast_all(self, event_type: str, data: dict):
        """Broadcasts to every single connected client (global or session-specific)."""
        payload = {
            "type": event_type,
            "data": jsonable_encoder(data),
            "timestamp": datetime.utcnow().isoformat()
        }
        try:
            message_str = json.dumps(jsonable_encoder(payload))
        except TypeError as exc:
            logger.error(f"WebSocket payload serialization failed for event {event_type}: {exc}")
            fallback_payload = {
                "type": event_type,
                "data": str(data),
                "timestamp": datetime.utcnow().isoformat()
            }
            message_str = json.dumps(fallback_payload)
        
        # Global listeners
        disconnected_globals = []
        for ws in self.global_connections:
            try:
                await ws.send_text(message_str)
            except Exception as e:
                disconnected_globals.append(ws)
        for ws in disconnected_globals:
            self.disconnect(ws, "all")
            
        # Session listeners
        for s_id, sockets in list(self.active_connections.items()):
            disconnected_sockets = []
            for ws in sockets:
                try:
                    await ws.send_text(message_str)
                except Exception as e:
                    disconnected_sockets.append(ws)
            for ws in disconnected_sockets:
                self.disconnect(ws, s_id)

# Singleton Instance
ws_manager = ConnectionManager()
