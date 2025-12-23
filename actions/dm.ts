'use server';

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { pusherServer } from "@/lib/pusher";
import { createNotification } from "@/actions/notifications";

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
    // OPTIMIZATION: Use select to avoiding fetching the 'image' field (Base64) which causes huge network usage
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
        select: {
            id: true,
            content: true,
            senderId: true,
            receiverId: true,
            createdAt: true,
            isRead: true,
            deletedBySender: true,
            deletedByReceiver: true,
            clearedBySender: true,
            clearedByReceiver: true,
            // image: false, // Explicitly NOT selecting image
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
                // Note: We don't have 'image' field anymore, so we can't show '📷 Fotoğraf'
                // If content is empty (image only message), it will show empty string or we can show generic text if needed.
                lastMessage: isCleared ? '' : (msg.content || 'Bir gönderi'),
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

export async function getMessage(messageId: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return null;

    // @ts-ignore
    const userId = session.user.id as string;

    const message = await prisma.message.findUnique({
        where: { id: messageId },
        include: {
            sender: { select: { id: true, username: true, image: true } },
            receiver: { select: { id: true, username: true, image: true } }
        }
    });

    if (!message) return null;

    // Security check: user must be sender or receiver
    if (message.senderId !== userId && message.receiverId !== userId) {
        return null;
    }

    return {
        ...message,
        createdAt: message.createdAt.toISOString()
    };
}

export async function getMessages(otherUserId: string, cursor?: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) return { messages: [], hasMore: false };

    // @ts-ignore
    const userId = session.user.id as string;

    if (!userId) return { messages: [], hasMore: false };

    const LIMIT = 20; // Messages per page

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
            createdAt: 'desc' // Get newest first
        },
        take: LIMIT + 1, // Fetch one extra to check if more exist
        ...(cursor ? {
            cursor: { id: cursor },
            skip: 1 // Skip the cursor item
        } : {})
    });

    const hasMore = messages.length > LIMIT;
    const resultMessages = hasMore ? messages.slice(0, LIMIT) : messages;

    // Mark messages from other user as read (only on initial load)
    if (!cursor) {
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

        revalidatePath('/dm');
    }

    // Reverse to get oldest first for display
    return {
        messages: resultMessages.reverse().map(msg => ({
            ...msg,
            createdAt: msg.createdAt.toISOString()
        })),
        hasMore
    };
}

export async function sendMessage(receiverId: string, content: string, image?: string) {
    if (image) {
        console.log("Server received message with image size: " + (image.length / 1024).toFixed(2) + " KB");
    } else {
        console.log("Server received message without image");
    }
    const session = await getServerSession(authOptions);
    if (!session?.user) throw new Error("Unauthorized");

    // @ts-ignore
    const senderId = session.user.id as string;

    if (!senderId) throw new Error("Unauthorized");

    // Check if sender is banned
    const sender = await prisma.user.findUnique({
        where: { id: senderId },
        select: { isBanned: true }
    });

    if (sender?.isBanned) {
        throw new Error("Hesabınız engellenmiş.");
    }

    // Check if receiver exists and is not banned
    const receiver = await prisma.user.findUnique({
        where: { id: receiverId },
        select: { isBanned: true }
    });

    if (!receiver) {
        throw new Error("Kullanıcı bulunamadı.");
    }

    if (receiver.isBanned) {
        throw new Error("Bu kullanıcıya mesaj gönderemezsiniz.");
    }

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

    // Trigger real-time event via Pusher
    if (pusherServer) {
        // Create unique channel name for this conversation
        const channelName = `private-chat-${[senderId, receiverId].sort().join('-')}`;

        await pusherServer.trigger(channelName, 'new-message', {
            ...message,
            image: message.image ? 'sent-image' : null, // Don't send full base64 to Pusher (limit 10KB)
            hasImage: !!message.image,
            createdAt: message.createdAt.toISOString()
        });

        // Also trigger a 'message-count-update' event for the receiver
        // This allows the receiver's global message count to update instantly
        const userChannel = `private-user-${receiverId}`;
        await pusherServer.trigger(userChannel, 'info-update', {
            type: 'message-received'
        });
    }

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
