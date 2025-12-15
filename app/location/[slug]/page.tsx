import { getPlaceDetails } from "@/lib/google-places";
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { MapPin, Edit3 } from "lucide-react";
import EntryCard from "@/components/EntryCard";
import NewEntryForm from "@/components/NewEntryForm";
import PlaceIcon from "@/components/PlaceIcon";
import Link from "next/link";
import MobileEntryWrapper from "@/components/MobileEntryWrapper";
import PaginationControls from "@/components/PaginationControls";
import { Metadata, ResolvingMetadata } from "next";

interface PageProps {
    params: { slug: string };
    searchParams: { [key: string]: string | string[] | undefined };
}

export async function generateMetadata(
    { params }: PageProps,
    parent: ResolvingMetadata
): Promise<Metadata> {
    const slug = decodeURIComponent(params.slug);

    // Try finding by slug or ID to get the name
    let name = slug;
    const location = await prisma.location.findFirst({
        where: {
            OR: [
                { slug: slug },
                { googleId: slug }
            ]
        }
    });

    if (location) {
        name = location.name;
    } else {
        // Fallback to Google API for name if not in DB
        const place = await getPlaceDetails(slug);
        if (place) name = place.name;
    }

    return {
        title: `${name} İtirafları ve Yorumları - Mekan İtirafları`,
        description: `${name} hakkında yazılan itirafları oku, yorum yap veya kendi itirafını paylaş. ${name} nerede, nasıl gidilir?`,
        openGraph: {
            title: `${name} İtirafları - Mekan İtirafları`,
            description: `${name} hakkında bilinmeyenler ve itiraflar.`
        }
    };
}

async function getLocationData(slugOrId: string, page: number = 1) {
    const ITEMS_PER_PAGE = 10;
    const skip = (page - 1) * ITEMS_PER_PAGE;

    // 1. Try finding by slug
    let location = await prisma.location.findUnique({
        where: { slug: slugOrId },
        include: {
            _count: { select: { entries: true } },
            entries: {
                include: { user: true, likes: true },
                orderBy: { createdAt: 'desc' },
                take: ITEMS_PER_PAGE,
                skip: skip
            }
        }
    });

    // 2. If not found, try by Google ID (Migration/Legacy support)
    if (!location) {
        const byId = await prisma.location.findUnique({
            where: { googleId: slugOrId },
            include: {
                // minimal fetch to check redirect
                entries: { select: { id: true }, take: 0 }
            }
        });

        if (byId) {
            // Found by ID, but we want to use slug. Signal redirect.
            return { redirect: `/location/${byId.slug}` };
        }
    }

    return { location };
}

