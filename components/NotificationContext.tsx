'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { getNavigationCounts } from '@/actions/notifications';

interface NotificationContextType {
    unreadMessageCount: number;
    unreadNotificationCount: number;
    refreshCounts: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children, initialCount = 0 }: { children: React.ReactNode; initialCount?: number }) {
    const { data: session, status } = useSession();
    const [unreadMessageCount, setUnreadMessageCount] = useState(initialCount);
    const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

    const refreshCounts = useCallback(async () => {
        if (status !== 'authenticated') return;
        try {
            const counts = await getNavigationCounts();
            setUnreadMessageCount(counts.unreadMessageCount);
            setUnreadNotificationCount(counts.unreadNotificationCount);
        } catch (error) {
            console.error('Failed to refresh counts', error);
        }
    }, [status]);

    // Initial load only
    useEffect(() => {
        refreshCounts();
    }, [refreshCounts]);

    // Pusher subscription
    useEffect(() => {
        if (status !== 'authenticated' || !session?.user) return;

        const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
        const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

        if (!pusherKey || !pusherCluster) return;

        const initPusher = async () => {
            const Pusher = (await import('pusher-js')).default;

            const pusher = new Pusher(pusherKey, {
                cluster: pusherCluster,
                authEndpoint: '/api/pusher/auth',
            });

            // @ts-ignore
            const userId = session.user.id || session.user.sub;
            const channelName = `private-user-${userId}`;
            const channel = pusher.subscribe(channelName);

            // Listen for any info update (messages or notifications)
            channel.bind('info-update', (data: any) => {
                refreshCounts();
            });

            // Also listen for direct notification events
            channel.bind('notification', () => {
                refreshCounts();
            });

            return () => {
                channel.unbind_all();
                pusher.unsubscribe(channelName);
                pusher.disconnect();
            };
        };

        let cleanup: (() => void) | undefined;
        initPusher().then(fn => { cleanup = fn; });

        return () => {
            if (cleanup) cleanup();
        };
    }, [session, status, refreshCounts]);

    return (
        <NotificationContext.Provider value={{ unreadMessageCount, unreadNotificationCount, refreshCounts }}>
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
