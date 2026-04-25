import { useState, useEffect } from "react";
import { getContract, prepareContractCall, readContract } from "thirdweb";
import { useSendTransaction, ConnectButton, BuyWidget } from "thirdweb/react";
import { parseEther, formatEther } from "ethers/utils";
import { client } from "./App.jsx";
import { MONAD, VAULT_ADDRESS, VAULT_ABI, VAULT_KEYS, VAULT_SALTS } from "./config.js";

export default function VaultGame({ account }) {
  const [pools,      setPools]      = useState(["—","—","—","—"]);
  const [modal,      setModal]      = useState(null);

  useEffect(() => {
    fetchPools();
    const id = setInterval(fetchPools, 20000);
    return () => clearInterval(id);
  }, []);

  async function fetchPools() {
    try {
      const contract = getContract({ client, chain:MONAD, address:VAULT_ADDRESS, abi:VAULT_ABI });
      const r = await readContract({ contract, method:"getAllPools", params:[] });
      const fmt = v => parseFloat(formatEther(v)).toLocaleString(undefined,{maximumFractionDigits:2});
      setPools([fmt(r[0]),fmt(r[1]),fmt(r[2]),fmt(r[3])]);
    } catch {}
  }

  return (
    <div style={{ maxWidth:"1100px", margin:"0 auto", padding:"32px 24px 64px", position:"relative", zIndex:1 }}>
      <div style={{ textAlign:"center", marginBottom:"32px" }}>
        <h2 style={{
          fontFamily:"Cinzel,serif", fontWeight:900,
          fontSize:"clamp(28px,5vw,48px)", letterSpacing:"4px",
          background:"linear-gradient(135deg,#ff6600,#ffaa00,#00c8ff,#00ff88)",
          WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent",
          backgroundSize:"300%", animation:"titleFlow 4s linear infinite",
        }}>VAULT GAME</h2>
        <p style={{ color:"#2a6a8a", fontSize:"11px", letterSpacing:"3px", marginTop:"6px" }}>
          BUY A KEY · SPIN THE WHEEL · CRACK THE VAULT
        </p>
        <div style={{ margin:"16px auto", width:"100px", height:"1px", background:"linear-gradient(90deg,transparent,#00c8ff,transparent)" }}/>
      </div>

      <div style={{ background:"#020c14", border:"1px solid #0a2a3a", borderRadius:"12px", padding:"14px 20px", marginBottom:"28px", display:"flex", alignItems:"center", gap:"12px", flexWrap:"wrap" }}>
        <span style={{ fontSize:"9px", color:"#2a6a8a", letterSpacing:"1.5px" }}>CONTRACT</span>
        <code style={{ fontSize:"11px", color:"#c9a84c", flex:1 }}>{VAULT_ADDRESS}</code>
        <button onClick={()=>navigator.clipboard.writeText(VAULT_ADDRESS)} style={{ background:"none", border:"1px solid #0a2a3a", borderRadius:"6px", color:"#00c8ff", fontSize:"9px", padding:"4px 10px" }}>COPY</button>
      </div>

      <div style={{ fontSize:"11px", color:"#c9a84c", letterSpacing:"3px", textAlign:"center", marginBottom:"16px" }}>◈ CHOOSE YOUR KEY</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:"14px", marginBottom:"32px" }}>
        {VAULT_KEYS.map((k,i) => (
          <KeyCard key={k.name} data={k} pool={pools[i]} onClick={()=>setModal(i)}/>
        ))}
      </div>

      <div style={{ fontSize:"11px", color:"#c9a84c", letterSpacing:"3px", textAlign:"center", marginBottom:"16px" }}>◈ LIVE VAULTS</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(240px,1fr))", gap:"18px", marginBottom:"32px" }}>
        {VAULT_KEYS.map((k,i) => (
          <VaultCard key={k.name} data={k} pool={pools[i]} onClick={()=>setModal(i)}/>
        ))}
      </div>

      <HowToPlay />

      {modal !== null && (
        <VaultModal keyIdx={modal} account={account} onClose={()=>setModal(null)} onSuccess={fetchPools}/>
      )}
    </div>
  );
}

