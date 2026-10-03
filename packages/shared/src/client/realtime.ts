import { TraineeReport, Decision, TruthEvent, Participant } from '../types/index.js';

export type ConnectionState = 'connected' | 'reconnecting' | 'fallback_polling' | 'disconnected';

export interface RealtimeClientConfig {
  wsUrl: string;
  exerciseId: number;
  getToken: () => string | null;
  pollFallbackFn?: () => Promise<void>;
  onReport?: (report: TraineeReport) => void;
  onLinkStatus?: (data: { bars: number; quality: number; status: string }) => void;
  onTruthEvent?: (event: TruthEvent) => void;
  onReportDelivered?: (meta: any) => void;
  onDecision?: (decision: Decision) => void;
  onParticipantJoined?: (participant: Participant) => void;
  onConnectionChange?: (state: ConnectionState) => void;
}

export class RealtimeClient {
  private config: RealtimeClientConfig;
  private ws: WebSocket | null = null;
  private pingInterval: any = null;
  private reconnectTimeout: any = null;
  private pollInterval: any = null;
  private reconnectAttempts = 0;
  private isExplicitlyClosed = false;
  private disconnectedTime: number | null = null;
  private state: ConnectionState = 'disconnected';

  constructor(config: RealtimeClientConfig) {
    this.config = config;
  }

  public connect(): void {
    this.isExplicitlyClosed = false;
    const token = this.config.getToken();
    if (!token) {
      this.setState('disconnected');
      return;
    }

    const base = this.config.wsUrl.replace(/\/+$/, '');
    const wsUrl = `${base}/ws/exercises/${this.config.exerciseId}/?token=${encodeURIComponent(token)}`;

    try {
      this.ws = new WebSocket(wsUrl);
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
    } catch (e) {
      this.handleError(e);
    }
  }

  private setState(newState: ConnectionState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.config.onConnectionChange?.(newState);
    }
  }

  private handleOpen(): void {
    this.reconnectAttempts = 0;
    this.disconnectedTime = null;
    this.stopPolling();
    this.setState('connected');

    // Setup 20-second heartbeat ping
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 20000);
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'report':
          this.config.onReport?.(data.report);
          break;
        case 'link_status':
          this.config.onLinkStatus?.(data);
          break;
        case 'truth_event':
          this.config.onTruthEvent?.(data.event);
          break;
        case 'report_delivered':
          this.config.onReportDelivered?.(data);
          break;
        case 'decision':
          this.config.onDecision?.(data.decision);
          break;
        case 'participant_joined':
          this.config.onParticipantJoined?.(data.participant);
          break;
        case 'pong':
          // Heartbeat ack
          break;
        default:
          break;
      }
    } catch (_) {}
  }

  private handleError(err: any): void {
    // Socket error triggers reconnect in handleClose
  }

  private handleClose(event?: CloseEvent): void {
    this.stopPing();
    this.ws = null;

    if (this.isExplicitlyClosed) {
      this.setState('disconnected');
      return;
    }

    if (!this.disconnectedTime) {
      this.disconnectedTime = Date.now();
    }

    this.setState('reconnecting');

    // Check if offline > 5s; start REST poll fallback
    const elapsedOfflineMs = Date.now() - this.disconnectedTime;
    if (elapsedOfflineMs >= 5000) {
      this.startPolling();
    } else {
      setTimeout(() => {
        if (this.state === 'reconnecting' && !this.pollInterval) {
          this.startPolling();
        }
      }, 5000 - elapsedOfflineMs);
    }

    // Exponential backoff reconnect
    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 15000);
    clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      if (!this.isExplicitlyClosed) {
        this.connect();
      }
    }, delay);
  }

  private startPolling(): void {
    if (!this.pollInterval && this.config.pollFallbackFn) {
      this.setState('fallback_polling');
      this.config.pollFallbackFn();
      this.pollInterval = setInterval(() => {
        if (this.config.pollFallbackFn) {
          this.config.pollFallbackFn();
        }
      }, 3000);
    }
  }

  private stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  public sendPosition(lat: number, lon: number): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: 'position', lat, lon }));
    }
  }

  public disconnect(): void {
    this.isExplicitlyClosed = true;
    this.stopPing();
    this.stopPolling();
    clearTimeout(this.reconnectTimeout);
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setState('disconnected');
  }
}
