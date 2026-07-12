/**
 * ws.ts — WebSocket клиент для real-time уведомлений.
 * Поддерживает аутентификацию, reconnect, event routing.
 */

const WS_BASE = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8642';

type WsEvent = 'pulse_beat' | 'new_suggestion' | 'service_status' |
  'new_question' | 'your_question_answered' | 'chat_response' |
  'crowdfunding_milestone' | '_connected' | '_disconnected';

type WsMessage = { event: WsEvent; data: Record<string, unknown> };
type WsHandler = (data: Record<string, unknown>) => void;

class WsClient {
  private ws: WebSocket | null = null;
  private handlers: Map<WsEvent, Set<WsHandler>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private token: string | null = null;
  private connected = false;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;

  connect(token?: string) {
    if (typeof window === 'undefined') return;
    this.token = token || this.getTokenFromCookie();
    const url = this.token
      ? `${WS_BASE}/ws?token=${encodeURIComponent(this.token)}`
      : `${WS_BASE}/ws`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.connected = true;
      this.reconnectAttempts = 0;
      this.emit('_connected', {});
    };

    this.ws.onmessage = (e) => {
      try {
        const msg: WsMessage = JSON.parse(e.data);
        this.emit(msg.event, msg.data);
      } catch {}
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.emit('_disconnected', {});
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.connected = false;
    this.reconnectAttempts = 0;
  }

  on(event: WsEvent, handler: WsHandler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }

  private emit(event: WsEvent, data: Record<string, unknown>) {
    this.handlers.get(event)?.forEach(h => h(data));
  }

  private scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => this.connect(), 5000);
  }

  private getTokenFromCookie(): string | null {
    if (typeof document === 'undefined') return null;
    const match = document.cookie.split('; ').find(c => c.startsWith('arkaim_session='));
    return match ? match.split('=')[1] : null;
  }

  get isConnected() {
    return this.connected;
  }
}

export const wsClient = new WsClient();
export type { WsEvent, WsMessage, WsHandler };
