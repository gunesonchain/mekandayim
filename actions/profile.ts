'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import bcrypt from 'bcryptjs';

export async function updateProfile(prevState: any, formData: FormData) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return { message: 'Oturum açmanız gerekiyor.', type: 'error' };
    }

    const name = formData.get('name') as string;
    const bio = formData.get('bio') as string;
    const image = formData.get('image') as string; // Expecting Base64 string
    const hideEntries = formData.get('hideEntries') === 'true'; // Toggle value

    try {
        const updateData: any = {};
        if (name) updateData.name = name;
        if (bio !== null) updateData.bio = bio;
        if (image) updateData.image = image;
        updateData.hideEntries = hideEntries;

        await prisma.user.update({
            where: { email: session.user.email },
            data: updateData,
        });

        revalidatePath('/profile');
        return { message: 'Profil başarıyla güncellendi.', type: 'success' };
    } catch (error) {
        console.error('Update Profile Error:', error);
        return { message: 'Bir hata oluştu.', type: 'error' };
    }
}

export async function changePassword(prevState: any, formData: FormData) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return { message: 'Oturum açmanız gerekiyor.', type: 'error' };
    }

    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (!currentPassword || !newPassword || !confirmPassword) {
        return { message: 'Tüm alanları doldurunuz.', type: 'error' };
    }

    if (newPassword !== confirmPassword) {
        return { message: 'Yeni şifreler eşleşmiyor.', type: 'error' };
    }

    if (newPassword.length < 6) {
        return { message: 'Yeni şifre en az 6 karakter olmalıdır.', type: 'error' };
    }

    try {
        // Get user to check current password
        // Since we are using an auth strategy where specific user retrieval might be needed for password check
        // We need to fetch the user including the password field (which is usually excluded in session)
        // Note: Password field must be selected explicitly if not default, but Prisma model usually returns it unless excluded in query.
        // Wait, default findUnique returns all scalar fields.
        const user = await prisma.user.findUnique({
            where: { email: session.user.email },
        });

        if (!user || !user.password) {
            // If user logged in via Google/OAuth, they might not have a password.
            return { message: 'Kullanıcı bulunamadı veya şifre belirlenmemiş (Google girişi?).', type: 'error' };
        }

        const isValid = await bcrypt.compare(currentPassword, user.password);

        if (!isValid) {
            return { message: 'Mevcut şifre yanlış.', type: 'error' };
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await prisma.user.update({
            where: { email: session.user.email },
            data: { password: hashedPassword },
        });

        revalidatePath('/profile');
        return { message: 'Şifreniz başarıyla değiştirildi.', type: 'success' };
    } catch (error) {
        console.error('Change Password Error:', error);
        return { message: 'Bir hata oluştu.', type: 'error' };
    }
}
