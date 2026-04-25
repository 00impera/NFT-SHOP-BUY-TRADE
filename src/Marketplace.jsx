import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { getContract, prepareContractCall, readContract } from "thirdweb";
import { useSendTransaction } from "thirdweb/react";
import { formatEther, parseEther } from "ethers/utils";
import { client } from "./App.jsx";
import {
  MONAD,
  NFT_ADDRESS,
  MARKETPLACE_ADDRESS,
  NFT_ABI,
  MARKETPLACE_ABI,
  TG_BOT_URL,
} from "./config.js";

/* ─── Design Tokens ──────────────────────────────────────────────── */
const T = {
  gold:    "#c9a84c",
  goldHi:  "#f0d080",
  cyan:    "#00c8ff",
  green:   "#00ff88",
  red:     "#ff4466",
  blue:    "#29b6f6",
  dim:     "#2a6a8a",
  mid:     "#80b8d0",
  bg:      "#020c14",
  bgHover: "#040e18",
  border:  "#0a2a3a",
};

const STATUS_COLOR = { success: T.green, error: T.red, info: T.cyan };
const STATUS_BG    = {
  success: "rgba(0,255,136,0.07)",
  error:   "rgba(255,68,102,0.07)",
  info:    "rgba(0,200,255,0.07)",
};

/* ─── Improvement #1 — Error helpers ────────────────────────────── */
const FRIENDLY_ERRORS = [
  [/user rejected/i,                "Transaction cancelled by wallet."],
  [/insufficient funds/i,           "Insufficient MON balance for this transaction."],
  [/not listed/i,                   "This token is not currently listed for sale."],
  [/not owner/i,                    "You don't own this token."],
  [/already listed/i,               "This token is already listed."],
  [/execution reverted/i,           "Contract call reverted — check token ID and ownership."],
  [/network.*changed/i,             "Network changed — please reconnect your wallet."],
  [/could not decode result data/i, "Contract returned no data — method may not exist."],
  [/fetch/i,                        "Network error — check your connection and try again."],
];

export function friendlyError(err) {
  const raw = err?.message || String(err);
  for (const [pattern, text] of FRIENDLY_ERRORS) {
    if (pattern.test(raw)) return text;
  }
  return raw.length > 120 ? raw.slice(0, 117) + "…" : raw;
}

/* ─── Tabs ───────────────────────────────────────────────────────── */
const TABS = [
  { id: "buy",    label: "Buy",    icon: "⬇", desc: "Purchase a listed NFT" },
  { id: "list",   label: "Sell",   icon: "⬆", desc: "List your NFT for sale" },
  { id: "cancel", label: "Cancel", icon: "✕", desc: "Remove your listing" },
  { id: "trade",  label: "Trade",  icon: "⇄", desc: "Swap NFTs peer-to-peer" },
];

/* ─── Improvement #4 — useResponsive ────────────────────────────── */
export function useResponsive() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 700);
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 700);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return { isMobile };
}

