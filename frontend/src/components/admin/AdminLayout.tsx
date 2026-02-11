import { PropsWithChildren } from "react";
import bgDark from "../../assets/background-dark.png";
import bgLight from "../../assets/background-light.png";
import AdminSidebar from "./AdminSidebar";

type AdminLayoutProps = PropsWithChildren<{
    currentPage?: string;
    onNavigate?: (page: string) => void;
    onLogout?: () => void;
}>;

export default function AdminLayout({ children, currentPage = "dashboard", onNavigate, onLogout }: AdminLayoutProps) {
    return (
        <div
            className="relative min-h-screen text-slate-900 dark:text-green-100"
            style={{
                backgroundImage: `url(${bgLight})`,
            }}
        >
            {/* Dark mode background */}
            <div
                className="absolute inset-0 hidden dark:block"
                style={{
                    backgroundImage: `url(${bgDark})`,
                }}
            />

            {/* Overlay for readability */}
            <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-[1px]" />

            {/* App content */}
            <div className="relative z-10 flex min-h-screen">
                <AdminSidebar 
                    currentPage={currentPage} 
                    onNavigate={onNavigate}
                    onLogout={onLogout}
                />
                
                <main className="flex-1 overflow-y-auto">
                    <div className="mx-auto max-w-[1400px] p-6 md:p-8">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
}
