'use client';

import { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { Place } from '@/lib/google-places';
import PlaceIcon from './PlaceIcon';

interface SearchInputProps {
    variant?: 'hero' | 'header' | 'mobile';
    placeholder?: string;
    autoFocus?: boolean;
}

export default function SearchInput({ variant = 'hero', placeholder = "Mekan ara...", autoFocus = false }: SearchInputProps) {
    const [query, setQuery] = useState('');
    const [locations, setLocations] = useState<Place[]>([]);
    const [loading, setLoading] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Styles based on variant
    const containerClasses = {
        hero: "w-full relative z-10 mb-12",
        header: "w-full max-w-md relative hidden md:block",
        mobile: "w-full relative mb-6"
    };

    const inputClasses = {
        hero: "w-full glass-panel !bg-white/5 !border-white/20 rounded-2xl py-5 pl-14 pr-6 text-lg text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all shadow-xl shadow-purple-900/5",
        header: "w-full bg-white/10 border border-white/10 rounded-full py-2 pl-10 pr-4 text-base md:text-sm text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all",
        mobile: "w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-base text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
    };

    const iconClasses = {
        hero: "absolute inset-y-0 left-5 flex items-center pointer-events-none text-gray-400 z-10",
        header: "absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400 z-10",
        mobile: "absolute inset-y-0 left-4 flex items-center pointer-events-none text-gray-400 z-10"
    };

    const dropdownClasses = {
        hero: "absolute top-full left-0 right-0 mt-4 glass-panel bg-[#0a0a0a]/95 rounded-2xl overflow-hidden shadow-2xl z-50 border border-white/10",
        header: "absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] rounded-xl overflow-hidden shadow-xl z-50 border border-white/10",
        mobile: "absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] rounded-xl overflow-hidden shadow-xl z-50 border border-white/10"
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (!query) {
            setLocations([]);
            setShowResults(false);
            return;
        }

        const fetchLocations = async () => {
            setLoading(true);
            setShowResults(true);
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

    return (
        <div ref={containerRef} className={containerClasses[variant]}>
            <div className="relative">
                <div className={iconClasses[variant]}>
                    <Search className={variant === 'hero' ? 'w-6 h-6' : 'w-4 h-4'} />
                </div>
                <input
                    type="text"
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => { if (query) setShowResults(true); }}
                    className={inputClasses[variant]}
                    autoFocus={autoFocus}
                />
            </div>

            {/* Results Dropdown */}
            {showResults && (locations.length > 0 || loading) && (
                <div className={dropdownClasses[variant]}>
                    {loading ? (
                        <div className={`text-center text-gray-400 animate-pulse ${variant === 'hero' ? 'p-8' : 'p-4 text-xs'}`}>Mekanlar aranıyor...</div>
                    ) : (
                        <div className="max-h-[60vh] overflow-y-auto">
                            {locations.map((place) => (
                                <Link
                                    key={place.id}
                                    href={`/location/${place.id}`}
                                    onClick={() => {
                                        setShowResults(false);
                                        setQuery(''); // Optional: clear search on select
                                    }}
                                    className={`flex items-center gap-3 hover:bg-white/10 transition-all border-b border-white/5 last:border-0 group active:bg-white/20 ${variant === 'hero' ? 'p-5' : 'p-3'}`}
                                >
                                    <div className={`${variant === 'hero' ? 'w-14 h-14 min-w-[3.5rem]' : 'w-10 h-10 min-w-[2.5rem]'} rounded-xl bg-white/5 flex items-center justify-center text-gray-400 group-hover:text-purple-400 group-hover:bg-purple-900/20 transition-colors overflow-hidden border border-white/10 shadow-lg`}>
                                        {place.photoUrl ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img src={place.photoUrl} alt={place.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <PlaceIcon type={place.type} size={variant === 'hero' ? 24 : 16} />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className={`font-bold text-white truncate mb-1 ${variant === 'hero' ? 'text-lg' : 'text-sm'}`}>{place.name}</div>
                                        <div className={`text-gray-400 truncate ${variant === 'hero' ? 'text-sm' : 'text-xs'}`}>{place.address}</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
