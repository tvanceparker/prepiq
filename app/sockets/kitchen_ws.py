# app/sockets/kitchen_ws.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.sockets.connection_manager import manager

router = APIRouter()

@router.websocket("/ws/kitchen")
async def kitchen_websocket(websocket: WebSocket, restaurant_id: int = Query(...)):
    room = f"kitchen_{restaurant_id}"
    await manager.connect(room, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            print(f"[Kitchen WS] Received: {data}")

            # Example: when order ready, notify waiters in the right room
            if data.get("type") == "order_ready":
                # notify both legacy waiter room and POS room for compatibility
                waiter_room = f"waiter_{restaurant_id}"
                pos_room = f"pos_{restaurant_id}"
                payload = {
                    "type": "order_ready",
                    "order_id": data.get("order_id"),
                    "details": data.get("details"),
                }
                await manager.send_message(waiter_room, payload)
                await manager.send_message(pos_room, payload)
    except WebSocketDisconnect:
        manager.disconnect(room, websocket)
