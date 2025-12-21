'use client';

import { useEffect, useRef, useState } from 'react';
import EntryCard from './EntryCard';

interface HighlightWrapperProps {
    entries: any[];
    currentUserId?: string;
    currentPage?: number;
}

export default function HighlightWrapper({ entries, currentUserId, currentPage = 1 }: HighlightWrapperProps) {
    const [highlightedId, setHighlightedId] = useState<string | null>(null);
    const hasScrolled = useRef(false);

    useEffect(() => {
        // Get hash from URL
        const hash = window.location.hash.slice(1); // Remove #
        if (!hash) return;

        setHighlightedId(hash);

        // Scroll to element after a delay to ensure DOM is ready
        if (!hasScrolled.current) {
            const scrollTimeout = setTimeout(() => {
                const element = document.getElementById(hash);
                if (element) {
                    element.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center',
                        inline: 'nearest'
                    });
                    hasScrolled.current = true;
                }
            }, 500);

            return () => clearTimeout(scrollTimeout);
        }
    }, []);

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
