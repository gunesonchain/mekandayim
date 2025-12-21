'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';

interface ProfileTabsProps {
    username: string;
}

export default function ProfileTabs({ username }: ProfileTabsProps) {
    const searchParams = useSearchParams();
    const view = searchParams.get('view') || 'entries';

    const tabs = [
        { id: 'entries', label: 'İtiraflarım' },
        { id: 'settings', label: 'Profil Ayarları' }
    ];

    return (
        <div className="flex border-b border-white/10 mb-6">
            {tabs.map((tab) => {
                const isActive = view === tab.id;

                return (
                    <Link
                        key={tab.id}
                        href={`/user/${username}?view=${tab.id}`}
                        scroll={false}
                        className={`relative flex-1 py-3 text-center text-sm font-medium transition-colors ${isActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        {tab.label}
                        {isActive && (
                            <motion.div
                                layoutId="profileTabIndicator"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500"
                                initial={false}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                            />
                        )}
                    </Link>
                );
            })}
        </div>
    );
}
