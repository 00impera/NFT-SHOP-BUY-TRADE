import { useState, useEffect, useRef } from "react";
import { createThirdwebClient } from "thirdweb";
import { ConnectButton, BuyWidget, useActiveAccount, useActiveWalletChain } from "thirdweb/react";
import { CLIENT_ID, MONAD, TG_BOT_URL } from "./config.js";
import Marketplace from "./Marketplace.jsx";
import VaultGame from "./VaultGame.jsx";
import BridgeModal from "./BridgeModal.jsx";

export const client = createThirdwebClient({ clientId: CLIENT_ID });

const TgIcon = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.04 9.607c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.903.614z"/>
  </svg>
);

export default function App() {
  const account      = useActiveAccount();
  const chain        = useActiveWalletChain();
  const [page,       setPage]       = useState("market");
  const [bridgeOpen, setBridgeOpen] = useState(false);
  const [tgDismiss,  setTgDismiss]  = useState(false);
  const isWrongChain = account && chain?.id !== 143;

  return (
    <div style={{ minHeight: "100vh", position: "relative", zIndex: 1 }}>
      <RainCanvas />

      {/* ── NAV ── */}
      <nav style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"0 28px", height:"64px",
        background:"rgba(2,12,20,0.94)", backdropFilter:"blur(16px)",
        borderBottom:"1px solid #0a2a3a",
        position:"sticky", top:0, zIndex:100,
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:"32px" }}>
          <div style={{
            fontFamily:"Cinzel, serif", fontWeight:900, fontSize:"20px", letterSpacing:"3px",
            background:"linear-gradient(135deg,#ff6600,#ffaa00,#00c8ff,#00ff88)",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            backgroundSize:"300%", animation:"titleFlow 4s linear infinite",
          }}>MONADEX</div>
          <div style={{ display:"flex", gap:"6px" }}>
            {[["market","◈ MARKET"],["vault","⬡ VAULT GAME"]].map(([id,label]) => (
              <button key={id} onClick={() => setPage(id)} style={{
                background: page===id ? "rgba(201,168,76,0.12)" : "transparent",
                border: `1px solid ${page===id ? "#c9a84c" : "#0a2a3a"}`,
                borderRadius:"8px", padding:"7px 14px",
                color: page===id ? "#c9a84c" : "#2a6a8a",
                fontSize:"11px", letterSpacing:"1.5px",
              }}>{label}</button>
            ))}
          </div>
        </div>

        <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
          {isWrongChain && (
            <div style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", color:"#ef4444", padding:"6px 12px", borderRadius:"6px", fontSize:"10px", letterSpacing:"1px" }}>
              ⚠ Switch to Monad
            </div>
          )}
          <button onClick={() => setBridgeOpen(true)} style={{
            background:"linear-gradient(135deg,#003a5a,#00c8ff)",
            border:"none", borderRadius:"20px", padding:"7px 16px",
            fontSize:"10px", letterSpacing:"1.5px", color:"#000",
            fontFamily:"Share Tech Mono, monospace", fontWeight:700,
            boxShadow:"0 0 12px #00c8ff44", animation:"vibrate 0.3s linear infinite",
          }}
            onMouseEnter={e=>{e.currentTarget.style.animation="none";e.currentTarget.style.transform="scale(1.08)";}}
            onMouseLeave={e=>{e.currentTarget.style.animation="vibrate 0.3s linear infinite";e.currentTarget.style.transform="none";}}
          >⬡ GET MON</button>
          <a href={TG_BOT_URL} target="_blank" rel="noreferrer" style={{
            display:"flex", alignItems:"center", gap:"6px",
            background:"rgba(41,182,246,0.1)", border:"1px solid rgba(41,182,246,0.25)",
            borderRadius:"8px", padding:"7px 13px", color:"#29b6f6",
            fontSize:"11px", textDecoration:"none",
          }}
            onMouseEnter={e=>{e.currentTarget.style.background="rgba(41,182,246,0.2)";}}
            onMouseLeave={e=>{e.currentTarget.style.background="rgba(41,182,246,0.1)";}}
          ><TgIcon size={13}/>BOT</a>
          <ConnectButton client={client} chain={MONAD} theme="dark" btnTitle="Connect" />
        </div>
      </nav>

      {/* ── TG BANNER ── */}
      {!tgDismiss && (
        <div className="slide-down" style={{
          background:"linear-gradient(90deg,rgba(41,182,246,0.07),rgba(201,168,76,0.07))",
          borderBottom:"1px solid rgba(41,182,246,0.15)",
          padding:"8px 28px", display:"flex", alignItems:"center", justifyContent:"center", gap:"10px",
        }}>
          <TgIcon size={13}/>
          <span style={{ fontSize:"11px", color:"#80b8d0" }}>
            Trade NFTs in Telegram →{" "}
            <a href={TG_BOT_URL} target="_blank" rel="noreferrer" style={{ color:"#29b6f6", textDecoration:"none", fontWeight:500 }}>@BuyTradeNFT_Bot</a>
          </span>
          <button onClick={() => setTgDismiss(true)} style={{ marginLeft:"auto", background:"none", border:"none", color:"#2a6a8a", fontSize:"16px" }}>×</button>
        </div>
      )}

      {/* ── PAGES ── */}
      {page === "market" && <MarketPage account={account} />}
      {page === "vault"  && <VaultGame  account={account} />}

      {bridgeOpen && <BridgeModal account={account} onClose={() => setBridgeOpen(false)} />}
    </div>
  );
}

