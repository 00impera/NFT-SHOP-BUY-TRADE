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

/* ─── RPC helper ─────────────────────────────────────────────────── */
const RPC_URL = "https://rpc.ankr.com/monad_mainnet";

async function rpcGetBalance(address) {
  const res = await fetch(RPC_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0", id: 1,
      method: "eth_getBalance",
      params: [address, "latest"],
    }),
  });
  const { result } = await res.json();
  return BigInt(result);
}

/* ─── NFT ABI (hardcoded — full verified ABI from Monadscan) ────── */
const NFT_ABI_FULL = [
  { "inputs": [{ "internalType": "address", "name": "owner_", "type": "address" }], "stateMutability": "nonpayable", "type": "constructor" },
  { "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "approve", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }], "name": "balanceOf", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "getApproved", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }, { "internalType": "address", "name": "operator", "type": "address" }], "name": "isApprovedForAll", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "to", "type": "address" }, { "internalType": "string", "name": "uri", "type": "string" }], "name": "mint", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "name", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "nextId", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "owner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "ownerOf", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "renounceOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "safeTransferFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }, { "internalType": "bytes", "name": "data", "type": "bytes" }], "name": "safeTransferFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "operator", "type": "address" }, { "internalType": "bool", "name": "approved", "type": "bool" }], "name": "setApprovalForAll", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "bytes4", "name": "interfaceId", "type": "bytes4" }], "name": "supportsInterface", "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "symbol", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "tokenURI", "outputs": [{ "internalType": "string", "name": "", "type": "string" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "from", "type": "address" }, { "internalType": "address", "name": "to", "type": "address" }, { "internalType": "uint256", "name": "tokenId", "type": "uint256" }], "name": "transferFrom", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "newOwner", "type": "address" }], "name": "transferOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
];

/* ─── Error helpers ──────────────────────────────────────────────── */
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

/* ─── useResponsive ──────────────────────────────────────────────── */
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

/* ─── StatusBanner ───────────────────────────────────────────────── */
export const StatusBanner = memo(({ status, onDismiss }) => {
  if (!status) return null;
  const color = STATUS_COLOR[status.type];
  const bg    = STATUS_BG[status.type];
  const icon  = status.type === "success" ? "✓" : status.type === "error" ? "✕" : "○";
  return (
    <div className="fade-in" role="alert" aria-live="polite" style={{
      display: "flex", alignItems: "flex-start", gap: "10px",
      background: bg, border: `1px solid ${color}22`,
      borderLeft: `3px solid ${color}`,
      borderRadius: "10px", padding: "12px 14px", marginBottom: "16px",
    }}>
      <span style={{ color, fontSize: "13px", flexShrink: 0, marginTop: "1px" }} aria-hidden="true">{icon}</span>
      <span style={{ color, fontSize: "12px", flex: 1, lineHeight: 1.6 }}>{status.m}</span>
      <button onClick={onDismiss} aria-label="Dismiss message"
        style={{ background: "none", border: "none", color: T.dim, fontSize: "18px", cursor: "pointer", lineHeight: 1, padding: "0 2px" }}>×</button>
    </div>
  );
});

/* ─── Stat ───────────────────────────────────────────────────────── */
export const Stat = memo(({ label, value, accent, last }) => (
  <div style={{ textAlign: "center", padding: "0 20px", borderRight: last ? "none" : `1px solid ${T.border}` }}>
    <div style={{ fontSize: "9px", color: T.dim, letterSpacing: "2px", marginBottom: "5px" }}>{label}</div>
    <div style={{ fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: "18px", color: accent || T.gold, lineHeight: 1 }}>{value}</div>
  </div>
));

