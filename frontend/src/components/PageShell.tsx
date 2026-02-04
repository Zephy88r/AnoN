import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import UtilityPanel from "./UtilityPanel";

export default function PageShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="h-screen bg-black text-green-100">
        <Navbar />

        <div className="grid grid-cols-[240px_1fr_280px] h-[calc(100vh-64px)]">
            <Sidebar />

            <main className="overflow-y-auto p-6">
            {children}
            </main>

            <UtilityPanel />
        </div>
        </div>
    );
}
