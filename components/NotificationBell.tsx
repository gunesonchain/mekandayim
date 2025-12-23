'use client';

import { useState, useEffect, useRef } from 'react';
import { Bell, Heart, MessageCircle, AlertTriangle, Check, CheckCheck, Trash2, ChevronRight } from 'lucide-react';
import { getNotifications, markAllNotificationsAsRead, deleteAllNotifications } from '@/actions/notifications';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useNotification } from './NotificationContext';

interface Notification {
    id: string;
    type: string;
    message: string;
    link?: string | null;
    isRead: boolean;
    createdAt: string;
}

export default function NotificationBell() {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const { unreadNotificationCount, refreshCounts } = useNotification();

    // Load notifications
    const loadNotifications = async () => {
        setLoading(true);
        try {
            const notifs = await getNotifications(5); // Limit 5
            setNotifications(notifs);
        } catch (error) {
            console.error('Failed to load notifications', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClearAll = async () => {
        if (!confirm('Tüm bildirimleri silmek istediğinizden emin misiniz?')) return;
        try {
            await deleteAllNotifications();
            setNotifications([]);
            await refreshCounts(); // Refresh context
        } catch (error) {
            console.error('Failed to clear notifications', error);
        }
    };

    // Reload list when new notification arrives (if open)
    useEffect(() => {
        if (isOpen) {
            loadNotifications();
        }
    }, [unreadNotificationCount]);

    // Pusher subscription for real-time
    useEffect(() => {
        const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
        const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

        if (!pusherKey || !pusherCluster) return;

        // Note: For real Pusher integration, we need the userId
        // This would require passing it as a prop or getting from session
    }, []);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleDropdown = async () => {
        const newState = !isOpen;
        setIsOpen(newState);

        if (newState) {
            loadNotifications();
            if (unreadNotificationCount > 0) {
                try {
                    await markAllNotificationsAsRead();
                    await refreshCounts();
                } catch (error) {
                    console.error('Failed to auto-mark read', error);
                }
            }
        }
    };

    const handleNotificationClick = (notification: Notification) => {
        if (notification.link) {
            router.push(notification.link, { scroll: false }); // Prevent auto-scroll to top
        }
        setIsOpen(false);
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'like':
                return <Heart size={16} className="text-pink-500" />;
            case 'message':
                return <MessageCircle size={16} className="text-blue-500" />;
            case 'report_resolved':
                return <Check size={16} className="text-green-500" />;
            case 'report_dismissed':
                return <AlertTriangle size={16} className="text-yellow-500" />;
            default:
                return <Bell size={16} className="text-gray-500" />;
        }
    };

    const formatTime = (dateStr: string) => {
        try {
            return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: tr });
        } catch {
            return '';
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Bell Icon Button */}
            <button
                onClick={toggleDropdown}
                className="relative p-2 text-gray-300 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                title="Bildirimler"
            >
                <Bell size={20} />
                {unreadNotificationCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-xs font-bold rounded-full px-1">
                        {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                    </span>
                )}
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 max-h-[80vh] flex flex-col bg-gray-900 border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                    {/* Header */}
                    <div className="flex-none px-4 py-3 border-b border-white/10 flex items-center justify-between bg-gray-900/95 backdrop-blur-sm z-10">
                        <h3 className="font-semibold text-white">Bildirimler</h3>
                    </div>

                    {/* Notifications List */}
                    <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                        {loading && notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                Yükleniyor...
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <Bell size={32} className="mx-auto mb-2 opacity-50" />
                                <p className="text-sm">Henüz bildirim yok</p>
                            </div>
                        ) : (
                            notifications.map((notification) => (
                                <button
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`w-full px-4 py-3 flex items-start gap-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0`}
                                >
                                    <div className="flex-none mt-0.5">
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-gray-300 line-clamp-2">
                                            {notification.message}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-1">
                                            {formatTime(notification.createdAt)}
                                        </p>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {/* Footer */}
                    <div className="flex-none p-2 border-t border-white/10 bg-gray-900/95 backdrop-blur-sm flex items-center justify-between gap-2 z-10">
                        <button
                            onClick={handleClearAll}
                            className="text-xs text-gray-400 hover:text-red-400 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1"
                        >
                            <Trash2 size={14} />
                            Tümünü Temizle
                        </button>
                        <Link
                            href="/notifications"
                            onClick={() => setIsOpen(false)}
                            className="text-xs text-purple-400 hover:text-purple-300 px-3 py-2 rounded-lg hover:bg-white/5 transition-colors flex items-center gap-1 ml-auto"
                        >
                            Tümünü Gör
                            <ChevronRight size={14} />
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
