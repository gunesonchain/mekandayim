"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

interface Report {
    id: string;
    reason: string;
    createdAt: string | Date;
    status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
    reporter: {
        username: string;
    };
}

export default function ReportList({ reports }: { reports: Report[] }) {
    const [currentPage, setCurrentPage] = useState(1);

    // Config
    const ITEMS_PER_PAGE = 5;
    const totalPages = Math.ceil(reports.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const displayedReports = reports.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    return (
        <div className="space-y-2">
            <div className="grid gap-2 grid-cols-1">
                {displayedReports.map((report) => (
                    <div key={report.id} className={`p-3 rounded border flex flex-col gap-1 ${report.status === 'DISMISSED' ? 'bg-white/5 border-white/5 opacity-50' : 'bg-red-500/5 border-red-500/10'}`}>
                        <div className="flex justify-between items-start">
                            <span className="text-gray-300 text-sm break-words break-all">{report.reason}</span>
                            <span className="text-[10px] text-gray-500 whitespace-nowrap ml-2">
                                {formatDistanceToNow(new Date(report.createdAt), { locale: tr })}
                            </span>
                        </div>
                        <div className="text-[10px] text-gray-600 flex justify-between items-center">
                            <span>Raporlayan: @{report.reporter.username}</span>
                            <span className="uppercase font-bold tracking-wider">{report.status === 'PENDING' ? 'Bekliyor' : report.status === 'DISMISSED' ? 'Yoksayıldı' : 'Çözüldü'}</span>
                        </div>
                    </div>
                ))}
            </div>

            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1 pt-2">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-7 h-7 text-xs rounded transition-colors ${currentPage === page
                                ? 'bg-purple-600 text-white'
                                : 'text-gray-400 hover:text-white hover:bg-white/10'
                                }`}
                        >
                            {page}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
