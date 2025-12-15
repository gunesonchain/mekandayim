'use client';

import Link from "next/link";
import { getAvatarColor } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { getConversations, deleteConversation } from "@/actions/dm";
import { motion, PanInfo, useAnimation } from "framer-motion";
import { Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

interface Conversation {
    user: {
        id: string;
        username: string;
        image: string | null;
    };
    lastMessage: string;
    lastMessageDate: string; // string because it comes from server action serialized
    isRead?: boolean;
    unreadCount?: number;
}

interface ConversationListProps {
    conversations: Conversation[];
}

function ConversationItem({ conv, activeId }: { conv: Conversation, activeId: string }) {
    const controls = useAnimation();
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDragEnd = async (event: any, info: PanInfo) => {
        // Threshold for deletion trigger (e.g., swiped 100px left)
        if (info.offset.x < -100) {
            if (confirm(`@${conv.user.username} kişisini sohbet listenizden silmek istiyor musunuz?`)) {
                setIsDeleting(true);
                try {
                    await deleteConversation(conv.user.id);
                    // UI update happens via revalidatePath, but optimistic could be added
                } catch (error) {
                    console.error("Delete failed", error);
                    setIsDeleting(false);
                    controls.start({ x: 0 }); // Reset
                }
            } else {
                controls.start({ x: 0 }); // Reset if cancelled
            }
        } else {
            // Snap back if threshold not met
            controls.start({ x: 0 });
        }
    };

    if (isDeleting) return null;

    return (
        <div className="relative overflow-hidden border-b border-white/5 bg-black/5">
            {/* Background Layer (Delete Action) */}
            <div className="absolute inset-y-0 right-0 w-full bg-red-600 flex items-center justify-end pr-6">
                <Trash2 className="text-white" size={24} />
            </div>

            {/* Foreground Layer (Content) */}
            <motion.div
                drag="x"
                dragConstraints={{ left: -100, right: 0 }}
                dragElastic={0.1}
                onDragEnd={handleDragEnd}
                animate={controls}
                className="relative bg-black z-10"
                style={{ x: 0 }}
            >
                <Link
                    href={`/dm/${conv.user.id}`}
                    prefetch={false}
                    className={cn(
                        "flex items-center gap-3 p-4 hover:bg-white/5 transition-colors relative h-full w-full",
                        activeId === conv.user.id ? "bg-white/5 border-l-4 border-l-purple-500" : "border-l-4 border-l-transparent",
                        conv.unreadCount && conv.unreadCount > 0 ? "bg-white/[0.02]" : "bg-[#09090b]"
                    )}
                    draggable={false}
                >
                    <div className={`w-12 h-12 rounded-full flex-shrink-0 bg-gradient-to-br ${getAvatarColor(conv.user.username)} flex items-center justify-center text-lg font-bold text-white overflow-hidden border border-white/10 relative`}>
                        {conv.user.image ? (
                            <img src={conv.user.image} alt={conv.user.username} className="w-full h-full object-cover" />
                        ) : (
                            conv.user.username?.[0]?.toUpperCase()
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center mb-1">
                            <span className={cn(
                                "truncate",
                                conv.unreadCount && conv.unreadCount > 0 ? "font-bold text-white" : "font-semibold text-gray-200"
                            )}>
                                @{conv.user.username}
                            </span>
                            <span className="text-[10px] text-gray-500">
                                {formatDistanceToNow(new Date(conv.lastMessageDate), { addSuffix: true, locale: tr })}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <p className={cn(
                                "text-sm truncate pr-2",
                                conv.unreadCount && conv.unreadCount > 0 ? "text-white font-medium" : "text-gray-400"
                            )}>
                                {conv.lastMessage || <span className="text-gray-600 text-xs">Henüz mesaj yok</span>}
                            </p>
                            {/* Unread Badge */}
                            {conv.unreadCount && conv.unreadCount > 0 ? (
                                <span className="flex-shrink-0 flex h-5 w-5 items-center justify-center rounded-full bg-purple-600 text-xs font-bold text-white">
                                    {conv.unreadCount}
                                </span>
                            ) : null}
                        </div>
                    </div>
                </Link>
            </motion.div>
        </div>
    );
}

export default function ConversationList({ conversations: initialConversations }: ConversationListProps) {
    const params = useParams();
    const activeId = params?.userId as string;
    const [conversations, setConversations] = useState(initialConversations);

    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const updated = await getConversations();
                // Normalize items
                const formatted = updated.map((c: any) => ({
                    ...c,
                    lastMessageDate: typeof c.lastMessageDate === 'string' ? c.lastMessageDate : c.lastMessageDate.toISOString()
                }));
                setConversations(formatted);
            } catch (err) {
                console.error("Polling conversations failed", err);
            }
        }, 3000);
        return () => clearInterval(interval);
    }, []);

    // Sync state if props change (e.g. initial load vs client nav)
    useEffect(() => {
        setConversations(initialConversations);
    }, [initialConversations]);

    if (conversations.length === 0) {
        return (
            <div className="p-4 text-center text-gray-400 text-sm mt-10">
                Henüz hiç mesajlaşma yok.
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden">
            {/* Hint removed as requested */}
            {conversations.map((conv) => (
                <ConversationItem key={conv.user.id} conv={conv} activeId={activeId} />
            ))}
        </div>
    );
}
