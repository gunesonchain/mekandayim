import { getConversations } from "@/actions/dm";
import ConversationList from "@/components/dm/ConversationList";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DMLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect('/api/auth/signin');
    }

    const conversations = await getConversations();

    return (
        <div className="container mx-auto max-w-5xl h-[calc(100vh-80px)] md:h-[calc(100vh-180px)] md:py-4">
            <div className="flex h-full bg-black/40 backdrop-blur-xl md:border md:border-white/10 md:rounded-2xl overflow-hidden shadow-2xl">

                {/* Sidebar - Hidden on mobile if viewing a chat (handled via CSS/Logic usually, but here commonly standard logic is tricky in RSC) 
                    For simplicity: On Desktop it's distinct. On Mobile we rely on page routing.
                */}
                <div className="hidden md:flex flex-col w-80 border-r border-white/10 bg-black/20">
                    <div className="p-4 border-b border-white/10 font-bold text-white text-lg">
                        Mesajlar
                    </div>
                    <ConversationList conversations={conversations} />
                </div>

                {/* Main Content Area */}
                <div className="flex-1 h-full relative">
                    {children}
                </div>
            </div>
        </div>
    );
}