/* ─── MarketStats ────────────────────────────────────────────────── */
// Only calls methods that actually exist on the contract:
// FEE_BPS() and eth_getBalance (native MON held by the contract).
// Volume / floor / listed-count have no on-chain getter → shown as "—".
export const MarketStats = memo(({ mkt, onVaultPool, isMobile }) => {
  const [stats,    setStats]    = useState({ fee: "—", vault: "—", volume: "—", listed: "—" });
  const [loading,  setLoading]  = useState(true);
  const [fetchErr, setFetchErr] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true); setFetchErr(false);
    try {
      const [feeBps, weiBalance] = await Promise.all([
        readContract({ contract: mkt, method: "FEE_BPS", params: [] }).catch(() => null),
        rpcGetBalance(MARKETPLACE_ADDRESS).catch(() => null),
      ]);

      const vaultMon = weiBalance != null
        ? (Number(weiBalance) / 1e18).toFixed(4) + " MON"
        : "—";

      setStats({
        fee:    feeBps != null ? `${feeBps.toString()} bps` : "—",
        vault:  vaultMon,
        volume: "—",   // no on-chain counter
        listed: "—",   // no on-chain counter
      });
    } catch (_) { setFetchErr(true); }
    setLoading(false);
  }, [mkt]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  const dot = loading ? "…" : undefined;

  return (
    <section aria-label="Market statistics" style={{
      display: "flex", flexDirection: isMobile ? "column" : "row",
      alignItems: isMobile ? "flex-start" : "center",
      justifyContent: "space-between", gap: isMobile ? "14px" : 0,
      background: T.bg, border: `1px solid ${T.border}`, borderRadius: "12px",
      padding: isMobile ? "16px" : "16px 24px", marginBottom: "18px",
      boxShadow: "0 0 40px rgba(0,0,0,0.6)",
    }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: isMobile ? "16px 0" : 0 }}>
        <Stat label="FEE RATE"   value={dot || stats.fee}    />
        <Stat label="VAULT POOL" value={dot || stats.vault}  accent={T.green} />
        <Stat label="VOLUME"     value={dot || stats.volume} accent={T.cyan} />
        <Stat label="LISTED"     value={dot || stats.listed} accent={T.mid} last />
      </div>
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        {fetchErr && (
          <button onClick={fetchStats} aria-label="Retry loading market stats"
            style={{ fontSize: "10px", color: T.red, background: "none", border: `1px solid ${T.red}44`, borderRadius: "6px", padding: "6px 10px", cursor: "pointer" }}>
            ↻ Retry
          </button>
        )}
        <button onClick={onVaultPool} aria-label="View Vault Pool details" style={{
          padding: "10px 20px", borderRadius: "8px",
          border: "1px solid rgba(0,255,136,0.3)", background: "rgba(0,255,136,0.08)",
          color: T.green, fontFamily: "Cinzel, serif", fontSize: "11px", letterSpacing: "1.5px",
          cursor: "pointer", transition: "all 0.15s", whiteSpace: "nowrap",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = "rgba(0,255,136,0.18)"; e.currentTarget.style.boxShadow = "0 0 16px rgba(0,255,136,0.25)"; }}
          onMouseLeave={e => { e.currentTarget.style.background = "rgba(0,255,136,0.08)"; e.currentTarget.style.boxShadow = "none"; }}
        >◈ VAULT POOL</button>
      </div>
    </section>
  );
});

/* ─── VaultPoolModal ─────────────────────────────────────────────── */
// Fetches native MON balance of the marketplace contract via eth_getBalance.
// No ABI method needed — works on any EVM chain.
export const VaultPoolModal = memo(({ onClose }) => {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err,     setErr]     = useState(false);
  const modalRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true); setErr(false);
    try {
      const wei = await rpcGetBalance(MARKETPLACE_ADDRESS);
      const mon = (Number(wei) / 1e18).toFixed(4);
      setBalance(mon);
    } catch (_) { setErr(true); }
    setLoading(false);
  }, []);

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
        e.preventDefault(); (e.shiftKey ? last : first)?.focus();
      }
    };
    el.addEventListener("keydown", trap);
    return () => el.removeEventListener("keydown", trap);
  }, []);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="vault-title" style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: "rgba(0,5,10,0.85)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
    }} onClick={onClose} onKeyDown={e => e.key === "Escape" && onClose()}>
      <div ref={modalRef} onClick={e => e.stopPropagation()} style={{
        background: T.bg, border: "1px solid #0a3a2a", borderRadius: "16px",
        padding: "32px 36px", minWidth: "320px", maxWidth: "420px", width: "100%",
        boxShadow: "0 0 60px rgba(0,255,136,0.12)",
      }}>
        <div id="vault-title" style={{ fontFamily: "Cinzel, serif", fontSize: "16px", color: T.green, letterSpacing: "3px", marginBottom: "6px" }}>◈ VAULT POOL</div>
        <p style={{ fontSize: "10px", color: T.dim, marginBottom: "20px", lineHeight: 1.7 }}>
          Marketplace fees accumulate in the contract. The balance shown is the total MON held by the marketplace contract on-chain.
        </p>

        {/* Balance card */}
        <div style={{ background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.18)", borderRadius: "10px", padding: "22px 20px", textAlign: "center", marginBottom: "14px" }}>
          <div style={{ fontSize: "9px", color: T.dim, letterSpacing: "2px", marginBottom: "8px" }}>CONTRACT BALANCE</div>
          {loading && (
            <div style={{ color: T.dim, fontSize: "12px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
              <span style={{ animation: "spin 1.2s linear infinite", display: "inline-block" }}>◌</span> Fetching…
            </div>
          )}
          {err && (
            <div>
              <div style={{ color: T.red, fontSize: "11px", marginBottom: "10px" }}>Could not fetch balance — RPC error.</div>
              <button onClick={load} style={{ fontSize: "10px", color: T.cyan, background: "none", border: `1px solid ${T.cyan}44`, borderRadius: "6px", padding: "5px 12px", cursor: "pointer" }}>↻ Retry</button>
            </div>
          )}
          {!loading && !err && balance != null && (
            <div style={{ fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: "32px", color: T.green, lineHeight: 1 }}>
              {balance}
              <span style={{ fontSize: "15px", color: T.mid, marginLeft: "8px" }}>MON</span>
            </div>
          )}
        </div>

        {/* Contract link */}
        <a href={`https://monadscan.com/address/${MARKETPLACE_ADDRESS}`} target="_blank" rel="noreferrer"
          style={{ display: "block", textAlign: "center", fontSize: "10px", color: T.dim, fontFamily: "Share Tech Mono, monospace", textDecoration: "none", marginBottom: "18px" }}
          onMouseEnter={e => e.target.style.color = T.cyan}
          onMouseLeave={e => e.target.style.color = T.dim}
        >
          ↗ View contract on Monadscan
        </a>

        <button onClick={onClose} aria-label="Close vault pool dialog" style={{
          width: "100%", padding: "11px", borderRadius: "8px",
          border: `1px solid ${T.border}`, background: "transparent", color: T.dim,
          fontSize: "11px", cursor: "pointer", transition: "all 0.15s",
        }}
          onMouseEnter={e => { e.currentTarget.style.background = T.bgHover; e.currentTarget.style.color = T.mid; }}
          onMouseLeave={e => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.dim; }}
        >Close</button>
      </div>
    </div>
  );
});

