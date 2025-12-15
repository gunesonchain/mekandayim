import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
    currentPage: number;
    totalPages: number;
    baseUrl: string;
    searchParams?: { [key: string]: string | string[] | undefined };
}

export default function PaginationControls({ currentPage, totalPages, baseUrl, searchParams }: PaginationControlsProps) {
    if (totalPages <= 1) return null;

    // Helper to generate URL with existing search params
    const getPageUrl = (page: number) => {
        const params = new URLSearchParams();
        if (searchParams) {
            Object.entries(searchParams).forEach(([key, value]) => {
                if (key !== 'page' && typeof value === 'string') {
                    params.set(key, value);
                }
            });
        }
        params.set('page', page.toString());
        return `${baseUrl}?${params.toString()}`;
    };

    return (
        <div className="flex justify-center items-center gap-4 mt-8">
            {currentPage > 1 ? (
                <Link
                    href={getPageUrl(currentPage - 1)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                >
                    <ChevronLeft size={16} />
                    <span>Önceki</span>
                </Link>
            ) : (
                <button
                    disabled
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-gray-600 cursor-not-allowed"
                >
                    <ChevronLeft size={16} />
                    <span>Önceki</span>
                </button>
            )}

            <div className="flex items-center gap-2 text-sm text-gray-400">
                <span className="text-white font-medium">{currentPage}</span>
                <span>/</span>
                <span>{totalPages}</span>
            </div>

            {currentPage < totalPages ? (
                <Link
                    href={getPageUrl(currentPage + 1)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
                >
                    <span>Sonraki</span>
                    <ChevronRight size={16} />
                </Link>
            ) : (
                <button
                    disabled
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 text-gray-600 cursor-not-allowed"
                >
                    <span>Sonraki</span>
                    <ChevronRight size={16} />
                </button>
            )}
        </div>
    );
}
