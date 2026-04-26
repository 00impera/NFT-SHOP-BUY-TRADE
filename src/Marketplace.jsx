import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { getContract, prepareContractCall, readContract } from "thirdweb";
import { useSendTransaction } from "thirdweb/react";
import { formatEther, parseEther } from "ethers"; // ✅ FIXED: was "ethers/utils"
import { client } from "./App.jsx";
import {
  MONAD, NFT_ADDRESS, MARKETPLACE_ADDRESS,
  NFT_ABI, MARKETPLACE_ABI, TG_BOT_URL,
} from "./config.js";

/* ══ Design tokens (from CSS vars) ═══════════════════════════════ */
const T = {
  gold: "#c9a84c", goldHi: "#f0d080", green: "#00ff88",
  cyan: "#00c8ff", red: "#ef4444", blue: "#29b6f6",
  dim: "#4a8aaa", mid: "#80b8d0", bg: "#020c14",
  border: "#0a2a3a", border2: "#0d3347",
};

const IPFS_GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://ipfs.io/ipfs/",
];

const FRIENDLY_ERRORS = [
  [/user rejected/i,                "Transaction cancelled."],
  [/insufficient funds/i,           "Insufficient MON balance."],
  [/not listed/i,                   "Token is not listed for sale."],
  [/not owner/i,                    "You don't own this token."],
  [/already listed/i,               "Token is already listed."],
  [/execution reverted/i,           "Contract reverted — check token ID and ownership."],
  [/could not decode result data/i, "Contract returned no data."],
];
function friendlyError(err) {
  const raw = err?.message || String(err);
  for (const [p, t] of FRIENDLY_ERRORS) if (p.test(raw)) return t;
  return raw.length > 120 ? raw.slice(0, 117) + "…" : raw;
}

/* ── IPFS helpers ─────────────────────────────────────────────── */
function resolveIpfs(uri) {
  if (!uri) return null;
  if (uri.startsWith("ipfs://")) return IPFS_GATEWAYS[0] + uri.slice(7);
  return uri; // ✅ https:// Cloudinary URLs pass through unchanged
}
async function fetchMetadata(tokenId, nftContract) {
  try {
    const uri = await readContract({ contract: nftContract, method: "tokenURI", params: [BigInt(tokenId)] });
    if (!uri) return null;
    let data;
    if (uri.startsWith("data:application/json")) {
      data = JSON.parse(atob(uri.split(",")[1]));
    } else {
      const url = resolveIpfs(uri);
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) return null;
      data = await res.json();
    }
    return { name: data?.name ?? `#${tokenId}`, description: data?.description ?? null, image: resolveIpfs(data?.image ?? null) };
  } catch { return null; }
}

/* ══ Sub-components ══════════════════════════════════════════════ */

/* Toast notifications */
function Toast({ toasts, remove }) {
  return (
    <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 200, display: "flex", flexDirection: "column", gap: "8px", pointerEvents: "none" }}>
      {toasts.map(t => (
        <div key={t.id} className="scale-in" onClick={() => remove(t.id)} style={{
          display: "flex", alignItems: "flex-start", gap: "10px",
          background: t.type === "success" ? "rgba(0,255,136,0.12)" : t.type === "error" ? "rgba(239,68,68,0.12)" : "rgba(0,200,255,0.10)",
          border: `1px solid ${t.type === "success" ? "rgba(0,255,136,0.35)" : t.type === "error" ? "rgba(239,68,68,0.35)" : "rgba(0,200,255,0.35)"}`,
          borderLeft: `3px solid ${t.type === "success" ? T.green : t.type === "error" ? T.red : T.cyan}`,
          borderRadius: "10px", padding: "12px 16px", maxWidth: "340px",
          backdropFilter: "blur(8px)", boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          cursor: "pointer", pointerEvents: "auto",
          color: t.type === "success" ? T.green : t.type === "error" ? T.red : T.cyan,
          fontSize: "12px", lineHeight: 1.55,
        }}>
          <span style={{ flexShrink: 0, marginTop: "1px" }}>
            {t.type === "success" ? "✓" : t.type === "error" ? "✕" : "○"}
          </span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

function useToasts() {
  const [toasts, setToasts] = useState([]);
  const add = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4500);
  }, []);
  const remove = useCallback(id => setToasts(p => p.filter(t => t.id !== id)), []);
  return { toasts, add, remove };
}