function MarketPage({ account }) {
  if (!account) return <HeroSection />;
  return <Marketplace account={account} />;
}

function HeroSection() {
  return (
    <div style={{ maxWidth:"1100px", margin:"0 auto", padding:"56px 24px 0" }}>
      <div style={{
        borderRadius:"20px", marginBottom:"28px",
        background:"linear-gradient(135deg,#020c14 0%,#0a1a28 55%,#140820 100%)",
        border:"1px solid #0a2a3a", padding:"68px 48px", position:"relative", overflow:"hidden",
      }}>
        <div style={{ position:"absolute", top:0, right:0, width:"55%", height:"100%",
          background:"radial-gradient(ellipse at 70% 50%,rgba(201,168,76,0.1) 0%,transparent 70%)",
          pointerEvents:"none" }}/>
        <div style={{ position:"absolute", inset:0, opacity:0.025,
          backgroundImage:"linear-gradient(#00c8ff 1px,transparent 1px),linear-gradient(90deg,#00c8ff 1px,transparent 1px)",
          backgroundSize:"40px 40px", pointerEvents:"none" }}/>
        <div style={{ position:"relative", zIndex:1, maxWidth:"560px" }}>
          <div style={{
            display:"inline-flex", alignItems:"center", gap:"8px",
            background:"rgba(201,168,76,0.12)", border:"1px solid rgba(201,168,76,0.3)",
            borderRadius:"100px", padding:"5px 14px", marginBottom:"24px",
          }}>
            <div style={{ width:"7px", height:"7px", borderRadius:"50%", background:"#00ff88", animation:"pulse 2s infinite" }}/>
            <span style={{ fontSize:"10px", color:"#c9a84c", letterSpacing:"2px" }}>LIVE ON MONAD MAINNET</span>
          </div>
          <h1 style={{
            fontFamily:"Cinzel, serif", fontWeight:900, fontSize:"clamp(36px,6vw,60px)",
            lineHeight:1.08, marginBottom:"20px", letterSpacing:"-1px",
            background:"linear-gradient(135deg,#ff6600,#ffaa00,#00c8ff,#00ff88)",
            WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
            backgroundSize:"300%", animation:"titleFlow 4s linear infinite",
          }}>Discover, Trade<br/>&amp; Play Vaults</h1>
          <p style={{ color:"#80b8d0", fontSize:"14px", lineHeight:1.7, marginBottom:"32px" }}>
            NFT Marketplace + Vault Game on Monad.<br/>
            Buy with card · Bridge any chain · Trade P2P
          </p>
          <ConnectButton
            client={createThirdwebClient({ clientId: CLIENT_ID })}
            chain={MONAD} theme="dark" btnTitle="Connect Wallet to Start"
          />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:"14px", marginBottom:"40px" }}>
        {[["Total Volume","—","MON"],["Floor Price","—","MON"],["NFTs Listed","—",""],["Vault Pool","—","MON"]].map(([l,v,u]) => (
          <div key={l} style={{ background:"#020c14", border:"1px solid #0a2a3a", borderRadius:"12px", padding:"18px 20px" }}
            onMouseEnter={e=>e.currentTarget.style.borderColor="#1a4a6a"}
            onMouseLeave={e=>e.currentTarget.style.borderColor="#0a2a3a"}>
            <div style={{ fontSize:"9px", color:"#2a6a8a", letterSpacing:"2px", marginBottom:"8px" }}>{l.toUpperCase()}</div>
            <div style={{ fontFamily:"Cinzel, serif", fontWeight:700, fontSize:"24px", color:"#80b8d0" }}>
              {v}<span style={{ fontSize:"12px", color:"#2a6a8a", marginLeft:"4px" }}>{u}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RainCanvas() {
  const ref = useRef(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas.getContext("2d");
    let id;
    function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
    resize();
    window.addEventListener("resize", resize);
    const drops = Array.from({ length: 55 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      speed: 1.5 + Math.random() * 4,
      len: 10 + Math.random() * 30,
      color: Math.random() > 0.5 ? "#00c8ff" : "#0044ff",
      alpha: 0.3 + Math.random() * 0.5,
      width: 0.5 + Math.random() * 1.5,
    }));
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drops.forEach(d => {
        ctx.beginPath(); ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.width, d.y + d.len);
        ctx.strokeStyle = d.color; ctx.globalAlpha = d.alpha; ctx.lineWidth = d.width; ctx.stroke();
        d.y += d.speed;
        if (d.y > canvas.height) { d.y = -d.len; d.x = Math.random() * canvas.width; }
      });
      ctx.globalAlpha = 1;
      id = requestAnimationFrame(draw);
    }
    draw();
    return () => { cancelAnimationFrame(id); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position:"fixed", top:0, left:0, width:"100%", height:"100%", zIndex:0, pointerEvents:"none", opacity:0.15, filter:"blur(0.5px)" }} />;
}
