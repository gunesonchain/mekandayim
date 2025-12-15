'use client';

import { useState, useEffect } from 'react';
import { Search, MapPin, PenLine } from 'lucide-react';
import { Place } from '@/lib/google-places';
import { createEntry } from '@/app/actions';
import { useSession } from 'next-auth/react';
import PlaceIcon from '@/components/PlaceIcon';
import { useRouter } from 'next/navigation';

export default function NewEntryPage() {
    const { data: session } = useSession();
    const router = useRouter();

    // Search State
    const [query, setQuery] = useState('');
    const [locations, setLocations] = useState<Place[]>([]);
    const [loading, setLoading] = useState(false);

    // Selection State
    const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
    const [content, setContent] = useState('');

    useEffect(() => {
        if (!query) {
            setLocations([]);
            return;
        }

        const fetchLocations = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/locations?q=${query}`);
                const data = await res.json();
                if (Array.isArray(data)) {
                    setLocations(data);
                } else {
                    setLocations([]);
                }
            } catch (error) {
                console.error("Failed to fetch locations", error);
            } finally {
                setLoading(false);
            }
        };

        const timeoutId = setTimeout(fetchLocations, 300);
        return () => clearTimeout(timeoutId);
    }, [query]);

    const handleSelectPlace = (place: Place) => {
        setSelectedPlace(place);
        setQuery('');
        setLocations([]);
    };

    const handleSubmit = async (formData: FormData) => {
        if (!selectedPlace || !session?.user) return;

        // Append extra data
        formData.append('locationId', selectedPlace.id);
        formData.append('locationName', selectedPlace.name);
        // @ts-ignore
        formData.append('userId', session.user.id || session.user.image); // Backwards compat

        const result = await createEntry(formData);

        if (result?.error) {
            alert(result.error); // Simple alert for now, can be improved to toast
        } else if (result?.success) {
            router.push(`/location/${selectedPlace.id}`);
        }
    };

    if (!session) {
        return (
            <div className="flex min-h-screen items-center justify-center">
                <p className="text-gray-400">Giriş yapmalısınız.</p>
            </div>
        );
    }

    return (
        <main className="flex flex-col items-center pt-32 px-4 w-full max-w-2xl mx-auto h-full pb-12">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-2">
                    <PenLine className="text-purple-500" />
                    Yeni İtiraf
                </h1>
                <p className="text-gray-400">Önce mekanı seç, sonra içini dök.</p>
            </div>

            {!selectedPlace ? (
                <div className="w-full relative z-10">
                    <div className="relative">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Search className="text-gray-500" />
                        </div>
                        <input
                            type="text"
                            placeholder="Hangi mekan? (örn: Starbucks, Macfit)..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white/10 transition-all shadow-lg shadow-purple-900/10"
                            autoFocus
                        />
                    </div>

                    {(locations.length > 0 || loading) && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-50">
                            {loading ? (
                                <div className="p-4 text-center text-gray-500">Aranıyor...</div>
                            ) : (
                                locations.map((place) => (
                                    <button
                                        key={place.id}
                                        onClick={() => handleSelectPlace(place)}
                                        className="w-full flex items-center gap-3 p-4 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 group text-left"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-purple-400 group-hover:bg-purple-900/20 transition-colors overflow-hidden border border-white/10">
                                            {place.photoUrl ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img src={place.photoUrl} alt={place.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <PlaceIcon type={place.type} size={20} />
                                            )}
                                        </div>
                                        <div>
                                            <div className="font-bold text-white max-w-[300px] truncate">{place.name}</div>
                                            <div className="text-xs text-gray-500">{place.address}</div>
                                        </div>
                                        {/* Type is now represented by icon on left */}
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>
            ) : (
                <div className="w-full bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-purple-600/20 flex items-center justify-center text-purple-400 overflow-hidden border border-white/10">
                                {selectedPlace.photoUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={selectedPlace.photoUrl} alt={selectedPlace.name} className="w-full h-full object-cover" />
                                ) : (
                                    <MapPin size={24} />
                                )}
                            </div>
                            <div>
                                <h2 className="font-bold text-xl text-white">{selectedPlace.name}</h2>
                                <p className="text-sm text-gray-400">{selectedPlace.address}</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedPlace(null)}
                            className="text-xs text-gray-500 hover:text-white transition-colors"
                        >
                            Mekanı Değiştir
                        </button>
                    </div>

                    <form action={handleSubmit} className="flex flex-col gap-4">
                        <textarea
                            name="content"
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Bu mekan hakkında ne düşünüyorsun? Dedikodu, itiraf, tavsiye..."
                            className="w-full h-40 bg-black/50 border border-white/10 rounded-xl p-4 text-white focus:border-purple-500 focus:outline-none transition-colors resize-none"
                            required
                        />
                        <button
                            type="submit"
                            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
                        >
                            <PenLine size={20} />
                            İtirafı Paylaş
                        </button>
                    </form>
                </div>
            )}
        </main>
    );
}