function KeyCard({ data, pool, onClick }) {
  const colors = { bronze:"#cd7f32", silver:"#c0c0c0", gold:"#c9a84c", platinum:"#a0d8ff" };
  const c = colors[data.tier];
  return (
    <div onClick={onClick} style={{
      background:"#020c14", border:`1px solid ${c}`, borderRadius:"16px",
      padding:"20px", textAlign:"center", cursor:"pointer",
      transition:"transform 0.3s, box-shadow 0.3s", position:"relative", overflow:"hidden",
    }}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-5px)";e.currentTarget.style.boxShadow=`0 8px 30px ${c}44`;}}
      onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}
    >
      <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:`linear-gradient(90deg,transparent,${c},transparent)` }}/>
      <img src={data.img} alt={data.name} style={{ width:"80px", height:"80px", objectFit:"contain", marginBottom:"10px", filter:"drop-shadow(0 0 12px rgba(0,200,255,0.5))", display:"block", margin:"0 auto 10px" }} onError={e=>e.target.style.display="none"}/>
      <div style={{ fontFamily:"Cinzel,serif", fontSize:"13px", fontWeight:700, color:c, marginBottom:"5px" }}>{data.name}</div>
      <div style={{ fontSize:"22px", fontWeight:700, color:"#00ff88", marginBottom:"4px" }}>{Number(data.price).toLocaleString()} MON</div>
      <div style={{ fontSize:"9px", color:"#2a6a8a", letterSpacing:"1px" }}>4 ATTEMPTS · VAULT {data.vaultId}</div>
      <div style={{ fontSize:"11px", color:"#c9a84c", marginTop:"8px", padding:"5px", background:"#040e18", borderRadius:"8px" }}>Pool: <span>{pool}</span> MON</div>
    </div>
  );
}

function VaultCard({ data, pool, onClick }) {
  const colors = { bronze:"#cd7f32", silver:"#c0c0c0", gold:"#c9a84c", platinum:"#a0d8ff" };
  const c = colors[data.tier];
  return (
    <div onClick={onClick} style={{
      background:"#020c14", border:`1px solid ${c}`, borderRadius:"20px",
      overflow:"hidden", cursor:"pointer", transition:"transform 0.4s, box-shadow 0.4s",
    }}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-6px) scale(1.02)";e.currentTarget.style.boxShadow=`0 0 30px ${c}44`;}}
      onMouseLeave={e=>{e.currentTarget.style.transform="none";e.currentTarget.style.boxShadow="none";}}
    >
      <div style={{ width:"100%", height:"200px", display:"flex", alignItems:"center", justifyContent:"center", background:"linear-gradient(135deg,#040e18,#020810)", overflow:"hidden" }}>
        <img src={data.img} alt={data.name} style={{ width:"100%", height:"100%", objectFit:"cover", transition:"transform 0.4s" }} onError={e=>e.target.style.display="none"}/>
      </div>
      <div style={{ padding:"14px" }}>
        <div style={{ fontFamily:"Cinzel,serif", fontSize:"12px", fontWeight:700, color:c, letterSpacing:"2px", marginBottom:"6px" }}>{data.name}</div>
        <div style={{ fontSize:"22px", fontWeight:700, color:"#00ff88", textShadow:"0 0 12px #00ff88" }}>{pool}</div>
        <div style={{ fontSize:"9px", color:"#2a6a8a", letterSpacing:"2px" }}>MON IN POOL</div>
        <div style={{ display:"inline-block", marginTop:"6px", padding:"3px 10px", borderRadius:"10px", fontSize:"9px", background:"#1a0808", border:"1px solid #ff4444", color:"#ff4444", letterSpacing:"1px" }}>🔒 LOCKED</div>
      </div>
    </div>
  );
}

