import SearchSection from '@/components/SearchSection';
import LocationStats from '@/components/LocationStats';
import { getHomepageStats } from './actions';

export const dynamic = 'force-dynamic';

export default async function Home() {
    const { recentLocations, popularLocations } = await getHomepageStats();

    return (
        <main className="flex flex-col items-center pt-20 px-4 w-full max-w-4xl mx-auto h-full pb-12">
            {/* Brand */}
            <div className="mb-8 text-center">
                <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
                    Mekan<span className="text-purple-500">İtirafları</span>
                </h1>
                <p className="text-gray-400">Aradığın mekanı bul, başlıkları oku.</p>
            </div>

            {/* Search */}
            <SearchSection />

            {/* Stats */}
            <LocationStats
                recentLocations={recentLocations}
                popularLocations={popularLocations}
            />
        </main>
    );
}
