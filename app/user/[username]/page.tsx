import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import EntryCard from "@/components/EntryCard";
import { MessageCircle, Calendar, Heart } from "lucide-react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getAvatarColor } from "@/lib/utils";
import ProfileSettings from "@/components/ProfileSettings";
import PaginationControls from "@/components/PaginationControls";

interface UserPageProps {
    params: { username: string };
    searchParams?: { [key: string]: string | string[] | undefined };
}

async function getUser(username: string) {
    const decodedUsername = decodeURIComponent(username);
    return await prisma.user.findFirst({
        where: { username: decodedUsername }
    });
}

async function getUserEntries(userId: string, page: number = 1) {
    const ITEMS_PER_PAGE = 10;
    const skip = (page - 1) * ITEMS_PER_PAGE;

    const [entries, totalCount] = await Promise.all([
        prisma.entry.findMany({
            where: { userId },
            include: {
                user: true,
                location: true,
                likes: true
            },
            orderBy: { createdAt: 'desc' },
            take: ITEMS_PER_PAGE,
            skip: skip
        }),
        prisma.entry.count({ where: { userId } })
    ]);

    return { entries, totalCount };
}

export default async function UserProfilePage({ params, searchParams }: UserPageProps) {
    const user = await getUser(params.username);

    if (!user) {
        notFound();
    }

    const session = await getServerSession(authOptions);
    const userId = session?.user?.id ? (session.user.id as string) : null;

    // Check if the current viewer is the owner of this profile
    const isOwner = session?.user?.email === user.email;

    const page = typeof searchParams?.page === 'string' ? parseInt(searchParams.page) : 1;
    const view = typeof searchParams?.view === 'string' ? searchParams.view : 'entries';

    // Fetch entries with pagination
    const { entries, totalCount } = await getUserEntries(user.id, page);
    const totalPages = Math.ceil(totalCount / 10);

    // Calculate total likes received
    const totalLikes = await prisma.like.count({
        where: {
            entry: {
                userId: user.id
            }
        }
    });

    const serializedUser = {
        ...user,
        createdAt: user.createdAt.toISOString(),
    };

    return (
        <main className="container mx-auto px-4 py-8 max-w-2xl">
            {/* Profile Header */}
            <div className="mb-8 flex flex-col items-center text-center">
                <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${getAvatarColor(user.username)} flex items-center justify-center text-4xl font-bold text-white mb-4 shadow-xl overflow-hidden border-4 border-white/10`}>
                    {user.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={user.image} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                        user.username?.[0]?.toUpperCase()
                    )}
                </div>

                <h1 className="text-3xl font-bold text-white mb-1">@{user.username}</h1>
                {/* "Üye Profili" removed as requested */}

                {user.bio && <p className="text-gray-400 text-sm max-w-[280px] mb-4 whitespace-pre-wrap break-words">{user.bio}</p>}

                <div className="flex items-center gap-6 bg-white/5 px-6 py-3 rounded-2xl border border-white/5 backdrop-blur-sm mb-6">
                    <div className="flex flex-col items-center">
                        <span className="text-2xl font-bold text-white flex items-center gap-2">
                            {totalCount}
                            <span className="text-lg">🤭</span>
                        </span>
                        <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">İtiraf</span>
                    </div>
                    <div className="w-px h-8 bg-white/10" />
                    <div className="flex flex-col items-center">
                        <span className="text-2xl font-bold text-white flex items-center gap-2">
                            {totalLikes}
                            <span className="text-red-500 text-lg">❤️</span>
                        </span>
                        <span className="text-xs text-gray-400 uppercase tracking-wider font-medium">Beğeni</span>
                    </div>
                </div>

                {/* Join Date */}
                {/* Join Date */}
                {user.createdAt && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                        <Calendar size={12} />
                        <span>Katılım: {new Date(user.createdAt).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' })}</span>
                    </div>
                )}

                {/* Actions (DM) - Only show if LOGGED IN and NOT own profile */}
                {session?.user && !isOwner && (
                    <Link
                        href={`/dm/${user.id}`}
                        className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-full font-bold hover:bg-gray-200 transition-colors mt-6"
                    >
                        <MessageCircle size={18} />
                        Mesaj At
                    </Link>
                )}
            </div>

            {/* Owner Tabs */}
            {isOwner && (
                <div className="flex border-b border-white/10 mb-6">
                    <Link
                        href={`/user/${user.username}?view=entries`}
                        className={`flex-1 py-3 text-center text-sm font-medium transition-colors border-b-2 ${view === 'entries'
                            ? 'border-purple-500 text-white'
                            : 'border-transparent text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        İtiraflarım
                    </Link>
                    <Link
                        href={`/user/${user.username}?view=settings`}
                        className={`flex-1 py-3 text-center text-sm font-medium transition-colors border-b-2 ${view === 'settings'
                            ? 'border-purple-500 text-white'
                            : 'border-transparent text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        Profil Ayarları
                    </Link>
                </div>
            )}

            {/* Content Switch */}
            {isOwner && view === 'settings' ? (
                <ProfileSettings user={serializedUser} />
            ) : (
                /* Entries List */
                <div className="space-y-4">
                    {!isOwner && <h2 className="text-xl font-bold text-white border-b border-white/10 pb-4 mb-6">Paylaşılan İtiraflar</h2>}

                    {/* Privacy Check */}
                    {!isOwner && user.hideEntries ? (
                        <div className="relative overflow-hidden rounded-3xl border border-white/10 min-h-[440px] group">
                            {/* Fake Content Layer (Blurred) */}
                            <div className="absolute inset-0 p-6 space-y-4 opacity-50 select-none pointer-events-none overflow-hidden">
                                {/* Dummy Entry 1 */}
                                <div className="bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="h-4 w-1/3 bg-white/20 rounded animate-pulse"></div>
                                        <div className="h-3 w-12 bg-white/10 rounded"></div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="h-3 w-full bg-white/10 rounded"></div>
                                        <div className="h-3 w-5/6 bg-white/10 rounded"></div>
                                        <div className="h-3 w-4/6 bg-white/10 rounded"></div>
                                    </div>
                                </div>

                                {/* Dummy Entry 2 */}
                                <div className="bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="h-4 w-1/4 bg-white/20 rounded"></div>
                                        <div className="h-3 w-10 bg-white/10 rounded"></div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="h-3 w-11/12 bg-white/10 rounded"></div>
                                        <div className="h-3 w-full bg-white/10 rounded"></div>
                                    </div>
                                </div>

                                {/* Dummy Entry 3 */}
                                <div className="bg-white/5 border border-white/10 p-4 rounded-xl backdrop-blur-sm">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="h-4 w-1/3 bg-white/20 rounded"></div>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="h-3 w-full bg-white/10 rounded"></div>
                                        <div className="h-3 w-3/4 bg-white/10 rounded"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Heavy Blur Overlay - Frosted Glass (No Black Tint) */}
                            <div className="absolute inset-0 backdrop-blur-xl bg-white/5"></div>

                            {/* Foreground Message */}
                            <div className="absolute inset-0 flex items-center justify-center z-20">
                                <div className="flex flex-col items-center gap-6 p-8 text-center max-w-sm mx-auto">
                                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-3xl flex items-center justify-center border border-white/10 shadow-2xl shadow-purple-900/20 mb-2 ring-1 ring-white/20">
                                        <div className="text-4xl drop-shadow-md">🔒</div>
                                    </div>

                                    <div className="space-y-2">
                                        <h3 className="text-2xl font-bold text-white tracking-tight">Bu Profil Gizli</h3>
                                        <p className="text-gray-400 text-sm leading-relaxed">
                                            <span className="font-semibold text-white">@{user.username}</span> itiraflarını sadece kendisinin görmesini tercih etti.
                                        </p>
                                    </div>

                                    <div className="flex gap-4 text-3xl opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                                        <span>🙊</span>
                                        <span>🙈</span>
                                        <span>🙉</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Normal List */
                        <>
                            {entries.length === 0 ? (
                                <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                                    <p className="text-gray-500">
                                        {isOwner ? 'Henüz hiç itiraf paylaşmadınız.' : 'Bu kullanıcı henüz hiç itiraf paylaşmamış.'}
                                    </p>
                                    {isOwner && (
                                        <Link href="/new-entry" className="inline-block mt-4 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors font-medium">
                                            İlk İtirafını Yaz
                                        </Link>
                                    )}
                                </div>
                            ) : (
                                <>
                                    {entries.map((entry) => (
                                        <div key={entry.id} className="relative">
                                            {/* Location Tag */}
                                            <Link href={`/location/${entry.location.googleId}`} className="absolute -top-3 right-0 bg-purple-900/50 text-purple-300 text-[10px] px-2 py-1 rounded hover:bg-purple-900/70 transition-colors z-10">
                                                @{entry.location.name}
                                            </Link>
                                            <EntryCard
                                                entry={entry}
                                                // @ts-ignore
                                                currentUserId={userId}
                                            />
                                        </div>
                                    ))}
                                    <PaginationControls
                                        currentPage={page}
                                        totalPages={totalPages}
                                        baseUrl={`/user/${user.username}`}
                                        searchParams={searchParams}
                                    />
                                </>
                            )}
                        </>
                    )}
                </div>
            )}
        </main>
    );
}
