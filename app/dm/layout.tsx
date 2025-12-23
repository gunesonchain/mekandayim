import { getConversations } from "@/actions/dm";
import ConversationList from "@/components/dm/ConversationList";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DMLayoutClient from "@/components/dm/DMLayoutClient";

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
        <DMLayoutClient>
            <div className="fixed inset-0 top-[64px] z-0 lg:static lg:z-auto lg:h-[calc(100vh-180px)] lg:py-4 container mx-auto max-w-5xl h-[calc(100dvh-64px)]">
                <div className="flex h-full bg-black/40 backdrop-blur-xl lg:border lg:border-white/10 lg:rounded-2xl overflow-hidden shadow-2xl">

                    {/* Sidebar - Hidden on mobile if viewing a chat (handled via CSS/Logic usually, but here commonly standard logic is tricky in RSC) 
                        For simplicity: On Desktop it's distinct. On Mobile we rely on page routing.
                    */}
                    <div className="hidden lg:flex flex-col w-80 border-r border-white/10 bg-black/20">
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
        </DMLayoutClient>
    );
}
