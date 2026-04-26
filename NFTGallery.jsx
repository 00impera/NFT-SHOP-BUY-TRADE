import { useState, useEffect, useCallback, useRef } from "react";
import { getContract, readContract } from "thirdweb";
import { formatEther } from "ethers/utils";
import { client } from "./App.jsx";
import {
  MONAD, NFT_ADDRESS, MARKETPLACE_ADDRESS,
  NFT_ABI, MARKETPLACE_ABI,
} from "./config.js";

/* ── IPFS gateway list ─────────────────────────────────────────── */
const GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://dweb.link/ipfs/",
];
function resolveIpfs(uri) {
  if (!uri) return null;
  if (uri.startsWith("ipfs://")) return GATEWAYS[0] + uri.slice(7);
  return uri;
}

/* ── Fetch metadata for one token ────────────────────────────── */
async function fetchMeta(tokenId, nftContract) {
  try {
    const uri = await readContract({
      contract: nftContract,
      method: "tokenURI",
      params: [BigInt(tokenId)],
    });
    if (!uri) return null;

    let data;
    if (uri.startsWith("data:application/json")) {
      data = JSON.parse(atob(uri.split(",")[1]));
    } else {
      const url = resolveIpfs(uri);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 7000);
      try {
        const res = await fetch(url, { signal: ctrl.signal });
        clearTimeout(timer);
        if (!res.ok) return null;
        data = await res.json();
      } catch { clearTimeout(timer); return null; }
    }
    return {
      name: data?.name ?? `Token #${tokenId}`,
      description: data?.description ?? null,
      image: resolveIpfs(data?.image ?? null),
    };
  } catch {
    return null;
  }
}

