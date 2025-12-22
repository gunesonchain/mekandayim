const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const username = process.argv[2];

    if (!username) {
        console.error('Please provide a username: node scripts/set-mod.js <username>');
        process.exit(1);
    }

    try {
        const user = await prisma.user.update({
            where: { username },
            data: { role: 'MODERATOR' },
        });
        console.log(`Success! User ${user.username} is now a MODERATOR.`);
    } catch (error) {
        if (error.code === 'P2025') {
            console.error(`User '${username}' not found.`);
        } else {
            console.error('Error updating user:', error);
        }
    } finally {
        await prisma.$disconnect();
    }
}

main();
