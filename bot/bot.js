const TelegramBot = require("node-telegram-bot-api");
const http = require("http");

const TOKEN      = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || "https://nft-shop-buy-trade.pages.dev";

if (!TOKEN) { console.error("❌ BOT_TOKEN missing!"); process.exit(1); }

const bot = new TelegramBot(TOKEN, { polling: true });

// ── HTTP server keeps Render Web Service alive ──
http.createServer((req, res) => res.end("🤖 BuyTradeNFT Bot running!")).listen(process.env.PORT || 3000);

process.on("unhandledRejection", err => console.error("Rejection:", err.message));
process.on("uncaughtException",  err => console.error("Exception:",  err.message));

console.log("🤖 BuyTradeNFT_Bot is running...");

const NFT_ADDR         = "0x45336C2E15F2fe58c67Ee4035a520231b2751669";
const MARKETPLACE_ADDR = "0x4b2D922a3e0Fca29A4DC1Fa3936DdAc142074069";
const VAULT_ADDR       = "0x9d5aD64997C26ca505f11fDE71789eb3c664EE60";

async function fetchPools() {
  try {
    const r = await fetch("https://rpc.monad.xyz", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc:"2.0", id:1, method:"eth_call", params:[{ to:VAULT_ADDR, data:"0x8a4d31bd" },"latest"] }),
    });
    const d = await r.json();
    if (!d.result || d.result === "0x") return null;
    const clean = d.result.slice(2);
    const fmt = hex => (Number(BigInt("0x"+hex)) / 1e18).toLocaleString(undefined,{maximumFractionDigits:2});
    return { bronze:fmt(clean.slice(0,64)), silver:fmt(clean.slice(64,128)), gold:fmt(clean.slice(128,192)), platinum:fmt(clean.slice(192,256)) };
  } catch { return null; }
}

const MAIN_TEXT = name =>
  `🔥 *Welcome to MONADEX${name?", "+name:""}!*\n\n` +
  `The #1 NFT Marketplace + Vault Game on *Monad Mainnet*.\n\n` +
  `🛒 *Buy & Sell* NFTs peer-to-peer\n` +
  `⇄ *Trade* NFTs with other players\n` +
  `⬡ *Vault Game* — crack the code, win the pool!\n` +
  `💳 Buy MON with card or bridge any chain\n\n` +
  `👇 Tap below to open the app:`;

const MAIN_KB = { inline_keyboard: [
  [{ text:"🚀 Open MONADEX App", web_app:{ url:WEBAPP_URL } }],
  [{ text:"⬡ Vault Game", web_app:{ url:`${WEBAPP_URL}?page=vault` } }, { text:"◈ Marketplace", web_app:{ url:`${WEBAPP_URL}?page=market` } }],
  [{ text:"💰 Live Pools", callback_data:"pools" }, { text:"📋 Contracts", callback_data:"contracts" }],
  [{ text:"🔗 All Links", callback_data:"links" }, { text:"❓ Help", callback_data:"help" }],
]};

bot.onText(/\/start/, msg => {
  const name = msg.from.first_name || "";
  bot.sendPhoto(msg.chat.id, "https://raw.githubusercontent.com/00impera/winnowin/b01f15ef4c94f40439e554c14712b4878669f624/SEIF_3.png",
    { caption:MAIN_TEXT(name), parse_mode:"Markdown", reply_markup:MAIN_KB }
  ).catch(() => bot.sendMessage(msg.chat.id, MAIN_TEXT(name), { parse_mode:"Markdown", reply_markup:MAIN_KB }));
});

bot.onText(/\/menu/,  msg => bot.sendMessage(msg.chat.id, MAIN_TEXT(""), { parse_mode:"Markdown", reply_markup:MAIN_KB }));

