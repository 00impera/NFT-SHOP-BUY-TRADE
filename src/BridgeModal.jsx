import { useState, useEffect } from "react";
import { ConnectButton, BuyWidget } from "thirdweb/react";
import { client } from "./App.jsx";
import { MONAD, getNearIntentsTokens, getNearIntentsQuote } from "./config.js";

export default function BridgeModal({ account, onClose }) {
  const [tab,         setTab]        = useState("card");
  const [swapTokens,  setSwapTokens] = useState([]);
  const [swapOrigin,  setSwapOrigin] = useState("");
  const [swapAmount,  setSwapAmount] = useState("");
  const [swapQuote,   setSwapQuote]  = useState(null);
  const [swapLoading, setSwapLoading]= useState(false);
  const [swapError,   setSwapError]  = useState(null);

  useEffect(() => {
    getNearIntentsTokens()
      .then(tokens => setSwapTokens(
        tokens.filter(t => ["eth","btc","sol","usdc","usdt","near","bnb"].some(s => t.symbol?.toLowerCase().includes(s)))
      ))
      .catch(() => {});
  }, []);

  async function handleGetQuote() {
    if (!swapOrigin || !swapAmount || !account) return;
    setSwapLoading(true); setSwapError(null); setSwapQuote(null);
    try {
      const tok = swapTokens.find(t => t.assetId === swapOrigin);
      const dec = tok?.decimals ?? 18;
      const amountRaw = (BigInt(Math.round(parseFloat(swapAmount) * Math.pow(10, dec)))).toString();
      const q = await getNearIntentsQuote({ originAsset:swapOrigin, destinationAsset:"nep141:wrap.near", amount:amountRaw, recipient:account.address });
      setSwapQuote(q);
    } catch { setSwapError("Could not fetch quote. Try a different token or amount."); }
    setSwapLoading(false);
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,4,8,0.92)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(8px)" }} onClick={onClose}>
      <div style={{ background:"#020c14", border:"1px solid #0a2a3a", borderRadius:"24px", padding:"28px", width:"95%", maxWidth:"480px", position:"relative", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 0 60px #00c8ff22" }} onClick={e=>e.stopPropagation()}>
        <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:"linear-gradient(90deg,transparent,#00c8ff,#00ff88,transparent)", borderRadius:"24px 24px 0 0" }}/>
        <button onClick={onClose} style={{ position:"absolute", top:"14px", right:"18px", background:"none", border:"none", color:"#2a6a8a", fontSize:"20px", cursor:"pointer" }}>✕</button>
        <div style={{ fontFamily:"Cinzel,serif", fontSize:"17px", color:"#c9a84c", letterSpacing:"3px", marginBottom:"20px", textAlign:"center" }}>◈ GET MON TO PLAY</div>

        {/* Tabs */}
        <div style={{ display:"flex", gap:"8px", marginBottom:"20px" }}>
          {[["card","💳 BUY WITH CARD"],["bridge","⬡ NEAR BRIDGE"]].map(([id,label]) => (
            <button key={id} onClick={()=>setTab(id)} style={{
              flex:1, padding:"10px", borderRadius:"10px",
              fontFamily:"Share Tech Mono,monospace", fontSize:"10px", letterSpacing:"1.5px", cursor:"pointer",
              background: tab===id ? "rgba(0,200,255,0.1)" : "none",
              border: `1px solid ${tab===id ? "#00c8ff" : "#0a2a3a"}`,
              color: tab===id ? "#00c8ff" : "#80b8d0",
              boxShadow: tab===id ? "0 0 12px #00c8ff22" : "none",
            }}>{label}</button>
          ))}
        </div>

        {tab==="card" && (
          <div>
            {!account ? (
              <div style={{ textAlign:"center", padding:"20px 0" }}>
                <p style={{ color:"#80b8d0", fontSize:"12px", marginBottom:"16px" }}>Connect your wallet to buy MON with card.</p>
                <ConnectButton client={client} chain={MONAD} theme="dark" btnTitle="Connect Wallet"/>
              </div>
            ) : (
              <>
                <p style={{ fontSize:"11px", color:"#80b8d0", lineHeight:1.8, marginBottom:"16px" }}>Buy MON directly with a credit or debit card via Thirdweb Pay. Funds arrive ready to play.</p>
                <div style={{ borderRadius:"12px", overflow:"hidden", border:"1px solid rgba(0,200,255,0.2)", background:"rgba(5,10,14,0.95)" }}>
                  <BuyWidget client={client} chain={MONAD} theme="dark"/>
                </div>
              </>
            )}
          </div>
        )}

        {tab==="bridge" && (
          <div>
            {!account ? (
              <div style={{ textAlign:"center", padding:"20px 0" }}>
                <p style={{ color:"#80b8d0", fontSize:"12px", marginBottom:"16px" }}>Connect your wallet to bridge tokens to MON.</p>
                <ConnectButton client={client} chain={MONAD} theme="dark" btnTitle="Connect Wallet"/>
              </div>
            ) : (
              <>
                <p style={{ fontSize:"11px", color:"#80b8d0", lineHeight:1.8, marginBottom:"16px" }}>
                  Powered by <strong style={{ color:"#00c8ff" }}>NEAR Intents</strong> — swap ETH, BTC, SOL, USDC and more into MON from any chain.
                </p>
                <div style={{ marginBottom:"12px" }}>
                  <label style={{ display:"block", fontSize:"9px", color:"#2a6a8a", letterSpacing:"2px", marginBottom:"6px" }}>FROM TOKEN</label>
                  <select value={swapOrigin} onChange={e=>{setSwapOrigin(e.target.value);setSwapQuote(null);}}
                    style={{ width:"100%", padding:"10px 12px", borderRadius:"8px", background:"#040e18", border:"1px solid #0a2a3a", color:"#80b8d0", fontFamily:"Share Tech Mono,monospace", fontSize:"12px", outline:"none" }}>
                    <option value="">Select token…</option>
                    {swapTokens.map(t => (
                      <option key={t.assetId} value={t.assetId} style={{ background:"#020c14" }}>
                        {t.symbol}{t.blockchain?" · "+t.blockchain.toUpperCase():""}{t.price?" ($"+Number(t.price).toFixed(2)+")":""}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom:"14px" }}>
                  <label style={{ display:"block", fontSize:"9px", color:"#2a6a8a", letterSpacing:"2px", marginBottom:"6px" }}>AMOUNT</label>
                  <input type="number" placeholder="0.00" value={swapAmount} onChange={e=>{setSwapAmount(e.target.value);setSwapQuote(null);}}
                    style={{ width:"100%", padding:"10px 12px", borderRadius:"8px", background:"#040e18", border:"1px solid #0a2a3a", color:"#80b8d0", fontFamily:"Share Tech Mono,monospace", fontSize:"13px", outline:"none" }}/>
                </div>
                <button onClick={handleGetQuote} disabled={!swapOrigin||!swapAmount||swapLoading}
                  style={{ width:"100%", padding:"13px", border:"none", borderRadius:"12px", background:"linear-gradient(135deg,#003a5a,#00c8ff)", color:"#000", fontFamily:"Cinzel,serif", fontSize:"12px", fontWeight:700, letterSpacing:"2px", cursor:"pointer", opacity:(!swapOrigin||!swapAmount||swapLoading)?0.4:1 }}>
                  {swapLoading?"FETCHING QUOTE…":"◈ GET BRIDGE QUOTE"}
                </button>

                {swapError && <div style={{ marginTop:"12px", padding:"10px", borderRadius:"8px", background:"rgba(255,68,102,0.08)", border:"1px solid rgba(255,68,102,0.3)", color:"#ff4466", fontSize:"10px" }}>{swapError}</div>}

                {swapQuote && !swapError && (
                  <div style={{ marginTop:"14px", padding:"14px", borderRadius:"10px", background:"rgba(0,200,255,0.04)", border:"1px solid #0a2a3a" }}>
                    {[["You Send",`${swapAmount} ${swapTokens.find(t=>t.assetId===swapOrigin)?.symbol??""}`],["You Receive (est.)",`${swapQuote.amountOutFormatted??swapQuote.minAmountOut??"—"} MON`],["Deadline",swapQuote.deadline?new Date(swapQuote.deadline).toLocaleTimeString():"10 min"]].map(([l,v]) => (
                      <div key={l} style={{ display:"flex", justifyContent:"space-between", padding:"7px 0", borderBottom:"1px solid rgba(0,200,255,0.07)", fontSize:"12px" }}>
                        <span style={{ color:"#80b8d0" }}>{l}</span>
                        <span style={{ color:"#00c8ff", fontWeight:700 }}>{v}</span>
                      </div>
                    ))}
                    {swapQuote.depositAddress && (
                      <div style={{ marginTop:"12px", padding:"12px", borderRadius:"8px", background:"rgba(201,168,76,0.05)", border:"1px solid rgba(201,168,76,0.25)" }}>
                        <div style={{ color:"#00c8ff", marginBottom:"6px", fontSize:"9px", letterSpacing:"2px" }}>DEPOSIT ADDRESS:</div>
                        <code style={{ fontSize:"11px", color:"#c9a84c", wordBreak:"break-all" }}>{swapQuote.depositAddress}</code>
                        <div style={{ marginTop:"8px", color:"#80b8d0", fontSize:"10px", lineHeight:1.6 }}>Send your tokens to this address. NEAR Intents will complete the bridge and deliver MON to your wallet.</div>
                        <button onClick={()=>navigator.clipboard.writeText(swapQuote.depositAddress)}
                          style={{ marginTop:"10px", width:"100%", padding:"7px 0", background:"none", border:"1px solid #0a2a3a", borderRadius:"6px", color:"#00c8ff", fontSize:"10px", cursor:"pointer", fontFamily:"Share Tech Mono,monospace" }}>COPY ADDRESS</button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