export default async function LocationPage({ params, searchParams }: PageProps) {
    const slug = decodeURIComponent(params.slug);
    const page = typeof searchParams.page === 'string' ? parseInt(searchParams.page) : 1;

    // Fetch DB Data
    const { location: dbLocation, redirect: redirectPath } = await getLocationData(slug, page);

    if (redirectPath) {
        redirect(redirectPath);
    }

    let googleId = slug;
    let locationEntries = [];
    let totalCount = 0;

    if (dbLocation) {
        googleId = dbLocation.googleId;
        locationEntries = dbLocation.entries;
        totalCount = dbLocation._count.entries;
    }

    // Fetch Google Data (Always fresh info)
    let place = await getPlaceDetails(googleId);

    // Fallback if Google API fails but we have DB data
    if (!place && dbLocation) {
        place = {
            id: dbLocation.googleId,
            name: dbLocation.name,
            address: dbLocation.address || 'Adres bilgisi alınamadı',
            type: 'unknown'
        };
    }

    // If neither exists, 404
    if (!place) return notFound();

    const totalPages = Math.ceil(totalCount / 10);
    const session = await getServerSession(authOptions);

    return (
        <main className="container mx-auto px-4 py-8 max-w-4xl">
            {/* Header Info */}
            <div className="mb-8 border-b border-white/10 pb-8">
                <div className="flex flex-col md:flex-row md:items-start gap-6">
                    {/* Thumbnail */}
                    <div className="w-full md:w-auto flex justify-center md:block">
                        {place.photoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                                src={place.photoUrl}
                                alt={place.name}
                                className="w-32 h-32 md:w-24 md:h-24 rounded-2xl object-cover border-4 border-white/10 shadow-2xl"
                            />
                        ) : (
                            <div className="w-32 h-32 md:w-24 md:h-24 rounded-2xl bg-gradient-to-br from-purple-900/50 to-pink-900/30 flex items-center justify-center border-4 border-white/10 shadow-2xl">
                                <PlaceIcon type={place.type} size={48} className="text-purple-300" />
                            </div>
                        )}
                    </div>

                    <div className="flex-1 text-center md:text-left pt-1">
                        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">{place.name}</h1>
                        <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + place.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-gray-400 text-sm hover:text-purple-400 transition-colors bg-white/5 px-4 py-2 rounded-full md:bg-transparent md:px-0 md:py-0"
                        >
                            <PlaceIcon type={place.type} size={16} />
                            <span className="underline decoration-dotted hover:decoration-solid">{place.address}</span>
                        </a>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">

                {/* Left Column: Entries */}
                <div className="md:col-span-2 space-y-4 pb-24 md:pb-0">
                    <div className="flex items-center justify-between mb-4 px-1">
                        <h2 className="text-xl font-semibold text-white">İtiraflar</h2>
                        <span className="text-xs text-gray-500 bg-white/5 px-2 py-1 rounded-lg">{totalCount} adet</span>
                    </div>

                    {locationEntries.length === 0 ? (
                        <div className="text-center py-16 bg-white/5 rounded-2xl border border-white/5 border-dashed">
                            <p className="text-gray-400 mb-2 text-lg">Bu mekan sessizliğini koruyor.</p>
                            <p className="text-sm text-gray-600">İlk itirafı sen yaz, mekanı şenlendir!</p>
                        </div>
                    ) : (
                        <>
                            {locationEntries.map((entry) => (
                                <EntryCard
                                    key={entry.id}
                                    entry={entry}
                                    // @ts-ignore
                                    currentUserId={session?.user?.id || session?.user?.image}
                                />
                            ))}

                            <PaginationControls
                                currentPage={page}
                                totalPages={totalPages}
                                baseUrl={`/location/${slug}`}
                                searchParams={searchParams}
                            />
                        </>
                    )}
                </div>

                {/* Right Column: Action / Sticky Info */}
                <div className="md:col-span-1">
                    <div className="md:sticky md:top-24">
                        {/* New Entry Form (Desktop) */}
                        <div className="hidden lg:block glass-panel p-6 rounded-2xl mb-8">
                            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                <span className="bg-purple-600/20 p-2 rounded-lg text-purple-400">✍️</span>
                                İtiraf Et
                            </h3>
                            {session?.user ? (
                                <NewEntryForm
                                    locationId={place.id}
                                    locationName={place.name}
                                    locationPhotoUrl={place.photoUrl}
                                    // @ts-ignore
                                    userId={session.user.id || session.user.image}
                                />
                            ) : (
                                <div className="text-center">
                                    <p className="text-gray-400 text-xs mb-3">Yazmak için giriş yapmalısın.</p>
                                    <Link href="/api/auth/signin" className="block w-full bg-white text-black py-3 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors">
                                        Giriş Yap
                                    </Link>
                                </div>
                            )}
                        </div>

                        {/* Mobile Entry Wrapper (Hidden on Desktop) */}
                        <div className="lg:hidden">
                            <MobileEntryWrapper>
                                {session?.user ? (
                                    <NewEntryForm
                                        locationId={place.id}
                                        locationName={place.name}
                                        locationPhotoUrl={place.photoUrl}
                                        // @ts-ignore
                                        userId={session.user.id || session.user.image}
                                    />
                                ) : (
                                    <div className="text-center">
                                        <p className="text-gray-400 text-xs mb-3">Yazmak için giriş yapmalısın.</p>
                                        <Link href="/api/auth/signin" className="block w-full bg-white text-black py-3 rounded-xl font-bold text-sm hover:bg-gray-200 transition-colors">
                                            Giriş Yap
                                        </Link>
                                    </div>
                                )}
                            </MobileEntryWrapper>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
