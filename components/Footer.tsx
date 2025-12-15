export default function Footer() {
    return (
        <footer className="w-full border-t border-white/10 bg-black py-8 mt-auto">
            <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-gray-500 text-sm">
                <p>&copy; 2024 Mekan İtirafları. Her hakkı saklıdır.</p>
                <div className="flex gap-6">
                    <a href="#" className="hover:text-white transition-colors">Hakkımızda</a>
                    <a href="#" className="hover:text-white transition-colors">Kurallar</a>
                    <a href="#" className="hover:text-white transition-colors">İletişim</a>
                </div>
            </div>
        </footer>
    );
}
