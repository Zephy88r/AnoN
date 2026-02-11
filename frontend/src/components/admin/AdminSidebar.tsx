import {
    ChartBarIcon,
    ClockIcon,
    ShieldCheckIcon,
    CreditCardIcon,
    DocumentTextIcon,
    MapPinIcon,
    ExclamationTriangleIcon,
    ClipboardDocumentListIcon,
    ArrowRightOnRectangleIcon,
    UserGroupIcon,
} from "@heroicons/react/24/outline";

type AdminSidebarProps = {
    currentPage: string;
    onNavigate?: (page: string) => void;
    onLogout?: () => void;
};

const navItems = [
    { id: "dashboard", label: "Dashboard", icon: ChartBarIcon },
    { id: "sessions", label: "Sessions", icon: ClockIcon },
    { id: "users", label: "Users", icon: UserGroupIcon },
    { id: "trust", label: "Trust", icon: ShieldCheckIcon },
    { id: "link-cards", label: "Link Cards", icon: CreditCardIcon },
    { id: "feed", label: "Feed", icon: DocumentTextIcon },
    { id: "map", label: "Map Pings", icon: MapPinIcon },
    { id: "abuse", label: "Abuse", icon: ExclamationTriangleIcon },
    { id: "audit", label: "Audit Log", icon: ClipboardDocumentListIcon },
];

export default function AdminSidebar({ currentPage, onNavigate, onLogout }: AdminSidebarProps) {
    return (
        <aside className="w-[260px] shrink-0 border-r border-emerald-500/15 dark:border-green-500/20 bg-white/40 dark:bg-black/40 backdrop-blur-sm flex flex-col">
            {/* Header */}
            <div className="p-6 border-b border-emerald-500/15 dark:border-green-500/20">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-500/20 dark:from-green-500/20 dark:to-emerald-500/20 flex items-center justify-center border border-emerald-500/30 dark:border-green-500/30">
                        <ShieldCheckIcon className="w-5 h-5 text-emerald-700 dark:text-green-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-slate-950 dark:text-green-100">
                            ANON Admin
                        </h2>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = currentPage === item.id;
                    
                    return (
                        <button
                            key={item.id}
                            onClick={() => onNavigate?.(item.id)}
                            className={`
                                w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                                transition-all duration-200
                                ${isActive
                                    ? "bg-emerald-500/15 dark:bg-green-500/15 text-emerald-900 dark:text-green-200 border border-emerald-500/30 dark:border-green-500/30 shadow-[0_0_18px_rgba(34,197,94,0.10)]"
                                    : "text-slate-700 dark:text-green-300/70 hover:bg-emerald-500/5 dark:hover:bg-green-500/10 hover:text-slate-900 dark:hover:text-green-200"
                                }
                            `}
                        >
                            <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-emerald-700 dark:text-green-400" : ""}`} />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </nav>

            {/* Logout */}
            <div className="p-4 border-t border-emerald-500/15 dark:border-green-500/20">
                <button
                    onClick={onLogout}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                        text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-500/10
                        border border-red-500/20 dark:border-red-500/20 transition-colors"
                >
                    <ArrowRightOnRectangleIcon className="w-5 h-5 shrink-0" />
                    <span>Logout</span>
                </button>
            </div>
        </aside>
    );
}
