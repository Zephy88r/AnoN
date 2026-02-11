import Panel from "./Panel";

type HealthStatus = "healthy" | "degraded" | "unknown";

type SystemHealthData = {
    websocket?: HealthStatus;
    database?: HealthStatus;
    rateLimiting?: HealthStatus;
    status?: string;
    uptime?: string;
};

type SystemHealthPanelProps = {
    health: SystemHealthData;
};

export default function SystemHealthPanel({ health }: SystemHealthPanelProps) {
    const getStatusColor = (status?: HealthStatus | string) => {
        if (!status) return "bg-slate-400 dark:bg-slate-500";
        
        const normalizedStatus = status.toLowerCase();
        if (normalizedStatus === "healthy" || normalizedStatus === "ok" || normalizedStatus === "normal") {
            return "bg-emerald-500 dark:bg-green-400";
        }
        if (normalizedStatus === "degraded" || normalizedStatus === "warning") {
            return "bg-yellow-500 dark:bg-yellow-400";
        }
        if (normalizedStatus === "down" || normalizedStatus === "error") {
            return "bg-red-500 dark:bg-red-400";
        }
        return "bg-slate-400 dark:bg-slate-500";
    };

    const getStatusLabel = (status?: HealthStatus | string) => {
        if (!status) return "Unknown";
        const normalized = status.toLowerCase();
        return normalized.charAt(0).toUpperCase() + normalized.slice(1);
    };

    const healthItems = [
        {
            label: "WebSocket",
            status: health.websocket || (health.status ? "healthy" : "unknown"),
        },
        {
            label: "Database",
            status: health.database || (health.status ? "healthy" : "unknown"),
        },
        {
            label: "Rate Limiting",
            status: health.rateLimiting || "unknown",
        },
    ];

    return (
        <Panel title="System Health">
            <div className="space-y-3">
                {healthItems.map((item) => (
                    <div key={item.label} className="flex items-center justify-between">
                        <span className="text-sm text-slate-700 dark:text-green-200">
                            {item.label}
                        </span>
                        <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(item.status)}`} />
                            <span className="text-sm font-mono text-slate-800 dark:text-green-100">
                                {getStatusLabel(item.status)}
                            </span>
                        </div>
                    </div>
                ))}
                
                {health.uptime && (
                    <div className="pt-3 mt-3 border-t border-emerald-500/10 dark:border-green-500/10">
                        <div className="flex items-center justify-between">
                            <span className="text-xs text-slate-600 dark:text-green-300/70">
                                Uptime
                            </span>
                            <span className="text-xs font-mono text-slate-800 dark:text-green-100">
                                {health.uptime}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </Panel>
    );
}
