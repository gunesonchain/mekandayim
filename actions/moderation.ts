'use server';

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { createNotification } from "./notifications";

// --- HELPERS ---

async function getSessionUser() {
    const session = await getServerSession(authOptions);
    return session?.user;
}

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REPORTS = 2;

// --- ACTIONS ---

// ... existing helper ...

export async function reportEntry(entryId: string, reason: string) {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return { error: "Şikayet etmek için giriş yapmalısınız." };

    // @ts-ignore
    const reporterId = sessionUser.id;

    // Check if user is banned (from DB since session doesn't have isBanned)
    const user = await prisma.user.findUnique({
        where: { id: reporterId },
        select: { isBanned: true }
    });

    if (user?.isBanned) {
        return { error: "Hesabınız engellenmiş." };
    }

    if (!reason || reason.trim().length < 3) {
        return { error: "Lütfen geçerli bir sebep belirtin." };
    }

    if (reason.length > 100) {
        return { error: "Şikayet sebebi en fazla 100 karakter olabilir." };
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
        return { error: "Bu itiraf zaten silinmiş." };
    }

    // Rate Limiting
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - RATE_LIMIT_WINDOW);

    const recentReports = await prisma.report.count({
        where: {
            reporterId,
            createdAt: { gte: oneMinuteAgo }
        }
    });

    if (recentReports >= MAX_REPORTS) {
        return { error: "Çok hızlı işlem yapıyorsunuz. Lütfen biraz bekleyin." };
    }

    try {
        await prisma.report.create({
            data: {
                reason,
                reporterId,
                entryId
            }
        });
        return { success: true };
    } catch (error) {
        console.error("Report Error:", error);
        return { error: "Bir hata oluştu." };
    }
}

export async function getReports() {
    const user = await getSessionUser();
    // @ts-ignore
    if (!user || user.role !== 'MODERATOR') return { error: "Yetkisiz işlem." };

    try {
        // Fetch ALL reports (Pending + Resolved/Dismissed)
        const reports = await prisma.report.findMany({
            include: {
                entry: {
                    include: {
                        user: true
                    }
                },
                reporter: true
            },
            orderBy: { createdAt: 'desc' }
        });

        // Group reports by entryId
        const groupedReports: Record<string, { entry: any, count: number, reports: any[], status: 'PENDING' | 'RESOLVED' | 'DISMISSED' }> = {};

        for (const report of reports) {
            if (!groupedReports[report.entry.id]) {
                groupedReports[report.entry.id] = {
                    entry: report.entry,
                    count: 0,
                    reports: [],
                    status: report.status as 'PENDING' | 'RESOLVED' | 'DISMISSED'
                };
            }

            // If any report is pending, the group is pending
            if (report.status === 'PENDING') {
                groupedReports[report.entry.id].status = 'PENDING';
            } else if (report.status === 'RESOLVED' && groupedReports[report.entry.id].status !== 'PENDING') {
                groupedReports[report.entry.id].status = 'RESOLVED';
            }

            groupedReports[report.entry.id].count++;
            groupedReports[report.entry.id].reports.push(report);
        }

        const allGroups = Object.values(groupedReports).sort((a, b) => b.count - a.count);

        const pendingGroups = allGroups.filter(g => g.status === 'PENDING');
        const resolvedGroups = allGroups.filter(g => g.status === 'RESOLVED');
        const dismissedGroups = allGroups.filter(g => g.status === 'DISMISSED');

        return { pendingGroups, resolvedGroups, dismissedGroups };
    } catch (error) {
        return { error: "Raporlar alınamadı." };
    }
}




export async function dismissReport(reportId: string, _formData?: FormData) {
    const user = await getSessionUser();
    // @ts-ignore
    if (!user || user.role !== 'MODERATOR') return;

    try {
        const report = await prisma.report.update({
            where: { id: reportId },
            data: { status: 'DISMISSED' }
        });

        // Notification removed based on user request (no alert on ignore)
        // await createNotification(report.reporterId, 'report_dismissed', ...);

        revalidatePath('/reports');
    } catch (error) {
        console.error("Dismiss Report Error:", error);
    }
}

