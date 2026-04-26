const TelegramBot = require("node-telegram-bot-api");
const http        = require("http");

/* ── ENV ─────────────────────────────────────────────────────────── */
const TOKEN      = process.env.BOT_TOKEN;
const WEBAPP_URL = (process.env.WEBAPP_URL || "https://nft-shop-buy-trade.pages.dev").replace(/\/$/, "");
const PORT       = process.env.PORT || 3000;

if (!TOKEN) { console.error("❌ BOT_TOKEN missing!"); process.exit(1); }

/* ── Contracts ───────────────────────────────────────────────────── */
const NFT_ADDR         = "0x45336C2E15F2fe58c67Ee4035a520231b2751669";
const MARKETPLACE_ADDR = "0x4b2D922a3e0Fca29A4DC1Fa3936DdAc142074069";
const VAULT_ADDR       = "0x9d5aD64997C26ca505f11fDE71789eb3c664EE60";
const RPC_URL          = "https://rpc.monad.xyz";
const EXPLORER         = "https://monadscan.com";
const VAULT_IMAGE      = "https://raw.githubusercontent.com/00impera/winnowin/b01f15ef4c94f40439e554c14712b4878669f624/SEIF_3.png";

/* ── Bot ─────────────────────────────────────────────────────────── */
const bot = new TelegramBot(TOKEN, {
  polling: {
    interval: 300,
    autoStart: true,
    params: { timeout: 10, allowed_updates: ["message","callback_query","web_app_data"] },
  },
});

/* ── Health server ───────────────────────────────────────────────── */
http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok", uptime: Math.floor(process.uptime()), pools: poolCache.data ? "cached" : "empty" }));
}).listen(PORT, () => console.log(`🌐 Health server on :${PORT}`));

/* ── RPC helper ──────────────────────────────────────────────────── */
async function rpcCall(method, params, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      if (d.error) throw new Error(d.error.message);
      return d.result;
    } catch (e) {
      if (i === retries - 1) throw e;
      await sleep(500 * (i + 1));
    }
  }
}

/* ── Pool cache (30s TTL) ────────────────────────────────────────── */
const poolCache = { data: null, ts: 0, TTL: 30_000 };

async function fetchPools(force = false) {
  const now = Date.now();
  if (!force && poolCache.data && now - poolCache.ts < poolCache.TTL) {
    return poolCache.data;
  }
  try {
    const result = await rpcCall("eth_call", [{ to: VAULT_ADDR, data: "0x8a4d31bd" }, "latest"]);
    if (!result || result === "0x") return null;
    const clean = result.slice(2).padStart(256, "0");
    const fmt   = hex => (Number(BigInt("0x" + hex)) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 3 });
    const data  = {
      bronze:   fmt(clean.slice(0,   64)),
      silver:   fmt(clean.slice(64,  128)),
      gold:     fmt(clean.slice(128, 192)),
      platinum: fmt(clean.slice(192, 256)),
    };
    poolCache.data = data;
    poolCache.ts   = now;
    return data;
  } catch (e) {
    console.error("fetchPools error:", e.message);
    return poolCache.data || null; // return stale if available
  }
}

/* ── Marketplace stats (MON balance) ─────────────────────────────── */
const statsCache = { data: null, ts: 0, TTL: 60_000 };

async function fetchMarketStats(force = false) {
  const now = Date.now();
  if (!force && statsCache.data && now - statsCache.ts < statsCache.TTL) return statsCache.data;
  try {
    const result = await rpcCall("eth_getBalance", [MARKETPLACE_ADDR, "latest"]);
    const mon = (Number(BigInt(result)) / 1e18).toFixed(4);
    statsCache.data = { vaultPool: mon };
    statsCache.ts   = now;
    return statsCache.data;
  } catch { return statsCache.data || null; }
}

/* ── Warm cache on startup ───────────────────────────────────────── */
Promise.all([fetchPools(), fetchMarketStats()])
  .then(() => console.log("✅ Cache warmed"))
  .catch(() => {});

/* ── Helpers ─────────────────────────────────────────────────────── */
const sleep = ms => new Promise(r => setTimeout(r, ms));

function shortAddr(addr) {
  return addr.slice(0, 8) + "…" + addr.slice(-6);
}

