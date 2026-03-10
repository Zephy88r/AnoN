import { useEffect, useMemo, useState } from "react";
import {
  PlusIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";

import CopyButton from "../components/CopyButton";
import { createLinkCard, fetchMyLinkCards } from "../services/linkCardsApi";
import { requestTrust } from "../services/trustApi";
import { getSessionToken } from "../services/api";

type LinkStatus = "active" | "used" | "revoked" | "expired";

type LinkCard = {
  id: string;
  code: string;
  createdAtISO: string;
  expiresAtISO: string;
  status: LinkStatus;
  note?: string;
};

const EXPIRED_RETENTION_MS = 24 * 60 * 60 * 1000;

const card =
  "rounded-2xl border border-emerald-500/15 dark:border-green-500/20 bg-white/70 dark:bg-black/50 backdrop-blur";

const focusRing =
  "focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-green-400 dark:focus-visible:ring-offset-black";

/** ---- Helpers ---- */
function fmtUntil(iso: string) {
  const ms = Date.parse(iso) - Date.now();
  const m = Math.round(ms / 60000);
  if (m <= 0) return "expired";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
}

function normalizeCode(raw: string) {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
}

function getEffectiveStatus(card: LinkCard, nowMs: number): LinkStatus {
  if (card.status === "active" && Date.parse(card.expiresAtISO) <= nowMs) {
    return "expired";
  }
  return card.status;
}

function shouldPurge(card: LinkCard, nowMs: number): boolean {
  if (getEffectiveStatus(card, nowMs) !== "expired") return false;
  const expiresAtMs = Date.parse(card.expiresAtISO);
  if (Number.isNaN(expiresAtMs)) return false;
  return nowMs - expiresAtMs > EXPIRED_RETENTION_MS;
}

function getExpiryLabel(card: LinkCard, nowMs: number): string {
  if (getEffectiveStatus(card, nowMs) === "expired") return "expired";
  return `expires in ${fmtUntil(card.expiresAtISO)}`;
}

export default function LinkCards() {
  const [cards, setCards] = useState<LinkCard[]>([]);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [note, setNote] = useState("");
  const [enterCode, setEnterCode] = useState("");
  const [enterState, setEnterState] =
    useState<"idle" | "verifying" | "ok" | "error">("idle");
  const [enterMsg, setEnterMsg] = useState("");

  /** Load my cards - wait for session */
  useEffect(() => {
    if (!getSessionToken()) {
      console.log("[LinkCards] waiting for session...");
      return;
    }

    fetchMyLinkCards()
      .then((apiCards) => {
        setCards(
          apiCards.map((c) => ({
            id: `lc_${c.code}`,
            code: c.code,
            status: c.status,
            createdAtISO: new Date().toISOString(),
            expiresAtISO: c.expires_at,
          }))
        );
      })
      .catch((err) => {
        console.error("[LinkCards] fetch failed:", err);
      });
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    setCards((prev) => {
      const filtered = prev.filter((card) => !shouldPurge(card, nowMs));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [nowMs]);

  const visibleCards = useMemo(
    () => cards.filter((card) => !shouldPurge(card, nowMs)),
    [cards, nowMs]
  );

  const activeCount = useMemo(
    () => visibleCards.filter((c) => getEffectiveStatus(c, nowMs) === "active").length,
    [visibleCards, nowMs]
  );

  /** Create new card */
  const generate = async () => {
    if (activeCount >= 3) return;

    const apiCard = await createLinkCard();

    setCards((prev) => [
      {
        id: `lc_${apiCard.code}`,
        code: apiCard.code,
        status: apiCard.status,
        createdAtISO: new Date().toISOString(),
        expiresAtISO: apiCard.expires_at,
        note: note || undefined,
      },
      ...prev,
    ]);

    setNote("");
  };

  /** Request trust using code */
  const unlock = async () => {
    setEnterState("verifying");
    setEnterMsg("");

    try {
      await requestTrust(normalizeCode(enterCode));
      setEnterState("ok");
      setEnterMsg("Trust request sent. Awaiting approval.");
    } catch {
      setEnterState("error");
      setEnterMsg("This link card cannot be used.");
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-3 sm:px-0">
      {/* Header */}
      <div className={`${card} p-4`}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-950 dark:text-green-100">
              Link Cards
            </h1>
            <p className="text-sm text-slate-700 dark:text-green-300/70">
              One-time secure bridges. Generate or enter a code.
            </p>
          </div>

          <div className="rounded-full border px-3 py-1 text-xs font-mono">
            active: {activeCount} / 3
          </div>
        </div>

        {/* Enter Code */}
        <div className="mt-4 flex gap-2">
          <input
            value={enterCode}
            onChange={(e) => {
              setEnterCode(e.target.value);
              setEnterState("idle");
              setEnterMsg("");
            }}
            placeholder="PASTE CODE"
            className={`w-full rounded-xl border px-3 py-2 font-mono ${focusRing}`}
          />
          <button
            onClick={unlock}
            disabled={!enterCode || enterState === "verifying"}
            className="rounded-xl border px-4 py-2 font-mono"
          >
            <ArrowRightIcon className="h-5 w-5" />
          </button>
        </div>

        {enterMsg && (
          <div className="mt-2 text-sm text-slate-700 dark:text-green-300">
            {enterMsg}
          </div>
        )}

        {/* Generator */}
        <div className="mt-4 flex gap-2">
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional note"
            className={`w-full rounded-xl border px-3 py-2 ${focusRing}`}
          />
          <button
            onClick={generate}
            disabled={activeCount >= 3}
            className="rounded-xl border px-4 py-2 font-mono"
          >
            <PlusIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-3">
        {visibleCards.map((c) => {
          return (
            <div key={c.id} className={`${card} p-4`}>
              <div className="flex justify-between">
                <div>
                  <div className="font-mono">{c.code}</div>
                  <div className="text-xs opacity-70">
                    {getExpiryLabel(c, nowMs)}
                  </div>
                </div>
                <CopyButton text={c.code} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
