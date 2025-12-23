'use client';

import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { sendMessage, clearConversation, getMessages } from '@/actions/dm';
import MessageBubble from './MessageBubble';
import { Loader2, ArrowLeft, ArrowUp, Image as ImageIcon, Trash2, X, MoreVertical, User, ChevronUp } from 'lucide-react';
import { getAvatarColor } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { compressImage } from '@/lib/imageCompression';
import { useNotification } from '@/components/NotificationContext';

interface ChatWindowProps {
    initialMessages: any[];
    initialHasMore: boolean;
    otherUser: {
        id: string;
        username: string;
        image: string | null;
    };
    currentUserId: string;
}

// Helper function to format date label
function getDateLabel(dateStr: string): string {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

    if (dateOnly.getTime() === todayOnly.getTime()) {
        return 'Bugün';
    } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
        return 'Dün';
    } else {
        return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
    }
}

export default function ChatWindow({ initialMessages, initialHasMore, otherUser, currentUserId }: ChatWindowProps) {
    const [messages, setMessages] = useState(initialMessages);
    const [hasMore, setHasMore] = useState(initialHasMore);
    const [loadingMore, setLoadingMore] = useState(false);
    const [newMessage, setNewMessage] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [showMenu, setShowMenu] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const prevScrollHeightRef = useRef<number>(0);

    const router = useRouter();
    const { refreshCounts } = useNotification();

    // Sync state with props (Important for router.refresh())
    useEffect(() => {
        setMessages(initialMessages);
        setHasMore(initialHasMore);
    }, [initialMessages, initialHasMore]);

    // Refresh notification counts when chat opens (messages marked as read by server)
    useEffect(() => {
        // Force refresh the page data to bypass Router Cache and ensure markAsRead runs
        router.refresh();
        refreshCounts();
    }, [refreshCounts, router]);

    // Load more messages
    const loadMoreMessages = useCallback(async () => {
        if (loadingMore || !hasMore || messages.length === 0) return;

        // Save scroll position
        if (scrollRef.current) {
            prevScrollHeightRef.current = scrollRef.current.scrollHeight;
        }

        setLoadingMore(true);
        try {
            const oldestMessage = messages[0];
            const result = await getMessages(otherUser.id, oldestMessage.id);

            if (result.messages && result.messages.length > 0) {
                setMessages(prev => [...result.messages, ...prev]);
                setHasMore(result.hasMore);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error("Load more error", error);
        } finally {
            setLoadingMore(false);
        }
    }, [loadingMore, hasMore, messages, otherUser.id]);

    // Scroll to top after loading older messages
    useLayoutEffect(() => {
        if (scrollRef.current && prevScrollHeightRef.current > 0 && !loadingMore) {
            // Scroll to top to see newly loaded older messages
            scrollRef.current.scrollTop = 0;
            prevScrollHeightRef.current = 0;
        }
    }, [messages, loadingMore]);

    // Pusher real-time subscription (replaces polling)
    useEffect(() => {
        // Only use Pusher if configured
        const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
        const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

        if (!pusherKey || !pusherCluster) {
            return;
        }

        // Initialize Pusher
        const initPusher = async () => {
            const Pusher = (await import('pusher-js')).default;

            const pusher = new Pusher(pusherKey, {
                cluster: pusherCluster,
                authEndpoint: '/api/pusher/auth',
            });

            // Create unique channel name (sorted user IDs)
            const channelName = `private-chat-${[currentUserId, otherUser.id].sort().join('-')}`;
            const channel = pusher.subscribe(channelName);

            channel.bind('new-message', async (message: any) => {
                let fullMessage = message;

                // If message has an image placeholder, fetch the actual content
                if (message.hasImage || message.image === 'sent-image') {
                    // Import here to avoid circular dependencies if any, though actions are usually fine
                    const { getMessage } = await import('@/actions/dm');
                    try {
                        const fetched = await getMessage(message.id);
                        if (fetched) {
                            fullMessage = fetched;
                        }
                    } catch (err) {
                        console.error("Failed to fetch full message image", err);
                    }
                }

                setMessages(prev => {
                    // Check if message already exists (avoid duplicates from own messages)
                    if (prev.some(m => m.id === fullMessage.id)) {
                        return prev;
                    }

                    // Remove optimistic version if exists
                    const filtered = prev.filter(m => !m.id.startsWith('temp-'));

                    return [...filtered, fullMessage];
                });

                // Scroll to bottom after state update
                setTimeout(() => {
                    if (scrollRef.current) {
                        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                    }
                }, 150);
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
    }, [otherUser.id, currentUserId]);

    // Auto-scroll to bottom on initial load
    const [initialScrollDone, setInitialScrollDone] = useState(false);

    useLayoutEffect(() => {
        if (scrollRef.current && !initialScrollDone && messages.length > 0) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
            setInitialScrollDone(true);
        }
    }, [messages.length, initialScrollDone]);

    // Close menu on click outside
    useEffect(() => {
        const closeMenu = () => setShowMenu(false);
        if (showMenu) {
            window.addEventListener('click', closeMenu);
        }
        return () => window.removeEventListener('click', closeMenu);
    }, [showMenu]);

    async function handleSend(e?: React.FormEvent, imageOverride?: string) {
        if (e) e.preventDefault();

        const content = newMessage.trim();
        const image = imageOverride || selectedImage;

        if ((!content && !image) || sending) return;

        setNewMessage('');
        setSelectedImage(null);
        setSending(true);

        const optimisticMsg = {
            id: 'temp-' + Date.now(),
            content: content,
            image: image,
            senderId: currentUserId,
            createdAt: new Date().toISOString(),
            isRead: false
        };

        try {
            setMessages(prev => [...prev, optimisticMsg]);

            // Scroll to bottom for new message
            setTimeout(() => {
                if (scrollRef.current) {
                    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
                }
            }, 50);

            if (image) {
                console.log("Sending image with size: " + (image.length / 1024).toFixed(2) + " KB");
            }
            const realMessage = await sendMessage(otherUser.id, content, image || undefined);

            setMessages(prev => prev.map(msg =>
                msg.id === optimisticMsg.id ? {
                    ...realMessage,
                    createdAt: realMessage.createdAt
                } : msg
            ));
        } catch (error: any) {
            console.error(error);
            setMessages(prev => prev.filter(msg => msg.id !== optimisticMsg.id));
            alert(error?.message || 'Mesaj gönderilemedi.');
        } finally {
            setSending(false);
        }
    }

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 20 * 1024 * 1024) {
            alert('Dosya çok büyük.');
            return;
        }

        try {
            const compressedBase64 = await compressImage(file, {
                maxWidth: 1024,
                maxHeight: 1024,
                quality: 0.8
            });

            setSelectedImage(compressedBase64);
        } catch (error) {
            console.error('Image compression failed', error);
            alert('Fotoğraf işlenirken bir hata oluştu.');
        }

        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClearConversation = async () => {
        if (!confirm('Bu kişiyle olan sohbet geçmişinizi temizlemek istediğinize emin misiniz?')) return;

        try {
            await clearConversation(otherUser.id);
            setMessages([]);
            router.refresh();
        } catch (error) {
            console.error('Clear failed', error);
            alert('Sohbet temizlenirken bir hata oluştu.');
        }
    };

    // Group messages by date
    const messagesWithDates: { type: 'date' | 'message'; date?: string; msg?: any }[] = [];
    let lastDate = '';

    messages.forEach(msg => {
        const msgDate = new Date(msg.createdAt).toDateString();
        if (msgDate !== lastDate) {
            messagesWithDates.push({ type: 'date', date: msg.createdAt });
            lastDate = msgDate;
        }
        messagesWithDates.push({ type: 'message', msg });
    });

    return (
        <div
            className="flex flex-col h-full bg-black/20 backdrop-blur-3xl relative overflow-hidden"
            onClick={() => {
                // Mobilde boşluğa tıklanınca inputa odaklansın (kullanıcı deneyimi için)
                if (window.innerWidth < 768 && fileInputRef.current) {
                    // fileInputRef değil text inputa odaklanmalı, bu yüzden ref eklememiz lazım
                    // Hızlı çözüm: document.querySelector ile inputu bulup focus yapalım
                    const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                    if (input) input.focus();
                }
            }}
        >
            {/* Chat Header - Compact */}
            <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between bg-black/40 sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <Link href="/dm" className="md:hidden p-1.5 -ml-1 text-gray-400 hover:text-white">
                        <ArrowLeft size={20} />
                    </Link>

                    <Link href={`/user/${otherUser.username}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(otherUser.username)} flex items-center justify-center text-xs font-bold text-white overflow-hidden border border-white/10`}>
                            {otherUser.image ? (
                                <img src={otherUser.image} alt={otherUser.username} className="w-full h-full object-cover" />
                            ) : (
                                otherUser.username?.[0]?.toUpperCase()
                            )}
                        </div>
                        <span className="font-semibold text-white text-sm">@{otherUser.username}</span>
                    </Link>
                </div>

                <div className="relative">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(!showMenu);
                        }}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <MoreVertical size={20} />
                    </button>

                    {showMenu && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-gray-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                            <Link
                                href={`/user/${otherUser.username}`}
                                className="flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors w-full text-left"
                            >
                                <User size={16} />
                                Profile Git
                            </Link>
                            <button
                                onClick={handleClearConversation}
                                className="flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors w-full text-left border-t border-white/5"
                            >
                                <Trash2 size={16} />
                                Sohbeti Temizle
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-2">
                {/* Load More Button */}
                {hasMore && (
                    <div className="flex justify-center py-2 mb-2">
                        <button
                            onClick={loadMoreMessages}
                            disabled={loadingMore}
                            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-full transition-colors disabled:opacity-50"
                        >
                            {loadingMore ? (
                                <Loader2 size={16} className="animate-spin" />
                            ) : (
                                <ChevronUp size={16} />
                            )}
                            {loadingMore ? 'Yükleniyor...' : 'Daha fazla mesaj göster'}
                        </button>
                    </div>
                )}

                {messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-2 opacity-50">
                        <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${getAvatarColor(otherUser.username)} flex items-center justify-center text-3xl font-bold text-white overflow-hidden border-4 border-white/5`}>
                            {otherUser.image ? (
                                <img src={otherUser.image} alt={otherUser.username} className="w-full h-full object-cover" />
                            ) : (
                                otherUser.username?.[0]?.toUpperCase()
                            )}
                        </div>
                        <p className="text-sm font-medium">@{otherUser.username} ile sohbeti başlat</p>
                    </div>
                ) : (
                    messagesWithDates.map((item, index) => {
                        if (item.type === 'date') {
                            return (
                                <div key={`date-${index}`} className="flex justify-center py-3">
                                    <span className="text-xs text-gray-500 bg-white/5 px-3 py-1 rounded-full">
                                        {getDateLabel(item.date!)}
                                    </span>
                                </div>
                            );
                        }
                        return (
                            <MessageBubble
                                key={item.msg.id}
                                id={item.msg.id}
                                content={item.msg.content}
                                image={item.msg.image}
                                isOwn={item.msg.senderId === currentUserId}
                                isRead={item.msg.isRead}
                                createdAt={item.msg.createdAt}
                            />
                        );
                    })
                )}
            </div>

            {/* Input Area - Compact */}
            <form onSubmit={handleSend} className="px-3 py-2 border-t border-white/10 bg-black/40 relative z-20">
                {selectedImage && (
                    <div className="mb-2 relative inline-block">
                        <img src={selectedImage} alt="Preview" className="h-16 w-auto rounded-lg border border-white/20" />
                        <button
                            type="button"
                            onClick={() => setSelectedImage(null)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                        >
                            <X size={12} />
                        </button>
                    </div>
                )}

                <div className="flex gap-2 relative items-center">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
                    >
                        <ImageIcon size={18} />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleImageSelect}
                        className="hidden"
                        accept="image/*"
                    />

                    <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Mesaj yaz..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-full py-2 px-4 text-base md:text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                    />
                    <button
                        type="submit"
                        disabled={(!newMessage.trim() && !selectedImage && !sending)}
                        className="p-2 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center"
                    >
                        {sending ? <Loader2 size={18} className="animate-spin" /> : <ArrowUp size={18} className="stroke-[3px]" />}
                    </button>
                </div>
            </form>
        </div>
    );
}
