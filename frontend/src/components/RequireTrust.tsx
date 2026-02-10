import { Navigate, useLocation, useParams } from "react-router-dom";
import { useTrust } from "../contexts/TrustContext";
import { getThreadById } from "../services/thread";

export default function RequireTrust({ children }: { children: JSX.Element }) {
    const { threadId } = useParams();
    const location = useLocation();
    const { isTrusted } = useTrust();

    if (!threadId) {
        return <Navigate to="/app/messages" replace />;
    }

    const thread = getThreadById(threadId);
    const peerAnonId = thread?.peerAnonId ?? null;

    // If thread doesn't exist locally, we cannot trust-gate it safely.
    if (!peerAnonId) {
        return (
        <Navigate
            to="/app/messages"
            replace
            state={{ from: location.pathname, reason: "thread_not_found" }}
        />
        );
    }

    if (!isTrusted(peerAnonId)) {
        return (
        <Navigate
            to="/app/messages"
            replace
            state={{ from: location.pathname, reason: "not_trusted" }}
        />
        );
    }

    return children;
}
