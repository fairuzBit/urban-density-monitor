// src/infrastructure/services/trafficWebSocketService.ts

import { authService } from "./authService";

export type FrameUpdateMessage = {
  type: "frame_update";
  stream_id: string;
  timestamp: string;
  counts: {
    person: number;
    motorcycle: number;
    car: number;
    bus: number;
    truck: number;
    vehicle_total: number;
  };
  person_vehicle_ratio: number;
  density_status: string;
  alert: {
    triggered: boolean;
    type: string;
    message: string;
  } | null;
  frame: string; // base64
};

type MessageHandler = (data: FrameUpdateMessage) => void;
type StatusHandler = (status: 'connecting' | 'connected' | 'error') => void;

class TrafficWebSocketService {
  private ws: WebSocket | null = null;
  private handlers: Set<MessageHandler> = new Set();
  private statusHandlers: Set<StatusHandler> = new Set();
  private isConnecting = false;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private streamId: string | null = null;

  async connect(streamId: string) {
    if (this.ws?.readyState === WebSocket.OPEN && this.streamId === streamId) return;
    
    this.streamId = streamId;
    this.isConnecting = true;
    this.statusHandlers.forEach(h => h('connecting'));
    
    try {
      const session = await authService.getSession();
      const token = session?.access_token;
      
      const wsUrl = process.env.NEXT_PUBLIC_WS_API_URL ;
      this.ws = new WebSocket(`${wsUrl}/ws/live/${streamId}?token=${token}&ngrok-skip-browser-warning=true`);

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'frame_update') {
            this.handlers.forEach(handler => handler(data));
          }
        } catch (err) {
          console.error("Failed to parse websocket message", err);
        }
      };

      this.ws.onclose = () => {
        this.isConnecting = false;
        this.statusHandlers.forEach(h => h('error'));
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error("WebSocket error", err);
        this.statusHandlers.forEach(h => h('error'));
        // Will trigger onclose
      };

      this.ws.onopen = () => {
        this.isConnecting = false;
        this.statusHandlers.forEach(h => h('connected'));
        console.log("WebSocket connected for stream:", streamId);
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
      };

    } catch (err) {
      this.isConnecting = false;
      this.statusHandlers.forEach(h => h('error'));
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (!this.streamId) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      console.log("Attempting to reconnect WebSocket...");
      if (this.streamId) this.connect(this.streamId);
    }, 5000);
  }

  disconnect() {
    this.streamId = null;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  subscribe(handler: MessageHandler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  subscribeStatus(handler: StatusHandler) {
    this.statusHandlers.add(handler);
    return () => {
      this.statusHandlers.delete(handler);
    };
  }
}

export const trafficWebSocketService = new TrafficWebSocketService();
