# app/services/kitchen_service.py

from app.sockets.connection_manager import manager

class KitchenService:
    def __init__(self, db, restaurant_id: int, subscription_tier: str, employee_id: int):
        self.db = db
        self.restaurant_id = restaurant_id
        self.employee_id = employee_id

    async def mark_order_done(self, order_id: int):
        waiter_room = f"waiter_{self.restaurant_id}"
        await manager.send_message(waiter_room, {
            "type": "order_done",
            "order_id": order_id
        })
        return {"status": "notified_waiter"}
