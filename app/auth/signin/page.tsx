'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin } from 'lucide-react';

export default function SignInPage() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const res = await signIn('credentials', {
            username,
            password,
            redirect: false,
        });

        if (res?.error) {
            setError('Giriş başarısız. Bilgilerinizi kontrol edin.');
        } else {
            router.push('/');
            router.refresh();
        }
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center p-4">
            <div className="mb-8 text-center">
                <Link href="/" className="flex items-center gap-2 font-bold text-2xl text-white justify-center mb-4">
                    <div className="w-10 h-10 rounded-xl bg-purple-600 flex items-center justify-center">
                        <MapPin size={24} className="text-white" />
                    </div>
                    <span>Mekan<span className="text-purple-500">İtirafları</span></span>
                </Link>
                <h2 className="text-xl text-gray-400">Tekrar hoşgeldiniz!</h2>
            </div>

            <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
                <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Kullanıcı Adı</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none transition-colors"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Şifre</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none transition-colors"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="mt-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-colors"
                    >
                        Giriş Yap
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-500">
                    Hesabın yok mu?{' '}
                    <Link href="/auth/register" className="text-purple-400 hover:text-purple-300 font-medium">
                        Kayıt Ol
                    </Link>
                </div>
            </div>
        </div>
    );
}
