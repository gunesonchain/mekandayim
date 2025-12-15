import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function slugify(text: string): string {
    const trMap: { [key: string]: string } = {
        'ç': 'c', 'Ç': 'c', 'ğ': 'g', 'Ğ': 'g', 'ü': 'u', 'Ü': 'u',
        'ş': 's', 'Ş': 's', 'ö': 'o', 'Ö': 'o', 'ı': 'i', 'İ': 'i'
    };

    return text
        .split('')
        .map(char => trMap[char] || char)
        .join('')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric chars
        .trim()
        .replace(/\s+/g, '-')         // Replace spaces with hyphens
        .replace(/-+/g, '-');         // Remove duplicate hyphens
}

const AVATAR_COLORS = [
    "from-slate-900 via-purple-900 to-slate-900",
    "from-indigo-500 via-purple-500 to-pink-500",
    "from-blue-600 via-indigo-600 to-purple-600",
    "from-rose-500 via-red-500 to-orange-500",
    "from-emerald-500 via-teal-500 to-cyan-500",
    "from-fuchsia-600 via-pink-600 to-rose-600",
    "from-amber-500 via-orange-500 to-red-500",
    "from-violet-600 via-indigo-600 to-blue-600",
    "from-cyan-500 via-blue-500 to-indigo-500",
    "from-lime-500 via-green-500 to-emerald-500",
    "from-slate-800 via-gray-700 to-zinc-800",
    "from-pink-500 via-rose-500 to-red-500",
    "from-teal-400 via-emerald-400 to-green-400",
    "from-purple-600 via-indigo-600 to-blue-600",
];

export function getAvatarColor(username: string | null | undefined): string {
    if (!username) return AVATAR_COLORS[0];

    // Simple hash function
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
        hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }

    const index = Math.abs(hash) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
}