/* ─── TgIcon ─────────────────────────────────────────────────────── */
export const TgIcon = memo(({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.04 9.607c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.903.614z"/>
  </svg>
));

/* ─── Improvement #3 — StatusBanner with aria-live ──────────────── */
export const StatusBanner = memo(({ status, onDismiss }) => {
  if (!status) return null;
  const color = STATUS_COLOR[status.type];
  const bg    = STATUS_BG[status.type];
  const icon  = status.type === "success" ? "✓" : status.type === "error" ? "✕" : "○";
  return (
    <div
      className="fade-in"
      role="alert"
      aria-live="polite"
      style={{
        display: "flex", alignItems: "flex-start", gap: "10px",
        background: bg,
        border: `1px solid ${color}22`,
        borderLeft: `3px solid ${color}`,
        borderRadius: "10px", padding: "12px 14px", marginBottom: "16px",
      }}
    >
      <span style={{ color, fontSize: "13px", flexShrink: 0, marginTop: "1px" }} aria-hidden="true">{icon}</span>
      <span style={{ color, fontSize: "12px", flex: 1, lineHeight: 1.6 }}>{status.m}</span>
      <button
        onClick={onDismiss}
        aria-label="Dismiss message"
        style={{ background: "none", border: "none", color: T.dim, fontSize: "18px", cursor: "pointer", lineHeight: 1, padding: "0 2px" }}
      >×</button>
    </div>
  );
});

/* ─── Stat ───────────────────────────────────────────────────────── */
export const Stat = memo(({ label, value, accent, last }) => (
  <div style={{
    textAlign: "center", padding: "0 20px",
    borderRight: last ? "none" : `1px solid ${T.border}`,
  }}>
    <div style={{ fontSize: "9px", color: T.dim, letterSpacing: "2px", marginBottom: "5px" }}>{label}</div>
    <div style={{ fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: "18px", color: accent || T.gold, lineHeight: 1 }}>
      {value}
    </div>
  </div>
));

/* ─── Improvement #5 — MarketStats (memoised, retry) ────────────── */
export const MarketStats = memo(({ mkt, onVaultPool, isMobile }) => {
  const [stats,    setStats]    = useState({ volume: "—", floor: "—", listed: "—", vault: "—" });
  const [loading,  setLoading]  = useState(true);
  const [fetchErr, setFetchErr] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true); setFetchErr(false);
    try {
      const [vol, floor, listed, vault] = await Promise.all([
        readContract({ contract: mkt, method: "totalVolume",   params: [] }).catch(() => null),
        readContract({ contract: mkt, method: "floorPrice",    params: [] }).catch(() => null),
        readContract({ contract: mkt, method: "totalListings", params: [] }).catch(() => null),
        readContract({ contract: mkt, method: "vaultPool",     params: [] }).catch(() => null),
      ]);
      setStats({
        volume: vol    != null ? `${parseFloat(formatEther(vol)).toFixed(2)} MON`   : "—",
        floor:  floor  != null ? `${parseFloat(formatEther(floor)).toFixed(3)} MON` : "—",
        listed: listed != null ? listed.toString()                                   : "—",
        vault:  vault  != null ? `${parseFloat(formatEther(vault)).toFixed(2)} MON` : "—",
      });
    } catch (_) { setFetchErr(true); }
    setLoading(false);
  }, [mkt]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const dot = loading ? "…" : undefined;

  return (
    <section
      aria-label="Market statistics"
      style={{
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "space-between",
        gap: isMobile ? "14px" : 0,
        background: T.bg, border: `1px solid ${T.border}`, borderRadius: "12px",
        padding: isMobile ? "16px" : "16px 24px", marginBottom: "18px",
        boxShadow: "0 0 40px rgba(0,0,0,0.6)",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? "16px 0" : 0 }}>
        <Stat label="TOTAL VOLUME" value={dot || stats.volume} />
        <Stat label="FLOOR PRICE"  value={dot || stats.floor}  accent={T.cyan} />
        <Stat label="NFTs LISTED"  value={dot || stats.listed} accent={T.mid} />
        <Stat label="VAULT POOL"   value={dot || stats.vault}  accent={T.green} last />
      </div>

      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        {fetchErr && (
          <button
            onClick={fetchStats}
            aria-label="Retry loading market stats"
            style={{
              fontSize: "10px", color: T.red, background: "none",
              border: `1px solid ${T.red}44`, borderRadius: "6px",
              padding: "6px 10px", cursor: "pointer",
            }}
          >↻ Retry</button>
        )}
        <button
          onClick={onVaultPool}
          aria-label="View Vault Pool details"
          style={{
            padding: "10px 20px", borderRadius: "8px",
            border: "1px solid rgba(0,255,136,0.3)",
            background: "rgba(0,255,136,0.08)",
            color: T.green, fontFamily: "Cinzel, serif",
            fontSize: "11px", letterSpacing: "1.5px",
            cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
          }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,255,136,0.18)"; e.currentTarget.style.boxShadow = "0 0 16px rgba(0,255,136,0.25)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,255,136,0.08)"; e.currentTarget.style.boxShadow = "none"; }}
        >◈ VAULT POOL</button>
      </div>
    </section>
  );
});

