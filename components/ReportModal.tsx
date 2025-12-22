'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Flag, X } from 'lucide-react';
import { useState } from 'react';

interface ReportModalProps {
    isOpen: boolean;
    title?: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: (reason: string) => void;
    onCancel: () => void;
}

export default function ReportModal({
    isOpen,
    title = 'İtirafı Şikayet Et',
    description = 'Bu itirafı neden şikayet ediyorsunuz? Lütfen kısaca açıklayın.',
    confirmText = 'Şikayet Et',
    cancelText = 'Vazgeç',
    onConfirm,
    onCancel
}: ReportModalProps) {
    const [reason, setReason] = useState('');

    const handleSubmit = () => {
        if (reason.trim().length > 0) {
            onConfirm(reason);
            setReason('');
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: "spring", duration: 0.5 }}
                        className="relative w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-[#0a0a0a] shadow-2xl"
                    >
                        {/* Background Effects */}
                        <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />

                        {/* Content */}
                        <div className="relative p-6">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center border border-yellow-500/20 text-yellow-500 shadow-lg shadow-yellow-500/10">
                                        <Flag size={20} />
                                    </div>
                                    <h3 className="text-lg font-bold text-white tracking-tight">
                                        {title}
                                    </h3>
                                </div>
                                <button onClick={onCancel} className="text-gray-500 hover:text-white transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <p className="text-gray-400 text-sm leading-relaxed mb-4">
                                {description}
                            </p>

                            <div className="relative">
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="Örn: Hakaret, spam, uygunsuz içerik..."
                                    maxLength={100}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-yellow-500/50 transition-colors mb-6 text-sm resize-none h-32"
                                    autoFocus
                                />
                                <div className="absolute bottom-8 right-3 text-xs text-gray-500">
                                    {reason.length}/100
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={onCancel}
                                    className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"
                                >
                                    {cancelText}
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={reason.trim().length === 0}
                                    className="flex-1 px-4 py-3 rounded-xl text-sm font-bold text-black bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-yellow-500/20 transition-all active:scale-95"
                                >
                                    {confirmText}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
