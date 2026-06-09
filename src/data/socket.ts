export type SocketStatus = 'connecting' | 'open' | 'reconnecting' | 'closed';

interface SocketOptions {
  url: string;
  onMessage: (data: unknown) => void;
  onOpen?: () => void;
  onStatus?: (status: SocketStatus) => void;
}

/**
 * A single auto-reconnecting WebSocket with exponential backoff. Used to
 * multiplex many symbol subscriptions over one connection per provider.
 */
export class ReconnectingSocket {
  private ws: WebSocket | null = null;
  private attempts = 0;
  private closedByUser = false;
  private status: SocketStatus = 'closed';

  constructor(private readonly opts: SocketOptions) {}

  connect(): void {
    this.closedByUser = false;
    this.open();
  }

  private open(): void {
    this.setStatus(this.attempts > 0 ? 'reconnecting' : 'connecting');
    let ws: WebSocket;
    try {
      ws = new WebSocket(this.opts.url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.ws = ws;
    ws.onopen = () => {
      this.attempts = 0;
      this.setStatus('open');
      this.opts.onOpen?.();
    };
    ws.onmessage = (e) => {
      try {
        this.opts.onMessage(JSON.parse(e.data as string));
      } catch {
        /* ignore non-JSON frames (e.g. pings) */
      }
    };
    ws.onclose = () => {
      this.ws = null;
      if (this.closedByUser) {
        this.setStatus('closed');
        return;
      }
      this.scheduleReconnect();
    };
    ws.onerror = () => {
      ws.close();
    };
  }

  private scheduleReconnect(): void {
    this.setStatus('reconnecting');
    const delay = Math.min(30_000, 1000 * 2 ** this.attempts);
    this.attempts += 1;
    setTimeout(() => {
      if (!this.closedByUser) this.open();
    }, delay);
  }

  send(payload: unknown): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  isOpen(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  close(): void {
    this.closedByUser = true;
    this.ws?.close();
    this.ws = null;
    this.setStatus('closed');
  }

  private setStatus(status: SocketStatus): void {
    if (this.status !== status) {
      this.status = status;
      this.opts.onStatus?.(status);
    }
  }
}
