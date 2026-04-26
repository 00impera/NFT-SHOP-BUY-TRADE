import { useState, useEffect, useRef } from "react";
import { createThirdwebClient } from "thirdweb";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import Marketplace from "./Marketplace.jsx";
import VaultGame   from "./VaultGame.jsx";
import BridgeModal from "./BridgeModal.jsx";
import NFTGallery  from "./NFTGallery.jsx";
import { MONAD, CLIENT_ID, TG_BOT_URL, NFT_ADDRESS, MARKETPLACE_ADDRESS } from "./config.js";

export const client = createThirdwebClient({ clientId: CLIENT_ID });

const NAV = [
  { id: "market",  label: "◈ MARKET"     },
  { id: "gallery", label: "⬢ GALLERY"    },
  { id: "vault",   label: "⬡ VAULT GAME" },
];

/* ── Ticker data — simulated live trades ── */
const TICKER_ITEMS = [
  { type: "buy",  addr: "0x4f2a…9b3c", token: "#142", price: "100",   currency: "MON" },
  { type: "sell", addr: "0x7e1d…2f8a", token: "#87",  price: "500",   currency: "MON" },
  { type: "buy",  addr: "0x9c3b…4d1e", token: "#215", price: "500",   currency: "MON" },
  { type: "sell", addr: "0x2a8f…7c5b", token: "#33",  price: "1000",  currency: "MON" },
  { type: "buy",  addr: "0x6b4e…3a9d", token: "#178", price: "250",   currency: "MON" },
  { type: "sell", addr: "0x1d7c…8e2f", token: "#99",  price: "750",   currency: "MON" },
  { type: "buy",  addr: "0x8f5a…1b4c", token: "#301", price: "100",   currency: "MON" },
  { type: "sell", addr: "0x3e9d…6a2b", token: "#55",  price: "2000",  currency: "MON" },
  { type: "buy",  addr: "0x5c2b…9f7e", token: "#420", price: "500",   currency: "MON" },
  { type: "sell", addr: "0x7a1f…4d8c", token: "#12",  price: "10000", currency: "MON" },
];

/* ── Live ticker strip ── */
function TickerBanner() {
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS]; // duplicate for seamless loop
  return (
    <div style={{
      width: "100%",
      background: "rgba(0,4,8,0.95)",
      borderBottom: "1px solid #0a2a3a",
      borderTop: "1px solid #0a2a3a",
      overflow: "hidden",
      height: "36px",
      display: "flex",
      alignItems: "center",
      position: "relative",
      zIndex: 49,
    }}>
      {/* Left fade */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: "80px",
        background: "linear-gradient(to right, rgba(0,4,8,1), transparent)",
        zIndex: 2, pointerEvents: "none",
      }}/>
      {/* Right fade */}
      <div style={{
        position: "absolute", right: 0, top: 0, bottom: 0, width: "80px",
        background: "linear-gradient(to left, rgba(0,4,8,1), transparent)",
        zIndex: 2, pointerEvents: "none",
      }}/>

      <div style={{
        display: "flex",
        gap: "0",
        animation: "tickerScroll 40s linear infinite",
        whiteSpace: "nowrap",
        willChange: "transform",
      }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "0 28px",
            borderRight: "1px solid #0a2a3a",
            height: "36px",
            fontSize: "10px",
            letterSpacing: "0.5px",
            fontFamily: "Share Tech Mono, monospace",
          }}>
            {/* Type badge */}
            <span style={{
              padding: "2px 7px",
              borderRadius: "4px",
              fontSize: "9px",
              fontWeight: 700,
              letterSpacing: "1.5px",
              background: item.type === "buy" ? "rgba(0,255,136,0.15)" : "rgba(239,68,68,0.15)",
              border: `1px solid ${item.type === "buy" ? "rgba(0,255,136,0.4)" : "rgba(239,68,68,0.4)"}`,
              color: item.type === "buy" ? "#00ff88" : "#ef4444",
            }}>
              {item.type === "buy" ? "BUY" : "SELL"}
            </span>

            {/* Token */}
            <span style={{ color: "#c9a84c", fontWeight: 700 }}>{item.token}</span>

            {/* Price */}
            <span style={{ color: item.type === "buy" ? "#00ff88" : "#ef4444", fontWeight: 700 }}>
              {item.price} {item.currency}
            </span>

            {/* Address */}
            <span style={{ color: "#2a6a8a" }}>{item.addr}</span>

            {/* Dot separator */}
            <span style={{ color: "#0a2a3a", fontSize: "16px", lineHeight: 1 }}>·</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Live stats bar ── */
