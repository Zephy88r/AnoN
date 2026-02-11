import { ReactNode } from "react";

type Column<T> = {
    key: string;
    label: string;
    render?: (item: T) => ReactNode;
    className?: string;
};

type DataTableProps<T> = {
    columns: Column<T>[];
    data: T[];
    keyExtractor: (item: T, index: number) => string;
    emptyMessage?: string;
};

export default function DataTable<T>({ columns, data, keyExtractor, emptyMessage = "No data available" }: DataTableProps<T>) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="text-xs text-slate-600 dark:text-green-300/70">
                    <tr>
                        {columns.map((col) => (
                            <th key={col.key} className={`text-left py-2 ${col.className || ""}`}>
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="text-slate-800 dark:text-green-200">
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length} className="py-6 text-center text-slate-500 dark:text-green-300/50">
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        data.map((item, index) => (
                            <tr
                                key={keyExtractor(item, index)}
                                className="border-t border-emerald-500/10 dark:border-green-500/10"
                            >
                                {columns.map((col) => (
                                    <td key={col.key} className={`py-3 ${col.className || ""}`}>
                                        {col.render ? col.render(item) : (item as any)[col.key]}
                                    </td>
                                ))}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
