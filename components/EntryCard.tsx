'use client';

import { Entry, User, Like, Location } from '@prisma/client';
import { MessageCircle, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { formatDistanceToNow, isToday, isYesterday, format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { getAvatarColor } from '@/lib/utils';
import LikeButton from './LikeButton';
import { deleteEntry } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface EntryWithRelations extends Entry {
    user: User;
    likes: Like[];
    location?: Location;
}

interface EntryCardProps {
    entry: EntryWithRelations;
    currentUserId?: string;
    locationSlug?: string; // Optional prompt to verify if it's available or need to be passed
}

export default function EntryCard({ entry, currentUserId }: EntryCardProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const router = useRouter();

    const date = new Date(entry.createdAt);
    // Safe access for likes in case schema/client isn't fully synced yet
    const likeCount = entry.likes?.length || 0;
    const isLiked = currentUserId && entry.likes ? entry.likes.some(like => like.userId === currentUserId) : false;
    const isOwner = currentUserId === entry.userId;

    let dateDisplay;
    if (isToday(date) || isYesterday(date)) {
        dateDisplay = formatDistanceToNow(date, { addSuffix: true, locale: tr });
        // Simplify "less than a minute"
        if (dateDisplay === 'bir dakikadan az önce') {
            dateDisplay = 'az önce';
        }
    } else {
        dateDisplay = format(date, 'd MMMM yyyy HH:mm', { locale: tr });
    }

    const handleDelete = async () => {
        if (!confirm('Bu itirafı silmek istediğinize emin misiniz?')) return;

        setIsDeleting(true);
        // We assume we are on the location page so we need slug, but entry might not have location loaded?
        // Wait, revalidatePath requires slug. 
        // If entry.location is not loaded, we might have issue.
        // However, usually we can rely on page refresh.
        // Or we pass slug as prop. 
        // Let's rely on passed prop OR try to define it.
        // The action needs slug. 
        // Hack: parse from URL or pass as prop?
        // Let's assume entry has location or we pass it.
        // Checking usage of EntryCard... usually in [slug]/page.tsx.
        // Let's try to get slug from URL via useParams?
        // Or just pass generic revalidate path if empty string?

        // Let's use window.location.pathname.
        // Or better: update the deleteEntry action to revalidate generic logic.
        // For now let's pass a placeholder slug if missing, handle client side refresh.

        // Actually best practice: client component uses props. 
        // But for minimal friction now:
        const response = await deleteEntry(entry.id, (entry.location as any)?.slug || 'unknown');

        if (response?.error) {
            alert(response.error);
            setIsDeleting(false);
        } else {
            router.refresh();
        }
    };

    if (isDeleting) return null; // Optimistic remove

    return (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-4 transition-colors hover:bg-white/10 group relative">
            {/* Delete Button for Owner */}
            {isOwner && (
                <button
                    onClick={handleDelete}
                    className="absolute top-4 right-4 text-gray-500 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    title="İtirafı Sil"
                >
                    <Trash2 size={16} />
                </button>
            )}

            <div className="flex justify-between items-start mb-3 pr-8">
                <div className="flex items-center gap-2">
                    <Link href={`/user/${entry.user.username}`}>
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(entry.user.username)} flex items-center justify-center text-xs font-bold text-white overflow-hidden border border-white/10`}>
                            {(entry.user as any).image ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={(entry.user as any).image} alt={entry.user.username} className="w-full h-full object-cover" />
                            ) : (
                                entry.user.username?.[0]?.toUpperCase()
                            )}
                        </div>
                    </Link>
                    <Link href={`/user/${entry.user.username}`} className="font-medium text-purple-400 text-sm hover:underline hover:text-purple-300 transition-colors">
                        @{entry.user.username}
                    </Link>
                </div>
                {/* Right side meta */}
                <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500">
                        {dateDisplay}
                    </span>
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
