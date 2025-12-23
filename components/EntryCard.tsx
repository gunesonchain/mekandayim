'use client';

import { Entry, User, Like, Location } from '@prisma/client';
import { MessageCircle, Trash2, Share, Flag } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { getAvatarColor } from '@/lib/utils';
import LikeButton from './LikeButton';
import { deleteEntry } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useConfirmation } from './ConfirmationContext';
import { useReport } from './ReportContext';
import { useToast } from './ToastContext'; // Import Hook

interface EntryWithRelations extends Entry {
    user: User;
    likes: Like[];
    location?: Location;
}

interface EntryCardProps {
    entry: EntryWithRelations;
    currentUserId?: string;
    locationSlug?: string;
    isHighlighted?: boolean;
    entryIndex?: number; // Position in the full list
}

export default function EntryCard({ entry, currentUserId, isHighlighted = false, entryIndex }: EntryCardProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showCopied, setShowCopied] = useState(false);
    const router = useRouter();
    const { confirm } = useConfirmation();
    const { report } = useReport();
    const { showToast } = useToast();

    const date = new Date(entry.createdAt);
    const likeCount = entry.likes?.length || 0;
    const isLiked = currentUserId && entry.likes ? entry.likes.some(like => like.userId === currentUserId) : false;
    const isOwner = currentUserId === entry.userId;

    // Use state for dynamic date display to avoid hydration mismatch
    const [dateDisplay, setDateDisplay] = useState(() => {
        // Server-side: always use static format
        return format(date, 'd MMM HH:mm', { locale: tr });
    });

    useEffect(() => {
        // Client-side: update to relative time
        let display;
        if (isToday(date) || isYesterday(date)) {
            display = formatDistanceToNow(date, { addSuffix: true, locale: tr });
            if (display === 'bir dakikadan az önce') {
                display = 'az önce';
            }
        } else {
            display = format(date, 'd MMMM yyyy HH:mm', { locale: tr });
        }
        setDateDisplay(display);
    }, []);

    const handleDelete = async () => {
        const isConfirmed = await confirm({
            title: 'İtirafı Sil',
            description: 'Bu itirafı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
            confirmText: 'Sil',
            cancelText: 'Vazgeç',
            isDestructive: true
        });

        if (!isConfirmed) return;

        setIsDeleting(true);
        const response = await deleteEntry(entry.id, (entry.location as any)?.slug || 'unknown');

        if (response?.error) {
            alert(response.error);
            setIsDeleting(false);
        } else {
            router.refresh();
        }
    };

    const handleShare = async () => {
        // Get current page path
        const currentPath = window.location.pathname;

        // Calculate page number if entryIndex is provided
        let shareUrl = `${window.location.origin}${currentPath}`;
        if (typeof entryIndex === 'number') {
            const pageNum = Math.floor(entryIndex / 10) + 1;
            if (pageNum > 1) {
                shareUrl += `?page=${pageNum}`;
            }
        }
        shareUrl += `#${entry.id}`;

        try {
            await navigator.clipboard.writeText(shareUrl);
            setShowCopied(true);
            setTimeout(() => setShowCopied(false), 2000);
        } catch (err) {
            console.error('Copy failed:', err);
            alert('Link kopyalanamadı.');
        }
    };



    if (isDeleting) return null;

    return (
        <div
            id={entry.id}
            className={`bg-white/5 border border-white/10 rounded-xl p-4 mb-4 transition-all hover:bg-white/10 group relative ${isHighlighted ? 'animate-highlight' : ''
                }`}
        >
            {/* Header: User info & Timestamp only */}
            <div className="flex justify-between items-center mb-2.5">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Link href={`/user/${entry.user.username}`}>
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(entry.user.username)} flex items-center justify-center text-xs font-bold text-white overflow-hidden border border-white/10 flex-shrink-0`}>
                            {(entry.user as any).image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={(entry.user as any).image} alt={entry.user.username} className="w-full h-full object-cover" />
                            ) : (
                                entry.user.username?.[0]?.toUpperCase()
                            )}
                        </div>
                    </Link>
                    <div className="flex items-baseline gap-2 min-w-0 flex-wrap">
                        <Link href={`/user/${entry.user.username}`} className="font-medium text-purple-400 text-sm hover:underline hover:text-purple-300 transition-colors flex-shrink-0">
                            @{entry.user.username}
                        </Link>
                        {/* @ts-ignore */}
                        {entry.user.role === 'MODERATOR' && (
                            <span title="Moderatör" className="inline-flex items-center justify-center bg-purple-500/20 text-purple-300 text-[8px] px-1 py-px rounded border border-purple-500/30 cursor-default select-none">
                                MOD
                            </span>
                        )}
                        <span className="text-[11px] text-gray-500 flex-shrink-0 leading-none ml-1">
                            {dateDisplay}
                        </span>
                    </div>
                </div>
            </div>

            {/* Content */}
            <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap break-words mb-3">
                {entry.content}
            </p>

            {/* Footer: Actions */}
            <div className="flex items-center justify-between border-t border-white/5 pt-3">

                {/* Left Side: Like, Message */}
                <div className="flex items-center gap-2">
                    <LikeButton
                        entryId={entry.id}
                        initialLikeCount={likeCount}
                        initialIsLiked={isLiked}
                        isGuest={!currentUserId}
                    />

                    <Link
                        href={`/dm/${entry.userId}`}
                        className={`flex items-center gap-1.5 transition-colors text-xs font-medium px-2 py-1.5 rounded-md hover:bg-white/5 ${!currentUserId || isOwner ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-purple-400'
                            }`}
                        onClick={(e) => {
                            if (!currentUserId || isOwner) {
                                e.preventDefault();
                            }
                        }}
                        title={!currentUserId ? 'Mesaj atmak için giriş yapmalısın' : isOwner ? 'Kendine mesaj atamazsın' : 'Mesaj Gönder'}
                    >
                        <MessageCircle size={16} />
                        <span className="font-medium">Mesaj Gönder</span>
                    </Link>
                </div>

                {/* Right Side: Report, Delete, Share */}
                <div className="flex items-center gap-1.5">
                    {/* Report button - Glowing Yellow */}
                    {!isOwner && (
                        <button
                            onClick={async () => {
                                const reason = await report({
                                    title: 'İtirafı Şikayet Et',
                                    description: 'Bu itirafı neden şikayet ediyorsunuz? Lütfen kısaca açıklayın.'
                                });

                                if (reason) {
                                    const { reportEntry } = await import('@/actions/moderation');
                                    // @ts-ignore
                                    const res = await reportEntry(entry.id, reason);
                                    if (res?.error) {
                                        showToast(res.error, 'error');
                                    } else {
                                        showToast('Şikayetiniz iletildi.', 'success');
                                    }
                                }
                            }}
                            className="p-1.5 text-gray-500 hover:text-yellow-500 hover:bg-yellow-500/10 rounded-lg transition-colors"
                            title="Şikayet Et"
                        >
                            <Flag size={16} />
                        </button>
                    )}

                    {/* Delete button - Glowing Red */}
                    {isOwner && (
                        <button
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
                            title="İtirafı Sil"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}

                    {/* Share button - iOS Style (Icon Only) */}
                    <div className="relative">
                        <button
                            onClick={handleShare}
                            className="p-1.5 text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors"
                            title="Paylaş"
                        >
                            <Share size={16} />
                        </button>
                        {showCopied && (
                            <div className="absolute -top-8 right-0 bg-white text-black text-[10px] px-2 py-1 rounded font-bold shadow-lg whitespace-nowrap animate-in fade-in zoom-in duration-200 z-20">
                                Kopyalandı
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
