'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin } from 'lucide-react';
import { registerUser } from '@/app/actions';

export default function RegisterPage() {
    const router = useRouter();
    const [error, setError] = useState('');

    const handleSubmit = async (formData: FormData) => {
        const res = await registerUser(formData);
        if (res?.error) {
            setError(res.error);
        } else {
            router.push('/auth/signin');
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
                <h2 className="text-xl text-gray-400">Aramıza katıl!</h2>
            </div>

            <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl">
                <form action={handleSubmit} className="flex flex-col gap-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3 rounded-lg">
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Kullanıcı Adı</label>
                        <input
                            name="username"
                            type="text"
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none transition-colors"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">E-posta</label>
                        <input
                            name="email"
                            type="email"
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none transition-colors"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-gray-400 mb-1">Şifre</label>
                        <input
                            name="password"
                            type="password"
                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-purple-500 focus:outline-none transition-colors"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="mt-2 bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-colors"
                    >
                        Kayıt Ol
                    </button>
                </form>

                <div className="mt-6 text-center text-sm text-gray-500">
                    Zaten hesabın var mı?{' '}
                    <Link href="/auth/signin" className="text-purple-400 hover:text-purple-300 font-medium">
                        Giriş Yap
                    </Link>
                </div>
            </div>
        </div>
    );
}