/* ─── VaultPoolModal (focus-trap, retry) ────────────────────────── */
export const VaultPoolModal = memo(({ onClose, mkt }) => {
  const [info,    setInfo]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState(false);
  const modalRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(false);
    try {
      const v = await readContract({ contract: mkt, method: "vaultPool", params: [] });
      setInfo(formatEther(v));
    } catch (_) { setErr(true); setInfo(null); }
    setLoading(false);
  }, [mkt]);

  useEffect(() => { load(); }, [load]);

  // Focus trap
  useEffect(() => {
    const el = modalRef.current;
    if (!el) return;
    const focusable = el.querySelectorAll("button,[href],input,[tabindex]");
    focusable[0]?.focus();
    const trap = e => {
      if (e.key !== "Tab") return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (e.shiftKey ? document.activeElement === first : document.activeElement === last) {
        e.preventDefault();
        (e.shiftKey ? last : first)?.focus();
      }
    };
    el.addEventListener("keydown", trap);
    return () => el.removeEventListener("keydown", trap);
  }, []);

  return (
    <div
      role="dialog" aria-modal="true" aria-labelledby="vault-title"
      style={{
        position: "fixed", inset: 0, zIndex: 100,
        background: "rgba(0,5,10,0.85)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
      }}
      onClick={onClose}
      onKeyDown={e => e.key === "Escape" && onClose()}
    >
      <div ref={modalRef} onClick={e => e.stopPropagation()} style={{
        background: T.bg, border: "1px solid #0a3a2a",
        borderRadius: "16px", padding: "32px 36px",
        minWidth: "320px", maxWidth: "400px", width: "100%",
        boxShadow: "0 0 60px rgba(0,255,136,0.12)",
      }}>
        <div id="vault-title" style={{ fontFamily: "Cinzel, serif", fontSize: "16px", color: T.green, letterSpacing: "3px", marginBottom: "6px" }}>◈ VAULT POOL</div>
        <p style={{ fontSize: "10px", color: T.dim, marginBottom: "20px", lineHeight: 1.7 }}>
          The Vault Pool accumulates fees from all marketplace transactions. Funds are distributed to eligible NFT holders based on protocol rules.
        </p>

        <div style={{ background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.18)", borderRadius: "10px", padding: "18px 20px", textAlign: "center" }}>
          <div style={{ fontSize: "9px", color: T.dim, letterSpacing: "2px", marginBottom: "6px" }}>CURRENT BALANCE</div>
          {loading && <div style={{ color: T.dim, fontSize: "12px" }}>Loading…</div>}
          {err && (
            <div>
              <div style={{ color: T.red, fontSize: "11px", marginBottom: "8px" }}>Could not fetch vault balance.</div>
              <button onClick={load} style={{ fontSize: "10px", color: T.cyan, background: "none", border: `1px solid ${T.cyan}44`, borderRadius: "6px", padding: "5px 10px", cursor: "pointer" }}>↻ Retry</button>
            </div>
          )}
          {!loading && !err && info != null && (
            <div style={{ fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: "28px", color: T.green }}>
              {info} <span style={{ fontSize: "14px", color: T.mid }}>MON</span>
            </div>
          )}
        </div>

        <button onClick={onClose} aria-label="Close vault pool dialog" style={{
          width: "100%", marginTop: "18px", padding: "11px",
          borderRadius: "8px", border: `1px solid ${T.border}`,
          background: "transparent", color: T.dim, fontSize: "11px", cursor: "pointer", transition: "all 0.15s",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = T.bgHover; e.currentTarget.style.color = T.mid; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.dim; }}
        >Close</button>
      </div>
    </div>
  );
});

