'use client';

import { Entry, User, Like, Location } from '@prisma/client';
import { MessageCircle, Trash2, Share2, Flag } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { getAvatarColor } from '@/lib/utils';
import LikeButton from './LikeButton';
import { deleteEntry } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useConfirmation } from './ConfirmationContext';

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

    const date = new Date(entry.createdAt);
    const likeCount = entry.likes?.length || 0;
    const isLiked = currentUserId && entry.likes ? entry.likes.some(like => like.userId === currentUserId) : false;
    const isOwner = currentUserId === entry.userId;

    let dateDisplay;
    if (isToday(date) || isYesterday(date)) {
        dateDisplay = formatDistanceToNow(date, { addSuffix: true, locale: tr });
        if (dateDisplay === 'bir dakikadan az önce') {
            dateDisplay = 'az önce';
        }
    } else {
        dateDisplay = format(date, 'd MMMM yyyy HH:mm', { locale: tr });
    }

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

    const handleReport = () => {
        alert('Şikayet özelliği yakında eklenecek.');
    };

    if (isDeleting) return null;

    return (
        <div
            id={entry.id}
            className={`bg-white/5 border border-white/10 rounded-xl p-4 mb-4 transition-all hover:bg-white/10 group relative ${isHighlighted ? 'animate-highlight' : ''
                }`}
        >
            {/* Header: User info, timestamp, and actions */}
            <div className="flex justify-between items-center mb-2.5">
                {/* Left: Avatar + Username + Timestamp */}
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
                        <span className="text-[11px] text-gray-500 flex-shrink-0 leading-none">
                            {dateDisplay}
                        </span>
                    </div>
                </div>

                {/* Right: Delete (owner) + Share + Report (non-owner) buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Delete button - only for owner */}
                    {isOwner && (
                        <button
                            onClick={handleDelete}
                            className="p-2 text-gray-500 hover:text-red-500 hover:bg-white/10 rounded-full transition-colors"
                            title="İtirafı Sil"
                        >
                            <Trash2 size={16} />
                        </button>
                    )}

                    {/* Report button - only for non-owners */}
                    {!isOwner && (
                        <button
                            onClick={handleReport}
                            className="p-2 text-gray-500 hover:text-yellow-500 hover:bg-white/10 rounded-full transition-colors"
                            title="Şikayet Et"
                        >
                            <Flag size={16} />
                        </button>
                    )}

                    {/* Share button - always visible */}
                    <div className="relative">
                        <button
                            onClick={handleShare}
                            className="p-2 text-gray-500 hover:text-purple-400 hover:bg-white/10 rounded-full transition-colors"
                            title="Paylaş"
                        >
                            <Share2 size={16} />
                        </button>
                        {showCopied && (
                            <div className="absolute -top-8 right-0 bg-purple-600 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap">
                                Link kopyalandı!
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap break-words mb-2.5">
                {entry.content}
            </p>

            <div className="flex items-center gap-4 border-t border-white/5 pt-2.5">
                <LikeButton
                    entryId={entry.id}
                    initialLikeCount={likeCount}
                    initialIsLiked={isLiked}
                    isGuest={!currentUserId}
                />

                <Link
                    href={`/dm/${entry.userId}`}
                    className="text-gray-400 hover:text-white flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-all hover:bg-white/5"
                >
                    <MessageCircle size={14} />
                    <span className="font-medium">Mesaj Gönder</span>
                </Link>
            </div>
        </div>
    );
}
