import { useState } from "react";
import { createThirdwebClient } from "thirdweb";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import Marketplace from "./Marketplace.jsx";
import VaultGame   from "./VaultGame.jsx";
import BridgeModal from "./BridgeModal.jsx";
import NFTGallery  from "./NFTGallery.jsx";  // ✅ file must be in src/ folder
import { MONAD, CLIENT_ID, TG_BOT_URL } from "./config.js";

/* ── Thirdweb client — exported so other modules can import it ── */
export const client = createThirdwebClient({ clientId: CLIENT_ID });

const NAV = [
  { id: "market",  label: "◈ MARKET"     },
  { id: "gallery", label: "⬢ GALLERY"    },
  { id: "vault",   label: "⬡ VAULT GAME" },
];

function TgIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.04 9.607c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.903.614z"/>
    </svg>
  );
}

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

function LandingScreen() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "40px 24px", position: "relative", zIndex: 1, gap: "32px",
    }}>
      <div style={{ textAlign: "center" }}>
        <h1 style={{
          fontFamily: "Cinzel, serif", fontWeight: 900,
          fontSize: "clamp(32px, 7vw, 64px)", letterSpacing: "6px",
          background: "linear-gradient(135deg, #c9a84c, #f0d080, #00c8ff)",
          WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
        }}>
          NFT MARKET
        </h1>
        <p style={{ color: "var(--text2)", fontSize: "11px", letterSpacing: "4px", marginTop: "8px" }}>
          BUY · SELL · TRADE · VAULT · MONAD
        </p>
        <div className="glow-line" style={{ margin: "20px auto", maxWidth: "200px" }} />
      </div>

      <div style={{
        display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: "12px", maxWidth: "700px", width: "100%",
      }}>
        {[
          { icon: "◈", label: "NFT Marketplace", desc: "Buy, sell & trade NFTs" },
          { icon: "⬡", label: "Vault Game",       desc: "Crack vaults, win MON"  },
          { icon: "⬢", label: "Gallery",           desc: "Browse all listings"    },
          { icon: "⬒", label: "Bridge",            desc: "Get MON on-ramp"        },
        ].map(f => (
          <div key={f.label} className="panel" style={{ textAlign: "center", padding: "20px 16px" }}>
            <div style={{ fontSize: "24px", color: "var(--gold)", marginBottom: "8px" }}>{f.icon}</div>
            <div style={{ fontFamily: "Cinzel, serif", fontSize: "11px", color: "var(--gold)", letterSpacing: "1.5px", marginBottom: "4px" }}>{f.label}</div>
            <div style={{ fontSize: "10px", color: "var(--text2)" }}>{f.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center" }}>
        <p style={{ fontSize: "10px", color: "var(--text2)", marginBottom: "16px", letterSpacing: "1px" }}>
          Connect your wallet to start trading
        </p>
        <ConnectButton client={client} chain={MONAD} theme="dark" connectButton={{ label: "Connect Wallet" }} />
      </div>

      <a href={TG_BOT_URL} target="_blank" rel="noreferrer"
        style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--tg)", fontSize: "11px", textDecoration: "none", opacity: 0.7 }}
        onMouseEnter={e => e.currentTarget.style.opacity = "1"}
        onMouseLeave={e => e.currentTarget.style.opacity = "0.7"}
      >
        <TgIcon size={14} />
        @BuyTradeNFT_Bot
      </a>
    </div>
  );
}

export default function App() {
  const account = useActiveAccount();
  const [page,       setPage]       = useState("market");
  const [bridgeOpen, setBridgeOpen] = useState(false);
  const [buyTokenId, setBuyTokenId] = useState("");

  if (!account) return <LandingScreen />;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ── Top nav ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        background: "rgba(0,4,8,0.88)", backdropFilter: "blur(14px)",
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

      <main style={{ flex: 1, position: "relative", zIndex: 1 }}>
        {page === "market"  && <Marketplace account={account} initialBuyId={buyTokenId} />}
        {page === "gallery" && <GalleryPage account={account} setPage={setPage} setBuyTokenId={setBuyTokenId} />}
        {page === "vault"   && <VaultGame   account={account} />}
      </main>

      {bridgeOpen && <BridgeModal account={account} onClose={() => setBridgeOpen(false)} />}
    </div>
  );
}
