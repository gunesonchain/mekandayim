'use client';

import { createEntry } from "@/app/actions";
import { Send } from "lucide-react";
import { useRef, useState } from "react";
import { useMobileLayout } from "./MobileLayoutContext";

interface NewEntryFormProps {
    locationId: string;
    locationName: string;
    userId: string;
    locationPhotoUrl?: string;
}

export default function NewEntryForm({ locationId, locationName, userId, locationPhotoUrl }: NewEntryFormProps) {
    const formRef = useRef<HTMLFormElement>(null);
    const { closeEntryModal } = useMobileLayout();

    async function clientAction(formData: FormData) {
        const result = await createEntry(formData);
        if (result?.error) {
            alert(result.error);
        } else if (result?.success) {
            formRef.current?.reset();
            closeEntryModal();
        }
    }

    const [charCount, setCharCount] = useState(0);

    return (
        <form ref={formRef} action={clientAction} className="flex flex-col gap-4">
            <input type="hidden" name="locationId" value={locationId} />
            <input type="hidden" name="locationName" value={locationName} />
            <input type="hidden" name="userId" value={userId} />
            <input type="hidden" name="locationPhotoUrl" value={locationPhotoUrl || ''} />

            <div className="relative">
                <textarea
                    name="content"
                    placeholder="Burada ne yaşandı? Dedikodu, itiraf, tavsiye..."
                    rows={4}
                    required
                    maxLength={200}
                    onChange={(e) => setCharCount(e.target.value.length)}
                    className="w-full glass-panel !bg-white/5 !border-white/10 rounded-2xl p-4 text-white text-base focus:border-purple-500 focus:ring-1 focus:ring-purple-500/50 outline-none resize-none placeholder:text-gray-500 transition-all pb-8"
                />
                <div className={`absolute bottom-3 right-4 text-xs font-medium transition-colors ${charCount > 180 ? 'text-red-400' : 'text-gray-500'
                    }`}>
                    {charCount}/200
                </div>
            </div>

            <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-4 rounded-xl font-bold text-base transition-all shadow-lg shadow-purple-900/20 active:scale-[0.98] flex items-center justify-center gap-2">
                <Send size={18} />
                İtirafı Paylaş
            </button>
        </form>
    );
}