bot.onText(/\/market/, msg => bot.sendMessage(msg.chat.id,
  `◈ *NFT MARKETPLACE*\n\n🛒 Buy NFTs\n⬆️ List for sale\n⇄ Trade P2P\n✕ Cancel listings\n\n🌐 [nft-shop-buy-trade.pages.dev](${WEBAPP_URL})`,
  { parse_mode:"Markdown", disable_web_page_preview:true, reply_markup:{ inline_keyboard:[
    [{ text:"◈ Open Marketplace", web_app:{ url:`${WEBAPP_URL}?page=market` } }],
    [{ text:"🏠 Main Menu", callback_data:"main_menu" }],
  ]}}
));

bot.onText(/\/vault/, msg => bot.sendMessage(msg.chat.id,
  `⬡ *VAULT GAME*\n\nBuy a key, spin the wheel, crack the 4-digit code!\n\n🗝️ Bronze   — *100 MON*\n🔑 Silver   — *500 MON*\n🏆 Gold     — *1,000 MON*\n💎 Platinum — *10,000 MON*\n\nEach key = *4 attempts*. Crack it → win the pool! 🎉`,
  { parse_mode:"Markdown", reply_markup:{ inline_keyboard:[
    [{ text:"⬡ Play Vault Game", web_app:{ url:`${WEBAPP_URL}?page=vault` } }],
    [{ text:"💰 Live Pool Sizes", callback_data:"pools" }],
    [{ text:"🏠 Main Menu", callback_data:"main_menu" }],
  ]}}
));

bot.onText(/\/pools/, async msg => {
  const loading = await bot.sendMessage(msg.chat.id, "⏳ Fetching live vault pools...");
  const p = await fetchPools();
  const text = p
    ? `⬡ *LIVE VAULT POOLS*\n\n🗝️ Bronze:   *${p.bronze} MON*\n🔑 Silver:   *${p.silver} MON*\n🏆 Gold:     *${p.gold} MON*\n💎 Platinum: *${p.platinum} MON*\n\n_Updated just now_`
    : `⬡ *VAULT POOLS*\n\n_Open the app to see live data_`;
  await bot.editMessageText(text, { chat_id:msg.chat.id, message_id:loading.message_id, parse_mode:"Markdown",
    reply_markup:{ inline_keyboard:[[{ text:"⬡ Play Now", web_app:{ url:`${WEBAPP_URL}?page=vault` } }],[{ text:"🔄 Refresh", callback_data:"pools" }],[{ text:"🏠 Main Menu", callback_data:"main_menu" }]]}
  }).catch(()=>{});
});

bot.onText(/\/contracts/, msg => bot.sendMessage(msg.chat.id,
  `📋 *Smart Contracts — Monad Mainnet*\n\n*NFT:*\n\`${NFT_ADDR}\`\n\n*Marketplace:*\n\`${MARKETPLACE_ADDR}\`\n\n*Vault Game:*\n\`${VAULT_ADDR}\`\n\n🔍 [Monadscan](https://monadscan.com)`,
  { parse_mode:"Markdown", disable_web_page_preview:true, reply_markup:{ inline_keyboard:[[{ text:"🏠 Main Menu", callback_data:"main_menu" }]]}}
));

bot.onText(/\/links/, msg => bot.sendMessage(msg.chat.id,
  `🔗 *MONADEX Links*\n\n🌐 [Open App](${WEBAPP_URL})\n🛒 [Marketplace](${WEBAPP_URL}?page=market)\n⬡ [Vault Game](${WEBAPP_URL}?page=vault)\n💳 [Buy MON with Card](${WEBAPP_URL})\n🌉 [Bridge MON](${WEBAPP_URL})\n🔍 [Monadscan](https://monadscan.com)`,
  { parse_mode:"Markdown", disable_web_page_preview:true, reply_markup:{ inline_keyboard:[[{ text:"🚀 Open App", web_app:{ url:WEBAPP_URL } }],[{ text:"🏠 Main Menu", callback_data:"main_menu" }]]}}
));

bot.onText(/\/help/, msg => bot.sendMessage(msg.chat.id,
  `❓ *MONADEX Bot Commands*\n\n/start — Welcome + open app\n/menu — Main menu\n/market — NFT Marketplace\n/vault — Vault Game\n/pools — Live vault pool sizes\n/contracts — Smart contracts\n/links — All website links\n/help — This menu`,
  { parse_mode:"Markdown", reply_markup:{ inline_keyboard:[[{ text:"🚀 Open App", web_app:{ url:WEBAPP_URL } }],[{ text:"🏠 Main Menu", callback_data:"main_menu" }]]}}
));

