'use server';

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function getConversations() {
    const session = await getServerSession(authOptions);
    if (!session?.user) return [];

    // @ts-ignore
    const userId = session.user.id as string;

    if (!userId) return [];

    // Helper to get logic for filtering deleted messages
    const notDeletedForUser = {
        OR: [
            // If I am sender, I shouldn't have deleted it
            { senderId: userId, deletedBySender: false },
            // If I am receiver, I shouldn't have deleted it
            { receiverId: userId, deletedByReceiver: false }
        ]
    };

    // Fetch all messages where current user is sender OR receiver
    // AND the message isn't deleted by them
    // Fetch all messages where current user is sender OR receiver
    // AND the message isn't deleted by them (deleted means removed from list)
    const messages = await prisma.message.findMany({
        where: {
            AND: [
                {
                    OR: [
                        { senderId: userId },
                        { receiverId: userId }
                    ]
                },
                notDeletedForUser
            ]
        },
        orderBy: {
            createdAt: 'desc'
        },
        include: {
            sender: {
                select: { id: true, username: true, image: true }
            },
            receiver: {
                select: { id: true, username: true, image: true }
            }
        }
    });

    // Map unique users and their stats
    const conversationMap = new Map();

    for (const msg of messages) {
        // Determine who the "other" person is
        const otherUser = msg.senderId === userId ? msg.receiver : msg.sender;

        // Check if this specific message is cleared by me
        const isCleared = (msg.senderId === userId && msg.clearedBySender) ||
            (msg.receiverId === userId && msg.clearedByReceiver);

        // Initialize if not exists
        if (!conversationMap.has(otherUser.id)) {
            // Found the LATEST message for this conversation

            // If it's cleared, we show empty state (but it exists in list)
            // If not cleared, we show content
            conversationMap.set(otherUser.id, {
                user: otherUser,
                lastMessage: isCleared ? '' : (msg.content || (msg.image ? '📷 Fotoğraf' : '')),
                lastMessageDate: msg.createdAt,
                isRead: true, // Default
                unreadCount: 0
            });

            // Set isRead logic if NOT cleared (if cleared, it's effectively read/gone)
            if (!isCleared && msg.senderId !== userId && !msg.isRead) {
                conversationMap.get(otherUser.id).isRead = false;
            }
        }

        const conv = conversationMap.get(otherUser.id);

        // Increment unread count only if NOT cleared and I am receiver
        if (!isCleared && msg.senderId !== userId && !msg.isRead) {
            conv.unreadCount += 1;
        }
    }

    return Array.from(conversationMap.values());
}

export async function getMessages(otherUserId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return [];

    // @ts-ignore
    const userId = session.user.id as string;

    if (!userId) return [];

    const messages = await prisma.message.findMany({
        where: {
            AND: [
                {
                    OR: [
                        { senderId: userId, receiverId: otherUserId },
                        { senderId: otherUserId, receiverId: userId }
                    ]
                },
                {
                    OR: [
                        { senderId: userId, deletedBySender: false, clearedBySender: false },
                        { receiverId: userId, deletedByReceiver: false, clearedByReceiver: false }
                    ]
                }
            ]
        },
        orderBy: {
            createdAt: 'asc'
        }
    });

    // Mark messages from other user as read when fetched
    await prisma.message.updateMany({
        where: {
            senderId: otherUserId,
            receiverId: userId,
            isRead: false
        },
        data: {
            isRead: true
        }
    });

    // Silent revalidate to update sidebar badges if needed
    revalidatePath('/dm');

    return messages.map(msg => ({
        ...msg,
        createdAt: msg.createdAt.toISOString()
    }));
}

export async function sendMessage(receiverId: string, content: string, image?: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    // @ts-ignore
    const senderId = session.user.id as string;

    if (!senderId) throw new Error("Unauthorized");

    // Rate Limiting: Max 15 messages per minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentMessageCount = await prisma.message.count({
        where: {
            senderId: senderId,
            createdAt: { gte: oneMinuteAgo }
        }
    });

    if (recentMessageCount >= 15) {
        throw new Error("Çok hızlı mesaj gönderiyorsunuz. Lütfen biraz bekleyin.");
    }

    const message = await prisma.message.create({
        data: {
            content,
            image,
            senderId,
            receiverId
        }
    });

    revalidatePath('/dm');
    revalidatePath(`/dm/${receiverId}`);

    return {
        ...message,
        createdAt: message.createdAt.toISOString()
    };
}

export async function clearConversation(otherUserId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    // @ts-ignore
    const userId = session.user.id as string;

    if (!userId) throw new Error("Unauthorized");

    // "Clear" messages (hide content, keep in list if desired, but getMessages hides them)
    // Actually, getConversations logic above handles 'cleared' messages as visible in list but empty content.
    // So we just set cleared = true.

    await prisma.message.updateMany({
        where: { senderId: userId, receiverId: otherUserId },
        data: { clearedBySender: true }
    });

    await prisma.message.updateMany({
        where: { senderId: otherUserId, receiverId: userId },
        data: { clearedByReceiver: true }
    });

    revalidatePath('/dm');
    revalidatePath(`/dm/${otherUserId}`);
}

export async function deleteConversation(otherUserId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    // @ts-ignore
    const userId = session.user.id as string;

    if (!userId) throw new Error("Unauthorized");

    // "Soft delete" messsages (Remove from list)
    await prisma.message.updateMany({
        where: { senderId: userId, receiverId: otherUserId },
        data: { deletedBySender: true }
    });

    await prisma.message.updateMany({
        where: { senderId: otherUserId, receiverId: userId },
        data: { deletedByReceiver: true }
    });

    revalidatePath('/dm');
    revalidatePath(`/dm/${otherUserId}`);
}
