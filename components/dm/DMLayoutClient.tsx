'use client';

import { useEffect } from 'react';

export default function DMLayoutClient({ children }: { children: React.ReactNode }) {
    // Lock body scroll on mobile when DM is open
    useEffect(() => {
        // Only on mobile
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        if (!isMobile) return;

        // Save current scroll position
        const scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.width = '100%';
        document.body.style.overflow = 'hidden';

        return () => {
            // Restore scroll position
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY || '0') * -1);
            }
        };
    }, []);

    return <>{children}</>;
}
