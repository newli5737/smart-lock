import React, { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react';

type WebSocketMessage = {
    type: string;
    [key: string]: any;
};

type MessageHandler = (message: WebSocketMessage) => void;

interface SocketContextType {
    isConnected: boolean;
    send: (message: WebSocketMessage) => void;
    subscribe: (handler: MessageHandler) => () => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
    const context = useContext(SocketContext);
    if (!context) {
        throw new Error('useSocket must be used within a SocketProvider');
    }
    return context;
};

interface SocketProviderProps {
    children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [ws, setWs] = useState<WebSocket | null>(null);
    const handlersRef = useRef<MessageHandler[]>([]);

    useEffect(() => {
        const wsBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const wsUrl = wsBaseUrl.replace('http', 'ws') + '/ws';

        let socket: WebSocket | null = null;
        let reconnectTimer: any = null;

        const connect = () => {
            // console.log('Connecting to WebSocket:', wsUrl);
            socket = new WebSocket(wsUrl);

            socket.onopen = () => {
                // console.log('WebSocket connected');
                setIsConnected(true);
                if (reconnectTimer) clearTimeout(reconnectTimer);
            };

            socket.onclose = () => {
                // console.log('WebSocket disconnected');
                setIsConnected(false);
                socket = null;
                reconnectTimer = setTimeout(() => {
                    // console.log('Reconnecting WebSocket...');
                    connect();
                }, 3000);
            };

            socket.onerror = () => {
                // error handling
            };

            socket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    handlersRef.current.forEach(handler => handler(message));
                } catch (e) {
                    // parse error
                }
            };

            setWs(socket);
        };

        connect();

        return () => {
            if (socket) socket.close();
            if (reconnectTimer) clearTimeout(reconnectTimer);
        };
    }, []);

    const subscribe = (handler: MessageHandler) => {
        handlersRef.current.push(handler);
        return () => {
            handlersRef.current = handlersRef.current.filter(h => h !== handler);
        };
    };

    const send = (message: WebSocketMessage) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        }
    };

    return (
        <SocketContext.Provider value={{ isConnected, send, subscribe }}>
            {children}
        </SocketContext.Provider>
    );
};
