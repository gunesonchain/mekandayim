'use client';

import { usePathname } from 'next/navigation';
import Footer from './Footer';

export default function ConditionalFooter() {
    const pathname = usePathname();
    const isHomepage = pathname === '/';

    // On mobile: Hidden unless homepage
    // On desktop: Always visible
    const visibilityClass = isHomepage ? '' : 'hidden md:block';

    return (
        <div className={visibilityClass}>
            <Footer />
        </div>
    );
}
