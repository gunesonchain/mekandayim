import { getReports, dismissReport, deleteEntryAndResolveReport, banUser, dismissAllReportsForEntry, restoreReportGroup } from "@/actions/moderation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import ReportList from "@/components/ReportList";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { Trash2, XCircle, CheckCircle, AlertTriangle, Archive } from "lucide-react";

export default async function ReportsPage({ searchParams }: { searchParams: { tab?: string } }) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== "MODERATOR") {
        redirect("/");
    }

    // @ts-ignore
    const { pendingGroups, historyGroups, error } = await getReports();

    // Determine active tab
    const tab = searchParams?.tab === 'history' ? 'history' : 'pending';
    const activeGroups = tab === 'history' ? historyGroups : pendingGroups;

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8 pb-24">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                        Şikayet Yönetimi
                    </h1>
                </div>

                {/* Tabs */}
                <div className="flex gap-4 border-b border-white/10 mb-6">
                    <Link
                        href="/reports"
                        className={`pb-3 px-2 text-sm font-medium transition-colors ${tab === 'pending' ? 'text-white border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Bekleyenler ({pendingGroups?.length || 0})
                    </Link>
                    <Link
                        href="/reports?tab=history"
                        className={`pb-3 px-2 text-sm font-medium transition-colors ${tab === 'history' ? 'text-white border-b-2 border-purple-500' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        Geçmiş ({historyGroups?.length || 0})
                    </Link>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6">
                        {error}
                    </div>
                )}

                {!activeGroups || activeGroups.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
                        {tab === 'pending' ? (
                            <>
                                <CheckCircle size={48} className="mx-auto text-green-500 mb-4" />
                                <h3 className="text-lg font-medium text-white">Her şey temiz!</h3>
                                <p className="text-gray-400">İncelenecek yeni şikayet bulunmuyor.</p>
                            </>
                        ) : (
                            <>
                                <Archive size={48} className="mx-auto text-gray-600 mb-4" />
                                <h3 className="text-lg font-medium text-white">Geçmiş Boş</h3>
                                <p className="text-gray-400">Henüz işlem yapılmış bir şikayet yok.</p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="space-y-6">
                        {activeGroups.map((group: any) => (
                            <div key={group.entry.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden transition-all hover:border-white/20">
                                {/* Header: Entry Info & Report Count */}
                                <div className="p-6 bg-gradient-to-b from-white/5 to-transparent">
                                    <div className="flex flex-col md:flex-row justify-between gap-6">

                                        <div className="flex-1 space-y-4 min-w-0"> {/* min-w-0 for truncation */}
                                            {/* Badge & User */}
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <div className="flex items-center gap-2 bg-red-500/20 text-red-400 px-3 py-1 rounded-full border border-red-500/20 whitespace-nowrap">
                                                    <AlertTriangle size={14} />
                                                    <span className="text-xs font-bold">{group.count} ŞİKAYET</span>
                                                </div>
                                                <span className="text-gray-600 text-sm hidden md:block">|</span>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-purple-600 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                        {group.entry.user.username[0].toUpperCase()}
                                                    </div>
                                                    <Link href={`/user/${group.entry.user.username}`} className="font-medium text-sm text-purple-400 hover:underline truncate">
                                                        @{group.entry.user.username}
                                                    </Link>
                                                    {group.entry.user.isBanned && (
                                                        <span className="text-red-500 text-xs border border-red-500/50 px-1 rounded whitespace-nowrap">BANNED</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Entry Content */}
                                            <div className={`bg-black/40 p-4 rounded-lg border content-box ${group.entry.isDeleted ? 'border-red-900/50' : 'border-white/5'}`}>
                                                {group.entry.isDeleted && (
                                                    <div className="text-red-500 text-xs font-bold mb-2 uppercase tracking-wider flex items-center gap-2">
                                                        <Trash2 size={12} /> Silinmiş İtiraf
                                                    </div>
                                                )}
                                                <p className="text-gray-200 text-base leading-relaxed break-words break-all whitespace-pre-wrap">{group.entry.content}</p>
                                                <div className="mt-2 text-xs text-gray-500">
                                                    {formatDistanceToNow(new Date(group.entry.createdAt), { addSuffix: true, locale: tr })}
                                                </div>
                                            </div>

                                            {/* Reports List (Paginated) */}
                                            <ReportList reports={group.reports} />
                                        </div>

                                        {/* Actions - Only show for Pending tab */}
                                        {tab === 'pending' ? (
                                            <div className="flex flex-col gap-3 md:w-36 flex-shrink-0 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6">
                                                <form action={deleteEntryAndResolveReport.bind(null, group.entry.id)}>
                                                    <button className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/20 p-2.5 rounded-lg transition-all font-medium text-sm group">
                                                        <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
                                                        İtirafı Sil
                                                    </button>
                                                </form>

                                                <form action={dismissAllReportsForEntry.bind(null, group.entry.id)}>
                                                    <button className="w-full flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5 p-2.5 rounded-lg transition-colors font-medium text-sm">
                                                        <XCircle size={16} />
                                                        Yoksay
                                                    </button>
                                                </form>
                                            </div>
                                        ) : (
                                            /* History Actions */
                                            <div className="flex flex-col gap-3 md:w-36 flex-shrink-0 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 md:pl-6 justify-center">
                                                <form action={restoreReportGroup.bind(null, group.entry.id)}>
                                                    <button className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-600/20 p-2.5 rounded-lg transition-all font-medium text-sm group">
                                                        <Archive size={16} className="group-hover:-translate-y-1 transition-transform" />
                                                        Geri Al
                                                    </button>
                                                </form>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
