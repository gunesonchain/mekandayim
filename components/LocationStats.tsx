import Link from 'next/link';
import { MapPin, Flame, Clock } from 'lucide-react';

interface LocationStatsProps {
    recentLocations: any[];
    popularLocations: any[];
}

export default function LocationStats({ recentLocations, popularLocations }: LocationStatsProps) {
    return (
        <div className="grid md:grid-cols-2 gap-4 md:gap-8 w-full">
            {/* Popular Locations */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 backdrop-blur-sm overflow-hidden">
                <div className="flex items-center gap-2 mb-4 text-orange-400">
                    <Flame size={20} />
                    <h2 className="font-bold text-lg">Popüler Mekanlar</h2>
                </div>
                <div className="space-y-3">
                    {popularLocations.map((location, index) => {
                        let iconColorClass = "text-gray-400 bg-white/5 border-white/10";
                        // ... style logic same as before ... 
                        let iconGlowClass = "";

                        if (index === 0) {
                            iconColorClass = "text-red-500 bg-red-500/20 border-red-500/30";
                            iconGlowClass = "shadow-[0_0_15px_rgba(239,68,68,0.5)]";
                        } else if (index === 1) {
                            iconColorClass = "text-orange-500 bg-orange-500/20 border-orange-500/30";
                            iconGlowClass = "shadow-[0_0_10px_rgba(249,115,22,0.3)]";
                        } else if (index === 2) {
                            iconColorClass = "text-amber-400 bg-amber-500/20 border-amber-500/30";
                            iconGlowClass = "shadow-[0_0_5px_rgba(251,191,36,0.2)]";
                        } else {
                            iconColorClass = "text-gray-400 bg-white/5 border-white/10";
                        }

                        return (
                            <Link
                                key={location.id}
                                href={`/location/${location.slug || location.googleId}`}
                                className="grid grid-cols-[3rem_1fr] gap-4 items-center p-3 rounded-xl hover:bg-white/5 transition-colors group relative overflow-hidden"
                            >
                                <div className="absolute right-0 top-1/2 -translate-y-1/2 text-[80px] font-black text-white/5 pointer-events-none select-none -z-0 translate-x-4">
                                    {index + 1}
                                </div>

                                <div className={`relative z-10 w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-300 border ${iconColorClass} ${iconGlowClass} group-hover:scale-110`}>
                                    <Flame
                                        size={index === 0 ? 28 : index === 1 ? 24 : 20}
                                        className={`${index === 0 ? "animate-pulse" : ""} transition-transform`}
                                        fill={index < 3 ? "currentColor" : "none"}
                                    />
                                </div>

                                <div className="relative z-10 flex items-center justify-between min-w-0 overflow-hidden">
                                    <div className="flex flex-col min-w-0 overflow-hidden">
                                        <span className={`font-bold text-lg truncate pr-3 ${index === 0 ? "text-red-400" : index === 1 ? "text-orange-400" : index === 2 ? "text-amber-200" : "text-white"}`}>
                                            {location.name}
                                        </span>
                                        {index < 3 && (
                                            <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                                                {index === 0 ? "En Popüler 🔥" : index === 1 ? "Çok Aktif" : "Yükselişte"}
                                            </span>
                                        )}
                                    </div>

                                    {location.entries24h > 0 && (
                                        <span className="shrink-0 text-white text-xs font-bold bg-green-500/20 px-3 py-1.5 rounded-full border border-green-500/20 whitespace-nowrap backdrop-blur-sm ml-2">
                                            +{location.entries24h}
                                        </span>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                    {popularLocations.length === 0 && (
                        <p className="text-gray-500 text-sm">Henüz popüler mekan yok.</p>
                    )}
                </div>
            </div>

            {/* Recent Locations */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 backdrop-blur-sm overflow-hidden">
                <div className="flex items-center gap-2 mb-4 text-purple-400">
                    <Clock size={20} />
                    <h2 className="font-bold text-lg">Son Girilenler</h2>
                </div>
                <div className="space-y-3">
                    {recentLocations.map((location) => (
                        <Link
                            key={location.id}
                            href={`/location/${location.slug || location.googleId}`}
                            className="grid grid-cols-[3rem_1fr] gap-4 items-center p-3 rounded-xl hover:bg-white/5 transition-colors group relative overflow-hidden"
                        >
                            <div className="w-12 h-12 rounded-lg bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-purple-400 transition-colors overflow-hidden border border-white/10">
                                {location.photoUrl ? (
                                    <img src={location.photoUrl} alt={location.name} className="w-full h-full object-cover" />
                                ) : (
                                    <MapPin size={20} />
                                )}
                            </div>
                            <div className="min-w-0 overflow-hidden">
                                <span className="text-white font-medium text-base group-hover:text-purple-300 transition-colors truncate block">
                                    {location.name}
                                </span>
                            </div>
                        </Link>
                    ))}
                    {recentLocations.length === 0 && (
                        <p className="text-gray-500 text-sm">Henüz entry girilmemiş.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
