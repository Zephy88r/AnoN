import type { PropsWithChildren } from "react";
import bgDark from "../assets/background-dark.png";
import bgLight from "../assets/background-light.png";
import frontBg from "../assets/front-background.png";

type AdminShellProps = PropsWithChildren<{
    variant?: "panel" | "login";
}>;

export default function AdminShell({ children, variant = "panel" }: AdminShellProps) {
    if (variant === "login") {
        return (
            <div
                className="relative min-h-screen flex items-center justify-center text-slate-900 dark:text-green-100"
                style={{
                    backgroundImage: `url(${bgLight})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                }}
            >
                <div
                    className="absolute inset-0 hidden dark:block"
                    style={{
                        backgroundImage: `url(${bgDark})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                    }}
                />
                <div
                    className="absolute inset-0 opacity-25 dark:opacity-40"
                    style={{
                        backgroundImage: `url(${frontBg})`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                        backgroundRepeat: "no-repeat",
                    }}
                />
                <div className="absolute inset-0 bg-white/65 dark:bg-black/65 backdrop-blur-[1px]" />
                <div className="relative w-full max-w-sm px-4 py-8 sm:max-w-md sm:py-10">
                    {children}
                </div>
            </div>
        );
    }

    return (
        <div
            className="relative min-h-screen text-slate-900 dark:text-green-100"
            style={{
                backgroundImage: `url(${bgLight})`,
            }}
        >
            <div
                className="absolute inset-0 hidden dark:block"
                style={{
                    backgroundImage: `url(${bgDark})`,
                }}
            />
            <div className="absolute inset-0 bg-white/60 dark:bg-black/60 backdrop-blur-[1px]" />
            <div className="relative z-10 min-h-screen px-4 py-8">
                {children}
            </div>
        </div>
    );
}
