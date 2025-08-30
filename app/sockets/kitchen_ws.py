# app/sockets/kitchen_ws.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.sockets.connection_manager import manager
from app.utils.security import verify_device_token

ALLOWED_DEVICE_TYPES = {"kitchen_display", "pos_terminal", "mobile"}

router = APIRouter()

@router.websocket("/ws/kitchen")
async def kitchen_websocket(websocket: WebSocket, restaurant_id: int = Query(...)):
    # Validate device token from query param or Authorization header
    token = websocket.query_params.get('device_token') or websocket.headers.get('authorization')
    if token and token.lower().startswith('bearer '):
        token = token.split(' ', 1)[1]

    claims = None
    try:
        claims = verify_device_token(token) if token else None
    except Exception:
        claims = None

    if not claims or int(claims.get('restaurant_id', -1)) != int(restaurant_id) or claims.get('device_type') not in ALLOWED_DEVICE_TYPES:
        # Reject connection
        await websocket.close(code=4001)
        return

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
