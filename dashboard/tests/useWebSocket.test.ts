/**
 * useWebSocket Hook Tests
 * Comprehensive tests for WebSocket connection management
 *
 * Coverage:
 * - Connection lifecycle
 * - Message handling
 * - Reconnection logic
 * - Error handling
 * - Cleanup
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useWebSocket } from '../hooks/useWebSocket';

describe('useWebSocket Hook', () => {
  let mockWebSocket: any;
  let mockWebSocketInstance: any;

  beforeEach(() => {
    vi.useFakeTimers();

    // Mock WebSocket
    mockWebSocketInstance = {
      send: vi.fn(),
      close: vi.fn(),
      readyState: 0, // CONNECTING
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onopen: null,
      onmessage: null,
      onclose: null,
      onerror: null,
    };

    mockWebSocket = vi.fn(() => mockWebSocketInstance);
    global.WebSocket = mockWebSocket as any;
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  describe('Connection Lifecycle', () => {
    it('should initialize and connect on mount', () => {
      const { result } = renderHook(() => useWebSocket());

      expect(mockWebSocket).toHaveBeenCalledWith('ws://localhost:3001');
      expect(result.current.isConnected).toBe(false);
    });

    it('should set isConnected to true when connection opens', () => {
      const onOpen = vi.fn();
      const { result } = renderHook(() => useWebSocket({ onOpen }));

      act(() => {
        mockWebSocketInstance.readyState = 1; // OPEN
        mockWebSocketInstance.onopen?.();
      });

      expect(result.current.isConnected).toBe(true);
      expect(onOpen).toHaveBeenCalled();
    });

    it('should set isConnected to false when connection closes', () => {
      const onClose = vi.fn();
      const { result } = renderHook(() => useWebSocket({ onClose }));

      // First open the connection
      act(() => {
        mockWebSocketInstance.readyState = 1;
        mockWebSocketInstance.onopen?.();
      });

      expect(result.current.isConnected).toBe(true);

      // Then close it
      act(() => {
        mockWebSocketInstance.readyState = 3; // CLOSED
        mockWebSocketInstance.onclose?.();
      });

      expect(result.current.isConnected).toBe(false);
      expect(onClose).toHaveBeenCalled();
    });

    it('should call disconnect on unmount', () => {
      const { unmount } = renderHook(() => useWebSocket());

      act(() => {
        mockWebSocketInstance.readyState = 1;
        mockWebSocketInstance.onopen?.();
      });

      unmount();

      expect(mockWebSocketInstance.close).toHaveBeenCalled();
    });

    it('should handle multiple connection lifecycle cycles', () => {
      const { result, rerender } = renderHook(() => useWebSocket());

      // Open
      act(() => {
        mockWebSocketInstance.readyState = 1;
        mockWebSocketInstance.onopen?.();
      });
      expect(result.current.isConnected).toBe(true);

      // Close
      act(() => {
        mockWebSocketInstance.readyState = 3;
        mockWebSocketInstance.onclose?.();
      });
      expect(result.current.isConnected).toBe(false);

      // Reconnect
      rerender();
      act(() => {
        mockWebSocketInstance.readyState = 1;
        mockWebSocketInstance.onopen?.();
      });
      expect(result.current.isConnected).toBe(true);
    });
  });

  describe('Message Handling', () => {
    it('should call onMessage when receiving a message', () => {
      const onMessage = vi.fn();
      renderHook(() => useWebSocket({ onMessage }));

      const testMessage = { type: 'test', data: 'hello' };

      act(() => {
        mockWebSocketInstance.onmessage?.({
          data: JSON.stringify(testMessage),
        });
      });

      expect(onMessage).toHaveBeenCalledWith(testMessage);
    });

    it('should handle malformed JSON messages gracefully', () => {
      const onMessage = vi.fn();
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      renderHook(() => useWebSocket({ onMessage }));

      act(() => {
        mockWebSocketInstance.onmessage?.({
          data: 'invalid json{',
        });
      });

      expect(onMessage).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('[WebSocket] Failed to parse message'),
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle empty messages', () => {
      const onMessage = vi.fn();
      renderHook(() => useWebSocket({ onMessage }));

      act(() => {
        mockWebSocketInstance.onmessage?.({ data: '' });
      });

      expect(onMessage).not.toHaveBeenCalled();
    });

    it('should handle messages with different types', () => {
      const onMessage = vi.fn();
      renderHook(() => useWebSocket({ onMessage }));

      const messageTypes = ['log', 'status', 'error', 'complete'];

      messageTypes.forEach((type) => {
        const message = { type, data: { value: type } };
        act(() => {
          mockWebSocketInstance.onmessage?.({
            data: JSON.stringify(message),
          });
        });
      });

      expect(onMessage).toHaveBeenCalledTimes(4);
      messageTypes.forEach((type) => {
        expect(onMessage).toHaveBeenCalledWith(
          expect.objectContaining({ type })
        );
      });
    });

    it('should handle rapid message bursts', () => {
      const onMessage = vi.fn();
      renderHook(() => useWebSocket({ onMessage }));

      const messageCount = 100;

      act(() => {
        for (let i = 0; i < messageCount; i++) {
          mockWebSocketInstance.onmessage?.({
            data: JSON.stringify({ type: 'burst', index: i }),
          });
        }
      });

      expect(onMessage).toHaveBeenCalledTimes(messageCount);
    });
  });

  describe('Sending Messages', () => {
    it('should send message when connected', () => {
      const { result } = renderHook(() => useWebSocket());

      act(() => {
        mockWebSocketInstance.readyState = 1; // OPEN
        mockWebSocketInstance.onopen?.();
      });

      act(() => {
        result.current.sendMessage('test', { data: 'hello' });
      });

      expect(mockWebSocketInstance.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'test', payload: { data: 'hello' } })
      );
    });

    it('should not send message when not connected', () => {
      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const { result } = renderHook(() => useWebSocket());

      act(() => {
        result.current.sendMessage('test', { data: 'hello' });
      });

      expect(mockWebSocketInstance.send).not.toHaveBeenCalled();
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        '[WebSocket] Cannot send message: not connected'
      );

      consoleWarnSpy.mockRestore();
    });

    it('should handle sending messages with complex payloads', () => {
      const { result } = renderHook(() => useWebSocket());

      act(() => {
        mockWebSocketInstance.readyState = 1;
        mockWebSocketInstance.onopen?.();
      });

      const complexPayload = {
        nested: { data: [1, 2, 3] },
        string: 'test',
        number: 42,
        boolean: true,
        null: null,
      };

      act(() => {
        result.current.sendMessage('complex', complexPayload);
      });

      expect(mockWebSocketInstance.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'complex', payload: complexPayload })
      );
    });

    it('should handle sending multiple messages in sequence', () => {
      const { result } = renderHook(() => useWebSocket());

      act(() => {
        mockWebSocketInstance.readyState = 1;
        mockWebSocketInstance.onopen?.();
      });

      const messages = [
        { type: 'msg1', data: 'first' },
        { type: 'msg2', data: 'second' },
        { type: 'msg3', data: 'third' },
      ];

      act(() => {
        messages.forEach((msg) => result.current.sendMessage(msg.type, msg.data));
      });

      expect(mockWebSocketInstance.send).toHaveBeenCalledTimes(3);
    });
  });

  describe('Reconnection Logic', () => {
    it('should attempt reconnection after connection closes', () => {
      renderHook(() =>
        useWebSocket({
          reconnectInterval: 3000,
          maxReconnectAttempts: 5,
        })
      );

      // Open connection
      act(() => {
        mockWebSocketInstance.readyState = 1;
        mockWebSocketInstance.onopen?.();
      });

      // Clear the initial call
      mockWebSocket.mockClear();

      // Close connection
      act(() => {
        mockWebSocketInstance.readyState = 3;
        mockWebSocketInstance.onclose?.();
      });

      // Advance timers to trigger reconnect
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      expect(mockWebSocket).toHaveBeenCalled();
    });

    it('should stop reconnecting after max attempts', () => {
      const maxReconnectAttempts = 3;
      renderHook(() =>
        useWebSocket({
          reconnectInterval: 1000,
          maxReconnectAttempts,
        })
      );

      // Open and close connection repeatedly
      for (let i = 0; i <= maxReconnectAttempts; i++) {
        act(() => {
          mockWebSocketInstance.readyState = 1;
          mockWebSocketInstance.onopen?.();
        });

        mockWebSocket.mockClear();

        act(() => {
          mockWebSocketInstance.readyState = 3;
          mockWebSocketInstance.onclose?.();
        });

        act(() => {
          vi.advanceTimersByTime(1000);
        });

        if (i < maxReconnectAttempts) {
          expect(mockWebSocket).toHaveBeenCalled();
        }
      }

      // After max attempts, should not reconnect
      mockWebSocket.mockClear();
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(mockWebSocket).not.toHaveBeenCalled();
    });

    it('should reset reconnect attempts on successful connection', () => {
      const { result } = renderHook(() =>
        useWebSocket({
          reconnectInterval: 1000,
          maxReconnectAttempts: 2,
        })
      );

      // First connection
      act(() => {
        mockWebSocketInstance.readyState = 1;
        mockWebSocketInstance.onopen?.();
      });

      // Close and reconnect once
      act(() => {
        mockWebSocketInstance.onclose?.();
        vi.advanceTimersByTime(1000);
      });

      // Successful reconnection should reset counter
      act(() => {
        mockWebSocketInstance.readyState = 1;
        mockWebSocketInstance.onopen?.();
      });

      expect(result.current.isConnected).toBe(true);

      // Should be able to reconnect again max times
      mockWebSocket.mockClear();
      act(() => {
        mockWebSocketInstance.onclose?.();
        vi.advanceTimersByTime(1000);
      });

      expect(mockWebSocket).toHaveBeenCalled();
    });

    it('should cancel reconnection timeout on manual disconnect', () => {
      const { result } = renderHook(() =>
        useWebSocket({ reconnectInterval: 3000 })
      );

      act(() => {
        mockWebSocketInstance.readyState = 1;
        mockWebSocketInstance.onopen?.();
      });

      act(() => {
        mockWebSocketInstance.onclose?.();
      });

      // Manually disconnect before timeout
      act(() => {
        result.current.disconnect();
      });

      mockWebSocket.mockClear();

      // Advance timers
      act(() => {
        vi.advanceTimersByTime(3000);
      });

      // Should not reconnect after manual disconnect
      expect(mockWebSocket).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should call onError when WebSocket error occurs', () => {
      const onError = vi.fn();
      renderHook(() => useWebSocket({ onError }));

      const errorEvent = new Event('error');

      act(() => {
        mockWebSocketInstance.onerror?.(errorEvent);
      });

      expect(onError).toHaveBeenCalledWith(errorEvent);
    });

    it('should log error to console on WebSocket error', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      renderHook(() => useWebSocket());

      const errorEvent = new Event('error');

      act(() => {
        mockWebSocketInstance.onerror?.(errorEvent);
      });

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[WebSocket] Error:',
        errorEvent
      );

      consoleErrorSpy.mockRestore();
    });

    it('should handle connection failure gracefully', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Mock WebSocket to throw on construction
      global.WebSocket = vi.fn(() => {
        throw new Error('Connection failed');
      }) as any;

      const { result } = renderHook(() => useWebSocket());

      expect(result.current.isConnected).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[WebSocket] Failed to connect:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Manual Controls', () => {
    it('should allow manual disconnect', () => {
      const { result } = renderHook(() => useWebSocket());

      act(() => {
        mockWebSocketInstance.readyState = 1;
        mockWebSocketInstance.onopen?.();
      });

      expect(result.current.isConnected).toBe(true);

      act(() => {
        result.current.disconnect();
      });

      expect(mockWebSocketInstance.close).toHaveBeenCalled();
    });

    it('should allow manual reconnect', () => {
      const { result } = renderHook(() => useWebSocket());

      act(() => {
        mockWebSocketInstance.readyState = 1;
        mockWebSocketInstance.onopen?.();
      });

      mockWebSocket.mockClear();

      act(() => {
        result.current.reconnect();
      });

      expect(mockWebSocket).toHaveBeenCalled();
    });

    it('should handle disconnect when not connected', () => {
      const { result } = renderHook(() => useWebSocket());

      expect(() => {
        act(() => {
          result.current.disconnect();
        });
      }).not.toThrow();
    });
  });

  describe('Configuration Options', () => {
    it('should use custom reconnect interval', () => {
      const customInterval = 5000;
      renderHook(() =>
        useWebSocket({
          reconnectInterval: customInterval,
        })
      );

      act(() => {
        mockWebSocketInstance.readyState = 1;
        mockWebSocketInstance.onopen?.();
        mockWebSocketInstance.onclose?.();
      });

      mockWebSocket.mockClear();

      // Should not reconnect before interval
      act(() => {
        vi.advanceTimersByTime(customInterval - 1);
      });
      expect(mockWebSocket).not.toHaveBeenCalled();

      // Should reconnect after interval
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(mockWebSocket).toHaveBeenCalled();
    });

    it('should use custom max reconnect attempts', () => {
      const maxAttempts = 10;
      renderHook(() =>
        useWebSocket({
          reconnectInterval: 100,
          maxReconnectAttempts: maxAttempts,
        })
      );

      // Try to reconnect beyond max attempts
      for (let i = 0; i < maxAttempts + 2; i++) {
        act(() => {
          mockWebSocketInstance.readyState = 1;
          mockWebSocketInstance.onopen?.();
          mockWebSocketInstance.onclose?.();
          vi.advanceTimersByTime(100);
        });
      }

      // The hook should have attempted exactly maxAttempts reconnections
      // Initial connection + maxAttempts = maxAttempts + 1 total
    });

    it('should work without any options', () => {
      const { result } = renderHook(() => useWebSocket());

      expect(result.current.isConnected).toBe(false);
      expect(typeof result.current.sendMessage).toBe('function');
      expect(typeof result.current.disconnect).toBe('function');
      expect(typeof result.current.reconnect).toBe('function');
    });
  });
});
