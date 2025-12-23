'use server';

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { pusherServer } from "@/lib/pusher";

// Create a new notification and broadcast via Pusher
export async function createNotification(
    userId: string,
    type: string,
    message: string,
    link?: string
) {
    const notification = await prisma.notification.create({
        data: {
            userId,
            type,
            message,
            link
        }
    });

    // Broadcast via Pusher if configured
    if (pusherServer) {
        const channelName = `private-user-${userId}`;
        await pusherServer.trigger(channelName, 'notification', {
            ...notification,
            createdAt: notification.createdAt.toISOString()
        });
    }

    return notification;
}

// Get notifications for current user
export async function getNotifications(limit: number = 20) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return [];

    // @ts-ignore
    const userId = session.user.id as string;
    if (!userId) return [];

    const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit
    });

    return notifications.map(n => ({
        ...n,
        createdAt: n.createdAt.toISOString()
    }));
}

// Get paginated notifications
export async function getPaginatedNotifications(page: number = 1, limit: number = 10) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { notifications: [], total: 0, totalPages: 0 };

    // @ts-ignore
    const userId = session.user.id as string;
    if (!userId) return { notifications: [], total: 0, totalPages: 0 };

    const skip = (page - 1) * limit;

    const [notifications, total] = await prisma.$transaction([
        prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
            skip: skip
        }),
        prisma.notification.count({
            where: { userId }
        })
    ]);

    return {
        notifications: notifications.map(n => ({
            ...n,
            createdAt: n.createdAt.toISOString()
        })),
        total,
        totalPages: Math.ceil(total / limit)
    };
}

// Get unread notification count
export async function getUnreadNotificationCount() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return 0;

    // @ts-ignore
    const userId = session.user.id as string;
    if (!userId) return 0;

    const count = await prisma.notification.count({
        where: { userId, isRead: false }
    });

    return count;
}

// Mark single notification as read
export async function markNotificationAsRead(notificationId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    // @ts-ignore
    const userId = session.user.id as string;

    await prisma.notification.updateMany({
        where: { id: notificationId, userId },
        data: { isRead: true }
    });

    return { success: true };
}

// Mark all notifications as read
export async function markAllNotificationsAsRead() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    // @ts-ignore
    const userId = session.user.id as string;

    await prisma.notification.updateMany({
        where: { userId, isRead: false },
        data: { isRead: true }
    });

    return { success: true };
}

// Delete all notifications
export async function deleteAllNotifications() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { error: "Unauthorized" };

    // @ts-ignore
    const userId = session.user.id as string;

    await prisma.notification.deleteMany({
        where: { userId }
    });

    return { success: true };
}

// Get global counts for navigation (messages + notifications)
export async function getNavigationCounts() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { unreadMessageCount: 0, unreadNotificationCount: 0 };

    // @ts-ignore
    const userId = session.user.id as string;

    const [unreadMessageCount, unreadNotificationCount] = await Promise.all([
        prisma.message.count({
            where: {
                receiverId: userId,
                isRead: false,
                deletedByReceiver: false
            }
        }),
        prisma.notification.count({
            where: { userId, isRead: false }
        })
    ]);

    return { unreadMessageCount, unreadNotificationCount };
}