/* ─── Panel ──────────────────────────────────────────────────────── */
export const Panel = memo(({ title, desc, children }) => (
  <div className="fade-in" style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: "14px", padding: "26px 24px 22px" }}>
    <div style={{ marginBottom: "20px" }}>
      <h3 style={{ fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: "16px", color: T.gold, letterSpacing: "2px", margin: "0 0 4px" }}>{title}</h3>
      <p style={{ fontSize: "10px", color: T.dim, lineHeight: 1.5, margin: 0 }}>{desc}</p>
    </div>
    {children}
  </div>
));

/* ─── Field ──────────────────────────────────────────────────────── */
export const Field = memo(({ label, placeholder, value, onChange, type = "text", id }) => {
  const [focused, setFocused] = useState(false);
  const inputId = id || `field-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div style={{ marginBottom: "14px" }}>
      <label htmlFor={inputId} style={{ display: "block", fontSize: "9px", color: T.dim, letterSpacing: "1.5px", marginBottom: "6px" }}>
        {label.toUpperCase()}
      </label>
      <input id={inputId} type={type} value={value} onChange={onChange} placeholder={placeholder}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        style={{
          width: "100%", padding: "10px 12px", boxSizing: "border-box",
          background: focused ? T.bgHover : T.bg,
          border: `1px solid ${focused ? T.gold : T.border}`,
          borderRadius: "8px", color: T.mid, fontSize: "13px",
          outline: "none", transition: "all 0.15s", fontFamily: "Share Tech Mono, monospace",
        }}
      />
    </div>
  );
});

/* ─── Buttons ────────────────────────────────────────────────────── */
export function PrimaryBtn({ onClick, children, loading, ariaLabel }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} disabled={loading}
      aria-label={ariaLabel || (typeof children === "string" ? children : undefined)} aria-busy={loading}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        width: "100%", padding: "13px", borderRadius: "8px", border: "none",
        fontFamily: "Cinzel, serif", fontSize: "12px", fontWeight: 700, letterSpacing: "2px",
        cursor: loading ? "not-allowed" : "pointer",
        background: loading ? "#3a2a00" : h ? `linear-gradient(135deg,#7a4a00,${T.goldHi})` : `linear-gradient(135deg,#7a4a00,${T.gold})`,
        color: "#000", transform: h && !loading ? "translateY(-1px)" : "none",
        boxShadow: h && !loading ? "0 6px 24px rgba(201,168,76,0.4)" : "none",
        transition: "all 0.15s", opacity: loading ? 0.7 : 1,
      }}
    >{loading ? "Processing…" : children}</button>
  );
}

