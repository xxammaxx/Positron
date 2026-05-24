import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Auto-cleanup after each test
afterEach(() => {
  cleanup();
});

// Mock EventSource for SSE tests
class MockEventSource {
  public readonly CONNECTING = 0;
  public readonly OPEN = 1;
  public readonly CLOSED = 2;
  public readyState: number = this.CONNECTING;
  public onopen: (() => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;
  private _url: string;

  constructor(url: string) {
    this._url = url;
    setTimeout(() => {
      this.readyState = this.OPEN;
      if (this.onopen) this.onopen();
    }, 0);
  }

  close(): void {
    this.readyState = this.CLOSED;
  }
}

vi.stubGlobal('EventSource', MockEventSource);

// Mock fetch
globalThis.fetch = vi.fn();