function StatsBar() {
  const [stats, setStats] = useState({
    floor: "100",
    volume: "47,830",
    listed: "142",
    traders: "891",
    change: "+12.4%",
  });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 3000);
    return () => clearInterval(id);
  }, []);

  const statItems = [
    { label: "FLOOR",       value: stats.floor + " MON",    color: "#00ff88", icon: "◈" },
    { label: "24H VOLUME",  value: stats.volume + " MON",   color: "#c9a84c", icon: "⬢" },
    { label: "LISTED",      value: stats.listed + " NFTs",  color: "#00c8ff", icon: "⬡" },
    { label: "24H TRADERS", value: stats.traders,            color: "#a855f7", icon: "◎" },
    { label: "24H CHANGE",  value: stats.change,             color: "#00ff88", icon: "▲" },
    { label: "NETWORK",     value: "Monad",                  color: "#00c8ff", icon: "⬒" },
  ];

  return (
    <div style={{
      display: "flex",
      flexWrap: "wrap",
      background: "rgba(1,8,16,0.9)",
      borderBottom: "1px solid #0a2a3a",
      position: "relative",
      zIndex: 48,
    }}>
      {statItems.map((s, i) => (
        <div key={i} style={{
          flex: "1 1 120px",
          padding: "10px 18px",
          borderRight: "1px solid #071520",
          display: "flex",
          flexDirection: "column",
          gap: "3px",
          minWidth: "100px",
        }}>
          <div style={{ fontSize: "8px", color: "#2a6a8a", letterSpacing: "2px" }}>
            {s.icon} {s.label}
          </div>
          <div style={{
            fontFamily: "Cinzel, serif",
            fontSize: "13px",
            fontWeight: 700,
            color: s.color,
            transition: "color 0.3s",
          }}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Alert / notification strip ── */
function AlertStrip() {
  const alerts = [
    "🔥 Token #142 just sold for 100 MON",
    "💎 New PLATINUM VAULT unlocked — pool: 48,200 MON",
    "⚡ Token #87 listed for 500 MON — grab it fast!",
    "🏆 0x9c3b…4d1e cracked GOLD VAULT — won 12,400 MON",
  ];
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIdx(i => (i + 1) % alerts.length);
        setVisible(true);
      }, 400);
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div style={{
      background: "rgba(201,168,76,0.06)",
      borderBottom: "1px solid rgba(201,168,76,0.15)",
      padding: "7px 20px",
      display: "flex",
      alignItems: "center",
      gap: "12px",
      position: "relative",
      zIndex: 47,
      overflow: "hidden",
    }}>
      <div style={{
        background: "rgba(201,168,76,0.2)",
        border: "1px solid rgba(201,168,76,0.4)",
        borderRadius: "4px",
        padding: "2px 8px",
        fontSize: "8px",
        letterSpacing: "2px",
        color: "#c9a84c",
        flexShrink: 0,
        fontWeight: 700,
      }}>
        LIVE
      </div>
      <div style={{
        fontSize: "11px",
        color: "#80b8d0",
        transition: "opacity 0.4s, transform 0.4s",
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-8px)",
        letterSpacing: "0.5px",
      }}>
        {alerts[idx]}
      </div>
    </div>
  );
}

