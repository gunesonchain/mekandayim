import Link from 'next/link';
import { FileQuestion } from 'lucide-react';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
            <div className="bg-purple-500/10 p-4 rounded-full mb-6 ring-1 ring-purple-500/20">
                <FileQuestion className="w-12 h-12 text-purple-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Sayfa Bulunamadı</h2>
            <p className="text-gray-400 mb-8 max-w-md">
                Aradığınız sayfa mevcut değil veya taşınmış olabilir.
            </p>
            <Link
                href="/"
                className="px-6 py-2.5 bg-white text-black font-medium rounded-xl hover:bg-gray-200 transition-colors"
            >
                Ana Sayfaya Dön
            </Link>
        </div>
    );
}
