import React, { useEffect, useState } from "react";

const Kitchen = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const restaurantId = 1;
    const ws = new WebSocket(
      `ws://localhost:8000/ws/kitchen?restaurant_id=${restaurantId}`
    );

    ws.onopen = () => {
      console.log("Connected to kitchen WS");
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);
      console.log("Kitchen WS message:", message);

      if (message.type === "new_order") {
        setOrders((prev) => [...prev, message.data]);
      }
    };

    ws.onclose = () => {
      console.log("Kitchen WS disconnected");
    };

    return () => {
      ws.close();
    };
  }, []);

  return (
    <div>
      <h1>Kitchen Orders</h1>
      {orders.length === 0 && <p>No new orders</p>}
      <ul>
        {orders.map((order, idx) => (
          <li key={idx}>{JSON.stringify(order)}</li>
        ))}
      </ul>
    </div>
  );
};

export default Kitchen;
