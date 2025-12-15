import { MetadataRoute } from 'next';
import { prisma } from '@/lib/prisma';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = 'https://mekan-itiraflari.com'; // Replace with actual domain from env if available

    // Static routes
    const routes = [
        '',
        '/auth/login',
        '/auth/register',
    ].map((route) => ({
        url: `${baseUrl}${route}`,
        lastModified: new Date(),
        changeFrequency: 'daily' as const,
        priority: 0.8,
    }));

    // Dynamic routes (Locations)
    // Fetch most recent or popular locations to include in sitemap
    // Including ALL locations might be too much if there are thousands, but for now include all.
    const locations = await prisma.location.findMany({
        select: {
            slug: true,
            entries: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { createdAt: true }
            }
        }
    });

    const locationRoutes = locations.map((loc) => ({
        url: `${baseUrl}/location/${loc.slug}`,
        lastModified: loc.entries[0]?.createdAt || new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
    }));

    return [...routes, ...locationRoutes];
}
