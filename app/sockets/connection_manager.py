# app/sockets/connection_manager.py
from fastapi import WebSocket
from typing import Dict, List

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, room: str, websocket: WebSocket):
        await websocket.accept()
        if room not in self.active_connections:
            self.active_connections[room] = []
        self.active_connections[room].append(websocket)
        print(f"WebSocket connected to room {room}. Total connections: {len(self.active_connections[room])}")


    def disconnect(self, room: str, websocket: WebSocket):
        if room in self.active_connections:
            self.active_connections[room].remove(websocket)

    async def send_message(self, room: str, message: dict):
        if room in self.active_connections:
            print(f"Sending message to room {room} with {len(self.active_connections[room])} connections")
            for connection in self.active_connections[room]:
                try:
                    await connection.send_json(message)
                except Exception as e:
                    print(f"Failed sending to a connection in room {room}: {e}")
        else:
            print(f"No active connections in room {room}")

manager = ConnectionManager()