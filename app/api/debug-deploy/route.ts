import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        // Check ENV vars
        const envCheck = {
            DATABASE_URL: process.env.DATABASE_URL ? 'Loaded (Length: ' + process.env.DATABASE_URL.length + ')' : 'MISSING',
            NEXTAUTH_URL: process.env.NEXTAUTH_URL || 'MISSING',
            PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY || 'MISSING'
        };

        // Try DB Connection
        await prisma.$connect();
        const userCount = await prisma.user.count();

        return NextResponse.json({
            status: 'System Online',
            env: envCheck,
            db_connection: 'SUCCESS ✅',
            user_count: userCount
        });

    } catch (error: any) {
        return NextResponse.json({
            status: 'System Error',
            error_message: error.message,
            error_code: error.code
        }, { status: 500 });
    }
}
