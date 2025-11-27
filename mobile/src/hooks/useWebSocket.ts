// src/hooks/useWebSocket.ts
import { useEffect, useRef, useCallback, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { WS_BASE_URL } from '../api/config';

export type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export interface UseWebSocketOptions {
  room: 'kitchen' | 'waiter';
  restaurantId: number;
  onMessage?: (data: any) => void;
  onStatusChange?: (status: WebSocketStatus) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export interface UseWebSocketReturn {
  status: WebSocketStatus;
  sendMessage: (message: any) => void;
  reconnect: () => void;
  disconnect: () => void;
}

export function useWebSocket({
  room,
  restaurantId,
  onMessage,
  onStatusChange,
  reconnectInterval = 3000,
  maxReconnectAttempts = 5,
}: UseWebSocketOptions): UseWebSocketReturn {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');

  const updateStatus = useCallback((newStatus: WebSocketStatus) => {
    setStatus(newStatus);
    onStatusChange?.(newStatus);
  }, [onStatusChange]);

  const connect = useCallback(async () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        console.warn('[WebSocket] No auth token available');
        updateStatus('error');
        return;
      }

      updateStatus('connecting');

      // Construct WebSocket URL
      const wsUrl = `${WS_BASE_URL}/ws/${room}?restaurant_id=${restaurantId}&token=${token}`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log(`[WebSocket] Connected to ${room} room`);
        reconnectAttemptsRef.current = 0;
        updateStatus('connected');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch (e) {
          console.warn('[WebSocket] Failed to parse message:', event.data);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        updateStatus('error');
      };

      ws.onclose = (event) => {
        console.log(`[WebSocket] Disconnected from ${room} room`, event.code, event.reason);
        updateStatus('disconnected');
        wsRef.current = null;

        // Attempt to reconnect if not closed intentionally
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current += 1;
          console.log(`[WebSocket] Reconnecting... Attempt ${reconnectAttemptsRef.current}`);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      updateStatus('error');
    }
  }, [room, restaurantId, onMessage, updateStatus, reconnectInterval, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    reconnectAttemptsRef.current = maxReconnectAttempts; // Prevent auto-reconnect

    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    updateStatus('disconnected');
  }, [maxReconnectAttempts, updateStatus]);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttemptsRef.current = 0;
    connect();
  }, [connect, disconnect]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message - not connected');
    }
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    status,
    sendMessage,
    reconnect,
    disconnect,
  };
}

export default useWebSocket;
