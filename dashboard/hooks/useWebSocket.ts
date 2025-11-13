import { useEffect, useRef, useState, useCallback } from 'react';
import type { WebSocketMessage } from '@/types';

/**
 * WebSocket server URL from environment or default
 * @constant {string}
 */
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';

/**
 * Configuration options for useWebSocket hook
 */
interface UseWebSocketOptions {
  /** Callback invoked when a message is received */
  onMessage?: (message: WebSocketMessage) => void;
  /** Callback invoked when connection is established */
  onOpen?: () => void;
  /** Callback invoked when connection is closed */
  onClose?: () => void;
  /** Callback invoked when an error occurs */
  onError?: (error: Event) => void;
  /** Milliseconds to wait before reconnection attempt (default: 3000) */
  reconnectInterval?: number;
  /** Maximum number of reconnection attempts (default: 5) */
  maxReconnectAttempts?: number;
}

/**
 * Custom React hook for WebSocket connections with automatic reconnection
 *
 * @description Manages WebSocket lifecycle including connection, disconnection, and automatic
 * reconnection on failure. Uses useRef for reconnection counter to prevent infinite loops
 * (fixed in Iteration 1, Bug #2).
 *
 * **Key Features:**
 * - Automatic reconnection with exponential backoff
 * - Connection state tracking
 * - Message sending with connection check
 * - Cleanup on unmount
 *
 * @param {UseWebSocketOptions} options - Configuration options
 * @returns {Object} WebSocket interface
 * @returns {boolean} isConnected - Current connection status
 * @returns {Function} sendMessage - Send a message through the WebSocket
 * @returns {Function} disconnect - Manually disconnect
 * @returns {Function} reconnect - Manually trigger reconnection
 *
 * @example Basic Usage
 * ```typescript
 * const { isConnected, sendMessage } = useWebSocket({
 *   onMessage: (msg) => console.log('Received:', msg),
 *   onOpen: () => console.log('Connected'),
 *   reconnectInterval: 3000,
 *   maxReconnectAttempts: 5,
 * });
 *
 * // Send a message
 * if (isConnected) {
 *   sendMessage('log-update', { runId: '123', log: 'Processing...' });
 * }
 * ```
 *
 * @example With Status Display
 * ```typescript
 * function StatusIndicator() {
 *   const { isConnected, reconnect } = useWebSocket();
 *
 *   return (
 *     <div>
 *       Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
 *       <button onClick={reconnect}>Reconnect</button>
 *     </div>
 *   );
 * }
 * ```
 *
 * @see {@link MASTER_BUG_GUIDE.md} Bug #2 - Infinite Reconnection Loop
 * @see {@link ARCHITECTURE_DECISIONS.md} ADR-004 - WebSocket State Management Pattern
 */
export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    onMessage,
    onOpen,
    onClose,
    onError,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(WS_URL);

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;
        onOpen?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          onMessage?.(message);
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
        setIsConnected(false);
        onClose?.();

        // Attempt reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          console.log(`[WebSocket] Reconnecting in ${reconnectInterval}ms...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current += 1;
            connect();
          }, reconnectInterval);
        }
      };

      ws.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        onError?.(error);
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[WebSocket] Failed to connect:', error);
    }
  }, [onMessage, onOpen, onClose, onError, reconnectInterval, maxReconnectAttempts]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  /**
   * Send a message through the WebSocket connection
   *
   * @description Sends a structured message with type and payload. Checks connection state
   * before sending and warns if not connected.
   *
   * @param {string} type - Message type identifier
   * @param {any} data - Message payload data
   *
   * @example
   * ```typescript
   * sendMessage('pipeline-start', { featureSpec: {...} });
   * sendMessage('log-update', { runId: '123', message: 'Processing...' });
   * ```
   */
  const sendMessage = useCallback((type: string, data: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload: data }));
    } else {
      console.warn('[WebSocket] Cannot send message: not connected');
    }
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    sendMessage,
    disconnect,
    reconnect: connect,
  };
}
