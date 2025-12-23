import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { pusherServer } from '@/lib/pusher';

export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);

        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized: No Session' }, { status: 401 });
        }

        if (!pusherServer) {
            const missing = [];
            if (!process.env.PUSHER_APP_ID) missing.push('PUSHER_APP_ID');
            if (!process.env.PUSHER_KEY) missing.push('PUSHER_KEY');
            if (!process.env.PUSHER_SECRET) missing.push('PUSHER_SECRET');
            if (!process.env.PUSHER_CLUSTER) missing.push('PUSHER_CLUSTER');

            return NextResponse.json({
                error: 'Pusher Configuration Missing',
                missing_keys: missing
            }, { status: 500 });
        }

        const data = await request.text();
        const params = new URLSearchParams(data);
        const socketId = params.get('socket_id');
        const channelName = params.get('channel_name');

        if (!socketId || !channelName) {
            return NextResponse.json({
                error: 'Invalid Request',
                details: 'Missing socket_id or channel_name',
                received_data: data
            }, { status: 400 });
        }

        // @ts-ignore
        const userId = session.user.id;

        const authResponse = pusherServer.authorizeChannel(socketId, channelName, {
            user_id: userId,
        });

        return NextResponse.json(authResponse);
    } catch (error: any) {
        console.error('Pusher Auth Error:', error);
        return NextResponse.json({ error: 'Internal Server Error', message: error.message }, { status: 500 });
    }
}