/* ─── NFTPreview (cancellable fetch) ────────────────────────────── */
export const NFTPreview = memo(({ nftContract, tokenId }) => {
  const [meta,    setMeta]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);
  const prevId = useRef(null);

  useEffect(() => {
    if (!tokenId || prevId.current === tokenId) return;
    prevId.current = tokenId;
    setMeta(null); setError(null); setLoading(true);
    let cancelled = false;

    (async () => {
      try {
        const uri = await readContract({ contract: nftContract, method: "tokenURI", params: [BigInt(tokenId)] });
        const url = uri.startsWith("ipfs://") ? uri.replace("ipfs://", "https://ipfs.io/ipfs/") : uri;

        let data;
        if (url.startsWith("data:application/json")) {
          data = JSON.parse(atob(url.split(",")[1]));
        } else {
          const res = await fetch(url);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          data = await res.json();
        }

        const img = data.image?.replace("ipfs://", "https://ipfs.io/ipfs/") ?? null;
        if (!cancelled) setMeta({ name: data.name, description: data.description, image: img });
      } catch (e) {
        if (!cancelled) setError(friendlyError(e));
      }
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [tokenId, nftContract]);

  if (!tokenId) return null;

  return (
    <div
      className="fade-in"
      role="region"
      aria-label={`NFT preview for token ${tokenId}`}
      style={{
        border: `1px solid ${T.border}`, borderRadius: "12px",
        overflow: "hidden", marginBottom: "16px",
        background: "rgba(0,200,255,0.03)",
      }}
    >
      {loading && (
        <div style={{ padding: "28px", textAlign: "center", color: T.dim, fontSize: "11px", letterSpacing: "2px" }}>
          <div style={{ marginBottom: "8px", fontSize: "20px", animation: "spin 1.2s linear infinite", display: "inline-block" }} aria-hidden="true">◌</div>
          <div role="status">Loading metadata…</div>
        </div>
      )}
      {error && (
        <div style={{ padding: "14px 16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: T.red, fontSize: "11px" }} aria-hidden="true">✕</span>
          <span style={{ color: T.red, fontSize: "11px" }}>{error}</span>
        </div>
      )}
      {meta && (
        <div style={{ display: "flex" }}>
          {meta.image && (
            <div style={{ width: "110px", minHeight: "110px", flexShrink: 0, background: "#010a12", position: "relative", overflow: "hidden" }}>
              <img
                src={meta.image}
                alt={meta.name ? `${meta.name} NFT artwork` : `Token #${tokenId} NFT artwork`}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                onError={e => { e.target.style.display = "none"; }}
              />
              <div style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                background: "linear-gradient(transparent, rgba(0,5,10,0.7))",
                padding: "8px 6px 4px",
              }}>
                <div style={{ fontFamily: "Share Tech Mono, monospace", fontSize: "9px", color: T.gold }} aria-hidden="true">#{tokenId}</div>
              </div>
            </div>
          )}
          <div style={{ padding: "14px 16px", flex: 1 }}>
            <div style={{ fontFamily: "Cinzel, serif", fontSize: "14px", color: T.gold, fontWeight: 700, marginBottom: "4px" }}>
              {meta.name || `Token #${tokenId}`}
            </div>
            {meta.description && (
              <p style={{
                fontSize: "10px", color: T.dim, lineHeight: 1.6, margin: 0,
                display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden",
              }}>
                {meta.description}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

/* ─── Panel ──────────────────────────────────────────────────────── */
export const Panel = memo(({ title, desc, children }) => (
  <div className="fade-in" style={{
    background: T.bg, border: `1px solid ${T.border}`,
    borderRadius: "14px", padding: "26px 24px 22px",
  }}>
    <div style={{ marginBottom: "20px" }}>
      <h3 style={{ fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: "16px", color: T.gold, letterSpacing: "2px", margin: "0 0 4px" }}>{title}</h3>
      <p style={{ fontSize: "10px", color: T.dim, lineHeight: 1.5, margin: 0 }}>{desc}</p>
    </div>
    {children}
  </div>
));

/* ─── Improvement #3 — Field with htmlFor ────────────────────────── */
export const Field = memo(({ label, placeholder, value, onChange, type = "text", id }) => {
  const [focused, setFocused] = useState(false);
  const inputId = id || `field-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div style={{ marginBottom: "14px" }}>
      <label htmlFor={inputId} style={{ display: "block", fontSize: "9px", color: T.dim, letterSpacing: "1.5px", marginBottom: "6px" }}>
        {label.toUpperCase()}
      </label>
      <input
        id={inputId} type={type} value={value} onChange={onChange} placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: "100%", padding: "10px 12px", boxSizing: "border-box",
          background: focused ? T.bgHover : T.bg,
          border: `1px solid ${focused ? T.gold : T.border}`,
          borderRadius: "8px", color: T.mid, fontSize: "13px",
          outline: "none", transition: "all 0.15s",
          fontFamily: "Share Tech Mono, monospace",
        }}
      />
    </div>
  );
});

/* ─── Buttons — all have aria-label + aria-busy ─────────────────── */
export function PrimaryBtn({ onClick, children, loading, ariaLabel }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick} disabled={loading}
      aria-label={ariaLabel || (typeof children === "string" ? children : undefined)}
      aria-busy={loading}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        width: "100%", padding: "13px", borderRadius: "8px", border: "none",
        fontFamily: "Cinzel, serif", fontSize: "12px", fontWeight: 700, letterSpacing: "2px",
        cursor: loading ? "not-allowed" : "pointer",
        background: loading ? "#3a2a00" : h ? `linear-gradient(135deg,#7a4a00,${T.goldHi})` : `linear-gradient(135deg,#7a4a00,${T.gold})`,
        color: "#000",
        transform: h && !loading ? "translateY(-1px)" : "none",
        boxShadow: h && !loading ? "0 6px 24px rgba(201,168,76,0.4)" : "none",
        transition: "all 0.15s", opacity: loading ? 0.7 : 1,
      }}
    >{loading ? "Processing…" : children}</button>
  );
}

export function GhostBtn({ onClick, children, ariaLabel }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel || (typeof children === "string" ? children : undefined)}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        width: "100%", padding: "9px", borderRadius: "8px",
        border: `1px solid ${T.border}`,
        background: h ? T.bgHover : "transparent",
        color: h ? T.mid : T.dim,
        fontSize: "11px", marginBottom: "12px",
        letterSpacing: "0.5px", cursor: "pointer", transition: "all 0.15s",
      }}
    >{children}</button>
  );
}

export function GreenBtn({ onClick, children, loading, ariaLabel }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick} disabled={loading}
      aria-label={ariaLabel || (typeof children === "string" ? children : undefined)}
      aria-busy={loading}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        width: "100%", padding: "13px", borderRadius: "8px",
        border: "1px solid rgba(0,255,136,0.28)",
        background: h ? "rgba(0,255,136,0.15)" : "rgba(0,255,136,0.07)",
        color: T.green, fontSize: "12px", fontFamily: "Cinzel, serif",
        letterSpacing: "2px", cursor: loading ? "not-allowed" : "pointer",
        transition: "all 0.15s", opacity: loading ? 0.7 : 1,
      }}
    >{loading ? "Processing…" : children}</button>
  );
}

export function DangerBtn({ onClick, children, loading, ariaLabel }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick} disabled={loading}
      aria-label={ariaLabel || (typeof children === "string" ? children : undefined)}
      aria-busy={loading}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        width: "100%", padding: "13px", borderRadius: "8px",
        border: "1px solid rgba(255,68,102,0.28)",
        background: h ? "rgba(255,68,102,0.15)" : "rgba(255,68,102,0.07)",
        color: T.red, fontSize: "12px", fontFamily: "Cinzel, serif",
        letterSpacing: "2px", cursor: loading ? "not-allowed" : "pointer",
        transition: "all 0.15s", opacity: loading ? 0.7 : 1,
      }}
    >{loading ? "Processing…" : children}</button>
  );
}

