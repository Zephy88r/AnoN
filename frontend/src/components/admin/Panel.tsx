import { PropsWithChildren } from "react";

type PanelProps = PropsWithChildren<{
    title?: string;
    description?: string;
    className?: string;
}>;

export default function Panel({ title, description, children, className = "" }: PanelProps) {
    return (
        <div className={`rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur p-5 ${className}`}>
            {(title || description) && (
                <div className="mb-4">
                    {title && (
                        <h3 className="text-sm font-mono tracking-wider uppercase text-emerald-700 dark:text-green-400 mb-1">
                            {title}
                        </h3>
                    )}
                    {description && (
                        <p className="text-xs text-slate-600 dark:text-green-300/70">
                            {description}
                        </p>
                    )}
                </div>
            )}
            {children}
        </div>
    );
}