function VaultModal({ keyIdx, account, onClose, onSuccess }) {
  const key = VAULT_KEYS[keyIdx];
  const [step,       setStep]      = useState("buy");
  const [spinning,   setSpinning]  = useState(false);
  const [spinDeg,    setSpinDeg]   = useState(0);
  const [dials,      setDials]     = useState([0,0,0,0]);
  const [turnsLeft,  setTurnsLeft] = useState(4);
  const [statusMsg,  setStatusMsg] = useState(null);
  const [showCard,   setShowCard]  = useState(false);
  const { mutate: sendTx, isPending } = useSendTransaction();
  const contract = getContract({ client, chain:MONAD, address:VAULT_ADDRESS, abi:VAULT_ABI });

  async function handleBuyKey() {
    if (!account) { setStatusMsg({ text:"Connect your wallet first!", type:"error" }); return; }
    setStatusMsg({ text:"Sending transaction…", type:"info" });
    try {
      sendTx(prepareContractCall({ contract, method:"buyKey", params:[BigInt(key.vaultId), key.keyType], value:parseEther(key.price) }), {
        onSuccess: () => { setStatusMsg({ text:"✅ Key purchased! Spin the wheel!", type:"success" }); setTimeout(()=>{setStep("spin");setStatusMsg(null);},1200); },
        onError: e => setStatusMsg({ text:"❌ "+(e.reason||e.message||"Failed").slice(0,80), type:"error" }),
      });
    } catch(e) { setStatusMsg({ text:"❌ "+e.message.slice(0,80), type:"error" }); }
  }

  function handleSpin() {
    if (spinning) return;
    setSpinning(true);
    const newDeg = spinDeg + 1440 + Math.floor(Math.random()*720);
    setSpinDeg(newDeg);
    setStatusMsg({ text:"🌀 Spinning…", type:"info" });
    setTimeout(()=>{
      setSpinning(false);
      setStatusMsg({ text:"✅ Done! Enter your 4-digit code.", type:"success" });
      setTimeout(()=>{setStep("guess");setStatusMsg(null);},1200);
    },4200);
  }

  async function handleTryCode() {
    if (!account) { setStatusMsg({ text:"Connect wallet first!", type:"error" }); return; }
    const code = dials[0]*1000+dials[1]*100+dials[2]*10+dials[3];
    setStatusMsg({ text:`Trying code ${String(code).padStart(4,"0")}…`, type:"info" });
    try {
      sendTx(prepareContractCall({ contract, method:"tryUnlock", params:[BigInt(code), VAULT_SALTS[keyIdx]] }), {
        onSuccess: async () => {
          try {
            const vd = await readContract({ contract, method:"getVault", params:[BigInt(key.vaultId)] });
            if (vd[2]) { setStep("done"); onSuccess(); return; }
            const sess = await readContract({ contract, method:"getSession", params:[account.address] });
            const turns = Number(sess[1]);
            setTurnsLeft(turns);
            if (turns===0) setStep("failed");
            else setStatusMsg({ text:`❌ Wrong — ${turns} attempt${turns!==1?"s":""} left.`, type:"error" });
          } catch { setStatusMsg({ text:"Code sent. Check wallet!", type:"info" }); }
        },
        onError: e => setStatusMsg({ text:"❌ "+(e.reason||e.message||"Failed").slice(0,80), type:"error" }),
      });
    } catch(e) { setStatusMsg({ text:"❌ "+e.message.slice(0,80), type:"error" }); }
  }

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,4,8,0.94)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", backdropFilter:"blur(10px)" }} onClick={onClose}>
      <div style={{ background:"#020c14", border:"1px solid #0a2a3a", borderRadius:"24px", padding:"28px", width:"95%", maxWidth:"420px", textAlign:"center", position:"relative", maxHeight:"90vh", overflowY:"auto", boxShadow:"0 0 60px #00c8ff22" }} onClick={e=>e.stopPropagation()}>
        <div style={{ position:"absolute", top:0, left:0, right:0, height:"2px", background:"linear-gradient(90deg,transparent,#00c8ff,#00ff88,transparent)", borderRadius:"24px 24px 0 0" }}/>
        <button onClick={onClose} style={{ position:"absolute", top:"14px", right:"18px", background:"none", border:"none", color:"#2a6a8a", fontSize:"20px", cursor:"pointer" }}>✕</button>
        <img src={key.img} alt={key.name} style={{ width:"100px", height:"100px", objectFit:"contain", margin:"0 auto 12px", display:"block", filter:"drop-shadow(0 0 18px rgba(0,200,255,0.6))", animation:"floatImg 3s ease-in-out infinite" }} onError={e=>e.target.style.display="none"}/>
        <div style={{ fontFamily:"Cinzel,serif", fontSize:"17px", color:"#c9a84c", letterSpacing:"3px", marginBottom:"20px" }}>◈ {key.name}</div>

        {step==="buy" && (
          <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
            <p style={{ fontSize:"12px", color:"#80b8d0", lineHeight:1.8 }}>
              Buy a <strong style={{ color:"#c9a84c" }}>{key.name.split(" ")[0]}</strong> key for{" "}
              <strong style={{ color:"#00ff88" }}>{Number(key.price).toLocaleString()} MON</strong> and get 4 attempts to crack the vault!
            </p>
            {!account ? (
              <div style={{ textAlign:"center" }}>
                <p style={{ color:"#80b8d0", fontSize:"11px", marginBottom:"14px" }}>Connect your wallet to play.</p>
                <ConnectButton client={client} chain={MONAD} theme="dark" btnTitle="Connect Wallet"/>
              </div>
            ) : (
              <>
                <button onClick={handleBuyKey} disabled={isPending} style={{ width:"100%", padding:"14px", border:"none", borderRadius:"12px", background:"linear-gradient(135deg,#7a4a00,#c9a84c)", color:"#000", fontFamily:"Cinzel,serif", fontSize:"12px", fontWeight:700, letterSpacing:"3px", cursor:isPending?"not-allowed":"pointer", opacity:isPending?0.4:1 }}>
                  {isPending?"Sending…":"◈ Buy Key & Play"}
                </button>
                <button onClick={()=>setShowCard(v=>!v)} style={{ width:"100%", padding:"12px", border:"none", borderRadius:"12px", background:"linear-gradient(135deg,#3a2a00,#c9a84c)", color:"#000", fontFamily:"Cinzel,serif", fontSize:"11px", fontWeight:700, letterSpacing:"2px", cursor:"pointer" }}>
                  {showCard?"✕ CLOSE CARD PURCHASE":"💳 BUY MON WITH CARD"}
                </button>
                {showCard && (
                  <div style={{ borderRadius:"12px", overflow:"hidden", border:"1px solid rgba(0,200,255,0.2)", background:"rgba(5,10,14,0.95)", marginTop:"4px" }}>
                    <BuyWidget client={client} chain={MONAD} theme="dark"/>
                  </div>
                )}
              </>
            )}
            {statusMsg && <StatusBox msg={statusMsg}/>}
          </div>
        )}

        {step==="spin" && (
          <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
            <div style={{ position:"relative", width:"240px", height:"240px", margin:"0 auto 10px" }}>
              <div style={{ position:"absolute", top:"-16px", left:"50%", transform:"translateX(-50%)", width:0, height:0, borderLeft:"11px solid transparent", borderRight:"11px solid transparent", borderBottom:"26px solid #c9a84c", filter:"drop-shadow(0 0 8px #c9a84c)", zIndex:10 }}/>
              <div style={{ width:"240px", height:"240px", borderRadius:"50%", border:"3px solid #00c8ff", boxShadow:"0 0 30px #00c8ff33",
                transition:spinning?"transform 4s cubic-bezier(0.17,0.67,0.12,0.99)":"none",
                transform:`rotate(${spinDeg}deg)`,
                background:"radial-gradient(circle,#040e18,#020810)",
                display:"flex", alignItems:"center", justifyContent:"center" }}>
                <WheelSVG/>
              </div>
            </div>
            <button onClick={handleSpin} disabled={spinning} style={{ width:"100%", padding:"14px", border:"none", borderRadius:"12px", background:"linear-gradient(135deg,#003a5a,#00c8ff)", color:"#000", fontFamily:"Cinzel,serif", fontSize:"12px", fontWeight:700, letterSpacing:"3px", cursor:spinning?"not-allowed":"pointer", opacity:spinning?0.4:1 }}>
              {spinning?"🌀 Spinning…":"◈ Spin the Wheel"}
            </button>
            {statusMsg && <StatusBox msg={statusMsg}/>}
          </div>
        )}

        {step==="guess" && (
          <div style={{ display:"flex", flexDirection:"column", gap:"14px" }}>
            <div style={{ marginBottom:"4px" }}>
              <div style={{ fontFamily:"Cinzel,serif", fontSize:"32px", fontWeight:700, color:"#c9a84c" }}>{turnsLeft}</div>
              <div style={{ fontSize:"9px", color:"#2a6a8a", letterSpacing:"2px" }}>ATTEMPTS REMAINING</div>
            </div>
            <div style={{ display:"flex", gap:"10px", justifyContent:"center" }}>
              {dials.map((v,i) => (
                <div key={i} onClick={()=>setDials(p=>{const n=[...p];n[i]=(n[i]+1)%10;return n;})}
                  style={{ width:"58px", height:"76px", background:"#040e18", border:"2px solid #0a2a3a", borderRadius:"12px", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Cinzel,serif", fontSize:"30px", fontWeight:900, color:"#00c8ff", textShadow:"0 0 15px #00c8ff", cursor:"pointer", userSelect:"none", transition:"all 0.3s" }}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="#00c8ff";e.currentTarget.style.color="#00ff88";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="#0a2a3a";e.currentTarget.style.color="#00c8ff";}}
                >{v}</div>
              ))}
            </div>
            <button onClick={handleTryCode} disabled={isPending||turnsLeft===0}
              style={{ width:"100%", padding:"14px", border:"none", borderRadius:"12px", background:"linear-gradient(135deg,#003a20,#00ff88)", color:"#000", fontFamily:"Cinzel,serif", fontSize:"12px", fontWeight:700, letterSpacing:"3px", cursor:"pointer", opacity:(isPending||turnsLeft===0)?0.4:1 }}>
              {isPending?"Sending…":"◈ Try This Code"}
            </button>
            {statusMsg && <StatusBox msg={statusMsg}/>}
          </div>
        )}

        {step==="done" && (
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:"64px", margin:"16px 0" }}>🎉</div>
            <div style={{ fontFamily:"Cinzel,serif", fontSize:"24px", fontWeight:900, color:"#c9a84c", letterSpacing:"4px", textShadow:"0 0 20px #c9a84c" }}>VAULT CRACKED!</div>
            <p style={{ color:"#00ff88", marginTop:"8px", fontSize:"12px" }}>Prize sent to your wallet + Winner NFT minted!</p>
            <button onClick={onClose} style={{ marginTop:"20px", width:"100%", padding:"14px", border:"none", borderRadius:"12px", background:"linear-gradient(135deg,#7a4a00,#c9a84c)", color:"#000", fontFamily:"Cinzel,serif", fontSize:"12px", fontWeight:700, letterSpacing:"3px", cursor:"pointer" }}>◈ Close</button>
          </div>
        )}

        {step==="failed" && (
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:"48px", margin:"16px 0" }}>🔒</div>
            <div style={{ fontFamily:"Cinzel,serif", color:"#ff4466", fontSize:"18px", letterSpacing:"2px" }}>VAULT REMAINS LOCKED</div>
            <p style={{ color:"#80b8d0", marginTop:"8px", fontSize:"12px" }}>No attempts remaining. Better luck next vault!</p>
            <button onClick={onClose} style={{ marginTop:"20px", width:"100%", padding:"14px", border:"none", borderRadius:"12px", background:"linear-gradient(135deg,#7a4a00,#c9a84c)", color:"#000", fontFamily:"Cinzel,serif", fontSize:"12px", fontWeight:700, letterSpacing:"3px", cursor:"pointer" }}>◈ Try Another Vault</button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusBox({ msg }) {
  const c = { info:"#00c8ff", success:"#00ff88", error:"#ff4466" };
  const b = { info:"rgba(0,200,255,0.08)", success:"rgba(0,255,136,0.08)", error:"rgba(255,68,102,0.08)" };
  return <div style={{ padding:"10px", borderRadius:"8px", fontSize:"10px", letterSpacing:"1px", background:b[msg.type], border:`1px solid ${c[msg.type]}44`, color:c[msg.type] }}>{msg.text}</div>;
}

