'use client';

import { X, LogIn, MessageCircle, LogOut } from 'lucide-react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import SearchInput from './SearchInput';
import { getAvatarColor } from '@/lib/utils';
import { useNotification } from './NotificationContext';
import { getUserProfileImage } from '@/app/actions';
import { useState, useEffect } from 'react';

interface MobileMenuProps {
    isOpen: boolean;
    onClose: () => void;
    session: any;
}

export default function MobileMenu({ isOpen, onClose, session }: MobileMenuProps) {
    const { unreadMessageCount } = useNotification();
    const [profileImage, setProfileImage] = useState<string | null>(session?.user?.image || null);

    useEffect(() => {
        if (session?.user && !session.user.image) {
            // @ts-ignore
            const userId = session.user.id || session.user.sub;
            if (userId) {
                getUserProfileImage(userId).then(img => {
                    if (img) setProfileImage(img);
                });
            }
        } else if (session?.user?.image) {
            setProfileImage(session.user.image);
        }
    }, [session]);

    // Prevent body scroll when menu is open
    useEffect(() => {
        if (isOpen) {
            // Save current scroll position
            const scrollY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${scrollY}px`;
            document.body.style.width = '100%';
            document.body.style.overflow = 'hidden';
        } else {
            // Restore scroll position
            const scrollY = document.body.style.top;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
            if (scrollY) {
                window.scrollTo(0, parseInt(scrollY || '0') * -1);
            }
        }

        return () => {
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.width = '';
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm md:hidden"
                    />

                    {/* Side Menu */}
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 left-0 bottom-0 w-[280px] bg-black/95 border-r border-white/10 z-[70] p-6 flex flex-col md:hidden"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-white">Menü</h2>
                            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-2 flex-1">
                            {session ? (
                                <>
                                    {/* Mobile Search - Top */}
                                    <div className="-mt-2">
                                        <SearchInput variant="mobile" placeholder="Mekan ara..." />
                                    </div>

                                    <Link onClick={onClose} href="/profile" className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${getAvatarColor(session.user?.username || session.user?.name)} flex items-center justify-center text-sm font-bold text-white overflow-hidden`}>
                                            {profileImage ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={profileImage} alt={session.user.name || ''} className="w-full h-full object-cover" />
                                            ) : (
                                                session.user?.name?.[0]?.toUpperCase()
                                            )}
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-sm font-medium text-white">{session.user?.name}</span>
                                            <span className="text-xs text-purple-400">Profili Görüntüle</span>
                                        </div>
                                    </Link>

                                    <Link onClick={onClose} href="/dm" className="flex items-center justify-between px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                                        <div className="flex items-center gap-3">
                                            <MessageCircle size={20} />
                                            Mesajlar
                                        </div>
                                        {/* Badge */}
                                        {unreadMessageCount > 0 && (
                                            <div className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded shadow-sm min-w-[20px] text-center flex items-center justify-center">
                                                {unreadMessageCount}
                                            </div>
                                        )}
                                    </Link>

                                    <Link onClick={onClose} href="/new-entry" className="flex items-center gap-3 px-4 py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                                        <div className="w-5 h-5 flex items-center justify-center"><span className="text-lg">+</span></div>
                                        Yeni İtiraf
                                    </Link>


                                    <button
                                        onClick={() => {
                                            const callbackUrl = `${window.location.origin}/`;
                                            signOut({ callbackUrl, redirect: true });
                                            onClose();
                                        }}
                                        className="flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors text-left"
                                    >
                                        <LogOut size={20} />
                                        Çıkış Yap
                                    </button>

                                    {/* @ts-ignore */}
                                    {session.user?.role === 'MODERATOR' && (
                                        <div className="pt-3 border-t border-white/10">
                                            <Link onClick={onClose} href="/reports" className="flex items-center gap-3 px-4 py-3 text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10 rounded-lg transition-colors">
                                                <div className="w-5 h-5 flex items-center justify-center font-bold">!</div>
                                                Şikayet Yönetimi
                                            </Link>
                                            <Link onClick={onClose} href="/bans" className="flex items-center gap-3 px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors">
                                                <div className="w-5 h-5 flex items-center justify-center">🚫</div>
                                                Engel Yönetimi
                                            </Link>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <div className="flex flex-col gap-2">
                                        <Link onClick={onClose} href="/api/auth/signin" className="flex items-center justify-center gap-2 px-4 py-3 text-white bg-purple-600 hover:bg-purple-700 rounded-xl transition-colors font-medium">
                                            <LogIn size={18} />
                                            Giriş Yap
                                        </Link>
                                        <Link onClick={onClose} href="/auth/register" className="flex items-center justify-center gap-2 px-4 py-3 text-purple-400 border border-purple-500/50 hover:bg-purple-500/10 rounded-xl transition-colors font-medium">
                                            Üye Ol
                                        </Link>
                                    </div>

                                    {/* Mobile Search - Below Login */}
                                    <div className="mt-2 text-white">
                                        <SearchInput variant="mobile" placeholder="Mekan ara..." />
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Footer Links in Menu */}
                        <div className="mt-auto pt-6 border-t border-white/10">
                            <div className="flex flex-col gap-3">
                                <Link onClick={onClose} href="#" className="text-sm text-gray-500 hover:text-gray-300">Hakkımızda</Link>
                                <Link onClick={onClose} href="#" className="text-sm text-gray-500 hover:text-gray-300">Kurallar</Link>
                                <Link onClick={onClose} href="#" className="text-sm text-gray-500 hover:text-gray-300">İletişim</Link>
                                <p className="text-xs text-gray-600 mt-2">&copy; 2025 Mekan İtirafları</p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
