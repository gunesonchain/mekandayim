'use client';

import { useEffect, useRef, useState } from 'react';
import EntryCard from './EntryCard';
import { useSearchParams } from 'next/navigation';

interface HighlightWrapperProps {
    entries: any[];
    currentUserId?: string;
    currentPage?: number;
}

export default function HighlightWrapper({ entries, currentUserId, currentPage = 1 }: HighlightWrapperProps) {
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    const hasScrolled = useRef(false);
    const searchParams = useSearchParams();

    useEffect(() => {
        // Reset scroll flag on entries or page change
        hasScrolled.current = false;

        const checkHash = () => {
            // Get hash from URL
            const hash = window.location.hash.slice(1); // Remove #
            if (!hash) {
                setHighlightedId(null);
                return;
            }

            setHighlightedId(hash);

            // Retry scrolling to element (up to 20 times * 100ms = 2s)
            let attempts = 0;
            const maxAttempts = 20;

            const attemptScroll = () => {
                const element = document.getElementById(hash);
                if (element) {
                    element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                        inline: 'nearest'
                    });
                } else if (attempts < maxAttempts) {
                    attempts++;
                    setTimeout(attemptScroll, 100);
                }
            };

            attemptScroll();
        };

        checkHash();

        // Listen for hash change events (for same-page navigation)
        window.addEventListener('hashchange', checkHash);
        return () => window.removeEventListener('hashchange', checkHash);
    }, [entries, searchParams]); // Re-run when entries or page params change

    return (
        <>
            {entries.map((entry, idx) => (
                <EntryCard
                    key={entry.id}
                    entry={entry}
                    currentUserId={currentUserId}
                    isHighlighted={entry.id === highlightedId}
                    entryIndex={(currentPage - 1) * 10 + idx}
                />
            ))}
        </>
    );
}
