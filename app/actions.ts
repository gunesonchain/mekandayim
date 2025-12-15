'use server';

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hash } from "bcrypt";

import { slugify } from "@/lib/utils";
import { getPlaceDetails } from "@/lib/google-places";

// ... existing imports

import { sendVerificationEmail } from "@/lib/mail";
import crypto from "crypto";

// ... existing imports

export async function createEntry(formData: FormData) {
    const content = formData.get('content') as string;
    const locationId = formData.get('locationId') as string; // This is Google ID
    const locationName = formData.get('locationName') as string;
    const locationPhotoUrl = formData.get('locationPhotoUrl') as string;
    const userId = formData.get('userId') as string;

    console.log("Creating Entry Request:", { content, locationId, locationName, userId });

    // Strict validation
    if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return { error: "İçerik boş olamaz." };
    }
    if (content.length > 200) {
        return { error: "İtiraf çok uzun! Maksimum 200 karakter." };
    }
    if (!locationId || typeof locationId !== 'string') {
        return { error: "Mekan seçilmedi." };
    }
    if (!userId || typeof userId !== 'string') {
        return { error: "Kullanıcı bulunamadı. Lütfen tekrar giriş yapın." };
    }

    // EMAIL VERIFICATION CHECK
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { emailVerified: true }
    });

    if (!user) return { error: "Kullanıcı bulunamadı." };

    // Allow users registered BEFORE this change to bypass? 
    // Or strictly enforce? User said "Gold Standard". Enforce.
    // But for existing users (like Batuhan), emailVerified is null.
    // I should probably manually verify existing users or add a fallback logic.
    // For now, I will NOT block existing users if they were created before "now"? No, can't check that easily without specific migration logic.
    // To safe guard the USER who is testing, I will update THEIR user manually later or let them verify.
    // Enforcing strict check:
    if (!user.emailVerified) {
        return { error: "İtiraf yazmak için lütfen e-postanızı onaylayın." };
    }

    // Rate Limiting: Max 3 entries per minute
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentEntryCount = await prisma.entry.count({
        where: {
            userId: userId,
            createdAt: { gte: oneMinuteAgo }
        }
    });

    if (recentEntryCount >= 3) {
        return { error: "Çok hızlı itiraf giriyorsunuz. Lütfen biraz bekleyin." };
    }

    try {
        // 1. Ensure Location exists in DB
        let location = await prisma.location.findUnique({
            where: { googleId: locationId }
        });

        if (!location) {
            console.log("Location not found in DB, creating new:", locationName);
            if (!locationName) return { error: "Mekan ismi eksik." }; // Cannot create without name

            try {
                // Generare slug
                const slug = slugify(locationName);

                // Simple implementation first:
                // Note: handling slug uniqueness fully is complex, assuming slugify is mostly unique or manually fixed for now
                let finalSlug = slug;
                const existingSlug = await prisma.location.findUnique({ where: { slug } });
                if (existingSlug) {
                    finalSlug = `${slug}-${locationId.slice(-4)}`; // append part of ID to make unique
                }

                location = await prisma.location.create({
                    data: {
                        googleId: locationId,
                        name: locationName,
                        slug: finalSlug,
                        photoUrl: locationPhotoUrl || null
                    }
                });
                console.log("Location created successfully:", location.id);
            } catch (locError) {
                console.error("Failed to create location:", locError);
                return { error: "Mekan oluşturulurken bir hata oluştu." };
            }
        } else {
            console.log("Location found:", location.id);
            // Optional: Update photoUrl if it was null?
            if (!location.photoUrl && locationPhotoUrl) {
                await prisma.location.update({
                    where: { id: location.id },
                    data: { photoUrl: locationPhotoUrl }
                });
            }
        }

        // 2. Create Entry
        console.log("Creating entry for user:", userId);
        const entry = await prisma.entry.create({
            data: {
                content: content,
                userId: userId,
                locationId: location.id
            }
        });
        console.log("Entry created successfully:", entry.id);

        revalidatePath(`/location/${location.slug}`); // Use slug
        return { success: true, locationSlug: location.slug }; // Return slug
    } catch (error) {
        console.error("Failed to create entry:", error);
        return { error: "Bir hata oluştu. Lütfen tekrar deneyin." };
    }
}

export async function sendMessage(formData: FormData) {
    const session = await getServerSession(authOptions);

    const content = formData.get('content') as string;
    const receiverId = formData.get('receiverId') as string;
    // @ts-ignore
    const senderId = session?.user?.image || session?.user?.id; // Hack for ID

    if (!content || !receiverId || !senderId) return;

    // EMAIL VERIFICATION CHECK
    const user = await prisma.user.findUnique({
        where: { id: senderId },
        select: { emailVerified: true }
    });

    if (!user || !user.emailVerified) {
        // Can't return error in void action easily without changing signature, but for now we essentially block it.
        // Ideally should show toast.
        return { error: "Onaysız hesap." };
    }

    // Rate Limit for DM
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const recentMsgCount = await prisma.message.count({
        where: {
            senderId: senderId,
            createdAt: { gte: oneMinuteAgo }
        }
    });

    if (recentMsgCount >= 15) {
        return; // Silent fail or handle error
    }

    await prisma.message.create({
        data: {
            content,
            senderId,
            receiverId
        }
    });

    revalidatePath(`/dm/${receiverId}`);
    revalidatePath(`/dm`);
}

