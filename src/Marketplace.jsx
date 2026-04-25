import { useState } from "react";
import { getContract, prepareContractCall, readContract } from "thirdweb";
import { useSendTransaction } from "thirdweb/react";
import { formatEther, parseEther } from "ethers/utils";
import { client } from "./App.jsx";
import { MONAD, NFT_ADDRESS, MARKETPLACE_ADDRESS, NFT_ABI, MARKETPLACE_ABI, TG_BOT_URL } from "./config.js";

const TABS = [
  { id:"buy",    label:"Buy",    icon:"⬇", desc:"Purchase a listed NFT" },
  { id:"list",   label:"Sell",   icon:"⬆", desc:"List your NFT for sale" },
  { id:"cancel", label:"Cancel", icon:"✕", desc:"Remove your listing" },
  { id:"trade",  label:"Trade",  icon:"⇄", desc:"Swap NFTs peer-to-peer" },
];

const TgIcon = ({ size=16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.04 9.607c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.903.614z"/>
  </svg>
);

export default function Marketplace({ account }) {
  const [tab, setTab]         = useState("buy");
  const [status, setStatus]   = useState(null);
  const [listing, setListing] = useState(null);
  const [buyId,    setBuyId]    = useState("");
  const [listId,   setListId]   = useState("");
  const [listPrice,setListPrice]= useState("");
  const [cancelId, setCancelId] = useState("");
  const [myToken,  setMyToken]  = useState("");
  const [wantToken,setWantToken]= useState("");
  const [acceptId, setAcceptId] = useState("");

  const { mutate: sendTx } = useSendTransaction();
  const nft = getContract({ client, chain:MONAD, address:NFT_ADDRESS, abi:NFT_ABI });
  const mkt = getContract({ client, chain:MONAD, address:MARKETPLACE_ADDRESS, abi:MARKETPLACE_ABI });
  const msg = (m, type="success") => setStatus({ m, type });

  async function checkListing(id) {
    try {
      msg("Fetching…","info");
      const d = await readContract({ contract:mkt, method:"listings", params:[BigInt(id)] });
      setListing({ seller:d[0], price:formatEther(d[1]), active:d[2] });
      if (!d[2]) msg(`Token #${id} not listed`, "error");
      else msg(`Token #${id} — ${formatEther(d[1])} MON`, "success");
    } catch(e) { msg(e.message,"error"); }
  }

  async function handleApprove(id) {
    msg("Approving…","info");
    sendTx(prepareContractCall({ contract:nft, method:"approve", params:[MARKETPLACE_ADDRESS, BigInt(id)] }), {
      onSuccess: () => msg("Approved! Now click Step 2.", "success"),
      onError: e => msg(e.message,"error"),
    });
  }

  async function handleList() {
    if (!listId || !listPrice) return msg("Enter token ID and price","error");
    msg("Listing…","info");
    sendTx(prepareContractCall({ contract:mkt, method:"listForSale", params:[BigInt(listId), parseEther(listPrice)] }), {
      onSuccess: () => msg(`Token #${listId} listed for ${listPrice} MON ✓`),
      onError: e => msg(e.message,"error"),
    });
  }

  async function handleBuy() {
    if (!buyId) return msg("Enter token ID","error");
    try {
      msg("Fetching price…","info");
      const d = await readContract({ contract:mkt, method:"listings", params:[BigInt(buyId)] });
      if (!d[2]) return msg("Not listed","error");
      msg("Buying…","info");
      sendTx(prepareContractCall({ contract:mkt, method:"buy", params:[BigInt(buyId)], value:d[1] }), {
        onSuccess: () => msg(`Token #${buyId} purchased! 🎉`),
        onError: e => msg(e.message,"error"),
      });
    } catch(e) { msg(e.message,"error"); }
  }

  async function handleCancel() {
    if (!cancelId) return msg("Enter token ID","error");
    msg("Cancelling…","info");
    sendTx(prepareContractCall({ contract:mkt, method:"cancelListing", params:[BigInt(cancelId)] }), {
      onSuccess: () => msg(`Listing #${cancelId} cancelled`),
      onError: e => msg(e.message,"error"),
    });
  }

  async function handleOfferTrade() {
    if (!myToken || !wantToken) return msg("Enter both token IDs","error");
    msg("Step 1/2 — Approving…","info");
    sendTx(prepareContractCall({ contract:nft, method:"approve", params:[MARKETPLACE_ADDRESS, BigInt(myToken)] }), {
      onSuccess: () => {
        msg("Step 2/2 — Offering trade…","info");
        sendTx(prepareContractCall({ contract:mkt, method:"offerTrade", params:[BigInt(myToken), BigInt(wantToken)] }), {
          onSuccess: () => msg(`Trade offered: #${myToken} ⇄ #${wantToken} ✓`),
          onError: e => msg(e.message,"error"),
        });
      },
      onError: e => msg(e.message,"error"),
    });
  }

  async function handleAcceptTrade() {
    if (!acceptId) return msg("Enter offered token ID","error");
    try {
      msg("Looking up offer…","info");
      const o = await readContract({ contract:mkt, method:"tradeOffers", params:[BigInt(acceptId)] });
      if (!o[3]) return msg(`No active offer for #${acceptId}`,"error");
      msg("Step 1/2 — Approving…","info");
      sendTx(prepareContractCall({ contract:nft, method:"approve", params:[MARKETPLACE_ADDRESS, o[2]] }), {
        onSuccess: () => {
          msg("Step 2/2 — Accepting…","info");
          sendTx(prepareContractCall({ contract:mkt, method:"acceptTrade", params:[BigInt(acceptId)] }), {
            onSuccess: () => msg("Trade completed! ✓"),
            onError: e => msg(e.message,"error"),
          });
        },
        onError: e => msg(e.message,"error"),
      });
    } catch(e) { msg(e.message,"error"); }
  }

  const SC = { success:"#00ff88", error:"#ff4466", info:"#00c8ff" };
  const SB = { success:"rgba(0,255,136,0.07)", error:"rgba(255,68,102,0.07)", info:"rgba(0,200,255,0.07)" };

  return (
    <div style={{ maxWidth:"1100px", margin:"0 auto", padding:"32px 24px 64px", position:"relative", zIndex:1 }}>
      <div style={{ marginBottom:"28px", display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
        <div>
          <h2 style={{ fontFamily:"Cinzel, serif", fontWeight:700, fontSize:"26px", color:"#c9a84c", letterSpacing:"2px", marginBottom:"4px" }}>NFT MARKETPLACE</h2>
          <p style={{ color:"#2a6a8a", fontSize:"11px", letterSpacing:"0.5px" }}>
            Connected: <span style={{ color:"#c9a84c" }}>{account.address.slice(0,6)}...{account.address.slice(-4)}</span>
            <span style={{ margin:"0 8px", color:"#0a2a3a" }}>·</span>
            <span style={{ color:"#00ff88" }}>Monad Mainnet</span>
          </p>
        </div>
        <a href={TG_BOT_URL} target="_blank" rel="noreferrer" style={{
          display:"flex", alignItems:"center", gap:"8px",
          background:"rgba(41,182,246,0.08)", border:"1px solid rgba(41,182,246,0.2)",
          borderRadius:"10px", padding:"10px 14px", textDecoration:"none", color:"#29b6f6",
        }}
          onMouseEnter={e=>{e.currentTarget.style.background="rgba(41,182,246,0.16)";}}
          onMouseLeave={e=>{e.currentTarget.style.background="rgba(41,182,246,0.08)";}}
        >
          <TgIcon size={15}/><div><div style={{ fontSize:"11px" }}>@BuyTradeNFT_Bot</div><div style={{ fontSize:"9px", color:"#80b8d0" }}>Trade via Telegram</div></div>
        </a>
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"230px 1fr", gap:"18px" }}>
        {/* Sidebar */}
        <div style={{ background:"#020c14", border:"1px solid #0a2a3a", borderRadius:"14px", overflow:"hidden" }}>
          <div style={{ padding:"13px 16px", borderBottom:"1px solid #0a2a3a" }}>
            <div style={{ fontSize:"9px", color:"#2a6a8a", letterSpacing:"2px" }}>ACTIONS</div>
          </div>
          {TABS.map(t => (
            <button key={t.id} onClick={() => { setTab(t.id); setStatus(null); setListing(null); }} style={{
              display:"flex", alignItems:"center", gap:"12px",
              width:"100%", padding:"12px 16px", border:"none",
              background: tab===t.id ? "rgba(201,168,76,0.1)" : "transparent",
              color: tab===t.id ? "#c9a84c" : "#2a6a8a",
              fontSize:"12px", letterSpacing:"1px", textAlign:"left",
              borderLeft: tab===t.id ? "2px solid #c9a84c" : "2px solid transparent",
            }}
              onMouseEnter={e=>{ if(tab!==t.id){e.currentTarget.style.background="rgba(255,255,255,0.03)";e.currentTarget.style.color="#80b8d0";}}}
              onMouseLeave={e=>{ if(tab!==t.id){e.currentTarget.style.background="transparent";e.currentTarget.style.color="#2a6a8a";}}}
            >
              <span style={{ fontSize:"14px", opacity:0.6, width:"16px", textAlign:"center" }}>{t.icon}</span>
              <div><div>{t.label}</div><div style={{ fontSize:"9px", color:"#1a4a5a", marginTop:"1px" }}>{t.desc}</div></div>
            </button>
          ))}
          <div style={{ padding:"14px 16px", borderTop:"1px solid #0a2a3a", marginTop:"6px" }}>
            <div style={{ fontSize:"9px", color:"#2a6a8a", letterSpacing:"1.5px", marginBottom:"10px" }}>CONTRACTS</div>
            {[["NFT", NFT_ADDRESS],["Market", MARKETPLACE_ADDRESS]].map(([l,a]) => (
              <div key={l} style={{ marginBottom:"8px" }}>
                <div style={{ fontSize:"9px", color:"#80b8d0", marginBottom:"2px" }}>{l}</div>
                <a href={`https://monadscan.com/address/${a}`} target="_blank" rel="noreferrer"
                  style={{ fontSize:"9px", color:"#2a6a8a", fontFamily:"Share Tech Mono,monospace", textDecoration:"none" }}
                  onMouseEnter={e=>e.target.style.color="#c9a84c"}
                  onMouseLeave={e=>e.target.style.color="#2a6a8a"}
                >{a.slice(0,8)}...{a.slice(-6)}</a>
              </div>
            ))}
          </div>
        </div>

        {/* Main */}
        <div>
          {status && (
            <div className="fade-in" style={{
              display:"flex", alignItems:"flex-start", gap:"10px",
              background:SB[status.type], border:`1px solid ${SC[status.type]}22`,
              borderLeft:`3px solid ${SC[status.type]}`,
              borderRadius:"10px", padding:"12px 14px", marginBottom:"16px",
            }}>
              <span style={{ color:SC[status.type], fontSize:"13px" }}>
                {status.type==="success"?"✓":status.type==="error"?"✕":"○"}
              </span>
              <span style={{ color:SC[status.type], fontSize:"12px", flex:1, lineHeight:1.5 }}>{status.m}</span>
              <button onClick={()=>setStatus(null)} style={{ background:"none",border:"none",color:"#2a6a8a",fontSize:"16px" }}>×</button>
            </div>
          )}

          {tab==="buy" && (
            <Panel title="Buy an NFT" desc="Enter a token ID to check price and purchase">
              <Field label="Token ID" placeholder="e.g. 42" value={buyId} onChange={e=>{setBuyId(e.target.value);setListing(null);}}/>
              {buyId && <GhostBtn onClick={()=>checkListing(buyId)}>Check Listing Price →</GhostBtn>}
              {listing?.active && (
                <div className="fade-in" style={{
                  background:"rgba(0,255,136,0.05)", border:"1px solid rgba(0,255,136,0.18)",
                  borderRadius:"10px", padding:"16px 18px", margin:"14px 0",
                  display:"flex", justifyContent:"space-between",
                }}>
                  <div>
                    <div style={{ fontSize:"9px", color:"#80b8d0", letterSpacing:"1.5px", marginBottom:"4px" }}>PRICE</div>
                    <div style={{ fontFamily:"Cinzel,serif", fontWeight:700, fontSize:"24px", color:"#80b8d0" }}>
                      {listing.price}<span style={{ fontSize:"13px", color:"#00ff88", marginLeft:"5px" }}>MON</span>
                    </div>
                  </div>
                  <div style={{ textAlign:"right" }}>
                    <div style={{ fontSize:"9px", color:"#80b8d0", letterSpacing:"1.5px", marginBottom:"4px" }}>SELLER</div>
                    <div style={{ fontSize:"11px", color:"#2a6a8a" }}>{listing.seller.slice(0,10)}...</div>
                  </div>
                </div>
              )}
              <PrimaryBtn onClick={handleBuy}>Buy Now</PrimaryBtn>
            </Panel>
          )}

          {tab==="list" && (
            <Panel title="List for Sale" desc="Approve the marketplace then create your listing">
              <Field label="Token ID" placeholder="e.g. 42" value={listId} onChange={e=>setListId(e.target.value)}/>
              <Field label="Price (MON)" placeholder="e.g. 0.5" value={listPrice} onChange={e=>setListPrice(e.target.value)}/>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"10px", marginTop:"4px" }}>
                <StepBtn step={1} label="Approve" color="#00c8ff" onClick={()=>listId&&handleApprove(listId)}/>
                <StepBtn step={2} label="List for Sale" color="#c9a84c" onClick={handleList}/>
              </div>
              <div style={{ marginTop:"12px", padding:"10px 12px", background:"rgba(0,200,255,0.04)", border:"1px solid rgba(0,200,255,0.12)", borderRadius:"8px", fontSize:"10px", color:"#2a6a8a", lineHeight:1.7 }}>
                Step 1 authorises the marketplace to transfer your NFT. Step 2 publishes the listing.
              </div>
            </Panel>
          )}

          {tab==="cancel" && (
            <Panel title="Cancel Listing" desc="Remove your NFT from sale — stays in your wallet">
              <Field label="Token ID" placeholder="e.g. 42" value={cancelId} onChange={e=>setCancelId(e.target.value)}/>
              <DangerBtn onClick={handleCancel}>Cancel Listing</DangerBtn>
            </Panel>
          )}

          {tab==="trade" && (
            <div style={{ display:"grid", gap:"16px" }}>
              <Panel title="Offer a Trade" desc="Approve your token then propose a swap">
                <div style={{ display:"grid", gridTemplateColumns:"1fr 30px 1fr", gap:"10px", alignItems:"end" }}>
                  <Field label="Your Token ID" placeholder="e.g. 10" value={myToken} onChange={e=>setMyToken(e.target.value)}/>
                  <div style={{ paddingBottom:"14px", textAlign:"center", color:"#2a6a8a", fontSize:"18px" }}>⇄</div>
                  <Field label="Want Token ID" placeholder="e.g. 55" value={wantToken} onChange={e=>setWantToken(e.target.value)}/>
                </div>
                <PrimaryBtn onClick={handleOfferTrade}>Approve + Offer Trade</PrimaryBtn>
              </Panel>
              <Panel title="Accept a Trade" desc="Accept an incoming swap offer">
                <Field label="Offered Token ID" placeholder="Token ID offered to you" value={acceptId} onChange={e=>setAcceptId(e.target.value)}/>
                <GreenBtn onClick={handleAcceptTrade}>Approve + Accept Trade</GreenBtn>
              </Panel>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, desc, children }) {
  return (
    <div className="fade-in" style={{ background:"#020c14", border:"1px solid #0a2a3a", borderRadius:"14px", padding:"26px 24px 22px" }}>
      <div style={{ marginBottom:"20px" }}>
        <h3 style={{ fontFamily:"Cinzel,serif", fontWeight:700, fontSize:"16px", color:"#c9a84c", letterSpacing:"2px", marginBottom:"4px" }}>{title}</h3>
        <p style={{ fontSize:"10px", color:"#2a6a8a", lineHeight:1.5 }}>{desc}</p>
      </div>
      {children}
    </div>
  );
}

function Field({ label, placeholder, value, onChange }) {
  const [f, setF] = useState(false);
  return (
    <div style={{ marginBottom:"14px" }}>
      <label style={{ display:"block", fontSize:"9px", color:"#2a6a8a", letterSpacing:"1.5px", marginBottom:"6px" }}>{label.toUpperCase()}</label>
      <input value={value} onChange={onChange} placeholder={placeholder}
        onFocus={()=>setF(true)} onBlur={()=>setF(false)}
        style={{ width:"100%", padding:"10px 12px", background:f?"#040e18":"#020c14", border:`1px solid ${f?"#c9a84c":"#0a2a3a"}`, borderRadius:"8px", color:"#80b8d0", fontSize:"13px", outline:"none", transition:"all 0.15s" }}/>
    </div>
  );
}

function PrimaryBtn({ onClick, children }) {
  const [h,setH]=useState(false);
  return <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{ width:"100%", padding:"13px", borderRadius:"8px", border:"none", fontFamily:"Cinzel,serif", fontSize:"12px", fontWeight:700, letterSpacing:"2px", cursor:"pointer",
      background:h?"linear-gradient(135deg,#7a4a00,#f0d080)":"linear-gradient(135deg,#7a4a00,#c9a84c)",
      color:"#000", transform:h?"translateY(-1px)":"none", boxShadow:h?"0 6px 24px rgba(201,168,76,0.4)":"none" }}>{children}</button>;
}