/* ── Quick Actions floating panel ── */
function QuickActions({ setPage, setBuyTokenId, setBridgeOpen }) {
  const [open, setOpen] = useState(false);

  const actions = [
    { label: "Buy NFT",    icon: "⬇", color: "#00ff88", action: () => { setPage("market"); setOpen(false); } },
    { label: "Sell NFT",   icon: "⬆", color: "#c9a84c", action: () => { setPage("market"); setOpen(false); } },
    { label: "Gallery",    icon: "⬢", color: "#00c8ff", action: () => { setPage("gallery"); setOpen(false); } },
    { label: "Vault Game", icon: "⬡", color: "#a855f7", action: () => { setPage("vault"); setOpen(false); } },
    { label: "Get MON",    icon: "⬒", color: "#f0d080", action: () => { setBridgeOpen(true); setOpen(false); } },
  ];

  return (
    <div style={{ position: "fixed", bottom: "28px", right: "24px", zIndex: 500 }}>
      {/* Action buttons */}
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        alignItems: "flex-end",
        marginBottom: "10px",
        transition: "all 0.3s",
        opacity: open ? 1 : 0,
        transform: open ? "translateY(0)" : "translateY(20px)",
        pointerEvents: open ? "auto" : "none",
      }}>
        {actions.map((a, i) => (
          <button
            key={i}
            onClick={a.action}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "10px 16px",
              background: "rgba(2,12,20,0.95)",
              border: `1px solid ${a.color}44`,
              borderRadius: "100px",
              color: a.color,
              fontSize: "11px",
              letterSpacing: "1px",
              cursor: "pointer",
              backdropFilter: "blur(10px)",
              boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 12px ${a.color}22`,
              fontFamily: "Share Tech Mono, monospace",
              transition: "all 0.2s",
              animationDelay: `${i * 50}ms`,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = `rgba(2,12,20,1)`;
              e.currentTarget.style.borderColor = a.color;
              e.currentTarget.style.boxShadow = `0 4px 20px rgba(0,0,0,0.5), 0 0 20px ${a.color}44`;
              e.currentTarget.style.transform = "translateX(-4px)";
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = "rgba(2,12,20,0.95)";
              e.currentTarget.style.borderColor = `${a.color}44`;
              e.currentTarget.style.boxShadow = `0 4px 20px rgba(0,0,0,0.5), 0 0 12px ${a.color}22`;
              e.currentTarget.style.transform = "translateX(0)";
            }}
          >
            <span style={{ fontSize: "14px" }}>{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>

      {/* FAB button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: "52px", height: "52px",
          borderRadius: "50%",
          background: open
            ? "linear-gradient(135deg, #7a4a00, #c9a84c)"
            : "linear-gradient(135deg, #003a5a, #00c8ff)",
          border: "none",
          color: "#000",
          fontSize: "20px",
          cursor: "pointer",
          boxShadow: open
            ? "0 0 30px rgba(201,168,76,0.5), 0 8px 32px rgba(0,0,0,0.6)"
            : "0 0 30px rgba(0,200,255,0.4), 0 8px 32px rgba(0,0,0,0.6)",
          transition: "all 0.3s cubic-bezier(0.34,1.56,0.64,1)",
          transform: open ? "rotate(45deg) scale(1.1)" : "rotate(0) scale(1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginLeft: "auto",
        }}
      >
        {open ? "✕" : "◈"}
      </button>
    </div>
  );
}

/* ── TG Icon ── */
function TgIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.04 9.607c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.903.614z"/>
    </svg>
  );
}

/* ── Gallery Page ── */
function GalleryPage({ account, setPage, setBuyTokenId }) {
  function handleBuyRequest({ tokenId }) {
    setBuyTokenId(String(tokenId));
    setPage("market");
  }
  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 24px 64px", position: "relative", zIndex: 1 }}>
      <NFTGallery account={account} onBuyRequest={handleBuyRequest} />
    </div>
  );
}

/* ── Landing Screen ── */
function LandingScreen({ setBridgeOpen }) {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 24px", position: "relative", zIndex: 1, gap: "32px",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: "10px", color: "#2a6a8a", letterSpacing: "5px", marginBottom: "16px" }}>
          ◈ MONAD BLOCKCHAIN · CHAIN ID 10143
        </div>
        <h1 style={{
          fontFamily: "Cinzel, serif", fontWeight: 900,
          fontSize: "clamp(32px, 7vw, 72px)", letterSpacing: "6px",
          background: "linear-gradient(135deg, #c9a84c, #f0d080, #00c8ff, #00ff88)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          backgroundSize: "300%", animation: "titleFlow 4s linear infinite",
        }}>
          NFT MARKET
        </h1>
        <p style={{ color: "#4a8aaa", fontSize: "11px", letterSpacing: "5px", marginTop: "8px" }}>
          BUY · SELL · TRADE · VAULT · MONAD
        </p>
        <div className="glow-line" style={{ margin: "20px auto", maxWidth: "300px" }} />
      </div>

      {/* Feature grid */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: "12px", maxWidth: "760px", width: "100%",
      }}>
        {[
          { icon: "◈", label: "NFT Marketplace", desc: "Buy, sell & trade", color: "#c9a84c" },
          { icon: "⬡", label: "Vault Game",      desc: "Win up to 48K MON", color: "#00ff88" },
          { icon: "⬢", label: "Gallery",          desc: "Browse all listings", color: "#00c8ff" },
          { icon: "⬒", label: "Bridge",           desc: "ETH, BTC, SOL → MON", color: "#a855f7" },
        ].map(f => (
          <div key={f.label} className="panel" style={{ textAlign: "center", padding: "20px 16px", borderColor: `${f.color}22` }}>
            <div style={{ fontSize: "26px", color: f.color, marginBottom: "8px" }}>{f.icon}</div>
            <div style={{ fontFamily: "Cinzel, serif", fontSize: "11px", color: f.color, letterSpacing: "1.5px", marginBottom: "4px" }}>{f.label}</div>
            <div style={{ fontSize: "10px", color: "#4a8aaa" }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* Recent activity preview */}
      <div style={{
        width: "100%", maxWidth: "600px",
        background: "var(--card)", border: "1px solid var(--border)",
        borderRadius: "14px", overflow: "hidden",
      }}>
        <div style={{ padding: "12px 18px", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "9px", color: "#2a6a8a", letterSpacing: "2px" }}>◎ RECENT ACTIVITY</span>
          <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "9px", color: "#00ff88" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#00ff88", display: "inline-block", animation: "pulse 2s infinite" }}/>
            LIVE
          </span>
        </div>
        {TICKER_ITEMS.slice(0, 5).map((item, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "center", gap: "12px",
            padding: "10px 18px",
            borderBottom: i < 4 ? "1px solid rgba(10,42,58,0.5)" : "none",
            fontSize: "11px",
          }}>
            <span style={{
              padding: "2px 7px", borderRadius: "4px", fontSize: "8px", letterSpacing: "1px", fontWeight: 700,
              background: item.type === "buy" ? "rgba(0,255,136,0.1)" : "rgba(239,68,68,0.1)",
              border: `1px solid ${item.type === "buy" ? "rgba(0,255,136,0.3)" : "rgba(239,68,68,0.3)"}`,
              color: item.type === "buy" ? "#00ff88" : "#ef4444",
              minWidth: "32px", textAlign: "center",
            }}>{item.type.toUpperCase()}</span>
            <span style={{ color: "#c9a84c", fontFamily: "Cinzel, serif", fontSize: "12px", fontWeight: 700 }}>{item.token}</span>
            <span style={{ color: item.type === "buy" ? "#00ff88" : "#ef4444", fontWeight: 700 }}>{item.price} MON</span>
            <span style={{ color: "#2a6a8a", marginLeft: "auto", fontFamily: "Share Tech Mono, monospace", fontSize: "10px" }}>{item.addr}</span>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: "10px", color: "#2a6a8a", marginBottom: "16px", letterSpacing: "1px" }}>
          Connect your wallet to start trading
        </p>
        <ConnectButton client={client} chain={MONAD} theme="dark" connectButton={{ label: "◈ Connect Wallet" }} />
      </div>

      <a href={TG_BOT_URL} target="_blank" rel="noreferrer"
        style={{ display: "flex", alignItems: "center", gap: "8px", color: "#29b6f6", fontSize: "11px", textDecoration: "none", opacity: 0.7 }}
        onMouseEnter={e => e.currentTarget.style.opacity = "1"}
        onMouseLeave={e => e.currentTarget.style.opacity = "0.7"}
      >
        <TgIcon size={14} />
        @BuyTradeNFT_Bot
      </a>
    </div>
  );
}

/* ══ MAIN APP ══════════════════════════════════════════════════ */
export default function App() {
  const account = useActiveAccount();
  const [page,       setPage]       = useState("market");
  const [bridgeOpen, setBridgeOpen] = useState(false);
  const [buyTokenId, setBuyTokenId] = useState("");

  if (!account) return (
    <>
      <style>{`
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes titleFlow {
          0%   { background-position: 0%; }
          100% { background-position: 300%; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.85); }
        }
      `}</style>
      <TickerBanner />
      <AlertStrip />
      <LandingScreen setBridgeOpen={setBridgeOpen} />
      {bridgeOpen && <BridgeModal account={account} onClose={() => setBridgeOpen(false)} />}
    </>
  );

  return (
    <>
      <style>{`
        @keyframes tickerScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes titleFlow {
          0%   { background-position: 0%; }
          100% { background-position: 300%; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.85); }
        }
      `}</style>

      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>

        {/* ── Top nav ── */}
        <header style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(0,4,8,0.92)", backdropFilter: "blur(14px)",
          borderBottom: "1px solid var(--border)",
          padding: "0 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          height: "56px", gap: "12px",
        }}>
          <div
            style={{ fontFamily: "Cinzel, serif", fontWeight: 900, fontSize: "15px", color: "var(--gold)", letterSpacing: "2px", cursor: "pointer", whiteSpace: "nowrap" }}
            onClick={() => setPage("market")}
          >
            ◈ NFT
          </div>

          <nav style={{ display: "flex", gap: "4px", flex: 1, justifyContent: "center", flexWrap: "wrap" }}>
            {NAV.map(({ id, label }) => (
              <button key={id} onClick={() => setPage(id)} style={{
                padding: "6px 14px", borderRadius: "100px",
                border: `1px solid ${page === id ? "var(--gold)" : "var(--border)"}`,
                background: page === id ? "rgba(201,168,76,0.12)" : "transparent",
                color: page === id ? "var(--gold)" : "var(--text2)",
                fontSize: "10px", letterSpacing: "1.5px", cursor: "pointer", transition: "all 0.15s",
              }}
                onMouseEnter={e => { if (page !== id) { e.currentTarget.style.borderColor = "var(--border2)"; e.currentTarget.style.color = "var(--text)"; }}}
                onMouseLeave={e => { if (page !== id) { e.currentTarget.style.borderColor = "var(--border)";  e.currentTarget.style.color = "var(--text2)"; }}}
              >{label}</button>
            ))}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
            <button onClick={() => setBridgeOpen(true)} className="btn btn-cyan"
              style={{ padding: "6px 12px", fontSize: "9px", letterSpacing: "1.5px" }}>
              ⬒ GET MON
            </button>
            <a href={TG_BOT_URL} target="_blank" rel="noreferrer"
              className="btn btn-ghost" style={{ padding: "6px 10px", color: "var(--tg)", borderColor: "rgba(41,182,246,0.25)" }}>
              <TgIcon size={14} />
            </a>
            <ConnectButton client={client} chain={MONAD} theme="dark" />
          </div>
        </header>

        {/* ── Ticker + stats ── */}
        <TickerBanner />
        <AlertStrip />
        <StatsBar />

        <main style={{ flex: 1, position: "relative", zIndex: 1 }}>
          {page === "market"  && <Marketplace account={account} initialBuyId={buyTokenId} />}
          {page === "gallery" && <GalleryPage account={account} setPage={setPage} setBuyTokenId={setBuyTokenId} />}
          {page === "vault"   && <VaultGame   account={account} />}
        </main>

        {/* ── Footer ── */}
        <footer style={{
          borderTop: "1px solid var(--border)",
          background: "rgba(0,4,8,0.9)",
          padding: "16px 24px",
          display: "flex", flexWrap: "wrap", gap: "16px",
          alignItems: "center", justifyContent: "space-between",
          fontSize: "10px", color: "#2a6a8a",
        }}>
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
            <span style={{ fontFamily: "Cinzel, serif", color: "#c9a84c", fontSize: "11px" }}>◈ NFT MARKET</span>
            <span>NFT: {NFT_ADDRESS.slice(0,8)}…{NFT_ADDRESS.slice(-6)}</span>
            <span>MKT: {MARKETPLACE_ADDRESS.slice(0,8)}…{MARKETPLACE_ADDRESS.slice(-6)}</span>
          </div>
          <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
            <a href={TG_BOT_URL} target="_blank" rel="noreferrer"
              style={{ color: "#29b6f6", textDecoration: "none", display: "flex", alignItems: "center", gap: "5px" }}>
              <TgIcon size={12} /> Telegram Bot
            </a>
            <a href={`https://monadscan.com`} target="_blank" rel="noreferrer"
              style={{ color: "#2a6a8a", textDecoration: "none" }}>
              ↗ MonadScan
            </a>
            <span style={{ color: "#071520" }}>·</span>
            <span>Monad Chain 10143</span>
          </div>
        </footer>
      </div>

      {/* ── Floating Quick Actions ── */}
      <QuickActions setPage={setPage} setBuyTokenId={setBuyTokenId} setBridgeOpen={setBridgeOpen} />

      {bridgeOpen && <BridgeModal account={account} onClose={() => setBridgeOpen(false)} />}
    </>
  );
}
