'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search, User, MessageCircle, MapPin, Menu, Plus, LogOut } from 'lucide-react';
import { useSession, signOut } from 'next-auth/react';
import clsx from 'clsx';
import { useState } from 'react';
import MobileMenu from './MobileMenu';
import SearchInput from './SearchInput';
import { useNotification } from './NotificationContext';
import NotificationBell from './NotificationBell';

export default function Header() {
    const pathname = usePathname();
    const { data: session } = useSession();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { unreadMessageCount } = useNotification();

    return (
        <>
            <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-black/80 backdrop-blur-xl">
                <div className="container mx-auto px-4 max-w-6xl h-16 flex items-center justify-between relative">

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
                            <span>Mekan<span className="text-purple-500">İtirafları</span></span>
                        </Link>
                    </div>

                    {/* Centered Search (Desktop) - Only if not homepage */}
                    {pathname !== '/' && (
                        <div className="absolute left-1/2 -translate-x-1/2 hidden md:block w-64">
                            <SearchInput variant="header" placeholder="Mekan ara..." />
                        </div>
                    )}

                    {/* Mobile Notification Bell (Right - symmetric to hamburger) */}
                    <div className="absolute right-2 md:hidden">
                        {session && <NotificationBell />}
                    </div>

                    {/* Desktop Nav */}
                    <nav className="hidden md:flex items-center gap-4 ml-auto">

                        {session ? (
                            <>
                                <Link href="/new-entry" title="Yeni İtiraf" className={clsx("p-2 rounded-full transition-colors hover:bg-white/10 hover:text-white", pathname === '/new-entry' ? "text-white bg-white/10" : "text-gray-400")}>
                                    <Plus size={20} />
                                </Link>

                                <Link href="/dm" title="Mesajlar" className={clsx("p-2 rounded-full transition-colors hover:bg-white/10 hover:text-white relative", pathname.startsWith('/dm') ? "text-white bg-white/10" : "text-gray-400")}>
                                    <MessageCircle size={20} />
                                    {unreadMessageCount > 0 && (
                                        <span className="absolute top-1 right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-red-600 ring-2 ring-black">
                                        </span>
                                    )}
                                </Link>

                                <NotificationBell />

                                {/* @ts-ignore */}
                                {session.user?.role === 'MODERATOR' && (
                                    <>
                                        <Link href="/reports" className={clsx("text-sm font-medium transition-colors hover:text-yellow-400", pathname === '/reports' ? "text-yellow-400" : "text-gray-400")}>
                                            Şikayetler
                                        </Link>
                                        <Link href="/bans" className={clsx("text-sm font-medium transition-colors hover:text-red-400", pathname === '/bans' ? "text-red-400" : "text-gray-400")}>
                                            Engeller
                                        </Link>
                                    </>
                                )}
                                <button
                                    onClick={() => {
                                        const callbackUrl = `${window.location.origin}/`;
                                        signOut({ callbackUrl, redirect: true });
                                    }}
                                    title="Çıkış Yap"
                                    className="p-2 text-gray-400 hover:text-red-400 hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <LogOut size={20} />
                                </button>

                                <Link href="/profile" title="Profilim" className="transition-opacity hover:opacity-80">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-xs text-white ring-2 ring-transparent hover:ring-white/20 transition-all">
                                        {session.user?.name?.[0]?.toUpperCase()}
                                    </div>
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link href="/api/auth/signin" className="text-sm font-medium text-gray-400 hover:text-white transition-colors">
                                    Giriş Yap
                                </Link>
                                <Link href="/auth/register" className="text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 px-4 py-2 rounded-full transition-colors">
                                    Kayıt Ol
                                </Link>
                            </>
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
