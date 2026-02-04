import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

type ThemeMode = "system" | "light" | "dark";

type ThemeContextValue = {
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
    resolvedTheme: "light" | "dark";
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "g-host-theme";

function getSystemTheme(): "light" | "dark" {
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyThemeClass(mode: ThemeMode) {
    const resolved = mode === "system" ? getSystemTheme() : mode;
    const root = document.documentElement;

    if (resolved === "dark") root.classList.add("dark");
    else root.classList.remove("dark");

    return resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
        const saved = localStorage.getItem(STORAGE_KEY) as ThemeMode | null;
        return saved ?? "system";
    });

    const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() =>
        applyThemeClass(themeMode)
    );

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, themeMode);
        setResolvedTheme(applyThemeClass(themeMode));
    }, [themeMode]);

    useEffect(() => {
        if (themeMode !== "system") return;

        const mq = window.matchMedia("(prefers-color-scheme: dark)");
        const handler = () => setResolvedTheme(applyThemeClass("system"));

        mq.addEventListener?.("change", handler);
        // fallback for older
        mq.addListener?.(handler);

        return () => {
        mq.removeEventListener?.("change", handler);
        mq.removeListener?.(handler);
        };
    }, [themeMode]);

    const value = useMemo(
        () => ({ themeMode, setThemeMode, resolvedTheme }),
        [themeMode, resolvedTheme]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
    }

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used inside ThemeProvider");
    return ctx;
}