/* ── NFT Card ─────────────────────────────────────────────────── */
function NFTCard({ tokenId, price, seller, meta, loading, onBuy, onSelect, index }) {
  const [imgErr, setImgErr] = useState(false);
  const delay = `${(index % 12) * 50}ms`;

  if (loading) {
    return (
      <div className="nft-card" style={{ animationDelay: delay, cursor: "default" }}>
        <div className="skeleton" style={{ paddingTop: "100%", width: "100%" }} />
        <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div className="skeleton" style={{ height: "10px", width: "50%", borderRadius: "4px" }} />
          <div className="skeleton" style={{ height: "14px", width: "80%", borderRadius: "4px" }} />
          <div className="skeleton" style={{ height: "18px", width: "60%", borderRadius: "4px" }} />
        </div>
      </div>
    );
  }

  return (
    <div
      className="nft-card"
      style={{ animationDelay: delay }}
      onClick={() => onSelect?.({ tokenId, price, seller, meta })}
    >
      {/* Badge */}
      <div className="nft-card__badge">FOR SALE</div>

      {/* Image */}
      <div className="nft-card__img-wrap">
        {meta?.image && !imgErr ? (
          <>
            <img
              src={meta.image}
              alt={meta.name}
              onError={() => setImgErr(true)}
            />
            <div className="nft-card__overlay">
              <button
                className="btn btn-green"
                style={{ width: "100%", fontSize: "10px", padding: "8px" }}
                onClick={e => { e.stopPropagation(); onBuy?.({ tokenId, price, seller }); }}
              >
                ◈ Buy Now
              </button>
            </div>
          </>
        ) : (
          <div className="nft-card__placeholder">
            <span>◈</span>
            <span style={{ fontSize: "10px", letterSpacing: "1px" }}>#{tokenId}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="nft-card__body">
        <div className="nft-card__id">TOKEN #{tokenId}</div>
        <div className="nft-card__name">{meta?.name ?? `Token #${tokenId}`}</div>
        <div className="nft-card__price">
          <span>
            <span className="nft-card__price-val">{price}</span>
            <span className="nft-card__price-unit">MON</span>
          </span>
          <a
            href={`https://monadscan.com/address/${seller}`}
            target="_blank" rel="noreferrer"
            onClick={e => e.stopPropagation()}
            style={{ fontSize: "9px", color: "var(--text2)", textDecoration: "none", letterSpacing: "0.5px" }}
            onMouseEnter={e => e.target.style.color = "var(--blue)"}
            onMouseLeave={e => e.target.style.color = "var(--text2)"}
          >
            {seller.slice(0, 6)}…
          </a>
        </div>
      </div>
    </div>
  );
}

/* ── NFT Detail Modal ─────────────────────────────────────────── */
function NFTDetailModal({ item, onClose, onBuy }) {
  if (!item) return null;
  const { tokenId, price, seller, meta } = item;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 300,
        background: "rgba(0,4,8,0.92)", backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        className="scale-in"
        style={{
          background: "var(--card)", border: "1px solid var(--border2)",
          borderRadius: "24px", overflow: "hidden",
          width: "95%", maxWidth: "520px",
          boxShadow: "0 0 60px rgba(0,200,255,0.15), 0 40px 80px rgba(0,0,0,0.8)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Top glow bar */}
        <div style={{ height: "2px", background: "linear-gradient(90deg, transparent, var(--blue), var(--green), transparent)" }} />

        <div style={{ display: "flex", flexDirection: "column" }}>
          {/* Image */}
          <div style={{ position: "relative", background: "#010a12", aspectRatio: "16/9", overflow: "hidden" }}>
            {meta?.image ? (
              <img src={meta.image} alt={meta.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "64px", color: "var(--border)" }}>◈</div>
            )}
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, var(--card) 0%, transparent 60%)" }} />
            <button
              onClick={onClose}
              style={{ position: "absolute", top: "14px", right: "14px", background: "rgba(2,12,20,0.8)", border: "1px solid var(--border)", borderRadius: "50%", width: "32px", height: "32px", color: "var(--text2)", fontSize: "16px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
            >✕</button>
            <div style={{ position: "absolute", top: "14px", left: "14px" }}>
              <div className="nft-card__badge">FOR SALE</div>
            </div>
          </div>

          {/* Details */}
          <div style={{ padding: "22px 26px 28px" }}>
            <div style={{ fontSize: "10px", color: "var(--text2)", letterSpacing: "2px", marginBottom: "4px" }}>TOKEN #{tokenId}</div>
            <div style={{ fontFamily: "Cinzel, serif", fontSize: "22px", fontWeight: 700, color: "var(--gold)", marginBottom: "8px" }}>
              {meta?.name ?? `Token #${tokenId}`}
            </div>
            {meta?.description && (
              <p style={{ fontSize: "11px", color: "var(--text2)", lineHeight: 1.7, marginBottom: "18px" }}>
                {meta.description}
              </p>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.2)", borderRadius: "12px", padding: "14px 20px", marginBottom: "18px" }}>
              <div>
                <div style={{ fontSize: "9px", color: "var(--text2)", letterSpacing: "2px", marginBottom: "4px" }}>PRICE</div>
                <div style={{ fontFamily: "Cinzel, serif", fontSize: "26px", fontWeight: 700, color: "var(--green)" }}>
                  {price} <span style={{ fontSize: "13px", color: "var(--text2)" }}>MON</span>
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "9px", color: "var(--text2)", letterSpacing: "2px", marginBottom: "4px" }}>SELLER</div>
                <a href={`https://monadscan.com/address/${seller}`} target="_blank" rel="noreferrer"
                  style={{ fontSize: "11px", color: "var(--blue)", fontFamily: "Share Tech Mono", textDecoration: "none" }}>
                  {seller.slice(0, 10)}…{seller.slice(-6)}
                </a>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1, padding: "14px", fontSize: "12px", borderRadius: "12px" }}
                onClick={() => { onBuy({ tokenId, price, seller }); onClose(); }}
              >
                ◈ Buy for {price} MON
              </button>
              <a
                href={`https://monadscan.com/token/${NFT_ADDRESS}?a=${tokenId}`}
                target="_blank" rel="noreferrer"
                className="btn btn-ghost"
                style={{ padding: "14px 18px", borderRadius: "12px", textDecoration: "none" }}
              >↗</a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   MAIN GALLERY COMPONENT
   Usage: <NFTGallery account={account} onBuyRequest={fn} />
   ════════════════════════════════════════════════════════════ */
export default function NFTGallery({ account, onBuyRequest }) {
  const [items,    setItems]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState(null);
  const [filter,   setFilter]   = useState("all");   // all | mine
  const [sortBy,   setSortBy]   = useState("price");  // price | id
  const [selected, setSelected] = useState(null);
  const [search,   setSearch]   = useState("");
  const abortRef = useRef(null);

  /* ── Scan first N token IDs for active listings ──────────── */
  const SCAN_LIMIT = 100;  // raise if you have more NFTs

  const loadGallery = useCallback(async () => {
    setLoading(true); setError(null);
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const nft = getContract({ client, chain: MONAD, address: NFT_ADDRESS, abi: NFT_ABI });
      const mkt = getContract({ client, chain: MONAD, address: MARKETPLACE_ADDRESS, abi: MARKETPLACE_ABI });

      // 1. Get total supply
      let nextId = BigInt(SCAN_LIMIT);
      try {
        nextId = await readContract({ contract: nft, method: "nextId", params: [] });
      } catch {}
      const total = Number(nextId);

      // 2. Check all listings in parallel batches
      const BATCH = 20;
      const listed = [];
      for (let start = 0; start < total; start += BATCH) {
        if (abortRef.current.signal.aborted) break;
        const end = Math.min(start + BATCH, total);
        const ids = Array.from({ length: end - start }, (_, i) => start + i);
        const results = await Promise.allSettled(
          ids.map(id =>
            readContract({ contract: mkt, method: "listings", params: [BigInt(id)] })
              .then(d => ({ id, seller: d[0], price: formatEther(d[1]), active: d[2] }))
          )
        );
        for (const r of results) {
          if (r.status === "fulfilled" && r.value.active) {
            listed.push(r.value);
          }
        }
      }

      if (abortRef.current.signal.aborted) return;

      // 3. Set placeholder items immediately so grid appears
      setItems(listed.map(l => ({ ...l, meta: null, metaLoading: true })));
      setLoading(false);

      // 4. Fetch metadata progressively
      for (const l of listed) {
        if (abortRef.current.signal.aborted) break;
        const meta = await fetchMeta(l.id, nft);
        setItems(prev => prev.map(item =>
          item.id === l.id ? { ...item, meta, metaLoading: false } : item
        ));
      }
    } catch (e) {
      if (!abortRef.current?.signal.aborted) {
        setError(e.message || "Failed to load gallery");
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadGallery();
    return () => abortRef.current?.abort();
  }, [loadGallery]);

  /* ── Filtering & sorting ──────────────────────────────────── */
  const visible = items
    .filter(item => {
      if (filter === "mine" && account) {
        return item.seller.toLowerCase() === account.address.toLowerCase();
      }
      return true;
    })
    .filter(item => {
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        String(item.id).includes(q) ||
        item.meta?.name?.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      if (sortBy === "price") return parseFloat(a.price) - parseFloat(b.price);
      return a.id - b.id;
    });

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <div className="fade-in">
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
        <div>
          <h2 style={{ fontFamily: "Cinzel, serif", fontWeight: 700, fontSize: "18px", color: "var(--gold)", letterSpacing: "3px", marginBottom: "3px" }}>
            ◈ NFT GALLERY
          </h2>
          <p style={{ fontSize: "10px", color: "var(--text2)", letterSpacing: "1px" }}>
            {loading ? "Scanning blockchain…" : `${items.length} NFTs listed · ${visible.length} shown`}
          </p>
        </div>
        <button
          className="btn btn-ghost"
          style={{ fontSize: "10px", padding: "8px 14px" }}
          onClick={loadGallery}
          disabled={loading}
        >
          {loading ? "⟳ Loading…" : "↻ Refresh"}
        </button>
      </div>

      {/* Filter bar */}
      <div className="filter-bar">
        {/* Search */}
        <input
          className="field-input"
          placeholder="Search by name or ID…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ flex: "1 1 180px", minWidth: "160px", padding: "7px 12px", fontSize: "11px", marginBottom: 0 }}
        />

        {/* Filter chips */}
        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
          {["all", "mine"].map(f => (
            <button
              key={f}
              className={`filter-chip ${filter === f ? "active" : ""}`}
              onClick={() => setFilter(f)}
              disabled={f === "mine" && !account}
            >
              {f === "all" ? "All Listings" : "My Listings"}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
          style={{
            background: "var(--dark2)", border: "1px solid var(--border)",
            borderRadius: "6px", color: "var(--text2)", fontSize: "10px",
            padding: "6px 10px", outline: "none", cursor: "pointer",
          }}
        >
          <option value="price">↑ Price</option>
          <option value="id">↑ Token ID</option>
        </select>
      </div>

      {/* Skeleton loading state */}
      {loading && (
        <div className="nft-gallery-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <NFTCard key={i} loading index={i} />
          ))}
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <div style={{ background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "12px", padding: "20px", textAlign: "center" }}>
          <div style={{ color: "var(--red)", fontSize: "13px", marginBottom: "10px" }}>✕ {error}</div>
          <button className="btn btn-ghost" onClick={loadGallery} style={{ fontSize: "10px" }}>↻ Try Again</button>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && visible.length === 0 && (
        <div className="empty-state">
          <div className="empty-state__icon">◈</div>
          <div className="empty-state__title">
            {items.length === 0 ? "No NFTs Listed" : "No Results"}
          </div>
          <div className="empty-state__sub">
            {items.length === 0
              ? "Be the first to list an NFT on the marketplace."
              : "Try a different search or filter."}
          </div>
        </div>
      )}

      {/* Gallery grid */}
      {!loading && visible.length > 0 && (
        <div className="nft-gallery-grid">
          {visible.map((item, i) => (
            <NFTCard
              key={item.id}
              tokenId={item.id}
              price={item.price}
              seller={item.seller}
              meta={item.meta}
              loading={item.metaLoading}
              index={i}
              onBuy={onBuyRequest}
              onSelect={setSelected}
            />
          ))}
        </div>
      )}

      {/* Floor price footer */}
      {!loading && visible.length > 1 && (
        <div style={{ marginTop: "20px", padding: "12px 18px", background: "var(--card)", border: "1px solid var(--border)", borderRadius: "10px", display: "flex", gap: "24px", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: "9px", color: "var(--text2)", letterSpacing: "2px", marginBottom: "3px" }}>FLOOR PRICE</div>
            <div style={{ fontFamily: "Cinzel, serif", fontSize: "16px", fontWeight: 700, color: "var(--green)" }}>
              {Math.min(...visible.map(v => parseFloat(v.price))).toFixed(4)} <span style={{ fontSize: "11px", color: "var(--text2)" }}>MON</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: "9px", color: "var(--text2)", letterSpacing: "2px", marginBottom: "3px" }}>LISTED</div>
            <div style={{ fontFamily: "Cinzel, serif", fontSize: "16px", fontWeight: 700, color: "var(--gold)" }}>{visible.length}</div>
          </div>
          <div>
            <div style={{ fontSize: "9px", color: "var(--text2)", letterSpacing: "2px", marginBottom: "3px" }}>HIGHEST PRICE</div>
            <div style={{ fontFamily: "Cinzel, serif", fontSize: "16px", fontWeight: 700, color: "var(--blue)" }}>
              {Math.max(...visible.map(v => parseFloat(v.price))).toFixed(4)} <span style={{ fontSize: "11px", color: "var(--text2)" }}>MON</span>
            </div>
          </div>
        </div>
      )}

      {/* Detail modal */}
      <NFTDetailModal
        item={selected}
        onClose={() => setSelected(null)}
        onBuy={item => { onBuyRequest?.(item); setSelected(null); }}
      />
    </div>
  );
}
