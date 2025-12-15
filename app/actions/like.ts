'use server';

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function toggleLike(entryId: string) {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
        return { error: "Beğenmek için giriş yapmalısınız." };
    }

    // @ts-ignore
    const userId = session.user.id || session.user.image;

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
            await prisma.like.create({
                data: {
                    userId,
                    entryId
                }
            });
            revalidatePath('/');
            revalidatePath(`/location/${entryId}`);
            return { action: 'liked' };
        }
    } catch (error) {
        console.error("Link toggle error:", error);
        return { error: "Bir hata oluştu." };
    }
}
