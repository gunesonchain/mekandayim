
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { CheckCircle2, XCircle } from "lucide-react";

export default async function VerifyPage({
    searchParams,
}: {
    searchParams: { token?: string };
}) {
    const token = searchParams.token;
    let message = "Doğrulanıyor...";
    let success = false;

    if (!token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
                <div className="bg-white/5 p-8 rounded-2xl border border-white/10 text-center max-w-md w-full">
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-2xl font-bold mb-2">Hatalı Link</h1>
                    <p className="text-gray-400 mb-6">Doğrulama linki geçersiz veya eksik.</p>
                    <Link href="/" className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                        Anasayfaya Dön
                    </Link>
                </div>
            </div>
        );
    }

    try {
        const verificationToken = await prisma.verificationToken.findUnique({
            where: { token },
        });

        if (!verificationToken) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
                    <div className="bg-white/5 p-8 rounded-2xl border border-white/10 text-center max-w-md w-full">
                        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold mb-2">Geçersiz Token</h1>
                        <p className="text-gray-400 mb-6">Bu doğrulama linki kullanılmış veya hatalı.</p>
                        <Link href="/auth/signin" className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                            Giriş Yap
                        </Link>
                    </div>
                </div>
            );
        }

        if (new Date() > verificationToken.expires) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
                    <div className="bg-white/5 p-8 rounded-2xl border border-white/10 text-center max-w-md w-full">
                        <XCircle className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold mb-2">Süresi Dolmuş</h1>
                        <p className="text-gray-400 mb-6">Bu linkin süresi dolmuş. Lütfen tekrar kayıt olmayı deneyin.</p>
                        <Link href="/auth/register" className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                            Tekrar Kayıt Ol
                        </Link>
                    </div>
                </div>
            );
        }

        const existingUser = await prisma.user.findUnique({
            where: { email: verificationToken.identifier },
        });

        if (!existingUser) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
                    <p className="text-red-500">Kullanıcı bulunamadı.</p>
                </div>
            );
        }

        await prisma.user.update({
            where: { id: existingUser.id },
            data: { emailVerified: new Date() },
        });

        await prisma.verificationToken.delete({
            where: { token },
        });

        success = true;

    } catch (error) {
        console.error("Verification error:", error);
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-black text-white p-4">
            <div className="bg-white/5 p-8 rounded-2xl border border-white/10 text-center max-w-md w-full">
                {success ? (
                    <>
                        <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold mb-2">Hesap Onaylandı!</h1>
                        <p className="text-gray-400 mb-6">E-posta adresiniz başarıyla doğrulandı. Artık giriş yapabilir ve itiraf yazabilirsiniz.</p>
                        <Link href="/auth/signin" className="block w-full bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                            Giriş Yap
                        </Link>
                    </>
                ) : (
                    <>
                        <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold mb-2">Bir Hata Oluştu</h1>
                        <p className="text-gray-400 mb-6">Doğrulama işlemi sırasında beklenmedik bir hata oldu.</p>
                        <Link href="/" className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors">
                            Anasayfa
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
}
