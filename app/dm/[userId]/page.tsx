import { getMessages } from "@/actions/dm";
import ChatWindow from "@/components/dm/ChatWindow";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = 'force-dynamic';

export default async function DMUserPage({ params }: { params: { userId: string } }) {
    const session = await getServerSession(authOptions);
    if (!session?.user) redirect('/api/auth/signin');

    // @ts-ignore
    const userId = session.user.id;
    if (!userId) redirect('/api/auth/signin');

    const otherUser = await prisma.user.findUnique({
        where: { id: params.userId },
        select: { id: true, username: true, image: true }
    });

    if (!otherUser) notFound();

    const messages = await getMessages(params.userId);

    return (
        <div className="h-full flex flex-col relative z-0">
            <ChatWindow
                initialMessages={messages}
                otherUser={otherUser}
                currentUserId={userId}
            />
        </div>
    );
}
