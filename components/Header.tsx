'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, User, MessageCircle, MapPin, Menu } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import clsx from 'clsx';
import { useState } from 'react';
import MobileMenu from './MobileMenu';
import SearchInput from './SearchInput';
import { useNotification } from './NotificationContext';

export default function Header() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { unreadCount } = useNotification();

    return (
        <>
            <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-xl">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between relative">

                    {/* Mobile Hamburger (Left) */}
                    <button
                        onClick={() => setIsMobileMenuOpen(true)}
                        className="md:hidden p-2 -ml-2 text-white hover:text-purple-400 transition-colors"
                    >
                        <Menu size={24} />
                    </button>

                    {/* Logo (Centered on Mobile, Left on Desktop) */}
                    <div className="absolute left-1/2 -translate-x-1/2 md:static md:translate-x-0">
                        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-white hover:text-purple-400 transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
                                <MapPin size={18} className="text-white" />
                            </div>
                            <span>Mekan<span className="text-purple-500">İtirafları</span> <span className="text-xs text-gray-500 ml-1">v2.0</span></span>
                        </Link>
                    </div>

                    {/* Desktop Nav & Search */}
                    <nav className="hidden md:flex items-center gap-6 ml-auto">

                        {/* Search Input (Right aligned next to nav) */}
                        {pathname !== '/' && (
                            <div className="w-64 mr-2">
                                <SearchInput variant="header" placeholder="Mekan ara..." />
                            </div>
                        )}

                        {session ? (
                            <Link href="/new-entry" className={clsx("text-sm font-medium transition-colors hover:text-white", pathname === '/new-entry' ? "text-white" : "text-gray-400")}>
                                Yeni İtiraf
                            </Link>
                        ) : null}

                        {session ? (
                            <>
                                <Link href="/dm" className={clsx("text-sm font-medium transition-colors hover:text-white flex items-center gap-2", pathname.startsWith('/dm') ? "text-white" : "text-gray-400")}>
                                    <div className="relative">
                                        <MessageCircle size={16} />
                                        {unreadCount > 0 && (
                                            <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-600 text-[9px] font-bold text-white ring-2 ring-black">
                                                {unreadCount > 9 ? '9+' : unreadCount}
                                            </span>
                                        )}
                                    </div>
                                    Mesajlar
                                </Link>
                                <Link href="/profile" className={clsx("text-sm font-medium transition-colors hover:text-white flex items-center gap-2", pathname === '/profile' ? "text-white" : "text-gray-400")}>
                                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-[10px] text-white">
                                        {session.user?.name?.[0]?.toUpperCase()}
                                    </div>
                                    Profilim
                                </Link>
                                <button
                                    onClick={() => signOut({ callbackUrl: '/' })}
                                    className="text-sm font-medium text-gray-400 hover:text-red-400 transition-colors"
                                >
                                    Çıkış Yap
                                </button>
                            </>
                        ) : (
                            <Link href="/api/auth/signin" className="text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-full transition-colors">
                                Giriş Yap
                            </Link>
                        )}
                    </nav>

                    {/* Mobile Placeholder for Right Side Balance (Hidden/Empty) */}
                    <div className="w-8 md:hidden"></div>
                </div>
            </header>

            <MobileMenu
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                session={session}
            />
        </>
    );
}
