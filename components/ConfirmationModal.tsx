'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function ConfirmationModal({
    isOpen,
    title,
    description,
    confirmText = 'Evet',
    cancelText = 'Vazgeç',
    isDestructive = false,
    onConfirm,
    onCancel
}: ConfirmationModalProps) {
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
                        {isDestructive && (
                            <div className="absolute inset-0 bg-gradient-to-b from-red-500/10 via-transparent to-transparent pointer-events-none" />
                        )}

                        {/* Content */}
                        <div className="relative p-6 flex flex-col items-center text-center">
                            {/* Icon */}
                            <div className={`mb-6 w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg border border-white/10 ${isDestructive
                                    ? 'bg-gradient-to-br from-red-500/20 to-red-900/20 text-red-500 shadow-red-500/20'
                                    : 'bg-gradient-to-br from-purple-500/20 to-purple-900/20 text-purple-500 shadow-purple-500/20'
                                }`}>
                                <AlertTriangle size={32} />
                            </div>

                            <h3 className="text-xl font-bold text-white mb-2 tracking-tight">
                                {title}
                            </h3>

                            <p className="text-gray-400 text-sm leading-relaxed mb-8">
                                {description}
                            </p>

                            {/* Actions */}
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={onCancel}
                                    className="flex-1 px-4 py-3 rounded-xl text-sm font-semibold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-colors"
                                >
                                    {cancelText}
                                </button>
                                <button
                                    onClick={onConfirm}
                                    className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold text-white shadow-lg transition-transform active:scale-95 ${isDestructive
                                            ? 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 shadow-red-500/25'
                                            : 'bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400 shadow-purple-500/25'
                                        }`}
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
