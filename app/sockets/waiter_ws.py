# app/sockets/waiter_ws.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.sockets.connection_manager import manager

router = APIRouter()

@router.websocket("/ws/waiter")
async def waiter_websocket(websocket: WebSocket, restaurant_id: int = Query(...)):
    room = f"waiter_{restaurant_id}"
    await manager.connect(room, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            print(f"[Waiter WS] Received: {data}")
            # You can handle waiter messages here if needed
    except WebSocketDisconnect:
        manager.disconnect(room, websocket)