/* Validated input with inline error */
const ValidInput = memo(function ValidInput({ label, placeholder, value, onChange, type = "text", id, validate, hint, inputMode }) {
  const [touched, setTouched] = useState(false);
  const [focused, setFocused] = useState(false);
  const err = touched && validate ? validate(value) : null;
  return (
    <div className="field-wrap">
      <label htmlFor={id} className="field-label">{label}</label>
      {hint && <p style={{ fontSize: "10px", color: T.dim, marginBottom: "6px", marginTop: "-4px" }}>{hint}</p>}
      <input
        id={id} type={type} inputMode={inputMode}
        value={value} onChange={onChange} placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(true); setTouched(true); }}
        className="field-input"
        style={{ borderColor: err ? T.red : focused ? T.gold : undefined }}
      />
      {err && <p style={{ fontSize: "10px", color: T.red, marginTop: "5px" }}>⚠ {err}</p>}
    </div>
  );
});

/* Progress step indicator */
function StepIndicator({ steps, current }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0", marginBottom: "22px" }}>
      {steps.map((s, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", flex: i < steps.length - 1 ? 1 : 0 }}>
          <div style={{ display: "flex", flex: "0 0 auto", flexDirection: "column", alignItems: "center", gap: "4px" }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "11px", fontWeight: 700, transition: "all 0.3s",
              background: i < current ? T.green : i === current ? "rgba(201,168,76,0.2)" : "transparent",
              border: `1.5px solid ${i < current ? T.green : i === current ? T.gold : T.border}`,
              color: i < current ? "#000" : i === current ? T.gold : T.dim,
            }}>
              {i < current ? "✓" : i + 1}
            </div>
            <span style={{ fontSize: "9px", color: i === current ? T.gold : T.dim, letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{s}</span>
          </div>
          {i < steps.length - 1 && (
            <div style={{ flex: 1, height: "1px", background: i < current ? T.green : T.border, margin: "0 8px", marginBottom: "18px", transition: "background 0.3s" }} />
          )}
        </div>
      ))}
    </div>
  );
}

