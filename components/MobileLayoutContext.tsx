'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

interface MobileLayoutContextType {
    isEntryModalOpen: boolean;
    openEntryModal: () => void;
    closeEntryModal: () => void;
    toggleEntryModal: () => void;
}

const MobileLayoutContext = createContext<MobileLayoutContextType | undefined>(undefined);

export function MobileLayoutProvider({ children }: { children: ReactNode }) {
    const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);

    const openEntryModal = () => setIsEntryModalOpen(true);
    const closeEntryModal = () => setIsEntryModalOpen(false);
    const toggleEntryModal = () => setIsEntryModalOpen(prev => !prev);

    return (
        <MobileLayoutContext.Provider value={{ isEntryModalOpen, openEntryModal, closeEntryModal, toggleEntryModal }}>
            {children}
        </MobileLayoutContext.Provider>
    );
}

export function useMobileLayout() {
    const context = useContext(MobileLayoutContext);
    if (context === undefined) {
        throw new Error('useMobileLayout must be used within a MobileLayoutProvider');
    }
    return context;
}
