import { Navigate, useParams } from "react-router-dom";
import { useTrust } from "../contexts/TrustContext";

/**
 * Guards chat threads behind trust.
 * Allows access only if trust is accepted for the peer.
 */
export default function RequireTrust({ children }: { children: JSX.Element }) {
    const { threadId } = useParams();
    const { isTrusted } = useTrust();

    if (!threadId) {
        return <Navigate to="/app/messages" replace />;
    }

    // 1️⃣ direct trust (threadId === peerKey)
    if (isTrusted(threadId)) {
        return children;
    }

    // 2️⃣ optional: resolve peerKey from stored thread metadata
    try {
        const raw = localStorage.getItem("ghost:chat_threads");
        if (raw) {
        const threads = JSON.parse(raw);
        const thread = threads?.[threadId];
        if (thread?.peerKey && isTrusted(thread.peerKey)) {
            return children;
        }
        }
    } catch {
        /* ignore corrupt storage */
    }

    // ❌ not trusted
    return <Navigate to="/app/messages" replace />;
}