/* NFT preview card (used in Buy panel) */
function NftPreviewCard({ tokenId, meta, metaLoading, listing }) {
  const [imgErr, setImgErr] = useState(false);
  if (!tokenId) return (
    <div style={{ background: "#010a12", borderRadius: "12px", aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", color: T.border }}>
      <span style={{ fontSize: "40px" }}>◈</span>
      <span style={{ fontSize: "10px", color: T.dim, letterSpacing: "2px" }}>ENTER TOKEN ID</span>
    </div>
  );
  if (metaLoading) return (
    <div style={{ background: "#010a12", borderRadius: "12px", aspectRatio: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px" }}>
      <div style={{ width: "32px", height: "32px", border: `2px solid ${T.border}`, borderTop: `2px solid ${T.gold}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <span style={{ fontSize: "10px", color: T.dim }}>Loading…</span>
    </div>
  );
  return (
    <div style={{ borderRadius: "12px", overflow: "hidden", aspectRatio: "1", position: "relative", background: "#010a12" }}>
      {meta?.image && !imgErr ? (
        <>
          <img src={meta.image} alt={meta.name} onError={() => setImgErr(true)}
            style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0 }} />
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(2,12,20,0.85) 0%, transparent 55%)" }} />
        </>
      ) : (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", fontSize: "40px", color: T.border }}>◈</div>
      )}
      <div style={{ position: "absolute", bottom: "10px", left: "10px" }}>
        <div style={{ background: "rgba(2,12,20,0.8)", backdropFilter: "blur(6px)", border: `1px solid ${T.border}`, borderRadius: "6px", padding: "4px 10px", fontFamily: "Share Tech Mono, monospace", fontSize: "11px", color: T.gold }}>
          #{tokenId}
        </div>
      </div>
      {listing?.active && (
        <div style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(0,255,136,0.15)", border: "1px solid rgba(0,255,136,0.35)", borderRadius: "5px", padding: "3px 8px", fontSize: "9px", letterSpacing: "1.5px", color: T.green }}>
          FOR SALE
        </div>
      )}
    </div>
  );
}

/* Listing info row */
function ListingInfo({ listing, tokenId }) {
  if (!listing) return null;
  if (!listing.active) return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 16px", background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "10px" }}>
      <span style={{ color: T.red }}>✕</span>
      <span style={{ color: T.red, fontSize: "12px" }}>Token #{tokenId} is not listed for sale.</span>
    </div>
  );
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px", background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.22)", borderRadius: "12px" }}>
      <div>
        <div style={{ fontSize: "9px", color: T.dim, letterSpacing: "2px", marginBottom: "5px" }}>PRICE</div>
        <div style={{ fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: "26px", color: T.green, lineHeight: 1 }}>
          {listing.price} <span style={{ fontSize: "13px", color: T.mid }}>MON</span>
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
  );
}

/* ══ Buy Panel ═══════════════════════════════════════════════════ */
function BuyPanel({ nft, mkt, toast }) {
  const [buyId,     setBuyId]     = useState("");
  const [listing,   setListing]   = useState(null);
  const [meta,      setMeta]      = useState(null);
  const [metaLoad,  setMetaLoad]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [copied,    setCopied]    = useState(false);
  const timer = useRef(null);
  const { mutate: sendTx } = useSendTransaction();

  /* Auto-fetch listing + metadata when ID changes */
  useEffect(() => {
    if (!buyId) { setListing(null); setMeta(null); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setMetaLoad(true);
      try {
        const [d, m] = await Promise.all([
          readContract({ contract: mkt, method: "listings", params: [BigInt(buyId)] }),
          fetchMetadata(buyId, nft),
        ]);
        setListing({ seller: d[0], price: formatEther(d[1]), active: d[2] });
        setMeta(m);
      } catch { setListing(null); setMeta(null); }
      setMetaLoad(false);
    }, 600);
  }, [buyId, nft, mkt]);

  const handleBuy = useCallback(async () => {
    if (!buyId || !listing?.active) return;
    setLoading(true);
    toast("Sending transaction…", "info");
    try {
      const d = await readContract({ contract: mkt, method: "listings", params: [BigInt(buyId)] });
      sendTx(
        prepareContractCall({ contract: mkt, method: "buy", params: [BigInt(buyId)], value: d[1] }),
        {
          onSuccess: () => { toast(`Token #${buyId} purchased! 🎉`); setLoading(false); },
          onError:   e  => { toast(friendlyError(e), "error");         setLoading(false); },
        }
      );
    } catch (e) { toast(friendlyError(e), "error"); setLoading(false); }
  }, [buyId, listing, mkt, sendTx, toast]);

  function handleCopy() {
    const url = `${window.location.origin}${window.location.pathname}?token=${buyId}`;
    navigator.clipboard.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  return (
    <div className="panel fade-in" style={{ display: "grid", gridTemplateColumns: "minmax(180px, 240px) 1fr", gap: "24px", padding: "0", overflow: "hidden", borderRadius: "18px" }}>
      {/* Left — artwork */}
      <div style={{ padding: "20px" }}>
        <NftPreviewCard tokenId={buyId} meta={meta} metaLoading={metaLoad} listing={listing} />
        {meta && (
          <div className="fade-in" style={{ marginTop: "12px" }}>
            <div style={{ fontFamily: "Cinzel, serif", fontSize: "14px", fontWeight: 700, color: T.gold, marginBottom: "3px" }}>{meta.name}</div>
            {meta.description && <p style={{ fontSize: "10px", color: T.dim, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{meta.description}</p>}
          </div>
        )}
      </div>

      {/* Right — form */}
      <div style={{ padding: "24px 24px 24px 4px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <h3 style={{ fontFamily: "Cinzel, serif", fontSize: "16px", color: T.gold, letterSpacing: "2px", marginBottom: "4px" }}>Buy an NFT</h3>
          <p style={{ fontSize: "10px", color: T.dim }}>Enter a token ID — price loads automatically</p>
        </div>

        <ValidInput
          id="buy-id" label="TOKEN ID" placeholder="e.g. 42" value={buyId}
          onChange={e => setBuyId(e.target.value.replace(/[^0-9]/g, ""))}
          inputMode="numeric"
          validate={v => (!v ? "Required" : null)}
        />

        <ListingInfo listing={listing} tokenId={buyId} />

        <div style={{ flex: 1 }} />

        {/* Buy button */}
        <button
          onClick={handleBuy}
          disabled={!listing?.active || loading}
          className="btn btn-green"
          style={{ padding: "14px", fontSize: "13px", borderRadius: "10px", letterSpacing: "2px" }}
        >
          {loading ? "Processing…" : listing?.active ? `Buy for ${listing.price} MON` : "Buy Now"}
        </button>

        {/* Actions row */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={handleCopy} disabled={!buyId} className="btn btn-ghost"
            style={{ flex: 1, color: copied ? T.green : undefined }}>
            {copied ? "✓ Copied!" : "⤴ Share"}
          </button>
          <a href={buyId ? `https://monadscan.com/token/${NFT_ADDRESS}?a=${buyId}` : "#"}
            target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ flex: 1, textDecoration: "none", textAlign: "center" }}>
            ↗ Explorer
          </a>
        </div>
      </div>
    </div>
  );
}

/* ══ Sell Panel ══════════════════════════════════════════════════ */
function SellPanel({ nft, mkt, account, toast }) {
  const [listId,    setListId]    = useState("");
  const [listPrice, setListPrice] = useState("");
  const [step,      setStep]      = useState(0); // 0 = idle, 1 = approved, 2 = done
  const [loading,   setLoading]   = useState(false);
  const { mutate: sendTx } = useSendTransaction();

  const handleApprove = useCallback(() => {
    if (!listId) return toast("Enter a token ID first.", "error");
    setLoading(true);
    toast("Step 1 — Approving marketplace…", "info");
    sendTx(
      prepareContractCall({ contract: nft, method: "approve", params: [MARKETPLACE_ADDRESS, BigInt(listId)] }),
      {
        onSuccess: () => { toast("Approved! Now set your price and list.", "success"); setStep(1); setLoading(false); },
        onError:   e  => { toast(friendlyError(e), "error"); setLoading(false); },
      }
    );
  }, [nft, listId, sendTx, toast]);

  const handleList = useCallback(() => {
    if (!listId || !listPrice) return toast("Enter token ID and price.", "error");
    setLoading(true);
    toast("Step 2 — Publishing listing…", "info");
    sendTx(
      prepareContractCall({ contract: mkt, method: "listForSale", params: [BigInt(listId), parseEther(listPrice)] }),
      {
        onSuccess: () => { toast(`Token #${listId} listed for ${listPrice} MON ✓`); setStep(2); setLoading(false); },
        onError:   e  => { toast(friendlyError(e), "error"); setLoading(false); },
      }
    );
  }, [mkt, listId, listPrice, sendTx, toast]);

  return (
    <div className="panel fade-in" style={{ maxWidth: "560px" }}>
      <h3 style={{ fontFamily: "Cinzel, serif", fontSize: "16px", color: T.gold, letterSpacing: "2px", marginBottom: "4px" }}>List for Sale</h3>
      <p style={{ fontSize: "10px", color: T.dim, marginBottom: "22px" }}>Approve the marketplace, then set your price</p>

      <StepIndicator steps={["Approve", "Set price", "Listed!"]} current={step} />

      <ValidInput
        id="sell-id" label="YOUR TOKEN ID" placeholder="e.g. 42" value={listId}
        onChange={e => setListId(e.target.value.replace(/[^0-9]/g, ""))}
        inputMode="numeric"
        validate={v => !v ? "Required" : null}
        hint="You must own this token to list it."
      />
      <ValidInput
        id="sell-price" label="PRICE (MON)" placeholder="e.g. 1.5" value={listPrice}
        onChange={e => setListPrice(e.target.value)}
        validate={v => !v ? "Required" : isNaN(Number(v)) || Number(v) <= 0 ? "Enter a valid price" : null}
        hint="Buyers will pay this amount in MON."
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "8px" }}>
        <button onClick={handleApprove} disabled={loading || step >= 1} className="btn btn-cyan"
          style={{ opacity: step >= 1 ? 0.5 : 1 }}>
          {step >= 1 ? "✓ Approved" : loading ? "Approving…" : "Step 1 — Approve"}
        </button>
        <button onClick={handleList} disabled={loading || step < 1} className="btn btn-primary">
          {loading && step >= 1 ? "Listing…" : "Step 2 — List"}
        </button>
      </div>

      <div style={{ marginTop: "14px", padding: "10px 14px", background: "rgba(0,200,255,0.05)", border: "1px solid rgba(0,200,255,0.12)", borderRadius: "8px", fontSize: "10px", color: T.dim, lineHeight: 1.7 }}>
        Step 1 authorises the marketplace contract to transfer your NFT. Step 2 creates the on-chain listing.
      </div>
    </div>
  );
}

/* ══ Cancel Panel ════════════════════════════════════════════════ */
function CancelPanel({ mkt, toast }) {
  const [cancelId, setCancelId] = useState("");
  const [loading,  setLoading]  = useState(false);
  const { mutate: sendTx } = useSendTransaction();

  const handle = useCallback(() => {
    if (!cancelId) return toast("Enter a token ID.", "error");
    setLoading(true);
    toast("Cancelling listing…", "info");
    sendTx(
      prepareContractCall({ contract: mkt, method: "cancelListing", params: [BigInt(cancelId)] }),
      {
        onSuccess: () => { toast(`Listing #${cancelId} cancelled.`); setLoading(false); },
        onError:   e  => { toast(friendlyError(e), "error"); setLoading(false); },
      }
    );
  }, [mkt, cancelId, sendTx, toast]);

  return (
    <div className="panel fade-in" style={{ maxWidth: "480px" }}>
      <h3 style={{ fontFamily: "Cinzel, serif", fontSize: "16px", color: T.gold, letterSpacing: "2px", marginBottom: "4px" }}>Cancel Listing</h3>
      <p style={{ fontSize: "10px", color: T.dim, marginBottom: "22px" }}>Remove your NFT from sale — it stays in your wallet</p>

      <ValidInput
        id="cancel-id" label="TOKEN ID" placeholder="e.g. 42" value={cancelId}
        onChange={e => setCancelId(e.target.value.replace(/[^0-9]/g, ""))}
        inputMode="numeric"
        validate={v => !v ? "Required" : null}
      />

      <button onClick={handle} disabled={loading || !cancelId} className="btn btn-danger" style={{ width: "100%", padding: "13px" }}>
        {loading ? "Processing…" : "Cancel Listing"}
      </button>
    </div>
  );
}

/* ══ Trade Panel ═════════════════════════════════════════════════ */
function TradePanel({ nft, mkt, toast }) {
  const [myToken,   setMyToken]   = useState("");
  const [wantToken, setWantToken] = useState("");
  const [acceptId,  setAcceptId]  = useState("");
  const [loadOff,   setLoadOff]   = useState(false);
  const [loadAcc,   setLoadAcc]   = useState(false);
  const { mutate: sendTx } = useSendTransaction();

  const handleOffer = useCallback(() => {
    if (!myToken || !wantToken) return toast("Enter both token IDs.", "error");
    setLoadOff(true);
    toast("Step 1/2 — Approving…", "info");
    sendTx(
      prepareContractCall({ contract: nft, method: "approve", params: [MARKETPLACE_ADDRESS, BigInt(myToken)] }),
      {
        onSuccess: () => {
          toast("Step 2/2 — Sending offer…", "info");
          sendTx(
            prepareContractCall({ contract: mkt, method: "offerTrade", params: [BigInt(myToken), BigInt(wantToken)] }),
            {
              onSuccess: () => { toast(`Trade offered: #${myToken} ⇄ #${wantToken} ✓`); setLoadOff(false); },
              onError:   e  => { toast(friendlyError(e), "error");                        setLoadOff(false); },
            }
          );
        },
        onError: e => { toast(friendlyError(e), "error"); setLoadOff(false); },
      }
    );
  }, [nft, mkt, myToken, wantToken, sendTx, toast]);

  const handleAccept = useCallback(async () => {
    if (!acceptId) return toast("Enter the offered token ID.", "error");
    setLoadAcc(true);
    try {
      const o = await readContract({ contract: mkt, method: "tradeOffers", params: [BigInt(acceptId)] });
      if (!o[3]) { toast(`No active offer for #${acceptId}.`, "error"); setLoadAcc(false); return; }
      toast("Step 1/2 — Approving…", "info");
      sendTx(
        prepareContractCall({ contract: nft, method: "approve", params: [MARKETPLACE_ADDRESS, o[2]] }),
        {
          onSuccess: () => {
            toast("Step 2/2 — Accepting…", "info");
            sendTx(
              prepareContractCall({ contract: mkt, method: "acceptTrade", params: [BigInt(acceptId)] }),
              {
                onSuccess: () => { toast("Trade completed ✓"); setLoadAcc(false); },
                onError:   e  => { toast(friendlyError(e), "error"); setLoadAcc(false); },
              }
            );
          },
          onError: e => { toast(friendlyError(e), "error"); setLoadAcc(false); },
        }
      );
    } catch (e) { toast(friendlyError(e), "error"); setLoadAcc(false); }
  }, [nft, mkt, acceptId, sendTx, toast]);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "16px" }}>
      {/* Offer trade */}
      <div className="panel fade-in">
        <h3 style={{ fontFamily: "Cinzel, serif", fontSize: "15px", color: T.gold, letterSpacing: "2px", marginBottom: "4px" }}>Offer a Trade</h3>
        <p style={{ fontSize: "10px", color: T.dim, marginBottom: "20px" }}>Swap NFTs peer-to-peer — no MON needed</p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: "10px", alignItems: "end", marginBottom: "8px" }}>
          <ValidInput id="my-token"   label="YOUR TOKEN"  placeholder="ID you give"    value={myToken}   onChange={e => setMyToken(e.target.value.replace(/[^0-9]/g, ""))} validate={v => !v ? "Required" : null} />
          <div style={{ paddingBottom: "14px", color: T.dim, fontSize: "20px", lineHeight: 1 }}>⇄</div>
          <ValidInput id="want-token" label="WANT TOKEN"  placeholder="ID you want"    value={wantToken} onChange={e => setWantToken(e.target.value.replace(/[^0-9]/g, ""))} validate={v => !v ? "Required" : null} />
        </div>

        <button onClick={handleOffer} disabled={loadOff} className="btn btn-primary" style={{ width: "100%", padding: "13px" }}>
          {loadOff ? "Processing…" : "Approve + Offer Trade"}
        </button>
      </div>

      {/* Accept trade */}
      <div className="panel fade-in" style={{ animationDelay: "60ms" }}>
        <h3 style={{ fontFamily: "Cinzel, serif", fontSize: "15px", color: T.gold, letterSpacing: "2px", marginBottom: "4px" }}>Accept a Trade</h3>
        <p style={{ fontSize: "10px", color: T.dim, marginBottom: "20px" }}>Accept an incoming swap offer</p>

        <ValidInput id="accept-id" label="OFFERED TOKEN ID" placeholder="Token offered to you" value={acceptId}
          onChange={e => setAcceptId(e.target.value.replace(/[^0-9]/g, ""))}
          validate={v => !v ? "Required" : null}
          hint="This is the ID of the token the other person offered."
        />

        <button onClick={handleAccept} disabled={loadAcc} className="btn btn-green" style={{ width: "100%", padding: "13px" }}>
          {loadAcc ? "Processing…" : "Approve + Accept Trade"}
        </button>
      </div>
    </div>
  );
}

