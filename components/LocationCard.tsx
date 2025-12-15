'use client';
import { motion } from 'framer-motion';
import { MapPin, Star } from 'lucide-react';
import Link from 'next/link';
import { Place } from '@/lib/google-places';

interface LocationCardProps {
    place: Place;
    index: number;
}

export default function LocationCard({ place, index }: LocationCardProps) {
    return (
        <Link href={`/location/${(place as any).slug || place.id}`}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="group relative overflow-hidden rounded-2xl bg-white/5 p-6 hover:bg-white/10 transition-colors border border-white/5 hover:border-purple-500/30"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                <div className="relative z-10">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-xl font-bold text-white group-hover:text-purple-300 transition-colors">
                            {place.name}
                        </h3>
                        {place.rating && (
                            <div className="flex items-center gap-1 text-yellow-500 bg-yellow-500/10 px-2 py-1 rounded-full text-xs font-bold">
                                <Star size={12} fill="currentColor" />
                                {place.rating}
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-2 text-gray-400 text-sm mb-4">
                        <MapPin size={14} />
                        <span className="truncate">{place.address}</span>
                    </div>

                    <div className="inline-block px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-medium uppercase tracking-wider">
                        {place.type}
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}
