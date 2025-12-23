import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
    metadataBase: new URL('https://mekan-itiraflari.com'),
    title: {
        default: "Mekan İtirafları | Anonim Sosyalleşme",
        template: "%s | Mekan İtirafları"
    },
    description: "Gittiğin mekanlar hakkında itirafları oku, deneyimlerini anonim olarak paylaş. Kafe, restoran ve barların bilinmeyen yüzü.",
    applicationName: "Mekan İtirafları",
    keywords: ["mekan", "itiraf", "cafe", "restoran", "anonim", "sosyal medya", "yorum"],
    authors: [{ name: "Mekan İtirafları Team" }],
    creator: "Mekan İtirafları",
    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },
    openGraph: {
        type: "website",
        locale: "tr_TR",
        url: 'https://mekan-itiraflari.com',
        title: "Mekan İtirafları | Şehrin Fısıltıları",
        description: "Mekanlar hakkında konuşulanları keşfet.",
        siteName: "Mekan İtirafları",
        images: [
            {
                url: '/og-image.jpg', // User needs to add this file
                width: 1200,
                height: 630,
                alt: 'Mekan İtirafları',
            },
        ],
    },
    twitter: {
        card: "summary_large_image",
        title: "Mekan İtirafları",
        description: "Mekanlar hakkında konuşulanları keşfet.",
        images: ['/og-image.jpg'], // User needs to add this file
    },
};

import Header from "@/components/Header";
import ConditionalFooter from "@/components/ConditionalFooter";
import AuthProvider from "@/components/AuthProvider";
import { MobileLayoutProvider } from "@/components/MobileLayoutContext";
import { NotificationProvider } from "@/components/NotificationContext";


import { ConfirmationProvider } from "@/components/ConfirmationContext";
import { ReportProvider } from "@/components/ReportContext";
import { ToastProvider } from "@/components/ToastContext"; // Import ToastProvider
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUnreadMessageCount } from "@/app/actions";

import NextTopLoader from 'nextjs-toploader';

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const session = await getServerSession(authOptions);
    let unreadCount = 0;

    if (session?.user) {
        // @ts-ignore
        const userId = session.user.id as string || session.user.sub as string;
        if (userId) {
            unreadCount = await getUnreadMessageCount(userId);
        }
    }

    return (
        <html lang="tr">
            <body className={outfit.className + " flex flex-col min-h-screen bg-black text-white antialiased selection:bg-purple-500/30"}>
                <NextTopLoader
                    color="#A855F7"
                    initialPosition={0.08}
                    crawlSpeed={200}
                    height={2}
                    crawl={true}
                    showSpinner={false}
                    easing="ease"
                    speed={200}
                    shadow="0 0 10px #A855F7,0 0 5px #A855F7"
                />
                <AuthProvider>
                    <ConfirmationProvider>
                        <ReportProvider>
                            <ToastProvider>
                                <NotificationProvider initialCount={unreadCount}>
                                    <MobileLayoutProvider>
                                        <Header />
                                        <div className="flex-1">
                                            {children}
                                        </div>
                                        <ConditionalFooter />
                                    </MobileLayoutProvider>
                                </NotificationProvider>
                            </ToastProvider>
                        </ReportProvider>
                    </ConfirmationProvider>
                </AuthProvider>
            </body>
        </html>
    );
}
