'use client';

import { Entry, User, Like, Location } from '@prisma/client';
import { MessageCircle, Trash2, MoreVertical, Flag } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { getAvatarColor } from '@/lib/utils';
import LikeButton from './LikeButton';
import { deleteEntry } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
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
}

export default function EntryCard({ entry, currentUserId }: EntryCardProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
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

    // Close menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setShowMenu(false);
            }
        };

        if (showMenu) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showMenu]);

    const handleDelete = async () => {
        setShowMenu(false);
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

    const handleReport = () => {
        setShowMenu(false);
        alert('Şikayet özelliği yakında eklenecek.');
    };

    if (isDeleting) return null;

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4 transition-colors hover:bg-white/10 group relative">
            {/* Header: User info, timestamp, and menu aligned on same row */}
            <div className="flex justify-between items-center mb-3">
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
                    <div className="flex items-center gap-2 min-w-0 flex-wrap">
                        <Link href={`/user/${entry.user.username}`} className="font-medium text-purple-400 text-sm hover:underline hover:text-purple-300 transition-colors flex-shrink-0">
                            @{entry.user.username}
                        </Link>
                        <span className="text-xs text-gray-500 flex-shrink-0">
                            {dateDisplay}
                        </span>
                    </div>
                </div>

                {/* Right: 3-dot menu */}
                <div className="relative flex-shrink-0" ref={menuRef}>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu(!showMenu);
                        }}
                        className="p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                        title="Seçenekler"
                    >
                        <MoreVertical size={16} />
                    </button>

                    {showMenu && (
                        <div className="absolute right-0 top-full mt-2 w-48 bg-gray-900 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50">
                            {isOwner && (
                                <button
                                    onClick={handleDelete}
                                    className="flex items-center gap-2 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors w-full text-left"
                                >
                                    <Trash2 size={16} />
                                    İtirafı Sil
                                </button>
                            )}
                            <button
                                onClick={handleReport}
                                className={`flex items-center gap-2 px-4 py-3 text-sm text-gray-300 hover:bg-white/10 hover:text-white transition-colors w-full text-left ${isOwner ? 'border-t border-white/5' : ''}`}
                            >
                                <Flag size={16} />
                                Şikayet Et
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <p className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap break-words mb-3">
                {entry.content}
            </p>

            <div className="flex items-center gap-4 border-t border-white/5 pt-3">
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
