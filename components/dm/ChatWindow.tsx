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

    // Input states
    const [newMessage, setNewMessage] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false); // Used for visual feedback, not disabling input entirely
    const [showMenu, setShowMenu] = useState(false);

    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const textInputRef = useRef<HTMLInputElement>(null);
    const prevScrollHeightRef = useRef<number>(0);
    const isSendingRef = useRef(false); // Ref to prevent double submission without re-rendering blocking input

    const router = useRouter();
    const { refreshCounts } = useNotification();

    // Sync state with props
    useEffect(() => {
        setMessages(initialMessages);
        setHasMore(initialHasMore);
    }, [initialMessages, initialHasMore]);

    // Refresh notification counts and mark as read
    useEffect(() => {
        router.refresh();
        refreshCounts();
    }, [refreshCounts, router]);

    // Scroll to bottom helper
    const scrollToBottom = useCallback((smooth = true) => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({
                top: scrollRef.current.scrollHeight,
                behavior: smooth ? 'smooth' : 'auto'
            });
        }
    }, []);

    // Load more messages
    const loadMoreMessages = useCallback(async () => {
        if (loadingMore || !hasMore || messages.length === 0) return;

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

    // Restore scroll position after loading more
    useLayoutEffect(() => {
        if (scrollRef.current && prevScrollHeightRef.current > 0 && !loadingMore) {
            const newScrollHeight = scrollRef.current.scrollHeight;
            const diff = newScrollHeight - prevScrollHeightRef.current;
            scrollRef.current.scrollTop = diff;
            prevScrollHeightRef.current = 0;
        }
    }, [messages, loadingMore]);

    // Initial Scroll to bottom
    useEffect(() => {
        scrollToBottom(false);
    }, []); // Run once on mount

    // Pusher real-time subscription
    useEffect(() => {
        const pusherKey = process.env.NEXT_PUBLIC_PUSHER_KEY;
        const pusherCluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;

        if (!pusherKey || !pusherCluster) return;

        const initPusher = async () => {
            const Pusher = (await import('pusher-js')).default;
            const pusher = new Pusher(pusherKey, {
                cluster: pusherCluster,
                authEndpoint: '/api/pusher/auth',
            });

            const channelName = `private-chat-${[currentUserId, otherUser.id].sort().join('-')}`;
            const channel = pusher.subscribe(channelName);

            channel.bind('new-message', async (message: any) => {
                let fullMessage = message;

                // Handle image placeholder fetching
                if (message.hasImage || message.image === 'sent-image') {
                    const { getMessage } = await import('@/actions/dm');
                    try {
                        const fetched = await getMessage(message.id);
                        if (fetched) fullMessage = fetched;
                    } catch (err) {
                        console.error("Failed to fetch full message image", err);
                    }
                }

                setMessages(prev => {
                    if (prev.some(m => m.id === fullMessage.id)) return prev;
                    // Dedupe against optimistic messages using temp-id logic if needed, 
                    // generally optimistic messages should be replaced by action result before this fires, 
                    // but just in case we can filter.
                    return [...prev, fullMessage];
                });

                // Scroll to bottom if user is close to bottom
                if (scrollRef.current) {
                    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
                    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
                    if (isNearBottom) {
                        setTimeout(() => scrollToBottom(), 100);
                    }
                }
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
    }, [otherUser.id, currentUserId, scrollToBottom]);

    // Close menu on click outside
    useEffect(() => {
        const closeMenu = () => setShowMenu(false);
        if (showMenu) window.addEventListener('click', closeMenu);
        return () => window.removeEventListener('click', closeMenu);
    }, [showMenu]);


    // GOLD STANDARD SEND LOGIC
    async function handleSend(e?: React.FormEvent) {
        if (e) e.preventDefault();

        const content = newMessage.trim();
        const image = selectedImage;

        // Prevent empty sends or double submissions
        if ((!content && !image) || isSendingRef.current) return;

        // 1. Optimistic Update: Add message immediately
        const tempId = 'temp-' + Date.now();
        const optimisticMsg = {
            id: tempId,
            content: content,
            image: image,
            senderId: currentUserId,
            createdAt: new Date().toISOString(),
            isRead: false,
            // Custom flag for UI to show it's pending/sending if we want opacity etc.
            isOptimistic: true
        };

        // 2. Reset Inputs IMMEDIATELY
        setNewMessage('');
        setSelectedImage(null);

        // 3. Focus Retention: Explicitly keep focus (though not disabling input usually handles this)
        // We do basic focus check just in case.
        if (textInputRef.current) {
            textInputRef.current.focus();
        }

        // 4. Update State
        setMessages(prev => [...prev, optimisticMsg]);
        scrollToBottom(true);

        // 5. Set sending flag (ref doesn't trigger re-render, blocking logic only)
        isSendingRef.current = true;
        setIsSubmitting(true); // For spinner if needed

        try {
            // 6. Server Action
            const realMessage = await sendMessage(otherUser.id, content, image || undefined);

            // 7. Replace Optimistic Message with Real One
            setMessages(prev => prev.map(msg =>
                msg.id === tempId ? { ...realMessage, createdAt: realMessage.createdAt } : msg
            ));
        } catch (error: any) {
            console.error(error);
            // Revert on failure
            setMessages(prev => prev.filter(msg => msg.id !== tempId));
            alert(error?.message || 'Mesaj gönderilemedi.');
        } finally {
            isSendingRef.current = false;
            setIsSubmitting(false);
            // Ensure focus is still there
            if (textInputRef.current) textInputRef.current.focus();
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
            // Focus text input after image select so user can type caption or just send
            if (textInputRef.current) textInputRef.current.focus();
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
            alert('Sohbet temizlenirken bir hata oluştu.');
        }
    };

    // Grouping Logic
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
        // MAIN CONTAINER: Fixed Fullscreen on Mobile, Flex on Desktop
        // This structure ensures 100% viewport height usage without scroll leakage
        <div
            className="flex flex-col h-full bg-black/20 backdrop-blur-3xl relative overflow-hidden"
            onClick={() => {
                if (window.innerWidth < 1024 && textInputRef.current) {
                    textInputRef.current.focus();
                }
            }}
        >
            {/* 1. HEADER (Fixed at top) */}
            <div className="shrink-0 px-4 py-3 border-b border-white/10 flex items-center justify-between bg-black/40 backdrop-blur-md z-10">
                <div className="flex items-center gap-3">
                    <Link href="/dm" className="lg:hidden p-2 -ml-2 text-gray-400 hover:text-white transition-colors">
                        <ArrowLeft size={22} />
                    </Link>

                    <Link href={`/user/${otherUser.username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getAvatarColor(otherUser.username)} flex items-center justify-center text-sm font-bold text-white overflow-hidden border border-white/10`}>
                            {otherUser.image ? (
                                <img src={otherUser.image} alt={otherUser.username} className="w-full h-full object-cover" />
                            ) : (
                                otherUser.username?.[0]?.toUpperCase()
                            )}
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-white text-sm leading-tight">@{otherUser.username}</span>
                            <span className="text-[10px] text-green-400 font-medium leading-tight">Çevrimiçi</span>
                        </div>
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
                        <div className="absolute right-0 top-full mt-2 w-48 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-50">
                            <Link href={`/user/${otherUser.username}`} className="flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:bg-white/10">
                                <User size={16} /> Profile Git
                            </Link>
                            <button onClick={handleClearConversation} className="flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 w-full text-left border-t border-white/5">
                                <Trash2 size={16} /> Sohbeti Temizle
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* 2. MESSAGES AREA (Scrollable Middle) */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-4 overscroll-contain"
                onClick={() => {
                    // Tap to focus input for better UX
                    if (window.innerWidth < 1024 && textInputRef.current) {
                        textInputRef.current.focus();
                    }
                }}
            >
                {/* Load More Trigger */}
                {hasMore && (
                    <div className="flex justify-center py-2">
                        <button
                            onClick={loadMoreMessages}
                            disabled={loadingMore}
                            className="flex items-center gap-2 text-xs text-gray-400 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
                        >
                            {loadingMore ? <Loader2 size={14} className="animate-spin" /> : <ChevronUp size={14} />}
                            {loadingMore ? 'Yükleniyor...' : 'Daha eski mesajlar'}
                        </button>
                    </div>
                )}

                {/* Empty State */}
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-[60%] text-gray-500 space-y-3 opacity-60">
                        <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${getAvatarColor(otherUser.username)} flex items-center justify-center text-3xl font-bold text-white overflow-hidden`}>
                            {otherUser.image ? <img src={otherUser.image} alt="" className="w-full h-full object-cover" /> : otherUser.username?.[0]?.toUpperCase()}
                        </div>
                        <p className="text-sm">@{otherUser.username} ile sohbeti başlat</p>
                    </div>
                )}

                {/* Messages List */}
                {messagesWithDates.map((item, index) => {
                    if (item.type === 'date') {
                        return (
                            <div key={`date-${index}`} className="flex justify-center my-4 opacity-70">
                                <span className="text-[10px] uppercase font-bold text-gray-500 bg-white/5 px-2 py-0.5 rounded text-center tracking-wider">
                                    {getDateLabel(item.date!)}
                                </span>
                            </div>
                        );
                    }
                    return (
                        <div key={item.msg.id} className={item.msg.isOptimistic ? "opacity-70 transition-opacity" : ""}>
                            <MessageBubble
                                id={item.msg.id}
                                content={item.msg.content}
                                image={item.msg.image}
                                isOwn={item.msg.senderId === currentUserId}
                                isRead={item.msg.isRead}
                                createdAt={item.msg.createdAt}
                            />
                        </div>
                    );
                })}
            </div>

            {/* 3. INPUT AREA (Fixed at bottom) */}
            <div className="shrink-0 bg-black/60 backdrop-blur-xl border-t border-white/10 p-2 pb-safe z-20">
                <form
                    onSubmit={handleSend}
                    className="flex flex-col gap-2 max-w-4xl mx-auto relative"
                >
                    {selectedImage && (
                        <div className="absolute bottom-full left-0 mb-2 p-2 bg-black/80 rounded-xl border border-white/10 backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
                            <div className="relative">
                                <img src={selectedImage} alt="Preview" className="h-24 w-auto rounded-lg" />
                                <button type="button" onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-lg">
                                    <X size={12} />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 p-1.5 rounded-[24px] pr-2 transition-all focus-within:border-purple-500/50 focus-within:bg-white/10">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-2.5 text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 rounded-full transition-all active:scale-95"
                        >
                            <ImageIcon size={20} />
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
                            ref={textInputRef}
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            placeholder="Bir mesaj yazın..."
                            className="flex-1 bg-transparent border-none text-white placeholder:text-gray-500 focus:ring-0 text-base md:text-sm py-2 px-1"
                            autoComplete="off"
                        // DO NOT DISABLE THIS INPUT, it kills focus!
                        />

                        <button
                            type="submit"
                            disabled={(!newMessage.trim() && !selectedImage)}
                            className="p-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-700 active:scale-95 shadow-lg shadow-purple-900/20"
                        >
                            {isSubmitting ? (
                                // Show spinner inside button but keep input focused
                                <Loader2 size={18} className="animate-spin" />
                            ) : (
                                <ArrowUp size={20} strokeWidth={2.5} />
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div >
    );
}
