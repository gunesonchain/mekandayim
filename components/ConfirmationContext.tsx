'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import ConfirmationModal from './ConfirmationModal';

interface ConfirmationOptions {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    isDestructive?: boolean;
}

interface ConfirmationContextType {
    confirm: (options: ConfirmationOptions) => Promise<boolean>;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export function ConfirmationProvider({ children }: { children: ReactNode }) {
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        options: ConfirmationOptions;
        resolve: (value: boolean) => void;
    } | null>(null);

    const confirm = useCallback((options: ConfirmationOptions) => {
        return new Promise<boolean>((resolve) => {
            setModalState({
                isOpen: true,
                options,
                resolve
            });
        });
    }, []);

    const handleConfirm = () => {
        if (modalState) {
            modalState.resolve(true);
            setModalState(null);
        }
    };

    const handleCancel = () => {
        if (modalState) {
            modalState.resolve(false);
            setModalState(null);
        }
    };

    return (
        <ConfirmationContext.Provider value={{ confirm }}>
            {children}
            {modalState && (
                <ConfirmationModal
                    isOpen={modalState.isOpen}
                    title={modalState.options.title}
                    description={modalState.options.description}
                    confirmText={modalState.options.confirmText}
                    cancelText={modalState.options.cancelText}
                    isDestructive={modalState.options.isDestructive}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                />
            )}
        </ConfirmationContext.Provider>
    );
}

export function useConfirmation() {
    const context = useContext(ConfirmationContext);
    if (!context) {
        throw new Error('useConfirmation must be used within a ConfirmationProvider');
    }
    return context;
}
