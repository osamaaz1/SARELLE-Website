'use client';

import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './auth-provider';

interface SocketContextValue {
  connected: boolean;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler: (...args: any[]) => void) => void;
  emit: (event: string, ...args: any[]) => void;
}

const SocketContext = createContext<SocketContextValue>({
  connected: false,
  unreadCount: 0,
  setUnreadCount: () => {},
  on: () => {},
  off: () => {},
  emit: () => {},
});

export function useSocket() {
  return useContext(SocketContext);
}

function getWsUrl() {
  const env = process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  if (typeof window === 'undefined') return env;
  if (env.includes('localhost') && window.location.hostname !== 'localhost') {
    return env.replace('localhost', window.location.hostname);
  }
  return env;
}
const WS_URL = getWsUrl();

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const socketRef = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) {
      // Disconnect if logged out
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setConnected(false);
      }
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('wimc_token') : null;
    if (!token) return;

    const socket = io(WS_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    // Listen for real-time notifications
    socket.on('notification', () => {
      setUnreadCount(prev => prev + 1);
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [user]);

  const on = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketRef.current?.on(event, handler);
  }, []);

  const off = useCallback((event: string, handler: (...args: any[]) => void) => {
    socketRef.current?.off(event, handler);
  }, []);

  const emit = useCallback((event: string, ...args: any[]) => {
    socketRef.current?.emit(event, ...args);
  }, []);

  return (
    <SocketContext.Provider value={{ connected, unreadCount, setUnreadCount, on, off, emit }}>
      {children}
    </SocketContext.Provider>
  );
}
