import { post } from './index';

export const sendOrderToKitchen = (order: any) => post('/waiter/orders/send', order);
