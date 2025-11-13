import { expect, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import '@testing-library/jest-dom';

// Cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock WebSocket globally
global.WebSocket = class WebSocket extends EventTarget {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = WebSocket.CONNECTING;
  url: string;

  constructor(url: string) {
    super();
    this.url = url;
    // Simulate async connection
    setTimeout(() => {
      this.readyState = WebSocket.OPEN;
      this.dispatchEvent(new Event('open'));
    }, 0);
  }

  send(data: string) {
    if (this.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
  }

  close() {
    this.readyState = WebSocket.CLOSED;
    this.dispatchEvent(new Event('close'));
  }
} as any;

// Mock EventSource
global.EventSource = class EventSource extends EventTarget {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSED = 2;

  readyState = EventSource.CONNECTING;
  url: string;

  constructor(url: string) {
    super();
    this.url = url;
  }

  close() {
    this.readyState = EventSource.CLOSED;
  }
} as any;

// Mock fetch globally
global.fetch = vi.fn();
