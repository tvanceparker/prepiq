from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from app.sockets.connection_manager import manager
from app.utils.security import verify_device_token

router = APIRouter()

ALLOWED_DEVICE_TYPES = {"pos_terminal", "mobile"}


@router.websocket("/ws/pos")
async def pos_websocket(websocket: WebSocket, restaurant_id: int = Query(...)):
    token = websocket.query_params.get('device_token') or websocket.headers.get('authorization')
    if token and token.lower().startswith('bearer '):
        token = token.split(' ', 1)[1]

    claims = None
    try:
        claims = verify_device_token(token) if token else None
    except Exception:
        claims = None

    if not claims or int(claims.get('restaurant_id', -1)) != int(restaurant_id) or claims.get('device_type') not in ALLOWED_DEVICE_TYPES:
        await websocket.close(code=4001)
        return

    room = f"pos_{restaurant_id}"
    await manager.connect(room, websocket)
    try:
        while True:
            data = await websocket.receive_json()
            print(f"[POS WS] Received: {data}")
            # You can handle POS messages here if needed
    except WebSocketDisconnect:
        manager.disconnect(room, websocket)