function formatPoolText(p, stale = false) {
  const tag = stale ? " _(cached)_" : " _— live_";
  return (
    `⬡ *LIVE VAULT POOLS*${tag}\n\n` +
    `🗝️ Bronze:    *${p.bronze} MON*\n` +
    `🔑 Silver:    *${p.silver} MON*\n` +
    `🏆 Gold:      *${p.gold} MON*\n` +
    `💎 Platinum:  *${p.platinum} MON*`
  );
}

/* ── Keyboards ───────────────────────────────────────────────────── */
const KB = {
  main: { inline_keyboard: [
    [{ text: "🚀 Open MONADEX App", web_app: { url: WEBAPP_URL } }],
    [
      { text: "⬡ Vault Game",  web_app: { url: `${WEBAPP_URL}?page=vault`  } },
      { text: "◈ Marketplace", web_app: { url: `${WEBAPP_URL}?page=market` } },
      { text: "⬢ Gallery",     web_app: { url: `${WEBAPP_URL}?page=gallery` } },
    ],
    [
      { text: "💰 Live Pools",  callback_data: "pools"     },
      { text: "📊 Stats",       callback_data: "stats"     },
      { text: "📋 Contracts",   callback_data: "contracts" },
    ],
    [
      { text: "🔗 Links",       callback_data: "links" },
      { text: "❓ Help",        callback_data: "help"  },
    ],
  ]},

  backToMain: { inline_keyboard: [
    [{ text: "🏠 Main Menu", callback_data: "main_menu" }],
  ]},

  poolsKb: { inline_keyboard: [
    [{ text: "⬡ Play Vault Game", web_app: { url: `${WEBAPP_URL}?page=vault` } }],
    [{ text: "🔄 Refresh", callback_data: "pools_refresh" }, { text: "🏠 Main Menu", callback_data: "main_menu" }],
  ]},
};

/* ── Message templates ───────────────────────────────────────────── */
function welcomeText(name) {
  return (
    `🔥 *Welcome to MONADEX${name ? ", " + name : ""}!*\n\n` +
    `The #1 NFT Marketplace \\+ Vault Game on *Monad Mainnet*\\.\n\n` +
    `🛒 *Buy & Sell* NFTs peer\\-to\\-peer\n` +
    `⇄ *Trade* NFTs with other players\n` +
    `⬡ *Vault Game* — crack the code, win the pool\\!\n` +
    `💳 Buy MON with card or bridge any chain\n\n` +
    `👇 Tap below to open the app:`
  );
}

/* ── Rate limiter (per user) ─────────────────────────────────────── */
const rateLimiter = new Map();
function isRateLimited(userId, limitMs = 1500) {
  const now = Date.now();
  const last = rateLimiter.get(userId) || 0;
  if (now - last < limitMs) return true;
  rateLimiter.set(userId, now);
  return false;
}
// Clean up rate limiter every 5 min
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [k, v] of rateLimiter) if (v < cutoff) rateLimiter.delete(k);
}, 300_000);

/* ── Safe send helpers ───────────────────────────────────────────── */
async function safeSend(chatId, text, opts = {}) {
  try {
    return await bot.sendMessage(chatId, text, { parse_mode: "Markdown", ...opts });
  } catch (e) {
    console.error(`safeSend(${chatId}):`, e.message);
  }
}

async function safeEdit(chatId, msgId, text, opts = {}) {
  try {
    return await bot.editMessageText(text, { chat_id: chatId, message_id: msgId, parse_mode: "Markdown", ...opts });
  } catch (e) {
    if (!e.message.includes("message is not modified")) {
      console.error(`safeEdit(${chatId}):`, e.message);
    }
  }
}

async function safePhoto(chatId, photo, opts = {}) {
  try {
    return await bot.sendPhoto(chatId, photo, { parse_mode: "Markdown", ...opts });
  } catch {
    return safeSend(chatId, opts.caption || "Welcome!", { parse_mode: "Markdown", reply_markup: opts.reply_markup });
  }
}

async function answerCb(queryId, text = "") {
  try { await bot.answerCallbackQuery(queryId, { text }); } catch {}
}

/* ════════════════════════════════════════════════════════════════════
   COMMANDS
   ════════════════════════════════════════════════════════════════════ */

bot.onText(/\/start/, async msg => {
  const name = msg.from?.first_name || "";
  await safePhoto(msg.chat.id, VAULT_IMAGE, {
    caption: `🔥 *Welcome to MONADEX${name ? ", " + name : ""}!*\n\nThe #1 NFT Marketplace + Vault Game on *Monad Mainnet*.\n\n🛒 Buy & Sell NFTs peer-to-peer\n⇄ Trade NFTs with other players\n⬡ Vault Game — crack the code, win the pool!\n💳 Buy MON with card or bridge any chain\n\n👇 Tap below to open the app:`,
    reply_markup: KB.main,
  });
});

