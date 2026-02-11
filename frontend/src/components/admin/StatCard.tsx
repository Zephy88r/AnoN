import { ArrowTrendingUpIcon, ArrowTrendingDownIcon } from "@heroicons/react/24/outline";

type StatCardProps = {
    title: string;
    value: string | number;
    change?: {
        value: number;
        positive: boolean;
    };
    icon?: React.ComponentType<{ className?: string }>;
};

export default function StatCard({ title, value, change, icon: Icon }: StatCardProps) {
    return (
        <div className="rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur p-5">
            <div className="flex items-start justify-between">
                <div className="flex-1">
                    <p className="text-xs font-mono tracking-wider uppercase text-slate-600 dark:text-green-300/70 mb-2">
                        {title}
                    </p>
                    <p className="text-3xl font-semibold text-slate-950 dark:text-green-100 mb-1">
                        {value}
                    </p>
                    {change && (
                        <div className="flex items-center gap-1">
                            {change.positive ? (
                                <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-600 dark:text-green-400" />
                            ) : (
                                <ArrowTrendingDownIcon className="w-4 h-4 text-red-500 dark:text-red-400" />
                            )}
                            <span className={`text-sm font-medium ${
                                change.positive 
                                    ? "text-emerald-600 dark:text-green-400" 
                                    : "text-red-500 dark:text-red-400"
                            }`}>
                                {change.positive ? "+" : ""}{change.value}%
                            </span>
                        </div>
                    )}
                </div>
                {Icon && (
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-green-500/10 flex items-center justify-center border border-emerald-500/20 dark:border-green-500/20">
                        <Icon className="w-5 h-5 text-emerald-700 dark:text-green-400" />
                    </div>
                )}
            </div>
        </div>
    );
}
