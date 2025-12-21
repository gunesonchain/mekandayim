'use client';

import { useEffect, useRef } from 'react';
import EntryCard from './EntryCard';

interface HighlightWrapperProps {
    entries: any[];
    currentUserId?: string;
}

export default function HighlightWrapper({ entries, currentUserId }: HighlightWrapperProps) {
    const hasScrolled = useRef(false);

    useEffect(() => {
        // Only run on client side
        if (typeof window === 'undefined' || hasScrolled.current) return;

        const hash = window.location.hash.slice(1); // Remove #
        if (!hash) return;

        // Small delay to ensure DOM is ready
        setTimeout(() => {
            const element = document.getElementById(hash);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                hasScrolled.current = true;
            }
        }, 300);
    }, []);

    const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';

    return (
        <>
            {entries.map((entry) => (
                <EntryCard
                    key={entry.id}
                    entry={entry}
                    currentUserId={currentUserId}
                    isHighlighted={entry.id === hash}
                />
            ))}
        </>
    );
}
