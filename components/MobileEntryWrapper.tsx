'use client';

import { Edit3, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMobileLayout } from './MobileLayoutContext';

export default function MobileEntryWrapper({ children }: { children: React.ReactNode }) {
    const { isEntryModalOpen, openEntryModal, closeEntryModal } = useMobileLayout();

    return (
        <>
            {/* Desktop View: Render layout normally (hidden on mobile) */}
            <div className="hidden md:block">
                <div className="glass-panel bg-white/5 border border-white/20 rounded-2xl p-5">
                    <h3 className="text-white font-bold mb-4 flex items-center gap-2 text-lg">
                        <Edit3 size={20} className="text-purple-500" />
                        İtiraf Et
                    </h3>
                    {children}
                </div>
            </div>

            {/* Mobile View: Floating Action Button */}
            <div className="md:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[linear-gradient(to_top,rgba(0,0,0,1)_0%,rgba(0,0,0,0)_100%)] w-full pb-6 pt-12 flex justify-center pointer-events-none">
                <button
                    onClick={openEntryModal}
                    className="pointer-events-auto bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full font-bold shadow-lg shadow-purple-900/40 flex items-center gap-2 active:scale-95 transition-transform backdrop-blur-md border border-white/20"
                >
                    <Edit3 size={18} />
                    İtiraf Et
                </button>
            </div>

            {/* Mobile Modal */}
            <AnimatePresence>
                {isEntryModalOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={closeEntryModal}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] md:hidden"
                        />

                        {/* Modal Content */}
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="fixed bottom-0 left-0 right-0 bg-[#0f0f0f] border-t border-white/10 rounded-t-3xl p-6 z-[70] md:hidden max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-xl font-bold text-white">Yeni İtiraf</h3>
                                <button
                                    onClick={closeEntryModal}
                                    className="p-2 bg-white/5 rounded-full text-gray-400 hover:text-white"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            {/* Render the form inside modal */}
                            <div className="pb-8">
                                {children}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
