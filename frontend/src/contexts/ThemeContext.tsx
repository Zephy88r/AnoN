import { createContext, useContext, useEffect, useMemo, useState } from "react";

type ThemeMode = "system" | "light" | "dark";

type ThemeContextValue = {
    themeMode: ThemeMode;
    setThemeMode: (mode: ThemeMode) => void;
    resolvedTheme: "light" | "dark";
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "g-host-theme";

function getSystemTheme(): "light" | "dark" {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(mode: ThemeMode): "light" | "dark" {
    const resolved = mode === "system" ? getSystemTheme() : mode;
    const root = document.documentElement;

    // smooth transition (prevents harsh flicker)
    root.classList.add("transition-colors", "duration-300");

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
        applyTheme(themeMode)
    );

    // Apply theme when mode changes
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, themeMode);
        setResolvedTheme(applyTheme(themeMode));
    }, [themeMode]);

    // Listen to system theme changes (only in system mode)
    useEffect(() => {
        if (themeMode !== "system") return;

        const mq = window.matchMedia("(prefers-color-scheme: dark)");

        const handleChange = () => {
        setResolvedTheme(applyTheme("system"));
        };

        mq.addEventListener("change", handleChange);

        return () => {
        mq.removeEventListener("change", handleChange);
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
    if (!ctx) {
        throw new Error("useTheme must be used within ThemeProvider");
    }
    return ctx;
}
