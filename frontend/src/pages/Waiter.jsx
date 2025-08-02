import React, { useState } from "react";
import { sendOrderToKitchen } from "../api/waiter";

const Waiter = () => {
  const [orderText, setOrderText] = useState("");
  const [status, setStatus] = useState(null);

  const submitOrder = async () => {
    try {
      const order = { send: { kitchen: orderText } }; // match backend format
      const res = await sendOrderToKitchen(order);
      setStatus("Order sent!");
      setOrderText("");
    } catch (err) {
      setStatus("Failed to send order: " + err.message);
    }
  };

  return (
    <div>
      <h1>Waiter Order Entry</h1>
      <textarea
        value={orderText}
        onChange={(e) => setOrderText(e.target.value)}
        placeholder="Enter order details"
      />
      <br />
      <button onClick={submitOrder}>Send to Kitchen</button>
      {status && <p>{status}</p>}
    </div>
  );
};

export default Waiter;
