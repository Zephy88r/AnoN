import {
    HomeIcon,
    MapIcon,
    UserGroupIcon,
    LinkIcon,
    ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";

const items = [
    { name: "Feed", icon: HomeIcon },
    { name: "Map", icon: MapIcon },
    { name: "Trust", icon: UserGroupIcon },
    { name: "Link Cards", icon: LinkIcon },
    { name: "Messages", icon: ChatBubbleLeftRightIcon },
];

export default function Sidebar() {
    return (
        <aside className="border-r border-green-500/20 bg-black/70 p-4">
        <nav className="space-y-2">
            {items.map(({ name, icon: Icon }) => (
            <div
                key={name}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-green-300 hover:bg-green-500/10 hover:text-green-400 cursor-pointer"
            >
                <Icon className="h-5 w-5" />
                <span className="font-mono">{name}</span>
            </div>
            ))}
        </nav>
        </aside>
    );
}