export async function registerUser(formData: FormData) {
    const username = formData.get('username') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // HONEYPOT CHECK
    const honeypot = formData.get('confirm_email') as string; // Hidden field
    if (honeypot) {
        console.log("Bot detected (Honeypot filled). Rejecting.");
        // Fake success to confuse bot
        return { success: true };
    }

    if (!username || !email || !password) {
        return { error: 'Lütfen tüm alanları doldurun.' };
    }

    try {
        const existing = await prisma.user.findFirst({
            where: {
                OR: [
                    { username },
                    { email }
                ]
            }
        });

        if (existing) {
            return { error: 'Bu kullanıcı adı veya e-posta zaten kullanımda.' };
        }

        const hashedPassword = await hash(password, 10);

        const newUser = await prisma.user.create({
            data: {
                username,
                email,
                password: hashedPassword,
                emailVerified: new Date() // AUTO-VERIFY for now
            }
        });

        // GENERATE TOKEN & SEND EMAIL (Disabled for now, will enable on Live)
        /*
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        await prisma.verificationToken.create({
            data: {
                identifier: email,
                token,
                expires
            }
        });

        await sendVerificationEmail(email, token);
        */

        return { success: true, message: "Kayıt başarılı! Giriş yapabilirsiniz." };
    } catch (error) {
        console.error("Register Error:", error);
        return { error: 'Bir hata oluştu.' };
    }
}

// Helper to ensure photo exists
async function ensureLocationPhoto(location: any) {
    if (!location.photoUrl) {
        console.log(`[PhotoDebug] Checking photo for: ${location.name} (${location.googleId})`);
        try {
            // Lazy load photo from Google Places
            const place = await getPlaceDetails(location.googleId);
            console.log(`[PhotoDebug] API Result used for ${location.name}:`, place ? "Found" : "Null", place?.photoUrl ? "HasPhoto" : "NoPhoto");

            if (place && place.photoUrl) {
                console.log(`[PhotoDebug] Updating DB for ${location.name} with photo: ${place.photoUrl.substring(0, 30)}...`);
                await prisma.location.update({
                    where: { id: location.id },
                    data: { photoUrl: place.photoUrl }
                });
                location.photoUrl = place.photoUrl;
            } else {
                console.log(`[PhotoDebug] No photo found in API for ${location.name}`);
            }
        } catch (e) {
            console.error(`[PhotoDebug] Failed to lazy load photo for ${location.name}`, e);
        }
    } else {
        // console.log(`[PhotoDebug] Location ${location.name} already has photo.`);
    }
    return location;
}

export async function getHomepageStats() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [recentLocations, popularLocations] = await Promise.all([
        // Recent: Locations with most recent entries
        prisma.entry.findMany({
            take: 5,
            orderBy: { createdAt: 'desc' },
            include: { location: true },
            distinct: ['locationId']
        }).then(async (entries) => {
            const locations = entries.map(e => e.location);
            return Promise.all(locations.map(ensureLocationPhoto));
        }),

        // Popular: Locations with most entries
        prisma.location.findMany({
            take: 5,
            orderBy: {
                entries: {
                    _count: 'desc'
                }
            },
            include: {
                _count: {
                    select: { entries: true }
                }
            }
        }).then(async (locations) => {
            // Enrich with 24h count AND ensure photo
            return Promise.all(locations.map(async (loc) => {
                const filledLoc = await ensureLocationPhoto(loc);
                const entries24h = await prisma.entry.count({
                    where: {
                        locationId: loc.id,
                        createdAt: { gte: oneDayAgo }
                    }
                });
                return { ...filledLoc, entries24h };
            }));
        })
    ]);

    return { recentLocations, popularLocations };
}

export async function getUnreadMessageCount(userId: string) {
    if (!userId) return 0;
    try {
        const count = await prisma.message.count({
            where: {
                receiverId: userId,
                isRead: false
            }
        });
        return count;
    } catch (error) {
        console.error("Failed to get unread count:", error);
        return 0;
    }
}

export async function deleteEntry(entryId: string, locationSlug: string) {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return { error: 'Oturum açmanız gerekiyor.' };
    }

    // @ts-ignore
    const userId = session.user.id as string;

    if (!userId) {
        return { error: 'Oturum açmanız gerekiyor.' };
    }

    try {
        const entry = await prisma.entry.findUnique({
            where: { id: entryId },
            select: { userId: true }
        });

        if (!entry) {
            return { error: 'İtiraf bulunamadı.' };
        }

        if (entry.userId !== userId) {
            return { error: 'Bu itirafı silme yetkiniz yok.' };
        }

        await prisma.entry.delete({
            where: { id: entryId }
        });

        revalidatePath(`/location/${locationSlug}`);
        return { success: true };
    } catch (error) {
        console.error("Delete Entry Error:", error);
        return { error: 'Silme işlemi başarısız oldu.' };
    }
}
