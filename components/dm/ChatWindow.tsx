'use client';

import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { sendMessage, deleteConversation, clearConversation, getMessages } from '@/actions/dm';
import MessageBubble from './MessageBubble';
import { Loader2, ArrowLeft, ArrowUp, Image as ImageIcon, Trash2, X, MoreVertical, User } from 'lucide-react';
import { getAvatarColor } from '@/lib/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { compressImage } from '@/lib/imageCompression';

interface ChatWindowProps {
    initialMessages: any[];
    otherUser: {
        id: string;
        username: string;
        image: string | null;
    };
    currentUserId: string;
}

export default function ChatWindow({ initialMessages, otherUser, currentUserId }: ChatWindowProps) {
    const [messages, setMessages] = useState(initialMessages);
    const [newMessage, setNewMessage] = useState('');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    // Polling for new messages every 3 seconds AND immediate fetch on mount
    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const latestMessages = await getMessages(otherUser.id);

                setMessages(currentMessages => {
                    // Keep optimistic messages that are currently sending/pending (temp ids)
                    const optimism = currentMessages.filter(m => m.id.startsWith('temp-'));

                    // latestMessages already have string dates from server action now
                    // Check if we actually have new messages to avoid unnecessary renders? 
                    // React state setter identity check handles strict equality, objects are new ref though.

                    // Merge: fetched are authoritative, optimism are appended if not yet in fetched
                    return [...latestMessages, ...optimism];
                });
            } catch (error) {
                console.error("Polling error", error);
            }
        };

        // Initial fetch to sync any stale server props immediately
        fetchMessages();

        const interval = setInterval(fetchMessages, 3000);

        return () => clearInterval(interval);
    }, [otherUser.id]);

    // Auto-scroll to bottom on load and new messages
    // Use useLayoutEffect to prevent visual jump/flash of scrolled content
    useLayoutEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages.length]);

    // Close menu on click outside - basic effect
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

        // Optimistic update
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

            const realMessage = await sendMessage(otherUser.id, content, image || undefined);

            // Replace optimistic message with real one
            setMessages(prev => prev.map(msg =>
                msg.id === optimisticMsg.id ? {
                    ...realMessage,
                    createdAt: realMessage.createdAt // already ISO string
                } : msg
            ));
        } catch (error) {
            console.error(error);
            // Remove optimistic message on error
            setMessages(prev => prev.filter(msg => msg.id !== optimisticMsg.id));
            alert('Mesaj gönderilemedi.');
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

        // Reset input
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleClearConversation = async () => {
        if (!confirm('Bu kişiyle olan sohbet geçmişinizi temizlemek istediğinize emin misiniz?')) return;

        try {
            await clearConversation(otherUser.id);
            setMessages([]); // Clear local state
            router.refresh(); // Refresh server state
        } catch (error) {
            console.error('Clear failed', error);
            alert('Sohbet temizlenirken bir hata oluştu.');
        }
    };

    return (
        <div className="flex flex-col h-full bg-black/20 backdrop-blur-3xl">
            {/* Chat Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40 sticky top-0 z-10">
                <div className="flex items-center gap-3">
                    {/* Back Button (Mobile Only) */}
                    <Link href="/dm" className="md:hidden p-2 -ml-2 text-gray-400 hover:text-white">
                        <ArrowLeft size={24} />
                    </Link>

                    <Link href={`/user/${otherUser.username}`} className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(otherUser.username)} flex items-center justify-center text-sm font-bold text-white overflow-hidden border border-white/10`}>
                            {otherUser.image ? (
                                <img src={otherUser.image} alt={otherUser.username} className="w-full h-full object-cover" />
                            ) : (
                                otherUser.username?.[0]?.toUpperCase()
                            )}
                        </div>
                        <span className="font-bold text-white">@{otherUser.username}</span>
                    </Link>
                </div>

                {/* Actions Menu */}
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
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
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
                    messages.map((msg) => (
                        <MessageBubble
                            key={msg.id} // Ensure uniqueness
                            id={msg.id}
                            content={msg.content}
                            image={msg.image}
                            isOwn={msg.senderId === currentUserId}
                            isRead={msg.isRead}
                            createdAt={msg.createdAt}
                        />
                    ))
                )}
            </div>

            {/* Input Area */}
            <form onSubmit={handleSend} className="p-4 border-t border-white/10 bg-black/40">
                {/* Image Preview */}
                {selectedImage && (
                    <div className="mb-2 relative inline-block">
                        <img src={selectedImage} alt="Preview" className="h-20 w-auto rounded-lg border border-white/20" />
                        <button
                            type="button"
                            onClick={() => setSelectedImage(null)}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                        >
                            <X size={12} />
                        </button>
                    </div>
                )}

                <div className="flex gap-2 relative items-end">
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-gray-400 hover:text-white transition-colors"
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
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Mesaj yaz..."
                        className="flex-1 bg-white/5 border border-white/10 rounded-full py-3 px-5 text-white placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500/50"
                    />
                    <button
                        type="submit"
                        disabled={(!newMessage.trim() && !selectedImage && !sending)}
                        className="p-3 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full text-white disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity flex items-center justify-center"
                    >
                        {sending ? <Loader2 size={20} className="animate-spin" /> : <ArrowUp size={20} className="stroke-[3px]" />}
                    </button>
                </div>
            </form>
        </div>
    );
}
