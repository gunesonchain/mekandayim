'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { getUnreadMessageCount } from '@/app/actions';

interface NotificationContextType {
    unreadCount: number;
    setUnreadCount: (count: number) => void;
    decrementCount: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({
    children,
    initialCount = 0
}: {
    children: React.ReactNode;
    initialCount?: number;
}) {
    const { data: session, status } = useSession();
    const [unreadCount, setUnreadCount] = useState(initialCount);

    // Sync initialCount if it changes (e.g. on navigation/refresh)
    useEffect(() => {
        setUnreadCount(initialCount);
    }, [initialCount]);

    // Polling for unread messages every 15 seconds
    useEffect(() => {
        if (status !== 'authenticated' || !session?.user) return;

        const poll = async () => {
            // @ts-ignore
            const userId = session.user.id || session.user.sub;
            if (userId) {
                const count = await getUnreadMessageCount(userId);
                setUnreadCount(count);
            }
        };

        const intervalId = setInterval(poll, 15000); // 15 seconds

        return () => clearInterval(intervalId);
    }, [session, status]);

    const decrementCount = () => {
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    return (
        <NotificationContext.Provider value={{ unreadCount, setUnreadCount, decrementCount }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotification() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
}
