import { WebSocketMessage } from '../types';

export class WebSocketClient {
    private ws: WebSocket | null = null;
    private messageHandlers: Map<string, (payload: any) => void> = new Map();

    constructor(private url: string = "ws://localhost:8767") {}

    connect(): Promise<void> {
        return new Promise((resolve, reject) => {
            this.ws = new WebSocket(this.url);

            this.ws.onopen = () => {
                console.log("WebSocket connected");
                resolve();
            };

            this.ws.onerror = (error) => {
                console.error("WebSocket error:", error);
                reject(error);
            };

            this.ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data) as WebSocketMessage;
                    const handler = this.messageHandlers.get(data.type);
                    if (handler) {
                        handler(data.payload);
                    }
                } catch (error) {
                    console.error("Error handling message:", error);
                }
            };
        });
    }

    disconnect(): void {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    send(type: string, payload: any): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message: WebSocketMessage = { type, payload };
            this.ws.send(JSON.stringify(message));
        } else {
            console.error("WebSocket is not connected");
        }
    }

    on<T = any>(type: string, handler: (payload: T) => void): void {
        this.messageHandlers.set(type, handler as (payload: any) => void);
    }

    off(type: string): void {
        this.messageHandlers.delete(type);
    }
} 