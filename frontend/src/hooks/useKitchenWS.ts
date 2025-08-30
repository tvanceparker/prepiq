import { useEffect, useRef, useState, useCallback } from 'react';
import { get } from '../api/index';

type NewOrderHandler = (orderId: number) => void;

export function useKitchenWS(onNewOrder: NewOrderHandler) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  const connect = useCallback(() => {
    if (wsRef.current) return;
    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const url = `${protocol}://${window.location.host}/ws/kitchen?restaurant_id=${localStorage.getItem('restaurant_id')}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      console.info('Kitchen WS connected');
    };

    ws.onmessage = evt => {
      try {
        const data = JSON.parse(evt.data);
        if (data?.type === 'new_order') {
          const orderId = data.order_id || data.data?.order_id;
          if (orderId) onNewOrder(Number(orderId));
        }
      } catch (err) {
        console.warn('Failed to parse ws message', err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      // attempt reconnect after a short delay
      setTimeout(() => connect(), 3000);
    };

    ws.onerror = e => {
      console.warn('Kitchen WS error', e);
    };
  }, [onNewOrder]);

  useEffect(() => {
    connect();
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { connected };
}

// helper to fetch order details
export const fetchOrderDetails = async (orderId: number) => {
  return get(`/orders/${orderId}`);
};