export function StepBtn({ step, label, color, onClick, loading, ariaLabel }) {
  const [h, setH] = useState(false);
  return (
    <button
      onClick={onClick} disabled={loading}
      aria-label={ariaLabel || `Step ${step}: ${label}`}
      aria-busy={loading}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        padding: "12px", borderRadius: "8px",
        border: `1px solid ${color}33`,
        background: h ? `${color}1a` : `${color}0a`,
        color, fontSize: "11px", fontFamily: "Share Tech Mono, monospace",
        cursor: loading ? "not-allowed" : "pointer", transition: "all 0.15s",
        opacity: loading ? 0.7 : 1,
      }}
    >
      <span style={{ opacity: 0.5, marginRight: "5px" }} aria-hidden="true">Step {step} —</span>
      {loading ? "…" : label}
    </button>
  );
}

/* ─── Improvement #4 — Sidebar (mobile-aware) ───────────────────── */
export const Sidebar = memo(({ tab, setTab, setStatus, setListing, isMobile }) => (
  <nav aria-label="Marketplace actions" style={{
    background: T.bg, border: `1px solid ${T.border}`,
    borderRadius: "14px", overflow: "hidden",
  }}>
    {!isMobile && (
      <div style={{ padding: "13px 16px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ fontSize: "9px", color: T.dim, letterSpacing: "2px" }}>ACTIONS</div>
      </div>
    )}
    <ul
      role="tablist"
      aria-label="Action tabs"
      style={{ margin: 0, padding: 0, listStyle: "none", display: isMobile ? "flex" : "block" }}
    >
      {TABS.map(t => (
        <li key={t.id} role="none" style={{ flex: isMobile ? 1 : undefined }}>
          <button
            role="tab"
            aria-selected={tab === t.id}
            aria-label={`${t.label} — ${t.desc}`}
            onClick={() => { setTab(t.id); setStatus(null); setListing(null); }}
            style={{
              display: "flex", alignItems: "center", justifyContent: isMobile ? "center" : "flex-start",
              gap: isMobile ? "6px" : "12px",
              width: "100%", padding: isMobile ? "10px 8px" : "12px 16px", border: "none",
              background: tab === t.id ? "rgba(201,168,76,0.1)" : "transparent",
              color: tab === t.id ? T.gold : T.dim,
              fontSize: isMobile ? "11px" : "12px", letterSpacing: "1px", textAlign: "left",
              borderLeft: isMobile ? "none" : (tab === t.id ? `2px solid ${T.gold}` : "2px solid transparent"),
              borderBottom: isMobile ? (tab === t.id ? `2px solid ${T.gold}` : `2px solid transparent`) : "none",
              cursor: "pointer", transition: "all 0.12s",
            }}
            onMouseEnter={e => { if (tab !== t.id) { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = T.mid; } }}
            onMouseLeave={e => { if (tab !== t.id) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.dim; } }}
          >
            <span style={{ fontSize: "14px", opacity: 0.6, width: "16px", textAlign: "center" }} aria-hidden="true">{t.icon}</span>
            {isMobile
              ? <span>{t.label}</span>
              : <div>
                  <div>{t.label}</div>
                  <div style={{ fontSize: "9px", color: "#1a4a5a", marginTop: "1px" }}>{t.desc}</div>
                </div>
            }
          </button>
        </li>
      ))}
    </ul>

    {!isMobile && (
      <div style={{ padding: "14px 16px", borderTop: `1px solid ${T.border}`, marginTop: "6px" }}>
        <div style={{ fontSize: "9px", color: T.dim, letterSpacing: "1.5px", marginBottom: "10px" }}>CONTRACTS</div>
        {[["NFT", NFT_ADDRESS], ["Market", MARKETPLACE_ADDRESS]].map(([label, addr]) => (
          <div key={label} style={{ marginBottom: "8px" }}>
            <div style={{ fontSize: "9px", color: T.mid, marginBottom: "2px" }}>{label}</div>
            <a
              href={`https://monadscan.com/address/${addr}`}
              target="_blank" rel="noreferrer"
              aria-label={`View ${label} contract on Monadscan`}
              style={{ fontSize: "9px", color: T.dim, fontFamily: "Share Tech Mono, monospace", textDecoration: "none" }}
              onMouseEnter={e => e.target.style.color = T.gold}
              onMouseLeave={e => e.target.style.color = T.dim}
            >{addr.slice(0, 8)}…{addr.slice(-6)}</a>
          </div>
        ))}
      </div>
    )}
  </nav>
));

/* ═══════════════════════════════════════════════════════════════════
   MAIN MARKETPLACE
   Improvements applied:
   #1 friendlyError()   — all handlers
   #2 per-action loading state object
   #3 aria-label / aria-live / role on every interactive element
   #4 useResponsive()  — grid collapses on mobile, sidebar becomes tabs
   #5 useMemo for contracts, useCallback for handlers
   ══════════════════════════════════════════════════════════════════ */
export default function Marketplace({ account }) {
  const { isMobile } = useResponsive();

  const [tab,       setTab]       = useState("buy");
  const [status,    setStatus]    = useState(null);
  const [listing,   setListing]   = useState(null);
  const [vaultOpen, setVaultOpen] = useState(false);

  // Improvement #2 — granular per-action loading
  const [loading, setLoading] = useState({
    buy: false, approve: false, list: false,
    cancel: false, offerTrade: false, acceptTrade: false,
  });
  const setL = useCallback((key, val) => setLoading(prev => ({ ...prev, [key]: val })), []);

  const [buyId,     setBuyId]     = useState("");
  const [listId,    setListId]    = useState("");
  const [listPrice, setListPrice] = useState("");
  const [cancelId,  setCancelId]  = useState("");
  const [myToken,   setMyToken]   = useState("");
  const [wantToken, setWantToken] = useState("");
  const [acceptId,  setAcceptId]  = useState("");

  const { mutate: sendTx } = useSendTransaction();

  // Improvement #5 — memoised contracts
  const nft = useMemo(() => getContract({ client, chain: MONAD, address: NFT_ADDRESS,         abi: NFT_ABI }),         []);
  const mkt = useMemo(() => getContract({ client, chain: MONAD, address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI }), []);

  const msg = useCallback((m, type = "success") => setStatus({ m, type }), []);

  // ── Handlers (useCallback + friendlyError) ──
  const checkListing = useCallback(async id => {
    try {
      msg("Fetching listing…", "info");
      const d = await readContract({ contract: mkt, method: "listings", params: [BigInt(id)] });
      setListing({ seller: d[0], price: formatEther(d[1]), active: d[2] });
      d[2] ? msg(`Token #${id} — ${formatEther(d[1])} MON`, "success")
           : msg(`Token #${id} is not currently listed.`, "error");
    } catch (e) { msg(friendlyError(e), "error"); }
  }, [mkt, msg]);

  const handleApprove = useCallback(async id => {
    msg("Approving marketplace…", "info");
    setL("approve", true);
    sendTx(
      prepareContractCall({ contract: nft, method: "approve", params: [MARKETPLACE_ADDRESS, BigInt(id)] }),
      {
        onSuccess: () => { msg("Approved! Now click Step 2.", "success"); setL("approve", false); },
        onError:   e  => { msg(friendlyError(e), "error");                setL("approve", false); },
      }
    );
  }, [nft, msg, sendTx, setL]);

  const handleList = useCallback(async () => {
    if (!listId || !listPrice) return msg("Enter token ID and price.", "error");
    msg("Publishing listing…", "info");
    setL("list", true);
    sendTx(
      prepareContractCall({ contract: mkt, method: "listForSale", params: [BigInt(listId), parseEther(listPrice)] }),
      {
        onSuccess: () => { msg(`Token #${listId} listed for ${listPrice} MON ✓`); setL("list", false); },
        onError:   e  => { msg(friendlyError(e), "error");                         setL("list", false); },
      }
    );
  }, [mkt, listId, listPrice, msg, sendTx, setL]);

  const handleBuy = useCallback(async () => {
    if (!buyId) return msg("Enter a token ID.", "error");
    try {
      msg("Fetching price…", "info");
      const d = await readContract({ contract: mkt, method: "listings", params: [BigInt(buyId)] });
      if (!d[2]) return msg("Token is not listed for sale.", "error");
      msg("Sending transaction…", "info");
      setL("buy", true);
      sendTx(
        prepareContractCall({ contract: mkt, method: "buy", params: [BigInt(buyId)], value: d[1] }),
        {
          onSuccess: () => { msg(`Token #${buyId} purchased! 🎉`); setL("buy", false); },
          onError:   e  => { msg(friendlyError(e), "error");        setL("buy", false); },
        }
      );
    } catch (e) { msg(friendlyError(e), "error"); }
  }, [mkt, buyId, msg, sendTx, setL]);

  const handleCancel = useCallback(async () => {
    if (!cancelId) return msg("Enter a token ID.", "error");
    msg("Cancelling listing…", "info");
    setL("cancel", true);
    sendTx(
      prepareContractCall({ contract: mkt, method: "cancelListing", params: [BigInt(cancelId)] }),
      {
        onSuccess: () => { msg(`Listing #${cancelId} cancelled.`); setL("cancel", false); },
        onError:   e  => { msg(friendlyError(e), "error");          setL("cancel", false); },
      }
    );
  }, [mkt, cancelId, msg, sendTx, setL]);

  const handleOfferTrade = useCallback(async () => {
    if (!myToken || !wantToken) return msg("Enter both token IDs.", "error");
    msg("Step 1/2 — Approving…", "info");
    setL("offerTrade", true);
    sendTx(
      prepareContractCall({ contract: nft, method: "approve", params: [MARKETPLACE_ADDRESS, BigInt(myToken)] }),
      {
        onSuccess: () => {
          msg("Step 2/2 — Sending offer…", "info");
          sendTx(
            prepareContractCall({ contract: mkt, method: "offerTrade", params: [BigInt(myToken), BigInt(wantToken)] }),
            {
              onSuccess: () => { msg(`Trade offered: #${myToken} ⇄ #${wantToken} ✓`); setL("offerTrade", false); },
              onError:   e  => { msg(friendlyError(e), "error");                        setL("offerTrade", false); },
            }
          );
        },
        onError: e => { msg(friendlyError(e), "error"); setL("offerTrade", false); },
      }
    );
  }, [nft, mkt, myToken, wantToken, msg, sendTx, setL]);

  const handleAcceptTrade = useCallback(async () => {
    if (!acceptId) return msg("Enter the offered token ID.", "error");
    try {
      msg("Looking up offer…", "info");
      const o = await readContract({ contract: mkt, method: "tradeOffers", params: [BigInt(acceptId)] });
      if (!o[3]) return msg(`No active offer for token #${acceptId}.`, "error");
      msg("Step 1/2 — Approving…", "info");
      setL("acceptTrade", true);
      sendTx(
        prepareContractCall({ contract: nft, method: "approve", params: [MARKETPLACE_ADDRESS, o[2]] }),
        {
          onSuccess: () => {
            msg("Step 2/2 — Accepting trade…", "info");
            sendTx(
              prepareContractCall({ contract: mkt, method: "acceptTrade", params: [BigInt(acceptId)] }),
              {
                onSuccess: () => { msg("Trade completed! ✓");   setL("acceptTrade", false); },
                onError:   e  => { msg(friendlyError(e), "error"); setL("acceptTrade", false); },
              }
            );
          },
          onError: e => { msg(friendlyError(e), "error"); setL("acceptTrade", false); },
        }
      );
    } catch (e) { msg(friendlyError(e), "error"); }
  }, [nft, mkt, acceptId, msg, sendTx, setL]);

  /* ── Render ── */
  return (
    <>
      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; } }
        .fade-in          { animation: fadeIn 0.25s ease; }
      `}</style>

      {vaultOpen && <VaultPoolModal onClose={() => setVaultOpen(false)} mkt={mkt} />}

      <main style={{
        maxWidth: "1100px", margin: "0 auto",
        padding: isMobile ? "20px 12px 48px" : "32px 24px 64px",
        position: "relative", zIndex: 1,
      }}>
        {/* Header */}
        <header style={{
          marginBottom: "18px",
          display: "flex", justifyContent: "space-between", alignItems: "flex-end",
          flexWrap: "wrap", gap: "12px",
        }}>
          <div>
            <h1 style={{
              fontFamily: "Cinzel, serif", fontWeight: 700,
              fontSize: isMobile ? "20px" : "26px",
              color: T.gold, letterSpacing: "2px", margin: "0 0 4px",
            }}>NFT MARKETPLACE</h1>
            <p style={{ color: T.dim, fontSize: "11px", letterSpacing: "0.5px", margin: 0 }}>
              Connected: <span style={{ color: T.gold }}>{account.address.slice(0, 6)}…{account.address.slice(-4)}</span>
              <span style={{ margin: "0 8px", color: T.border }}>·</span>
              <span style={{ color: T.green }}>Monad Mainnet</span>
            </p>
          </div>
          <a
            href={TG_BOT_URL} target="_blank" rel="noreferrer"
            aria-label="Open @BuyTradeNFT_Bot on Telegram"
            style={{
              display: "flex", alignItems: "center", gap: "8px",
              background: "rgba(41,182,246,0.08)", border: "1px solid rgba(41,182,246,0.2)",
              borderRadius: "10px", padding: "10px 14px", textDecoration: "none", color: T.blue,
              transition: "background 0.15s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "rgba(41,182,246,0.16)"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(41,182,246,0.08)"; }}
          >
            <TgIcon size={15} />
            <div>
              <div style={{ fontSize: "11px" }}>@BuyTradeNFT_Bot</div>
              <div style={{ fontSize: "9px", color: T.mid }}>Trade via Telegram</div>
            </div>
          </a>
        </header>

        <MarketStats mkt={mkt} onVaultPool={() => setVaultOpen(true)} isMobile={isMobile} />

        <div style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "230px 1fr",
          gap: "18px",
        }}>
          <Sidebar tab={tab} setTab={setTab} setStatus={setStatus} setListing={setListing} isMobile={isMobile} />

          <div>
            <StatusBanner status={status} onDismiss={() => setStatus(null)} />

            {tab === "buy" && (
              <Panel title="Buy an NFT" desc="Enter a token ID to check price and purchase">
                <Field id="buy-token-id" label="Token ID" placeholder="e.g. 42" value={buyId} onChange={e => { setBuyId(e.target.value); setListing(null); }} />
                {buyId && <GhostBtn onClick={() => checkListing(buyId)} ariaLabel={`Check listing price for token ${buyId}`}>Check Listing Price →</GhostBtn>}
                {buyId && <NFTPreview nftContract={nft} tokenId={buyId} />}
                {listing?.active && (
                  <div className="fade-in" style={{
                    background: "rgba(0,255,136,0.05)", border: "1px solid rgba(0,255,136,0.18)",
                    borderRadius: "10px", padding: "16px 18px", margin: "14px 0",
                    display: "flex", justifyContent: "space-between",
                  }}>
                    <div>
                      <div style={{ fontSize: "9px", color: T.mid, letterSpacing: "1.5px", marginBottom: "4px" }}>PRICE</div>
                      <div style={{ fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: "24px", color: T.mid }}>
                        {listing.price}<span style={{ fontSize: "13px", color: T.green, marginLeft: "5px" }}>MON</span>
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "9px", color: T.mid, letterSpacing: "1.5px", marginBottom: "4px" }}>SELLER</div>
                      <div style={{ fontSize: "11px", color: T.dim, fontFamily: "Share Tech Mono, monospace" }}>
                        {listing.seller.slice(0, 10)}…
                      </div>
                    </div>
                  </div>
                )}
                <PrimaryBtn onClick={handleBuy} loading={loading.buy} ariaLabel={`Buy token ${buyId || "—"}`}>Buy Now</PrimaryBtn>
              </Panel>
            )}

            {tab === "list" && (
              <Panel title="List for Sale" desc="Approve the marketplace then create your listing">
                <Field id="list-token-id" label="Token ID"    placeholder="e.g. 42"  value={listId}    onChange={e => setListId(e.target.value)} />
                <Field id="list-price"    label="Price (MON)" placeholder="e.g. 0.5" value={listPrice} onChange={e => setListPrice(e.target.value)} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "4px" }}>
                  <StepBtn step={1} label="Approve"       color={T.cyan} loading={loading.approve} onClick={() => listId && handleApprove(listId)} ariaLabel="Step 1: Approve marketplace to transfer your NFT" />
                  <StepBtn step={2} label="List for Sale" color={T.gold} loading={loading.list}    onClick={handleList}                             ariaLabel="Step 2: Publish listing on marketplace" />
                </div>
                <div style={{ marginTop: "12px", padding: "10px 12px", background: "rgba(0,200,255,0.04)", border: "1px solid rgba(0,200,255,0.12)", borderRadius: "8px", fontSize: "10px", color: T.dim, lineHeight: 1.7 }}>
                  Step 1 authorises the marketplace to transfer your NFT. Step 2 publishes the listing on-chain.
                </div>
              </Panel>
            )}

            {tab === "cancel" && (
              <Panel title="Cancel Listing" desc="Remove your NFT from sale — it stays in your wallet">
                <Field id="cancel-token-id" label="Token ID" placeholder="e.g. 42" value={cancelId} onChange={e => setCancelId(e.target.value)} />
                <DangerBtn onClick={handleCancel} loading={loading.cancel} ariaLabel={`Cancel listing for token ${cancelId || "—"}`}>Cancel Listing</DangerBtn>
              </Panel>
            )}

            {tab === "trade" && (
              <div style={{ display: "grid", gap: "16px" }}>
                <Panel title="Offer a Trade" desc="Approve your token then propose a peer-to-peer swap">
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: isMobile ? "1fr" : "1fr 30px 1fr",
                    gap: "10px", alignItems: "end",
                  }}>
                    <Field id="my-token"   label="Your Token ID" placeholder="e.g. 10" value={myToken}   onChange={e => setMyToken(e.target.value)} />
                    {!isMobile && <div style={{ paddingBottom: "14px", textAlign: "center", color: T.dim, fontSize: "18px" }} aria-hidden="true">⇄</div>}
                    <Field id="want-token" label="Want Token ID" placeholder="e.g. 55" value={wantToken} onChange={e => setWantToken(e.target.value)} />
                  </div>
                  <PrimaryBtn onClick={handleOfferTrade} loading={loading.offerTrade} ariaLabel={`Approve and offer trade of #${myToken} for #${wantToken}`}>Approve + Offer Trade</PrimaryBtn>
                </Panel>

                <Panel title="Accept a Trade" desc="Accept an incoming swap offer">
                  <Field id="accept-token-id" label="Offered Token ID" placeholder="Token ID offered to you" value={acceptId} onChange={e => setAcceptId(e.target.value)} />
                  <GreenBtn onClick={handleAcceptTrade} loading={loading.acceptTrade} ariaLabel={`Approve and accept trade offer for token ${acceptId}`}>Approve + Accept Trade</GreenBtn>
                </Panel>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