bot.on("callback_query", async query => {
  const data = query.data, chatId = query.message.chat.id;
  try { await bot.answerCallbackQuery(query.id); } catch(e) {}

  if (data === "main_menu") { bot.sendMessage(chatId, MAIN_TEXT(""), { parse_mode:"Markdown", reply_markup:MAIN_KB }); return; }

  if (data === "pools") {
    const loading = await bot.sendMessage(chatId, "⏳ Fetching live vault pools...");
    const p = await fetchPools();
    const text = p
      ? `⬡ *LIVE VAULT POOLS*\n\n🗝️ Bronze:   *${p.bronze} MON*\n🔑 Silver:   *${p.silver} MON*\n🏆 Gold:     *${p.gold} MON*\n💎 Platinum: *${p.platinum} MON*\n\n_Updated just now_`
      : `⬡ *VAULT POOLS*\n\n_Open the app to see live data_`;
    await bot.editMessageText(text, { chat_id:chatId, message_id:loading.message_id, parse_mode:"Markdown",
      reply_markup:{ inline_keyboard:[[{ text:"⬡ Play Now", web_app:{ url:`${WEBAPP_URL}?page=vault` } }],[{ text:"🔄 Refresh", callback_data:"pools" }],[{ text:"🏠 Main Menu", callback_data:"main_menu" }]]}
    }).catch(()=>{});
    return;
  }

  if (data === "contracts") {
    bot.sendMessage(chatId,
      `📋 *Smart Contracts — Monad Mainnet*\n\n*NFT:*\n\`${NFT_ADDR}\`\n\n*Marketplace:*\n\`${MARKETPLACE_ADDR}\`\n\n*Vault Game:*\n\`${VAULT_ADDR}\`\n\n🔍 [Monadscan](https://monadscan.com)`,
      { parse_mode:"Markdown", disable_web_page_preview:true, reply_markup:{ inline_keyboard:[[{ text:"🏠 Main Menu", callback_data:"main_menu" }]]}}
    ); return;
  }

  if (data === "links") {
    bot.sendMessage(chatId,
      `🔗 *MONADEX Links*\n\n🌐 [Open App](${WEBAPP_URL})\n🛒 [Marketplace](${WEBAPP_URL}?page=market)\n⬡ [Vault Game](${WEBAPP_URL}?page=vault)\n💳 [Buy MON with Card](${WEBAPP_URL})\n🌉 [Bridge MON](${WEBAPP_URL})\n🔍 [Monadscan](https://monadscan.com)`,
      { parse_mode:"Markdown", disable_web_page_preview:true, reply_markup:{ inline_keyboard:[[{ text:"🚀 Open App", web_app:{ url:WEBAPP_URL } }],[{ text:"🏠 Main Menu", callback_data:"main_menu" }]]}}
    ); return;
  }

  if (data === "help") {
    bot.sendMessage(chatId,
      `❓ *MONADEX Bot Commands*\n\n/start — Welcome + open app\n/menu — Main menu\n/market — NFT Marketplace\n/vault — Vault Game\n/pools — Live vault pool sizes\n/contracts — Smart contracts\n/links — All website links\n/help — This menu`,
      { parse_mode:"Markdown", reply_markup:{ inline_keyboard:[[{ text:"🚀 Open App", web_app:{ url:WEBAPP_URL } }],[{ text:"🏠 Main Menu", callback_data:"main_menu" }]]}}
    ); return;
  }
});

bot.on("web_app_data", msg => {
  try { bot.sendMessage(msg.chat.id, `✅ Action: ${JSON.stringify(JSON.parse(msg.web_app_data.data), null, 2)}`); }
  catch { bot.sendMessage(msg.chat.id, `✅ Data received from app.`); }
});

bot.on("polling_error", err => console.error("Polling error:", err.message));
