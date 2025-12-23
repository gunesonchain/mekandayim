import { getBannedUsers } from "@/actions/moderation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";
import { UserX, Search } from "lucide-react";
import BanSearchForm from "@/components/BanSearchForm";

export default async function BansPage({ searchParams }: { searchParams: { search?: string } }) {
    const session = await getServerSession(authOptions);
    // @ts-ignore
    if (!session || session.user?.role !== "MODERATOR") {
        redirect("/");
    }

    const search = searchParams?.search || '';
    // @ts-ignore
    const { users, error } = await getBannedUsers(search);

    return (
        <div className="min-h-screen bg-black text-white p-4 md:p-8 pb-24">
            <div className="max-w-4xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent">
                        Engel Yönetimi
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Engellenmiş kullanıcıları yönetin</p>
                </div>

                {/* Search Form */}
                <BanSearchForm initialSearch={search} />

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-4 rounded-xl mb-6">
                        {error}
                    </div>
                )}

                {!users || users.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
                        <UserX size={48} className="mx-auto text-gray-600 mb-4" />
                        <h3 className="text-lg font-medium text-white">Engellenmiş Kullanıcı Yok</h3>
                        <p className="text-gray-400">
                            {search ? 'Aramanızla eşleşen engellenmiş kullanıcı bulunamadı.' : 'Henüz engellenmiş kullanıcı bulunmuyor.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="text-sm text-gray-500 mb-4">{users.length} engellenmiş kullanıcı</div>
                        {users.map((user: any) => (
                            <div key={user.id} className="bg-white/5 border border-white/10 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-white/20 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full bg-red-600/20 flex items-center justify-center text-xl font-bold text-red-400 border border-red-500/20">
                                        {user.username[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <Link href={`/user/${user.username}`} className="font-medium text-white hover:text-purple-400 transition-colors">
                                            @{user.username}
                                        </Link>
                                        <div className="text-xs text-gray-500 mt-0.5">{user.email}</div>
                                        <div className="flex gap-3 mt-1 text-xs text-gray-600">
                                            <span>{user._count.entries} itiraf</span>
                                            <span>•</span>
                                            <span>Kayıt: {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true, locale: tr })}</span>
                                        </div>
                                    </div>
                                </div>
                                <form action={async () => {
                                    'use server';
                                    const { unbanUser } = await import('@/actions/moderation');
                                    await unbanUser(user.id);
                                }}>
                                    <button
                                        type="submit"
                                        className="w-full md:w-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition-colors"
                                    >
                                        Engeli Kaldır
                                    </button>
                                </form>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
