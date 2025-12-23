import { getConversations } from "@/actions/dm";
import ConversationList from "@/components/dm/ConversationList";
import { MessageCircle } from "lucide-react";

export default async function DMPage() {
    const conversations = await getConversations();

    return (
        <div className="h-full">
            {/* Desktop Empty State */}
            <div className="hidden md:flex flex-col items-center justify-center h-full text-center text-gray-500">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <MessageCircle size={40} className="text-gray-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Mesajlarınız</h3>
                <p>Mesajlaşmaya başlamak için bir sohbet seçin veya bir kullanıcı profiline gidin.</p>
            </div>

            {/* Mobile Conversation List - Shown ONLY on mobile because sidebar is hidden */}
            <div className="md:hidden h-full flex flex-col">
                <div className="p-4 border-b border-white/10 font-bold text-white text-lg bg-black/40 backdrop-blur">
                    Mesajlar
                </div>
                <ConversationList conversations={conversations} />
            </div>
        </div>
    );
}
