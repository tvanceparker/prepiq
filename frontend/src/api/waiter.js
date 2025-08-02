import { post } from "./index.ts";

export const sendOrderToKitchen = (order) => post("/waiter/orders/send", order);
// Add other waiter API calls here if needed
