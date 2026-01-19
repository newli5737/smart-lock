/**
 * WebSocket Service for Real-time Communication
 */

type WebSocketMessage = {
    type: string;
    [key: string]: any;
};

type MessageHandler = (message: WebSocketMessage) => void;

class WebSocketService {
    private ws: WebSocket | null = null;
    private reconnectTimer: number | null = null;
    private messageHandlers: MessageHandler[] = [];
    private url: string;

    constructor(url: string) {
        this.url = url;
    }

    connect() {
        if (this.ws?.readyState === WebSocket.OPEN) {
            console.log('WebSocket already connected');
            return;
        }

        console.log('🔌 Connecting to WebSocket:', this.url);
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
            console.log('✅ WebSocket connected');
            if (this.reconnectTimer) {
                clearTimeout(this.reconnectTimer);
                this.reconnectTimer = null;
            }
        };

        this.ws.onmessage = (event) => {
            try {
                const message: WebSocketMessage = JSON.parse(event.data);
                console.log('📨 WebSocket message:', message);

                // Notify all handlers
                this.messageHandlers.forEach(handler => handler(message));
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        this.ws.onerror = (error) => {
            console.error('❌ WebSocket error:', error);
        };

        this.ws.onclose = () => {
            console.log('🔌 WebSocket disconnected');
            this.ws = null;

            // Auto-reconnect after 3 seconds
            this.reconnectTimer = window.setTimeout(() => {
                console.log('🔄 Reconnecting WebSocket...');
                this.connect();
            }, 3000);
        };
    }

    disconnect() {
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    send(message: WebSocketMessage) {
        if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket not connected, cannot send message');
        }
    }

    onMessage(handler: MessageHandler) {
        this.messageHandlers.push(handler);

        // Return unsubscribe function
        return () => {
            const index = this.messageHandlers.indexOf(handler);
            if (index > -1) {
                this.messageHandlers.splice(index, 1);
            }
        };
    }
}

// Create WebSocket service instance
const wsBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const wsUrl = wsBaseUrl.replace('http', 'ws') + '/ws';

export const websocketService = new WebSocketService(wsUrl);

// Auto-connect on module load
websocketService.connect();