function WheelSVG() {
  return (
    <svg width="220" height="220" viewBox="0 0 240 240">
      <circle cx="120" cy="120" r="118" fill="none" stroke="#00c8ff" strokeWidth="1" strokeDasharray="4 4"/>
      {[[120,55,"#c9a84c",24,"7"],[185,130,"#00ff88",24,"3"],[120,200,"#c9a84c",24,"9"],[55,130,"#00ff88",24,"1"],[168,72,"#a0d8ff",18,"5"],[185,172,"#a0d8ff",18,"8"],[72,185,"#a0d8ff",18,"2"],[55,72,"#a0d8ff",18,"4"],[145,42,"#c9a84c",14,"6"],[200,100,"#c9a84c",14,"0"]].map(([x,y,fill,size,text],i) => (
        <text key={i} x={x} y={y} textAnchor="middle" fill={fill} fontSize={size} fontFamily="Cinzel" fontWeight="900">{text}</text>
      ))}
      <circle cx="120" cy="120" r="20" fill="#020c14" stroke="#00c8ff" strokeWidth="2"/>
      <text x="120" y="126" textAnchor="middle" fill="#00c8ff" fontSize="14" fontFamily="Cinzel">⬡</text>
    </svg>
  );
}

function HowToPlay() {
  const steps = [
    ["1","Connect Wallet","MetaMask, WalletConnect, Coinbase or any injected wallet on Monad (Chain ID 143)"],
    ["2","Get MON","Buy with card via Thirdweb Pay or bridge from any chain via NEAR Intents"],
    ["3","Choose a Key","Bronze 100 · Silver 500 · Gold 1,000 · Platinum 10,000 MON"],
    ["4","Spin the Wheel","Spin to get your starting combination hint"],
    ["5","Try the Code","4 attempts to guess the correct 4-digit vault code"],
    ["6","Win the Pool","Crack it → receive full vault pool + Winner NFT minted!"],
  ];
  return (
    <div style={{ background:"#020c14", border:"1px solid #0a2a3a", borderRadius:"16px", padding:"22px" }}>
      <div style={{ fontFamily:"Cinzel,serif", fontSize:"12px", letterSpacing:"3px", color:"#c9a84c", marginBottom:"16px" }}>◈ HOW TO PLAY</div>
      <div style={{ display:"flex", flexDirection:"column", gap:"12px" }}>
        {steps.map(([n,title,desc]) => (
          <div key={n} style={{ display:"flex", gap:"14px", alignItems:"flex-start" }}>
            <div style={{ width:"28px", height:"28px", minWidth:"28px", border:"1px solid #00c8ff", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"Cinzel,serif", fontSize:"11px", color:"#00c8ff" }}>{n}</div>
            <div style={{ fontSize:"11px", lineHeight:1.7, paddingTop:"3px" }}>
              <strong style={{ color:"#f0d080", display:"block", marginBottom:"1px", letterSpacing:"1px" }}>{title}</strong>
              <span style={{ color:"#80b8d0" }}>{desc}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
