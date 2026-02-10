import { storage } from "./storage";

export type ChatThread = {
    id: string;              // used in route: /app/messages/:threadId
    peerAnonId: string;      // the actual peer anon id we trust-gate on
    createdAtISO: string;
    lastMessageAtISO?: string;
    label?: string;          // optional UI label (safe)
    code?: string;           // optional: link card code used to create this thread
};

const THREADS_KEY = "chat_threads";
const THREADS_VERSION = 1;

function nowISO() {
    return new Date().toISOString();
}

/**
 * Link-card based thread id (UI deep link). Keep if you still use codes to open a thread.
 */
export function threadIdFromCode(code: string) {
    return `lc_${code.replace(/[^a-z0-9]/gi, "").toLowerCase()}`;
}

/**
 * ✅ Deterministic thread id from 2 anon ids.
 * Order doesn't matter. Same pair => same thread id.
 */
export function makeThreadId(a: string, b: string) {
    const [x, y] = [a, b].sort();
    return `th_${x.slice(0, 8)}_${y.slice(0, 8)}`;
}

/**
 * Internal storage: Record keyed by threadId
 */
function readThreadMap(): Record<string, ChatThread> {
    return storage.getJSON<Record<string, ChatThread>>(
        THREADS_KEY,
        {},
        { version: THREADS_VERSION }
    );
}

function writeThreadMap(m: Record<string, ChatThread>) {
    storage.setJSON(THREADS_KEY, m, { version: THREADS_VERSION });
}

export function listThreads(): ChatThread[] {
    const m = readThreadMap();
    return Object.values(m).sort(
        (a, b) => Date.parse(b.lastMessageAtISO ?? b.createdAtISO) - Date.parse(a.lastMessageAtISO ?? a.createdAtISO)
    );
}

export function getThreadById(threadId: string): ChatThread | null {
    const m = readThreadMap();
    return m[threadId] ?? null;
}

export function upsertThread(thread: ChatThread): ChatThread {
    const m = readThreadMap();
    const existing = m[thread.id];

    const merged: ChatThread = existing
        ? { ...existing, ...thread }
        : { ...thread };

    m[thread.id] = merged;
    writeThreadMap(m);
    return merged;
}

/**
 * ✅ Ensure thread exists for a peerAnonId (after trust accepted).
 * You must pass `myAnonId` from session/me (store it in session service).
 */
export function ensureThread(myAnonId: string, peerAnonId: string): ChatThread {
    const id = makeThreadId(myAnonId, peerAnonId);
    const existing = getThreadById(id);
    if (existing) return existing;

    return upsertThread({
        id,
        peerAnonId,
        createdAtISO: nowISO(),
    });
}

/**
 * Convenience: ensure thread exists for a code + peer
 * (useful if link cards are still part of your flow)
 */
export function ensureThreadForCode(code: string, peerAnonId: string): ChatThread {
    const id = threadIdFromCode(code);
    const existing = getThreadById(id);
    if (existing) return existing;

    return upsertThread({
        id,
        peerAnonId,
        code,
        createdAtISO: nowISO(),
    });
}

/**
 * Optional: update last message timestamp
 */
export function touchThread(threadId: string, atISO: string = nowISO()) {
    const t = getThreadById(threadId);
    if (!t) return;
    upsertThread({ ...t, lastMessageAtISO: atISO });
}
