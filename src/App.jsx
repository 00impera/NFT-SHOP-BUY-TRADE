// ── CHANGES TO MAKE IN App.jsx ──────────────────────────────────────────
//
// 1. Import NFTGallery at the top:
import NFTGallery from "./NFTGallery.jsx";
//
// 2. Add "gallery" to the nav buttons array (around line 38):
//    Change:
//    [["market","◈ MARKET"],["vault","⬡ VAULT GAME"]]
//    To:
//    [["market","◈ MARKET"],["gallery","⬢ GALLERY"],["vault","⬡ VAULT GAME"]]
//
// 3. Add gallery page render (after the vault line, around line 73):
//    {page === "gallery" && <GalleryPage account={account} setPage={setPage} />}
//
// 4. Add the GalleryPage component anywhere in the file:

function GalleryPage({ account, setPage }) {
  // When user clicks "Buy" on a gallery card, switch to market tab
  function handleBuyRequest({ tokenId }) {
    setPage("market");
    // Optionally: you can pass tokenId to Marketplace via context/state
  }

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 24px 64px", position: "relative", zIndex: 1 }}>
      <NFTGallery account={account} onBuyRequest={handleBuyRequest} />
    </div>
  );
}

// ── FULL UPDATED NAV SECTION (replace the nav buttons div) ──────────────
// Replace just the buttons array with this:
{[["market","◈ MARKET"],["gallery","⬢ GALLERY"],["vault","⬡ VAULT GAME"]].map(([id,label]) => (
  <button key={id} onClick={() => setPage(id)} style={{
    background: page===id ? "rgba(201,168,76,0.12)" : "transparent",
    border: `1px solid ${page===id ? "#c9a84c" : "#0a2a3a"}`,
    borderRadius:"8px", padding:"7px 14px",
    color: page===id ? "#c9a84c" : "#2a6a8a",
    fontSize:"11px", letterSpacing:"1.5px",
    transition: "all 0.15s",
  }}
    onMouseEnter={e => { if(page!==id) { e.currentTarget.style.borderColor="#1a4a6a"; e.currentTarget.style.color="#4a8aaa"; }}}
    onMouseLeave={e => { if(page!==id) { e.currentTarget.style.borderColor="#0a2a3a"; e.currentTarget.style.color="#2a6a8a"; }}}
  >{label}</button>
))}
