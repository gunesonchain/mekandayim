'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { MapPin, MessageCircle, User } from 'lucide-react';
import clsx from 'clsx';

export default function Navbar() {
    const pathname = usePathname();

    const navItems = [
        { name: 'Mekanlar', href: '/', icon: MapPin },
        { name: 'DM', href: '/dm', icon: MessageCircle },
        { name: 'Profil', href: '/profile', icon: User },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pb-4 pt-2 px-4 md:top-0 md:bottom-auto md:pt-4 md:pb-4 pointer-events-none">
            <div className="pointer-events-auto bg-black/60 backdrop-blur-xl border border-white/10 rounded-full px-6 py-3 shadow-2xl shadow-purple-900/20 flex items-center gap-8">
                {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link key={item.href} href={item.href} className="relative group">
                            {isActive && (
                                <motion.div
                                    layoutId="navContext"
                                    className="absolute inset-0 -m-2 bg-white/10 rounded-full"
                                    initial={false}
                                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                />
                            )}
                            <div className={clsx(
                                "relative flex flex-col items-center gap-1 transition-colors duration-200",
                                isActive ? "text-purple-400" : "text-gray-400 group-hover:text-white"
                            )}>
                                <item.icon size={24} />
                                <span className="text-[10px] font-medium tracking-wide uppercase">{item.name}</span>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