/* ══ Market Stats bar ════════════════════════════════════════════ */
const MarketStats = memo(function MarketStats({ mkt }) {
  const [fee,     setFee]     = useState("—");
  const [balance, setBalance] = useState("—");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [feeBps, res] = await Promise.all([
          readContract({ contract: mkt, method: "FEE_BPS", params: [] }).catch(() => null),
          fetch("https://rpc.ankr.com/monad_mainnet", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getBalance", params: [MARKETPLACE_ADDRESS, "latest"] }),
          }).then(r => r.json()).catch(() => null),
        ]);
        if (feeBps != null) setFee(`${feeBps.toString()} bps`);
        if (res?.result) setBalance((Number(BigInt(res.result)) / 1e18).toFixed(4) + " MON");
      } catch {}
      setLoading(false);
    })();
  }, [mkt]);

  const stats = [
    { label: "FEE RATE",    value: loading ? "…" : fee,     color: T.gold  },
    { label: "VAULT POOL",  value: loading ? "…" : balance,  color: T.green },
    { label: "NETWORK",     value: "Monad",                  color: T.cyan  },
    { label: "CHAIN ID",    value: "10143",                  color: T.mid   }, // ✅ FIXED: was 143
  ];

  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: "1px",
      background: T.border, border: `1px solid ${T.border}`,
      borderRadius: "12px", overflow: "hidden", marginBottom: "20px",
    }}>
      {stats.map((s) => (
        <div key={s.label} style={{
          flex: "1 1 120px", padding: "14px 20px",
          background: T.bg, textAlign: "center",
        }}>
          <div style={{ fontSize: "9px", color: T.dim, letterSpacing: "2px", marginBottom: "5px" }}>{s.label}</div>
          <div style={{ fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: "16px", color: s.color, lineHeight: 1 }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
});

/* ══ TAB definitions ═════════════════════════════════════════════ */
const TABS = [
  { id: "buy",    icon: "⬇", label: "Buy",    desc: "Purchase a listed NFT"         },
  { id: "sell",   icon: "⬆", label: "Sell",   desc: "List your NFT for sale"        },
  { id: "cancel", icon: "✕", label: "Cancel", desc: "Remove your listing"           },
  { id: "trade",  icon: "⇄", label: "Trade",  desc: "Swap NFTs peer-to-peer"        },
];

/* ══ MAIN MARKETPLACE ════════════════════════════════════════════ */
export default function Marketplace({ account, initialBuyId = "" }) {
  const [tab, setTab] = useState("buy");
  const { toasts, add: toast, remove } = useToasts();

  const nft = useMemo(() => getContract({ client, chain: MONAD, address: NFT_ADDRESS,         abi: NFT_ABI }),         []);
  const mkt = useMemo(() => getContract({ client, chain: MONAD, address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI }), []);

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <Toast toasts={toasts} remove={remove} />

      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "28px 20px 80px", position: "relative", zIndex: 1 }}>

        {/* ── Header ── */}
        <header style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h1 style={{ fontFamily: "Cinzel, serif", fontWeight: 900, fontSize: "clamp(18px, 4vw, 28px)", color: T.gold, letterSpacing: "3px", margin: "0 0 3px" }}>
              NFT MARKETPLACE
            </h1>
            <p style={{ color: T.dim, fontSize: "11px", margin: 0 }}>
              <span style={{ color: T.gold }}>{account.address.slice(0, 6)}…{account.address.slice(-4)}</span>
              <span style={{ margin: "0 8px", color: T.border }}>·</span>
              <span className="status-dot" style={{ marginRight: "5px" }} />
              <span style={{ color: T.green }}>Monad Mainnet</span>
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <a href={`https://monadscan.com/address/${account.address}`} target="_blank" rel="noreferrer"
              className="btn btn-ghost" style={{ fontSize: "10px" }}>↗ My Activity</a>
            <a href={TG_BOT_URL} target="_blank" rel="noreferrer" className="btn btn-ghost" style={{ fontSize: "10px", color: T.blue }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.248-2.04 9.607c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.903.614z"/></svg>
              Telegram Bot
            </a>
          </div>
        </header>

        <MarketStats mkt={mkt} />

        {/* ── Tab bar ── */}
        <div className="tab-bar" style={{ marginBottom: "20px" }}>
          {TABS.map(t => (
            <button key={t.id} className={`tab-item ${tab === t.id ? "active" : ""}`} onClick={() => setTab(t.id)}
              data-tip={t.desc} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ opacity: 0.7 }}>{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Panels ── */}
        {tab === "buy"    && <BuyPanel    nft={nft} mkt={mkt} toast={toast} />}
        {tab === "sell"   && <SellPanel   nft={nft} mkt={mkt} account={account} toast={toast} />}
        {tab === "cancel" && <CancelPanel mkt={mkt} toast={toast} />}
        {tab === "trade"  && <TradePanel  nft={nft} mkt={mkt} toast={toast} />}

        {/* ── Contract links ── */}
        <div style={{ marginTop: "32px", padding: "14px 18px", background: T.bg, border: `1px solid ${T.border}`, borderRadius: "10px", display: "flex", gap: "24px", flexWrap: "wrap" }}>
          <div style={{ fontSize: "9px", color: T.dim, letterSpacing: "1.5px", alignSelf: "center" }}>CONTRACTS</div>
          {[["NFT", NFT_ADDRESS], ["Marketplace", MARKETPLACE_ADDRESS]].map(([name, addr]) => (
            <a key={name} href={`https://monadscan.com/address/${addr}`} target="_blank" rel="noreferrer"
              style={{ fontSize: "10px", color: T.dim, fontFamily: "Share Tech Mono, monospace", textDecoration: "none" }}
              onMouseEnter={e => e.target.style.color = T.gold}
              onMouseLeave={e => e.target.style.color = T.dim}
            >
              {name}: {addr.slice(0, 8)}…{addr.slice(-6)}
            </a>
          ))}
        </div>
      </main>
    </>
  );
}
