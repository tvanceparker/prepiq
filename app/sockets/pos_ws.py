from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.sockets.connection_manager import manager

router = APIRouter()

@router.websocket("/ws/pos")
async def pos_websocket(websocket: WebSocket, restaurant_id: int = Query(...)):
    room = f"pos_{restaurant_id}"
    await manager.connect(room, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            print(f"[POS WS] Received: {data}")
            # You can handle POS messages here if needed
    except WebSocketDisconnect:
        manager.disconnect(room, websocket)
