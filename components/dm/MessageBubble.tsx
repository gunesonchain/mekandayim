'use client';

import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Check, CheckCheck } from "lucide-react";

interface MessageBubbleProps {
    id: string;
    content: string;
    image?: string | null;
    isOwn: boolean;
    isRead?: boolean;
    createdAt: Date | string;
}

export default function MessageBubble({ id, content, image, isOwn, isRead, createdAt }: MessageBubbleProps) {
    return (
        <div className={cn(
            "flex w-full mb-1 group",
            isOwn ? "justify-end" : "justify-start"
        )}>
            <div className={cn(
                "max-w-[75%] px-3 py-1.5 rounded-2xl break-words text-sm relative",
                isOwn
                    ? "bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-br-none"
                    : "bg-white/10 text-white rounded-bl-none border border-white/5"
            )}>
                {image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="Gönderilen fotoğraf" className="rounded-lg mb-2 max-h-60 object-cover w-full" />
                )}

                {content && <p>{content}</p>}

                <div className={cn(
                    "text-[10px] flex items-center justify-end gap-1 mt-1",
                    isOwn ? "text-purple-200" : "text-gray-400"
                )}>
                    <span>{format(new Date(createdAt), 'HH:mm', { locale: tr })}</span>
                    {isOwn && (
                        <span>
                            {isRead ? <CheckCheck size={14} /> : <Check size={14} />}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
