import type { ReactNode } from "react";
import { useRef, useEffect } from "react";

type Column<T> = {
    key: string;
    label: string | ReactNode;
    render?: (item: T) => ReactNode;
    className?: string;
};

type DataTableProps<T> = {
    columns: Column<T>[];
    data: T[];
    keyExtractor: (item: T, index: number) => string;
    emptyMessage?: string;
    selectable?: boolean;
    selectedItems?: Set<string>;
    onSelectItem?: (key: string) => void;
    onSelectAll?: (isSelected: boolean) => void;
};

export default function DataTable<T>({
    columns,
    data,
    keyExtractor,
    emptyMessage = "No data available",
    selectable = false,
    selectedItems = new Set(),
    onSelectItem,
    onSelectAll,
}: DataTableProps<T>) {
    const allCheckboxRef = useRef<HTMLInputElement>(null);
    const allSelected = data.length > 0 && data.every((item, index) => selectedItems.has(keyExtractor(item, index)));
    const someSelected = data.some((item, index) => selectedItems.has(keyExtractor(item, index)));

    useEffect(() => {
        if (allCheckboxRef.current) {
            allCheckboxRef.current.indeterminate = someSelected && !allSelected;
        }
    }, [someSelected, allSelected]);

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead className="text-xs text-slate-600 dark:text-green-300/70">
                    <tr>
                        {selectable && (
                            <th className="text-left py-2 px-2 w-10">
                                <input
                                    ref={allCheckboxRef}
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={(e) => onSelectAll?.(e.target.checked)}
                                    className="rounded border-emerald-500/30 dark:border-green-500/30"
                                />
                            </th>
                        )}
                        {columns.map((col, colIndex) => (
                            <th key={`header-${col.key}-${colIndex}`} className={`text-left py-2 ${col.className || ""}`}>
                                {col.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="text-slate-800 dark:text-green-200">
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length + (selectable ? 1 : 0)} className="py-6 text-center text-slate-500 dark:text-green-300/50">
                                {emptyMessage}
                            </td>
                        </tr>
                    ) : (
                        data.map((item, index) => {
                            const key = keyExtractor(item, index);
                            const isSelected = selectedItems.has(key);

                            return (
                                <tr
                                    key={key}
                                    className={`border-t border-emerald-500/10 dark:border-green-500/10 ${
                                        isSelected ? "bg-emerald-500/5 dark:bg-green-500/10" : ""
                                    }`}
                                >
                                    {selectable && (
                                        <td className="py-3 px-2 w-10">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => onSelectItem?.(key)}
                                                className="rounded border-emerald-500/30 dark:border-green-500/30"
                                            />
                                        </td>
                                    )}
                                    {columns.map((col, colIdx) => (
                                        <td 
                                            key={`${key}-${col.key}`} 
                                            className={`py-3 ${col.className || ""}`}
                                            onClick={(e) => {
                                                // Prevent row click from affecting checkbox
                                                if (col.key === 'select') {
                                                    e.stopPropagation();
                                                }
                                            }}
                                        >
                                            {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key])}
                                        </td>
                                    ))}
                                </tr>
                            );
                        })
                    )}
                </tbody>
            </table>
        </div>
    );
}
