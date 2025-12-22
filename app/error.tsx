'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
            <div className="bg-red-500/10 p-4 rounded-full mb-6 ring-1 ring-red-500/20">
                <AlertTriangle className="w-12 h-12 text-red-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Bir şeyler ters gitti!</h2>
            <p className="text-gray-400 mb-8 max-w-md">
                Beklenmedik bir hata oluştu. Lütfen sayfayı yenilemeyi veya daha sonra tekrar denemeyi unutmayın.
            </p>
            <div className="flex gap-4">
                <button
                    onClick={reset}
                    className="px-6 py-2.5 bg-white text-black font-medium rounded-xl hover:bg-gray-200 transition-colors"
                >
                    Tekrar Dene
                </button>
                <Link
                    href="/"
                    className="px-6 py-2.5 bg-white/5 text-white font-medium rounded-xl hover:bg-white/10 transition-colors"
                >
                    Ana Sayfaya Dön
                </Link>
            </div>
        </div>
    );
}
