import { WebSocketMessage } from './types';

export class WebSocketClient {
    private ws: WebSocket | null = null;
    private messageHandlers: Map<string, (payload: unknown) => void> = new Map();

    constructor(private url: string = "ws://localhost:8765") {}

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

    send(type: string, payload: unknown): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            const message: WebSocketMessage = { type, payload };
            this.ws.send(JSON.stringify(message));
        } else {
            console.error("WebSocket is not connected");
        }
    }

    on(type: string, handler: (payload: unknown) => void): void {
        this.messageHandlers.set(type, handler);
    }

    off(type: string): void {
        this.messageHandlers.delete(type);
    }
} 