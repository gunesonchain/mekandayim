'use client';

import { useState, useEffect } from 'react';
import { getPaginatedNotifications, markAllNotificationsAsRead, deleteAllNotifications } from '@/actions/notifications';
import { useRouter } from 'next/navigation';
import { Bell, Heart, MessageCircle, AlertTriangle, Check, Trash2, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useNotification } from '@/components/NotificationContext';

interface Notification {
    id: string;
    type: string;
    message: string;
    link?: string | null;
    isRead: boolean;
    createdAt: string;
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const router = useRouter();
    const { refreshCounts } = useNotification();

    const loadNotifications = async (pageNum: number) => {
        setLoading(true);
        try {
            const result = await getPaginatedNotifications(pageNum, 10);
            setNotifications(result.notifications);
            setTotalPages(result.totalPages);
            setPage(pageNum);
        } catch (error) {
            console.error('Failed to load notifications', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotifications(1);
        // Mark all as read when visiting this page
        markAllNotificationsAsRead().then(() => refreshCounts());
    }, []);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            loadNotifications(newPage);
            // Scroll to top
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handleClearAll = async () => {
        if (!confirm('Tüm bildirimleri silmek istediğinizden emin misiniz?')) return;
        try {
            await deleteAllNotifications();
            setNotifications([]);
            setTotalPages(0);
            refreshCounts();
        } catch (error) {
            console.error('Failed to delete notifications', error);
        }
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
        <div className="min-h-screen pb-20 pt-20 px-4 md:pt-24">
            <div className="max-w-2xl mx-auto">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <Link href="/" className="p-2 -ml-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <h1 className="text-xl font-bold">Bildirimler</h1>
                    </div>
                    {notifications.length > 0 && (
                        <button
                            onClick={handleClearAll}
                            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors text-xs font-medium"
                        >
                            <Trash2 size={14} />
                            Tümünü Temizle
                        </button>
                    )}
                </div>

                <div className="space-y-2">
                    {loading ? (
                        <div className="text-center py-12 text-gray-500">Yükleniyor...</div>
                    ) : notifications.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 bg-white/5 rounded-xl border border-white/5">
                            <Bell size={32} className="mx-auto mb-4 opacity-20" />
                            <p className="text-base font-medium text-gray-400">Bildiriminiz yok</p>
                        </div>
                    ) : (
                        <>
                            {notifications.map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={() => notification.link && router.push(notification.link)}
                                    className={`flex items-start gap-3 p-3 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group`}
                                >
                                    <div className="mt-0.5 p-1.5 bg-white/5 rounded-full group-hover:scale-110 transition-transform">
                                        {getIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-gray-200 text-sm leading-snug">
                                            {notification.message}
                                        </p>
                                        <p className="text-[10px] text-gray-500 mt-1 font-medium">
                                            {formatTime(notification.createdAt)}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-4 mt-6 py-4">
                                    <button
                                        onClick={() => handlePageChange(page - 1)}
                                        disabled={page === 1}
                                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronLeft size={20} />
                                    </button>
                                    <span className="text-sm text-gray-400">
                                        Sayfa {page} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => handlePageChange(page + 1)}
                                        disabled={page === totalPages}
                                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        <ChevronRight size={20} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
