'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
// import { toggleLike } from '@/app/actions/like'; // Need to adjust path if necessary

// Manually defining pending until we can import valid server action if causing issues
import { toggleLike } from '@/app/actions/like';

interface LikeButtonProps {
    entryId: string;
    initialLikeCount: number;
    initialIsLiked: boolean;
    isGuest?: boolean;
}

export default function LikeButton({ entryId, initialLikeCount, initialIsLiked, isGuest = false }: LikeButtonProps) {
    const [likeCount, setLikeCount] = useState(initialLikeCount);
    const [isLiked, setIsLiked] = useState(initialIsLiked);
    const [isLoading, setIsLoading] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    const handleToggle = async () => {
        if (isGuest) return; // Explicitly prevent action

        if (isLoading) return;
        setIsLoading(true);

        // Trigger animation
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 300);

        // ... rest of the code is unchanged ...
        // Optimistic update
        const previousIsLiked = isLiked;
        const previousCount = likeCount;

        const newIsLiked = !isLiked;
        const newCount = newIsLiked ? likeCount + 1 : likeCount - 1;

        setIsLiked(newIsLiked);
        setLikeCount(newCount);

        try {
            const result = await toggleLike(entryId);
            if ('error' in result) {
                // Revert
                setIsLiked(previousIsLiked);
                setLikeCount(previousCount);
            }
        } catch (error) {
            // Revert
            setIsLiked(previousIsLiked);
            setLikeCount(previousCount);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <button
            onClick={handleToggle}
            disabled={isGuest}
            className={`flex items-center gap-1.5 text-xs transition-all ${isLiked ? 'text-pink-500' : 'text-gray-500 hover:text-pink-400'
                } ${isGuest ? 'opacity-50 cursor-default hover:text-gray-500' : ''}`}
        >
            <Heart
                size={16}
                className={`transition-all duration-300 ${isLiked ? 'fill-pink-500' : ''} ${isAnimating ? 'scale-125' : 'scale-100'
                    }`}
            />
            <span className="font-medium transition-all duration-200 min-w-[12px]">{likeCount}</span>
        </button>
    );
}