function GhostBtn({ onClick, children }) {
  const [h,setH]=useState(false);
  return <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{ width:"100%", padding:"9px", borderRadius:"8px", border:"1px solid #0a2a3a", background:h?"#040e18":"transparent", color:h?"#80b8d0":"#2a6a8a", fontSize:"11px", marginBottom:"12px", letterSpacing:"0.5px" }}>{children}</button>;
}

function GreenBtn({ onClick, children }) {
  const [h,setH]=useState(false);
  return <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{ width:"100%", padding:"13px", borderRadius:"8px", border:"1px solid rgba(0,255,136,0.28)", background:h?"rgba(0,255,136,0.15)":"rgba(0,255,136,0.07)", color:"#00ff88", fontSize:"12px", fontFamily:"Cinzel,serif", letterSpacing:"2px" }}>{children}</button>;
}

function DangerBtn({ onClick, children }) {
  const [h,setH]=useState(false);
  return <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{ width:"100%", padding:"13px", borderRadius:"8px", border:"1px solid rgba(255,68,102,0.28)", background:h?"rgba(255,68,102,0.15)":"rgba(255,68,102,0.07)", color:"#ff4466", fontSize:"12px", fontFamily:"Cinzel,serif", letterSpacing:"2px" }}>{children}</button>;
}

function StepBtn({ step, label, color, onClick }) {
  const [h,setH]=useState(false);
  return <button onClick={onClick} onMouseEnter={()=>setH(true)} onMouseLeave={()=>setH(false)}
    style={{ padding:"12px", borderRadius:"8px", border:`1px solid ${color}33`, background:h?`${color}1a`:`${color}0a`, color, fontSize:"11px", fontFamily:"Share Tech Mono,monospace" }}>
    <span style={{ opacity:0.5, marginRight:"5px" }}>Step {step} —</span>{label}</button>;
}
