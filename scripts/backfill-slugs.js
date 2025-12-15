const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function slugify(text) {
    const trMap = {
        'ç': 'c', 'Ç': 'c', 'ğ': 'g', 'Ğ': 'g', 'ü': 'u', 'Ü': 'u',
        'ş': 's', 'Ş': 's', 'ö': 'o', 'Ö': 'o', 'ı': 'i', 'İ': 'i'
    };

    return text
        .split('')
        .map(char => trMap[char] || char)
        .join('')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

async function main() {
    console.log('Starting slug backfill...');
    const locations = await prisma.location.findMany({
        where: { slug: null }
    });

    console.log(`Found ${locations.length} locations without slug.`);

    for (const loc of locations) {
        let slug = slugify(loc.name);

        // Simple duplicate check
        const count = await prisma.location.count({ where: { slug } });
        if (count > 0) {
            slug = `${slug}-${loc.id.slice(-4)}`;
        }

        console.log(`Updating ${loc.name} -> ${slug}`);
        await prisma.location.update({
            where: { id: loc.id },
            data: { slug }
        });
    }
    console.log('Backfill complete.');
}

main()
    .catch(e => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