bot.onText(/\/menu/, async msg => {
  await safeSend(msg.chat.id,
    `◈ *MONADEX — Main Menu*\n\nChoose an action below:`,
    { reply_markup: KB.main }
  );
});

bot.onText(/\/market/, async msg => {
  await safeSend(msg.chat.id,
    `◈ *NFT MARKETPLACE*\n\n🛒 *Buy* listed NFTs instantly\n⬆️ *Sell* — list your NFT for MON\n⇄ *Trade* — P2P NFT swaps\n⬢ *Gallery* — browse all listings\n✕ *Cancel* your listing anytime\n\n🌐 ${WEBAPP_URL}`,
    { disable_web_page_preview: true, reply_markup: { inline_keyboard: [
      [{ text: "◈ Open Marketplace", web_app: { url: `${WEBAPP_URL}?page=market` } }],
      [{ text: "⬢ Browse Gallery",   web_app: { url: `${WEBAPP_URL}?page=gallery` } }],
      [{ text: "🏠 Main Menu", callback_data: "main_menu" }],
    ]}}
  );
});

bot.onText(/\/vault/, async msg => {
  const p = await fetchPools();
  const poolLine = p
    ? `\n\n💰 *Current Pools:*\n🗝️ ${p.bronze} · 🔑 ${p.silver} · 🏆 ${p.gold} · 💎 ${p.platinum} MON`
    : "";
  await safeSend(msg.chat.id,
    `⬡ *VAULT GAME*\n\nBuy a key → Spin the wheel → Crack the 4-digit code → *Win the pool!*\n\n🗝️ Bronze    — *100 MON*   (4 attempts)\n🔑 Silver    — *500 MON*   (4 attempts)\n🏆 Gold      — *1,000 MON*  (4 attempts)\n💎 Platinum  — *10,000 MON* (4 attempts)${poolLine}`,
    { reply_markup: { inline_keyboard: [
      [{ text: "⬡ Play Vault Game", web_app: { url: `${WEBAPP_URL}?page=vault` } }],
      [{ text: "💰 Live Pool Sizes", callback_data: "pools" }],
      [{ text: "🏠 Main Menu", callback_data: "main_menu" }],
    ]}}
  );
});

bot.onText(/\/pools/, async msg => {
  const loading = await safeSend(msg.chat.id, "⏳ Fetching live vault pools…");
  if (!loading) return;
  const p = await fetchPools(true); // force fresh
  const text = p ? formatPoolText(p) : `⬡ *VAULT POOLS*\n\n_Could not fetch — open the app for live data._`;
  await safeEdit(msg.chat.id, loading.message_id, text, { reply_markup: KB.poolsKb });
});

bot.onText(/\/stats/, async msg => {
  const loading = await safeSend(msg.chat.id, "⏳ Fetching stats…");
  if (!loading) return;
  const s = await fetchMarketStats(true);
  const text = s
    ? `📊 *MONADEX STATS*\n\n💼 *Marketplace Vault Pool:* ${s.vaultPool} MON\n\n🔍 [View on Monadscan](${EXPLORER}/address/${MARKETPLACE_ADDR})`
    : `📊 *STATS*\n\n_Could not fetch — try again._`;
  await safeEdit(msg.chat.id, loading.message_id, text, {
    disable_web_page_preview: true,
    reply_markup: { inline_keyboard: [
      [{ text: "🔄 Refresh", callback_data: "stats_refresh" }],
      [{ text: "🏠 Main Menu", callback_data: "main_menu" }],
    ]},
  });
});

bot.onText(/\/contracts/, async msg => {
  await safeSend(msg.chat.id,
    `📋 *Smart Contracts — Monad Mainnet*\n\n` +
    `*NFT Contract:*\n\`${NFT_ADDR}\`\n\n` +
    `*Marketplace:*\n\`${MARKETPLACE_ADDR}\`\n\n` +
    `*Vault Game:*\n\`${VAULT_ADDR}\`\n\n` +
    `🔍 [Monadscan Explorer](${EXPLORER})`,
    { disable_web_page_preview: true, reply_markup: { inline_keyboard: [
      [{ text: `🔍 NFT Contract`,         url: `${EXPLORER}/address/${NFT_ADDR}` }],
      [{ text: `🔍 Marketplace Contract`,  url: `${EXPLORER}/address/${MARKETPLACE_ADDR}` }],
      [{ text: `🔍 Vault Contract`,        url: `${EXPLORER}/address/${VAULT_ADDR}` }],
      [{ text: "🏠 Main Menu", callback_data: "main_menu" }],
    ]}}
  );
});

