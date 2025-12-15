import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function ProfileRedirectPage() {
    const session = await getServerSession(authOptions);

    if (!session || !session.user?.email) {
        redirect('/api/auth/signin');
    }

    // Fetch user to get username
    const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { username: true }
    });

    if (!user) {
        redirect('/');
    }

    redirect(`/user/${user.username}`);
}
