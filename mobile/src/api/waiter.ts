import { post } from './index';

export const sendOrderToKitchen = (order: any) => post('/pos/orders/send', order);
