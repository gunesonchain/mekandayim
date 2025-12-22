'use server';

import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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
    const user = await getSessionUser();
    if (!user) return { error: "Şikayet etmek için giriş yapmalısınız." };

    // @ts-ignore
    const reporterId = user.id;

    if (!reason || reason.trim().length < 3) {
        return { error: "Lütfen geçerli bir sebep belirtin." };
    }

    if (reason.length > 100) {
        return { error: "Şikayet sebebi en fazla 100 karakter olabilir." };
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
        const groupedReports: Record<string, { entry: any, count: number, reports: any[], status: 'PENDING' | 'RESOLVED' }> = {};

        for (const report of reports) {
            if (!groupedReports[report.entry.id]) {
                const groupStatus = report.status === 'PENDING' ? 'PENDING' : 'RESOLVED'; // Simplified status logic for group
                groupedReports[report.entry.id] = {
                    entry: report.entry,
                    count: 0,
                    reports: [],
                    status: groupStatus
                };
            }

            // If any report is pending, the group is pending
            if (report.status === 'PENDING') {
                groupedReports[report.entry.id].status = 'PENDING';
            }

            groupedReports[report.entry.id].count++;
            groupedReports[report.entry.id].reports.push(report);
        }

        const allGroups = Object.values(groupedReports).sort((a, b) => b.count - a.count);

        const pendingGroups = allGroups.filter(g => g.status === 'PENDING');
        const historyGroups = allGroups.filter(g => g.status !== 'PENDING');

        return { pendingGroups, historyGroups };
    } catch (error) {
        return { error: "Raporlar alınamadı." };
    }
}

export async function dismissReport(reportId: string) {
    const user = await getSessionUser();
    // @ts-ignore
    if (!user || user.role !== 'MODERATOR') return { error: "Yetkisiz işlem." };

    try {
        await prisma.report.update({
            where: { id: reportId },
            data: { status: 'DISMISSED' }
        });
        revalidatePath('/reports');
        return { success: true };
    } catch (error) {
        return { error: "İşlem başarısız." };
    }
}

export async function deleteEntryAndResolveReport(entryId: string, reportId?: string) {
    const user = await getSessionUser();
    // @ts-ignore
    if (!user || user.role !== 'MODERATOR') return { error: "Yetkisiz işlem." };

    try {
        console.log("Attempting soft delete for entry:", entryId);
        // SOFT DELETE: Update isDeleted to true
        await prisma.entry.update({
            where: { id: entryId },
            data: { isDeleted: true }
        });
        console.log("Soft delete successful");

        // Resolve all reports associated with this entry
        await prisma.report.updateMany({
            where: { entryId },
            data: { status: 'RESOLVED' }
        });

        revalidatePath('/reports');
        return { success: true };
    } catch (error) {
        console.error("Delete Action Failed:", error);
        return { error: "Silme işlemi başarısız." };
    }
}

export async function dismissAllReportsForEntry(entryId: string) {
    const user = await getSessionUser();
    // @ts-ignore
    if (!user || user.role !== 'MODERATOR') return { error: "Yetkisiz işlem." };

    try {
        await prisma.report.updateMany({
            where: { entryId },
            data: { status: 'DISMISSED' }
        });
        revalidatePath('/reports');
        return { success: true };
    } catch (error) {
        return { error: "İşlem başarısız." };
    }
}

export async function restoreReportGroup(entryId: string) {
    const user = await getSessionUser();
    // @ts-ignore
    if (!user || user.role !== 'MODERATOR') return { error: "Yetkisiz işlem." };

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
        return { success: true };
    } catch (error) {
        console.error(error);
        return { error: "Geri alma işlemi başarısız." };
    }
}

export async function banUser(userId: string) {
    const user = await getSessionUser();
    // @ts-ignore
    if (!user || user.role !== 'MODERATOR') return { error: "Yetkisiz işlem." };

    try {
        // Ban user
        await prisma.user.update({
            where: { id: userId },
            data: { isBanned: true }
        });

        revalidatePath('/reports');
        return { success: true };
    } catch (error) {
        return { error: "Ban işlemi başarısız oldu." };
    }
}
