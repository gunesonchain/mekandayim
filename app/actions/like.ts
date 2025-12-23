'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/actions/notifications";

export async function toggleLike(entryId: string) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return { error: "Beğenmek için giriş yapmalısınız." };
    }

    // @ts-ignore
    const userId = session.user.id || session.user.image;

    // Check if user is banned
    const currentUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { isBanned: true }
    });

    if (currentUser?.isBanned) {
        return { error: "Hesabınız engellenmiş." };
    }

    // Check if entry exists and is not deleted
    const entry = await prisma.entry.findUnique({
        where: { id: entryId },
        select: { isDeleted: true }
    });

    if (!entry) {
        return { error: "İtiraf bulunamadı." };
    }

    if (entry.isDeleted) {
        return { error: "Bu itiraf silinmiş." };
    }

    try {
        const existingLike = await prisma.like.findUnique({
            where: {
                userId_entryId: {
                    userId,
                    entryId
                }
            }
        });

        if (existingLike) {
            // Unlike
            await prisma.like.delete({
                where: {
                    userId_entryId: {
                        userId,
                        entryId
                    }
                }
            });
            revalidatePath('/');
            revalidatePath(`/location/${entryId}`); // Close enough, ideally locationId
            return { action: 'unliked' };
        } else {
            // Like
            const like = await prisma.like.create({
                data: {
                    userId,
                    entryId
                }
            });

            // Get entry details for notification
            const entryDetails = await prisma.entry.findUnique({
                where: { id: entryId },
                select: {
                    userId: true,
                    createdAt: true,
                    location: {
                        select: {
                            id: true,
                            slug: true
                        }
                    }
                }
            });

            // Get liker's username
            const liker = await prisma.user.findUnique({
                where: { id: userId },
                select: { username: true }
            });

            // Send notification to entry owner (if not self-like)
            if (entryDetails && entryDetails.userId !== userId && liker) {
                // Calculate page number for the entry
                const count = await prisma.entry.count({
                    where: {
                        locationId: entryDetails.location.id,
                        isDeleted: false,
                        createdAt: {
                            gt: entryDetails.createdAt // Newer entries come first
                        }
                    }
                });

                const PAGE_SIZE = 10;
                const pageNumber = Math.floor(count / PAGE_SIZE) + 1;

                let link = `/location/${entryDetails.location.slug}`;
                if (pageNumber > 1) {
                    link += `?page=${pageNumber}`;
                }
                link += `#${entryId}`;

                await createNotification(
                    entryDetails.userId,
                    'like',
                    `@${liker.username} itirafınızı beğendi`,
                    link
                );
            }

            revalidatePath('/');
            revalidatePath(`/location/${entryId}`);
            return { action: 'liked' };
        }
    } catch (error) {
        console.error("Link toggle error:", error);
        return { error: "Bir hata oluştu." };
    }
}