bot.onText(/\/links/, async msg => {
  await safeSend(msg.chat.id,
    `🔗 *MONADEX Links*\n\n` +
    `🌐 [Open App](${WEBAPP_URL})\n` +
    `🛒 [Marketplace](${WEBAPP_URL}?page=market)\n` +
    `⬢ [NFT Gallery](${WEBAPP_URL}?page=gallery)\n` +
    `⬡ [Vault Game](${WEBAPP_URL}?page=vault)\n` +
    `💳 [Buy MON with Card](${WEBAPP_URL})\n` +
    `🌉 [Bridge MON](${WEBAPP_URL})\n` +
    `🔍 [Monadscan](${EXPLORER})`,
    { disable_web_page_preview: true, reply_markup: { inline_keyboard: [
      [{ text: "🚀 Open App", web_app: { url: WEBAPP_URL } }],
      [{ text: "🏠 Main Menu", callback_data: "main_menu" }],
    ]}}
  );
});

bot.onText(/\/help/, async msg => {
  await safeSend(msg.chat.id,
    `❓ *MONADEX Bot Commands*\n\n` +
    `/start — Welcome screen\n` +
    `/menu — Main menu\n` +
    `/market — NFT Marketplace info\n` +
    `/vault — Vault Game info + pools\n` +
    `/pools — Live vault pool balances\n` +
    `/stats — Marketplace statistics\n` +
    `/contracts — Smart contract addresses\n` +
    `/links — All useful links\n` +
    `/help — This help menu`,
    { reply_markup: { inline_keyboard: [
      [{ text: "🚀 Open App", web_app: { url: WEBAPP_URL } }],
      [{ text: "🏠 Main Menu", callback_data: "main_menu" }],
    ]}}
  );
});

/* ════════════════════════════════════════════════════════════════════
   CALLBACK QUERIES
   ════════════════════════════════════════════════════════════════════ */

