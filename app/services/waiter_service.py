# app/services/waiter_service.py
from app.sockets.connection_manager import manager

class WaiterService:
    def __init__(self, db, restaurant_id: int, subscription_tier: str, employee_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        self.employee_id = employee_id

    async def send_order_to_kitchen(self, order_data: dict):
        kitchen_room = f"kitchen_{self.restaurant_id}"
        await manager.send_message(kitchen_room, {
            "type": "new_order",
            "data": order_data
        })
        return {"status": "sent_to_kitchen"}