export function GhostBtn({ onClick, children, ariaLabel }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} aria-label={ariaLabel || (typeof children === "string" ? children : undefined)}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        width: "100%", padding: "9px", borderRadius: "8px", border: `1px solid ${T.border}`,
        background: h ? T.bgHover : "transparent", color: h ? T.mid : T.dim,
        fontSize: "11px", marginBottom: "12px", letterSpacing: "0.5px", cursor: "pointer", transition: "all 0.15s",
      }}
    >{children}</button>
  );
}

export function GreenBtn({ onClick, children, loading, ariaLabel }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick} disabled={loading}
      aria-label={ariaLabel || (typeof children === "string" ? children : undefined)} aria-busy={loading}
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
    <button onClick={onClick} disabled={loading}
      aria-label={ariaLabel || (typeof children === "string" ? children : undefined)} aria-busy={loading}
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
    <button onClick={onClick} disabled={loading}
      aria-label={ariaLabel || `Step ${step}: ${label}`} aria-busy={loading}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        padding: "12px", borderRadius: "8px", border: `1px solid ${color}33`,
        background: h ? `${color}1a` : `${color}0a`, color,
        fontSize: "11px", fontFamily: "Share Tech Mono, monospace",
        cursor: loading ? "not-allowed" : "pointer", transition: "all 0.15s", opacity: loading ? 0.7 : 1,
      }}
    >
      <span style={{ opacity: 0.5, marginRight: "5px" }} aria-hidden="true">Step {step} —</span>
      {loading ? "…" : label}
    </button>
  );
}