const cbHandlers = {
  main_menu: async (query) => {
    await answerCb(query.id);
    await safeSend(query.message.chat.id,
      `◈ *MONADEX — Main Menu*\n\nChoose an action below:`,
      { reply_markup: KB.main }
    );
  },

  pools: async (query) => {
    await answerCb(query.id, "Fetching pools…");
    const loading = await safeSend(query.message.chat.id, "⏳ Fetching live vault pools…");
    if (!loading) return;
    const p = await fetchPools();
    const stale = p && Date.now() - poolCache.ts > poolCache.TTL;
    const text = p ? formatPoolText(p, stale) : `⬡ *VAULT POOLS*\n\n_Could not fetch — open the app for live data._`;
    await safeEdit(query.message.chat.id, loading.message_id, text, { reply_markup: KB.poolsKb });
  },

  pools_refresh: async (query) => {
    await answerCb(query.id, "Refreshing…");
    const p = await fetchPools(true);
    const text = p ? formatPoolText(p) : `⬡ *VAULT POOLS*\n\n_Could not fetch._`;
    await safeEdit(query.message.chat.id, query.message.message_id, text, { reply_markup: KB.poolsKb });
  },

  stats: async (query) => {
    await answerCb(query.id, "Loading stats…");
    const loading = await safeSend(query.message.chat.id, "⏳ Fetching stats…");
    if (!loading) return;
    const s = await fetchMarketStats();
    const text = s
      ? `📊 *MONADEX STATS*\n\n💼 *Marketplace Vault Pool:* ${s.vaultPool} MON\n\n🔍 [View on Monadscan](${EXPLORER}/address/${MARKETPLACE_ADDR})`
      : `📊 *STATS*\n\n_Could not fetch._`;
    await safeEdit(query.message.chat.id, loading.message_id, text, {
      disable_web_page_preview: true,
      reply_markup: { inline_keyboard: [
        [{ text: "🔄 Refresh", callback_data: "stats_refresh" }],
        [{ text: "🏠 Main Menu", callback_data: "main_menu" }],
      ]},
    });
  },

  stats_refresh: async (query) => {
    await answerCb(query.id, "Refreshing…");
    const s = await fetchMarketStats(true);
    const text = s
      ? `📊 *MONADEX STATS*\n\n💼 *Marketplace Vault Pool:* ${s.vaultPool} MON\n\n🔍 [View on Monadscan](${EXPLORER}/address/${MARKETPLACE_ADDR})`
      : `📊 *STATS*\n\n_Could not fetch._`;
    await safeEdit(query.message.chat.id, query.message.message_id, text, {
      disable_web_page_preview: true,
      reply_markup: { inline_keyboard: [
        [{ text: "🔄 Refresh", callback_data: "stats_refresh" }],
        [{ text: "🏠 Main Menu", callback_data: "main_menu" }],
      ]},
    });
  },

  contracts: async (query) => {
    await answerCb(query.id);
    await safeSend(query.message.chat.id,
      `📋 *Smart Contracts — Monad Mainnet*\n\n*NFT Contract:*\n\`${NFT_ADDR}\`\n\n*Marketplace:*\n\`${MARKETPLACE_ADDR}\`\n\n*Vault Game:*\n\`${VAULT_ADDR}\``,
      { disable_web_page_preview: true, reply_markup: { inline_keyboard: [
        [{ text: `🔍 NFT`,         url: `${EXPLORER}/address/${NFT_ADDR}` }],
        [{ text: `🔍 Marketplace`,  url: `${EXPLORER}/address/${MARKETPLACE_ADDR}` }],
        [{ text: `🔍 Vault`,        url: `${EXPLORER}/address/${VAULT_ADDR}` }],
        [{ text: "🏠 Main Menu", callback_data: "main_menu" }],
      ]}}
    );
  },

  links: async (query) => {
    await answerCb(query.id);
    await safeSend(query.message.chat.id,
      `🔗 *MONADEX Links*\n\n🌐 [App](${WEBAPP_URL}) · 🛒 [Market](${WEBAPP_URL}?page=market) · ⬢ [Gallery](${WEBAPP_URL}?page=gallery) · ⬡ [Vault](${WEBAPP_URL}?page=vault)`,
      { disable_web_page_preview: true, reply_markup: { inline_keyboard: [
        [{ text: "🚀 Open App", web_app: { url: WEBAPP_URL } }],
        [{ text: "🏠 Main Menu", callback_data: "main_menu" }],
      ]}}
    );
  },

  help: async (query) => {
    await answerCb(query.id);
    await safeSend(query.message.chat.id,
      `❓ *Commands:* /start /menu /market /vault /pools /stats /contracts /links /help`,
      { reply_markup: { inline_keyboard: [
        [{ text: "🚀 Open App", web_app: { url: WEBAPP_URL } }],
        [{ text: "🏠 Main Menu", callback_data: "main_menu" }],
      ]}}
    );
  },
};

bot.on("callback_query", async query => {
  const userId = query.from.id;
  if (isRateLimited(userId)) {
    try { await bot.answerCallbackQuery(query.id, { text: "⏳ Slow down a bit!", show_alert: false }); } catch {}
    return;
  }
  const handler = cbHandlers[query.data];
  if (handler) {
    try { await handler(query); }
    catch (e) { console.error(`CB handler [${query.data}] error:`, e.message); }
  } else {
    await answerCb(query.id);
  }
});

/* ── Web App data ──────────────────────────────────────────────────── */
bot.on("web_app_data", async msg => {
  try {
    const data = JSON.parse(msg.web_app_data.data);
    const action = data.action || "unknown";
    let reply = `✅ *Action received:* \`${action}\``;
    if (data.tokenId) reply += `\n🪙 Token: *#${data.tokenId}*`;
    if (data.price)   reply += `\n💰 Price: *${data.price} MON*`;
    await safeSend(msg.chat.id, reply, { reply_markup: KB.main });
  } catch {
    await safeSend(msg.chat.id, `✅ Action received from app.`, { reply_markup: KB.main });
  }
});

/* ── Error handlers ──────────────────────────────────────────────── */
bot.on("polling_error", err => {
  if (err.code === "ETELEGRAM" && err.message.includes("409")) {
    console.error("⚠️  Conflict: another bot instance is running!");
  } else {
    console.error("Polling error:", err.message);
  }
});

process.on("unhandledRejection", err => console.error("Unhandled rejection:", err?.message || err));
process.on("uncaughtException",  err => { console.error("Uncaught exception:", err.message); });

console.log("🤖 MONADEX Bot started — polling Telegram…");
