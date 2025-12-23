import Pusher from 'pusher';

// Check if we have all required env vars
const hasConfig = process.env.PUSHER_APP_ID &&
    (process.env.PUSHER_KEY || process.env.NEXT_PUBLIC_PUSHER_KEY) &&
    process.env.PUSHER_SECRET &&
    (process.env.PUSHER_CLUSTER || process.env.NEXT_PUBLIC_PUSHER_CLUSTER);

// Server-side Pusher instance
export const pusherServer = hasConfig ? new Pusher({
    appId: process.env.PUSHER_APP_ID!,
    key: (process.env.PUSHER_KEY || process.env.NEXT_PUBLIC_PUSHER_KEY)!,
    secret: process.env.PUSHER_SECRET!,
    cluster: (process.env.PUSHER_CLUSTER || process.env.NEXT_PUBLIC_PUSHER_CLUSTER)!,
    useTLS: true
}) : null;

// Helper to check if Pusher is configured
export const isPusherConfigured = () => !!hasConfig;
