import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
    const baseUrl = 'https://mekan-itiraflari.com';

    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/api/', '/dm/'],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