/* ─── Sidebar ────────────────────────────────────────────────────── */
export const Sidebar = memo(({ tab, setTab, setStatus, setListing, isMobile }) => (
  <nav aria-label="Marketplace actions" style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: "14px", overflow: "hidden" }}>
    {!isMobile && (
      <div style={{ padding: "13px 16px", borderBottom: `1px solid ${T.border}` }}>
        <div style={{ fontSize: "9px", color: T.dim, letterSpacing: "2px" }}>ACTIONS</div>
      </div>
    )}
    <ul role="tablist" aria-label="Action tabs" style={{ margin: 0, padding: 0, listStyle: "none", display: isMobile ? "flex" : "block" }}>
      {TABS.map(t => (
        <li key={t.id} role="none" style={{ flex: isMobile ? 1 : undefined }}>
          <button role="tab" aria-selected={tab === t.id} aria-label={`${t.label} — ${t.desc}`}
            onClick={() => { setTab(t.id); setStatus(null); setListing(null); }}
            style={{
              display: "flex", alignItems: "center", justifyContent: isMobile ? "center" : "flex-start",
              gap: isMobile ? "6px" : "12px", width: "100%",
              padding: isMobile ? "10px 8px" : "12px 16px", border: "none",
              background: tab === t.id ? "rgba(201,168,76,0.1)" : "transparent",
              color: tab === t.id ? T.gold : T.dim,
              fontSize: isMobile ? "11px" : "12px", letterSpacing: "1px", textAlign: "left",
              borderLeft: isMobile ? "none" : (tab === t.id ? `2px solid ${T.gold}` : "2px solid transparent"),
              borderBottom: isMobile ? (tab === t.id ? `2px solid ${T.gold}` : "2px solid transparent") : "none",
              cursor: "pointer", transition: "all 0.12s",
            }}
            onMouseEnter={e => { if (tab !== t.id) { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; e.currentTarget.style.color = T.mid; } }}
            onMouseLeave={e => { if (tab !== t.id) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = T.dim; } }}
          >
            <span style={{ fontSize: "14px", opacity: 0.6, width: "16px", textAlign: "center" }} aria-hidden="true">{t.icon}</span>
            {isMobile
              ? <span>{t.label}</span>
              : <div><div>{t.label}</div><div style={{ fontSize: "9px", color: "#1a4a5a", marginTop: "1px" }}>{t.desc}</div></div>
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
            <a href={`https://monadscan.com/address/${addr}`} target="_blank" rel="noreferrer"
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
   BuyPanel — OpenSea-style card
   ══════════════════════════════════════════════════════════════════ */
function BuyPanel({ buyId, setBuyId, listing, setListing, meta, metaLoading, onBuy, onCheck, loading, copied, setCopied }) {
  const timerRef = useRef(null);

  function handleTokenChange(e) {
    const val = e.target.value.replace(/[^0-9]/g, "");
    setBuyId(val);
    setListing(null);
    clearTimeout(timerRef.current);
    if (val) timerRef.current = setTimeout(() => onCheck(val), 600);
  }

  function handleCopy() {
    const url = window.location.origin + window.location.pathname + "?token=" + buyId;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const hasListing = listing?.active;
  const notListed  = listing && !listing.active;

  return (
    <div className="fade-in" style={{ background: T.bg, border: `1px solid ${T.border}`, borderRadius: "18px", overflow: "hidden" }}>

      {/* ── Header ── */}
      <div style={{ padding: "18px 24px 14px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h3 style={{ fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: "15px", color: T.gold, letterSpacing: "2px", margin: 0 }}>Buy an NFT</h3>
          <p style={{ fontSize: "10px", color: T.dim, margin: "3px 0 0" }}>Enter a token ID — price and artwork load automatically</p>
        </div>
        {buyId && (
          <a href={`https://monadscan.com/token/${NFT_ADDRESS}?a=${buyId}`} target="_blank" rel="noreferrer"
            style={{ fontSize: "10px", color: T.cyan, textDecoration: "none", display: "flex", alignItems: "center", gap: "4px" }}>
            ↗ Monadscan
          </a>
        )}
      </div>

      {/* ── Body: artwork + info ── */}
      <div style={{ display: "flex", flexWrap: "wrap", minHeight: "280px" }}>

        {/* Left — artwork */}
        <div style={{
          width: "240px", minWidth: "180px", flexShrink: 0,
          background: "#010a12", borderRight: `1px solid ${T.border}`,
          position: "relative", overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center", minHeight: "280px",
        }}>
          {metaLoading && (
            <div style={{ textAlign: "center", color: T.dim }}>
              <div style={{ fontSize: "28px", animation: "spin 1.2s linear infinite", display: "inline-block", marginBottom: "8px" }}>◌</div>
              <div style={{ fontSize: "10px", letterSpacing: "2px" }}>LOADING…</div>
            </div>
          )}
          {!metaLoading && meta?.image && (
            <>
              <img src={meta.image}
                alt={meta.name ? `${meta.name} NFT artwork` : `Token #${buyId} artwork`}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", position: "absolute", inset: 0 }}
                onError={e => { e.target.style.display = "none"; }}
              />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(2,12,20,0.85) 0%, transparent 55%)" }} />
              <div style={{
                position: "absolute", bottom: "14px", left: "14px",
                background: "rgba(2,12,20,0.75)", backdropFilter: "blur(4px)",
                border: `1px solid ${T.border}`, borderRadius: "6px",
                padding: "4px 10px", fontFamily: "Share Tech Mono, monospace", fontSize: "11px", color: T.gold,
              }}>#{buyId}</div>
            </>
          )}
          {!metaLoading && !meta?.image && (
            <div style={{ textAlign: "center", color: T.border }}>
              <div style={{ fontSize: "48px", marginBottom: "8px" }}>◈</div>
              {buyId
                ? <div style={{ fontSize: "10px", color: T.dim, letterSpacing: "1px" }}>No artwork</div>
                : <div style={{ fontSize: "10px", color: T.dim, letterSpacing: "1px" }}>Enter ID</div>
              }
            </div>
          )}
        </div>

        {/* Right — info */}
        <div style={{ flex: 1, minWidth: "260px", padding: "24px 26px", display: "flex", flexDirection: "column", gap: "18px" }}>

          {/* Token ID input */}
          <div>
            <label htmlFor="buy-token-id" style={{ display: "block", fontSize: "9px", color: T.dim, letterSpacing: "1.5px", marginBottom: "7px" }}>TOKEN ID</label>
            <input
              id="buy-token-id"
              value={buyId}
              onChange={handleTokenChange}
              placeholder="e.g. 42"
              inputMode="numeric"
              style={{
                width: "100%", padding: "11px 14px", boxSizing: "border-box",
                background: T.bgHover, border: `1px solid ${buyId ? T.gold : T.border}`,
                borderRadius: "8px", color: T.mid, fontSize: "15px",
                outline: "none", fontFamily: "Share Tech Mono, monospace",
                transition: "border-color 0.15s",
              }}
            />
          </div>

          {/* NFT name + description */}
          {meta && (
            <div className="fade-in">
              <div style={{ fontFamily: "Cinzel, serif", fontSize: "17px", fontWeight: 700, color: T.gold, marginBottom: "5px" }}>
                {meta.name || `Token #${buyId}`}
              </div>
              {meta.description && (
                <p style={{
                  fontSize: "11px", color: T.dim, lineHeight: 1.65, margin: 0,
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>{meta.description}</p>
              )}
            </div>
          )}

          {/* Price card */}
          {hasListing && (
            <div className="fade-in" style={{
              background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.2)",
              borderRadius: "10px", padding: "14px 20px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div>
                <div style={{ fontSize: "9px", color: T.dim, letterSpacing: "2px", marginBottom: "5px" }}>PRICE</div>
                <div style={{ fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: "28px", color: T.green, lineHeight: 1 }}>
                  {listing.price}
                  <span style={{ fontSize: "14px", color: T.mid, marginLeft: "7px" }}>MON</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "9px", color: T.dim, letterSpacing: "2px", marginBottom: "5px" }}>SELLER</div>
                <a href={`https://monadscan.com/address/${listing.seller}`} target="_blank" rel="noreferrer"
                  style={{ fontSize: "11px", color: T.cyan, fontFamily: "Share Tech Mono, monospace", textDecoration: "none" }}>
                  {listing.seller.slice(0, 8)}…{listing.seller.slice(-6)}
                </a>
              </div>
            </div>
          )}

          {/* Not listed warning */}
          {notListed && (
            <div className="fade-in" style={{
              background: "rgba(255,68,102,0.06)", border: "1px solid rgba(255,68,102,0.2)",
              borderRadius: "10px", padding: "12px 16px",
              display: "flex", alignItems: "center", gap: "10px",
            }}>
              <span style={{ color: T.red, fontSize: "16px" }}>✕</span>
              <span style={{ color: T.red, fontSize: "12px" }}>Token #{buyId} is not listed for sale.</span>
            </div>
          )}

          <div style={{ flex: 1 }} />

          {/* Buy button */}
          <button
            onClick={onBuy}
            disabled={!hasListing || loading}
            aria-label={hasListing ? `Buy token ${buyId} for ${listing.price} MON` : "Token not available"}
            aria-busy={loading}
            style={{
              width: "100%", padding: "16px", borderRadius: "10px", border: "none",
              fontFamily: "Cinzel, serif", fontSize: "13px", fontWeight: 700, letterSpacing: "2.5px",
              cursor: hasListing && !loading ? "pointer" : "not-allowed",
              background: hasListing
                ? loading ? "rgba(0,255,136,0.2)" : "linear-gradient(135deg, #005a30, #00ff88)"
                : "rgba(255,255,255,0.04)",
              color: hasListing ? "#000" : T.border,
              transition: "all 0.2s",
              boxShadow: hasListing && !loading ? "0 4px 24px rgba(0,255,136,0.3)" : "none",
            }}
            onMouseEnter={e => { if (hasListing && !loading) e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={e => { e.currentTarget.style.transform = "none"; }}
          >
            {loading ? "Processing…" : hasListing ? `Buy for ${listing.price} MON` : "Buy Now"}
          </button>

          {/* Action row */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button onClick={handleCopy} disabled={!buyId} aria-label="Copy shareable link"
              style={{
                flex: 1, padding: "9px 0", borderRadius: "7px", border: `1px solid ${T.border}`,
                background: "transparent", color: copied ? T.green : T.dim,
                fontSize: "11px", cursor: buyId ? "pointer" : "not-allowed",
                transition: "all 0.15s", letterSpacing: "0.5px",
              }}
              onMouseEnter={e => { if (buyId) e.currentTarget.style.borderColor = T.cyan; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; }}
            >
              {copied ? "✓ Copied!" : "⤴ Share"}
            </button>

            <a href={buyId ? `https://monadscan.com/token/${NFT_ADDRESS}?a=${buyId}` : "#"}
              target="_blank" rel="noreferrer"
              style={{
                flex: 1, padding: "9px 0", borderRadius: "7px", border: `1px solid ${T.border}`,
                background: "transparent", color: T.dim, fontSize: "11px",
                textDecoration: "none", textAlign: "center",
                transition: "all 0.15s", letterSpacing: "0.5px",
                pointerEvents: buyId ? "auto" : "none",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.color = T.gold; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.dim; }}
            >
              ↗ Explorer
            </a>

            <button aria-label="Favourite (coming soon)"
              style={{
                padding: "9px 14px", borderRadius: "7px", border: `1px solid ${T.border}`,
                background: "transparent", color: T.dim, fontSize: "16px", cursor: "pointer", transition: "all 0.15s",
              }}
              onMouseEnter={e => { e.currentTarget.style.color = "#ff6688"; e.currentTarget.style.borderColor = "#ff668844"; }}
              onMouseLeave={e => { e.currentTarget.style.color = T.dim; e.currentTarget.style.borderColor = T.border; }}
            >♡</button>
          </div>

        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════
   MAIN MARKETPLACE
   ══════════════════════════════════════════════════════════════════ */
export default function Marketplace({ account }) {
  const { isMobile } = useResponsive();

  const [tab,       setTab]       = useState("buy");
  const [status,    setStatus]    = useState(null);
  const [listing,   setListing]   = useState(null);
  const [vaultOpen, setVaultOpen] = useState(false);

  // Per-action loading flags
  const [loading, setLoading] = useState({
    buy: false, approve: false, list: false,
    cancel: false, offerTrade: false, acceptTrade: false,
  });
  const setL = useCallback((key, val) => setLoading(prev => ({ ...prev, [key]: val })), []);

  // Field state
  const [buyId,     setBuyId]     = useState("");
  const [listId,    setListId]    = useState("");
  const [listPrice, setListPrice] = useState("");
  const [cancelId,  setCancelId]  = useState("");
  const [myToken,   setMyToken]   = useState("");
  const [wantToken, setWantToken] = useState("");
  const [acceptId,  setAcceptId]  = useState("");

  // Buy panel extras
  const [buyMeta,        setBuyMeta]        = useState(null);
  const [buyMetaLoading, setBuyMetaLoading] = useState(false);
  const [copied,         setCopied]         = useState(false);

  const { mutate: sendTx } = useSendTransaction();

  // Memoised contracts
  const nft = useMemo(() => getContract({ client, chain: MONAD, address: "0x45336C2E15F2fe58c67Ee4035a520231b2751669", abi: NFT_ABI_FULL }), []);
  const mkt = useMemo(() => getContract({ client, chain: MONAD, address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI }), []);

  const msg = useCallback((m, type = "success") => setStatus({ m, type }), []);

  // Auto-fetch NFT metadata whenever buyId changes
  // Uses multiple IPFS gateways with AbortController timeout fallback
  useEffect(() => {
    if (!buyId) { setBuyMeta(null); return; }
    let cancelled = false;
    setBuyMetaLoading(true);
    setBuyMeta(null);

    const IPFS_GATEWAYS = [
      "https://gateway.pinata.cloud/ipfs/",
      "https://cloudflare-ipfs.com/ipfs/",
      "https://ipfs.io/ipfs/",
      "https://dweb.link/ipfs/",
    ];

    // Resolve any URI → HTTPS, trying gateways in order for ipfs://
    async function resolveUri(uri) {
      if (!uri) throw new Error("empty URI");

      // data URI — decode inline
      if (uri.startsWith("data:application/json")) {
        const b64 = uri.split(",")[1];
        return JSON.parse(atob(b64));
      }

      // plain HTTPS
      if (uri.startsWith("http")) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 8000);
        try {
          const res = await fetch(uri, { signal: ctrl.signal });
          clearTimeout(timer);
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return await res.json();
        } catch (e) { clearTimeout(timer); throw e; }
      }

      // ipfs:// — try gateways in order
      if (uri.startsWith("ipfs://")) {
        const cid = uri.slice(7); // everything after ipfs://
        for (const gw of IPFS_GATEWAYS) {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), 6000);
          try {
            const res = await fetch(gw + cid, { signal: ctrl.signal });
            clearTimeout(timer);
            if (!res.ok) continue;
            return await res.json();
          } catch (_) { clearTimeout(timer); }
        }
        throw new Error("All IPFS gateways failed for: " + uri);
      }

      throw new Error("Unknown URI scheme: " + uri);
    }

    // Resolve image field — also handles ipfs:// images
    function resolveImage(raw) {
      if (!raw) return null;
      if (raw.startsWith("ipfs://")) return IPFS_GATEWAYS[0] + raw.slice(7);
      return raw;
    }

    (async () => {
      try {
        // 0. Guard: check token exists (nextId is the next unminted ID)
        const nextId = await readContract({ contract: nft, method: "nextId", params: [] }).catch(() => null);
        console.log("[NFT] nextId:", nextId ? nextId.toString() : "unknown");
        if (nextId !== null && BigInt(buyId) >= nextId) {
          throw new Error(`Token #${buyId} does not exist yet (nextId=${nextId}). Valid IDs: 0 – ${nextId - 1n}`);
        }

        // 1. Read tokenURI from chain
        const uri = await readContract({
          contract: nft,
          method: "tokenURI",
          params: [BigInt(buyId)],
        });
        console.log("[NFT] tokenURI for #" + buyId + ":", uri);
        if (!uri || uri.trim() === "") throw new Error("tokenURI returned empty string for #" + buyId);

        // 2. Fetch metadata
        const data = await resolveUri(uri);
        console.log("[NFT] metadata:", data);

        const img = resolveImage(data?.image ?? null);

        if (!cancelled) {
          setBuyMeta({
            name:        data?.name        ?? `Token #${buyId}`,
            description: data?.description ?? null,
            image:       img,
          });
        }
      } catch (e) {
        console.error("[NFT] metadata fetch failed for #" + buyId + ":", e.message);
        if (!cancelled) setBuyMeta({ name: `Token #${buyId}`, description: null, image: null });
      }
      if (!cancelled) setBuyMetaLoading(false);
    })();

    return () => { cancelled = true; };
  }, [buyId, nft]);

  /* ── Handlers ── */

  const checkListing = useCallback(async id => {
    try {
      msg("Fetching listing...", "info");
      const d = await readContract({ contract: mkt, method: "listings", params: [BigInt(id)] });
      console.log("[Market] listing for #" + id + ":", d);
      setListing({ seller: d[0], price: formatEther(d[1]), active: d[2] });
      d[2]
        ? msg(`Token #${id} listed for ${formatEther(d[1])} MON`, "success")
        : msg(`Token #${id} is not listed for sale.`, "error");
    } catch (e) {
      console.error("[Market] checkListing error:", e);
      msg(friendlyError(e), "error");
    }
  }, [mkt, msg]);

  const handleApprove = useCallback(async id => {
    msg("Approving marketplace…", "info"); setL("approve", true);
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
    msg("Publishing listing…", "info"); setL("list", true);
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
      msg("Sending transaction…", "info"); setL("buy", true);
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
    msg("Cancelling listing…", "info"); setL("cancel", true);
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
    msg("Step 1/2 — Approving…", "info"); setL("offerTrade", true);
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
      msg("Step 1/2 — Approving…", "info"); setL("acceptTrade", true);
      sendTx(
        prepareContractCall({ contract: nft, method: "approve", params: [MARKETPLACE_ADDRESS, o[2]] }),
        {
          onSuccess: () => {
            msg("Step 2/2 — Accepting trade…", "info");
            sendTx(
              prepareContractCall({ contract: mkt, method: "acceptTrade", params: [BigInt(acceptId)] }),
              {
                onSuccess: () => { msg("Trade completed! ✓");      setL("acceptTrade", false); },
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

      {vaultOpen && <VaultPoolModal onClose={() => setVaultOpen(false)} />}

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: isMobile ? "20px 12px 48px" : "32px 24px 64px", position: "relative", zIndex: 1 }}>

        {/* Header */}
        <header style={{ marginBottom: "18px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: isMobile ? "20px" : "26px", color: T.gold, letterSpacing: "2px", margin: "0 0 4px" }}>NFT MARKETPLACE</h1>
            <p style={{ color: T.dim, fontSize: "11px", letterSpacing: "0.5px", margin: 0 }}>
              Connected: <span style={{ color: T.gold }}>{account.address.slice(0, 6)}…{account.address.slice(-4)}</span>
              <span style={{ margin: "0 8px", color: T.border }}>·</span>
              <span style={{ color: T.green }}>Monad Mainnet</span>
            </p>
          </div>
          <a href={TG_BOT_URL} target="_blank" rel="noreferrer" aria-label="Open @BuyTradeNFT_Bot on Telegram"
            style={{ display: "flex", alignItems: "center", gap: "8px", background: "rgba(41,182,246,0.08)", border: "1px solid rgba(41,182,246,0.2)", borderRadius: "10px", padding: "10px 14px", textDecoration: "none", color: T.blue, transition: "background 0.15s" }}
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

        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "230px 1fr", gap: "18px" }}>
          <Sidebar tab={tab} setTab={setTab} setStatus={setStatus} setListing={setListing} isMobile={isMobile} />

          <div>
            <StatusBanner status={status} onDismiss={() => setStatus(null)} />

            {/* ── BUY ── */}
            {tab === "buy" && (
              <BuyPanel
                buyId={buyId}
                setBuyId={setBuyId}
                listing={listing}
                setListing={setListing}
                meta={buyMeta}
                metaLoading={buyMetaLoading}
                onBuy={handleBuy}
                onCheck={checkListing}
                loading={loading.buy}
                copied={copied}
                setCopied={setCopied}
              />
            )}

            {/* ── SELL ── */}
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

            {/* ── CANCEL ── */}
            {tab === "cancel" && (
              <Panel title="Cancel Listing" desc="Remove your NFT from sale — it stays in your wallet">
                <Field id="cancel-token-id" label="Token ID" placeholder="e.g. 42" value={cancelId} onChange={e => setCancelId(e.target.value)} />
                <DangerBtn onClick={handleCancel} loading={loading.cancel} ariaLabel={`Cancel listing for token ${cancelId || "—"}`}>Cancel Listing</DangerBtn>
              </Panel>
            )}

            {/* ── TRADE ── */}
            {tab === "trade" && (
              <div style={{ display: "grid", gap: "16px" }}>
                <Panel title="Offer a Trade" desc="Approve your token then propose a peer-to-peer swap">
                  <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 30px 1fr", gap: "10px", alignItems: "end" }}>
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