export async function deleteEntryAndResolveReport(entryId: string, _formData?: FormData) {
    const user = await getSessionUser();
    // @ts-ignore
    if (!user || user.role !== 'MODERATOR') return;

    try {
        // Fetch pending reports to notify users
        const pendingReports = await prisma.report.findMany({
            where: { entryId, status: 'PENDING' }
        });

        // SOFT DELETE: Update isDeleted to true
        await prisma.entry.update({
            where: { id: entryId },
            data: { isDeleted: true }
        });


        // Resolve all reports associated with this entry
        await prisma.report.updateMany({
            where: { entryId },
            data: { status: 'RESOLVED' }
        });

        // Notify reporters (Unique per user)
        const notifiedUserIds = new Set<string>();

        for (const report of pendingReports) {
            if (!notifiedUserIds.has(report.reporterId)) {
                await createNotification(
                    report.reporterId,
                    'report_resolved',
                    'Şikayetiniz haklı bulundu ve içerik kaldırıldı. Teşekkürler!'
                );
                notifiedUserIds.add(report.reporterId);
            }
        }

        revalidatePath('/reports');
    } catch (error) {
        console.error("Delete Action Failed:", error);
    }
}

export async function dismissAllReportsForEntry(entryId: string, _formData?: FormData) {
    const user = await getSessionUser();
    // @ts-ignore
    if (!user || user.role !== 'MODERATOR') return;

    try {
        // Fetch pending reports to notify users
        const pendingReports = await prisma.report.findMany({
            where: { entryId, status: 'PENDING' }
        });

        await prisma.report.updateMany({
            where: { entryId },
            data: { status: 'DISMISSED' }
        });

        // Notify reporters (Unique per user)
        const notifiedUserIds = new Set<string>();

        // Notification removed based on user request (no alert on ignore)
        /*
        for (const report of pendingReports) {
            if (!notifiedUserIds.has(report.reporterId)) {
                await createNotification(
                   // ...
                );
                notifiedUserIds.add(report.reporterId);
            }
        }
        */

        revalidatePath('/reports');
    } catch (error) {
        console.error("Dismiss All Error:", error);
    }
}


export async function restoreReportGroup(entryId: string, _formData?: FormData) {
    const user = await getSessionUser();
    // @ts-ignore
    if (!user || user.role !== 'MODERATOR') return;

    try {
        // 1. Restore the entry if it was deleted
        await prisma.entry.update({
            where: { id: entryId },
            data: { isDeleted: false }
        });

        // 2. Set all reports back to PENDING
        await prisma.report.updateMany({
            where: { entryId },
            data: { status: 'PENDING' }
        });

        revalidatePath('/reports');
    } catch (error) {
        console.error(error);
    }
}

export async function banUser(userId: string, _formData?: FormData) {
    const user = await getSessionUser();
    // @ts-ignore
    if (!user || user.role !== 'MODERATOR') return { error: "Yetkisiz işlem." };

    try {
        // Ban user
        const bannedUser = await prisma.user.update({
            where: { id: userId },
            data: { isBanned: true }
        });

        revalidatePath('/reports');
        revalidatePath(`/user/${bannedUser.username}`);
        revalidatePath('/bans');
        return { success: true };
    } catch (error) {
        console.error("Ban Error:", error);
        return { error: "Bir hata oluştu." };
    }
}

export async function unbanUser(userId: string) {
    const user = await getSessionUser();
    // @ts-ignore
    if (!user || user.role !== 'MODERATOR') return { error: "Yetkisiz işlem." };

    try {
        const unbannedUser = await prisma.user.update({
            where: { id: userId },
            data: { isBanned: false }
        });

        revalidatePath('/bans');
        revalidatePath(`/user/${unbannedUser.username}`);
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error("Unban Error:", error);
        return { error: "Bir hata oluştu." };
    }
}

export async function getBannedUsers(search?: string) {
    const user = await getSessionUser();
    // @ts-ignore
    if (!user || user.role !== 'MODERATOR') return { error: "Yetkisiz işlem.", users: [] };

    try {
        const users = await prisma.user.findMany({
            where: {
                isBanned: true,
                ...(search ? {
                    OR: [
                        { username: { contains: search, mode: 'insensitive' } },
                        { email: { contains: search, mode: 'insensitive' } }
                    ]
                } : {})
            },
            select: {
                id: true,
                username: true,
                email: true,
                createdAt: true,
                _count: {
                    select: { entries: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        return { users };
    } catch (error) {
        console.error("Get Banned Users Error:", error);
        return { error: "Kullanıcılar alınamadı.", users: [] };
    }
}
