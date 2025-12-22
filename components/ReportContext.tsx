'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import ReportModal from './ReportModal';

interface ReportOptions {
    title?: string;
    description?: string;
}

interface ReportContextType {
    report: (options?: ReportOptions) => Promise<string | null>;
}

const ReportContext = createContext<ReportContextType | undefined>(undefined);

export function ReportProvider({ children }: { children: ReactNode }) {
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        options: ReportOptions;
        resolve: (value: string | null) => void;
    } | null>(null);

    const report = useCallback((options?: ReportOptions) => {
        return new Promise<string | null>((resolve) => {
            setModalState({
                isOpen: true,
                options: options || {},
                resolve
            });
        });
    }, []);

    const handleConfirm = (reason: string) => {
        if (modalState) {
            modalState.resolve(reason);
            setModalState(null);
        }
    };

    const handleCancel = () => {
        if (modalState) {
            modalState.resolve(null);
            setModalState(null);
        }
    };

    return (
        <ReportContext.Provider value={{ report }}>
            {children}
            {modalState && (
                <ReportModal
                    isOpen={modalState.isOpen}
                    title={modalState.options.title}
                    description={modalState.options.description}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                />
            )}
        </ReportContext.Provider>
    );
}

export function useReport() {
    const context = useContext(ReportContext);
    if (!context) {
        throw new Error('useReport must be used within a ReportProvider');
    }
    return context;
}
