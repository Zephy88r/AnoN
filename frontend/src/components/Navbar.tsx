import { Cog6ToothIcon, MoonIcon } from "@heroicons/react/24/outline";

export default function Navbar() {
    return (
        <header className="h-16 flex items-center justify-between px-6 border-b border-green-500/20 bg-black/80 backdrop-blur">
        {/* Left */}
        <div className="flex items-center gap-3">
            <span className="font-mono text-xl text-green-400">G-host</span>
            <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
        </div>

        {/* Center */}
        <div className="hidden md:flex font-mono text-green-500/70">
            &gt; search network
        </div>

        {/* Right */}
        <div className="flex items-center gap-4">
            <span className="font-mono text-sm text-green-300">
            User #XXXXXX
            </span>
            <MoonIcon className="h-5 w-5 text-green-400 cursor-pointer" />
            <Cog6ToothIcon className="h-5 w-5 text-green-400 cursor-pointer" />
        </div>
        </header>
    );
}
