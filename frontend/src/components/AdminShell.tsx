import { PropsWithChildren } from "react";
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
                className="min-h-screen flex items-center justify-center text-green-100"
                style={{
                    backgroundImage: `url(${frontBg})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                }}
            >
                <div className="absolute inset-0 bg-black/80 mix-blend-multiply" />
                <div className="relative w-full max-w-md px-4 py-12">
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
