'use client';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    return (
        <html>
            <body>
                <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white px-4">
                    <h2 className="text-2xl font-bold mb-4">Kritik Bir Hata Oluştu</h2>
                    <p className="text-gray-400 mb-6">Uygulama yüklenirken bir sorun oluştu.</p>
                    <button
                        onClick={() => reset()}
                        className="bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                    >
                        Tekrar Dene
                    </button>
                </div>
            </body>
        </html>
    );
}
