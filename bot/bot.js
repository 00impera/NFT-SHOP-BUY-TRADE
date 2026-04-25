const TelegramBot = require("node-telegram-bot-api");

const TOKEN = process.env.BOT_TOKEN;
const WEBAPP_URL = process.env.WEBAPP_URL || "https://nft-shop-buy-trade.pages.dev";

if (!TOKEN) {
  console.error("❌ BOT_TOKEN environment variable is missing!");
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: true });

console.log("🤖 BuyTradeNFT_Bot is running...");

// ── /start ──
bot.onText(/\/start/, (msg) => {
  const name = msg.from.first_name || "Trader";
  bot.sendPhoto(
    msg.chat.id,
    "https://raw.githubusercontent.com/00impera/winnowin/b01f15ef4c94f40439e554c14712b4878669f624/SEIF_3.png",
    {
      caption:
        `🔥 *Welcome to MONADEX, ${name}!*\n\n` +
        `The #1 NFT Marketplace + Vault Game on *Monad Mainnet*.\n\n` +
        `🛒 *Buy & Sell* NFTs peer-to-peer\n` +
        `⇄ *Trade* NFTs with other players\n` +
        `⬡ *Vault Game* — crack the code, win the pool!\n` +
        `💳 Buy MON with card or bridge from any chain\n\n` +
        `👇 Tap below to open the app:`,
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "🚀 Open MONADEX App",
              web_app: { url: WEBAPP_URL },
            },
          ],
          [
            {
              text: "⬡ Vault Game",
              web_app: { url: `${WEBAPP_URL}?page=vault` },
            },
            {
              text: "◈ Marketplace",
              web_app: { url: `${WEBAPP_URL}?page=market` },
            },
          ],
          [
            {
              text: "📢 Community",
              url: "https://t.me/BuyTradeNFT_Bot",
            },
          ],
        ],
      },
    }
  );
});

// ── /market ──
bot.onText(/\/market/, (msg) => {
  bot.sendMessage(msg.chat.id, "🛒 *NFT Marketplace*\n\nBuy, sell and trade NFTs on Monad.", {
    parse_mode: "Markdown",
    reply_markup: {
      inline_keyboard: [
        [{ text: "◈ Open Marketplace", web_app: { url: `${WEBAPP_URL}?page=market` } }],
      ],
    },
  });
});

// ── /vault ──
bot.onText(/\/vault/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `⬡ *VAULT GAME*\n\n` +
      `Buy a key, spin the wheel, crack the 4-digit code!\n\n` +
      `🗝️ Bronze — *100 MON*\n` +
      `🔑 Silver — *500 MON*\n` +
      `🏆 Gold — *1,000 MON*\n` +
      `💎 Platinum — *10,000 MON*\n\n` +
      `Each key gives you *4 attempts*. Crack it → win the full pool!`,
    {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [{ text: "⬡ Play Vault Game", web_app: { url: `${WEBAPP_URL}?page=vault` } }],
        ],
      },
    }
  );
});

// ── /help ──
bot.onText(/\/help/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `*MONADEX Bot Commands*\n\n` +
      `/start — Welcome + open app\n` +
      `/market — Open NFT Marketplace\n` +
      `/vault — Open Vault Game\n` +
      `/pools — Live vault pool sizes\n` +
      `/contracts — Smart contract addresses\n` +
      `/help — Show this menu`,
    { parse_mode: "Markdown" }
  );
});

// ── /contracts ──
bot.onText(/\/contracts/, (msg) => {
  bot.sendMessage(
    msg.chat.id,
    `*📋 Smart Contracts (Monad Mainnet)*\n\n` +
      `*NFT Contract:*\n\`0x45336C2E15F2fe58c67Ee4035a520231b2751669\`\n\n` +
      `*Marketplace:*\n\`0x4b2D922a3e0Fca29A4DC1Fa3936DdAc142074069\`\n\n` +
      `*Vault Game:*\n\`0x9d5aD64997C26ca505f11fDE71789eb3c664EE60\`\n\n` +
      `🔍 [View on Monadscan](https://monadscan.com)`,
    { parse_mode: "Markdown", disable_web_page_preview: true }
  );
});

// ── /pools ──
bot.onText(/\/pools/, async (msg) => {
  const loadMsg = await bot.sendMessage(msg.chat.id, "⏳ Fetching live pool data...");
  try {
    const { createPublicClient, http, parseAbi } = require("viem");
    const monad = {
      id: 143,
      name: "Monad Mainnet",
      nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
      rpcUrls: { default: { http: ["https://rpc.monad.xyz"] } },
    };
    const publicClient = createPublicClient({ chain: monad, transport: http() });
    const data = await publicClient.readContract({
      address: "0x9d5aD64997C26ca505f11fDE71789eb3c664EE60",
      abi: parseAbi(["function getAllPools() view returns (uint256,uint256,uint256,uint256)"]),
      functionName: "getAllPools",
    });
    const fmt = (v) => (parseFloat(v.toString()) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 });
    await bot.editMessageText(
      `⬡ *LIVE VAULT POOLS*\n\n` +
        `🗝️ Bronze Vault: *${fmt(data[0])} MON*\n` +
        `🔑 Silver Vault: *${fmt(data[1])} MON*\n` +
        `🏆 Gold Vault:   *${fmt(data[2])} MON*\n` +
        `💎 Platinum:     *${fmt(data[3])} MON*\n\n` +
        `_Updated just now_`,
      { chat_id: msg.chat.id, message_id: loadMsg.message_id, parse_mode: "Markdown",
        reply_markup: { inline_keyboard: [[{ text: "⬡ Play Now", web_app: { url: `${WEBAPP_URL}?page=vault` } }]] } }
    );
  } catch (e) {
    await bot.editMessageText(
      `⬡ *VAULT POOLS*\n\n🗝️ Bronze · 🔑 Silver · 🏆 Gold · 💎 Platinum\n\n_Open the app to see live data_`,
      { chat_id: msg.chat.id, message_id: loadMsg.message_id, parse_mode: "Markdown",
        reply_markup: { inline_keyboard: [[{ text: "⬡ Open App", web_app: { url: WEBAPP_URL } }]] } }
    );
  }
});

// ── Handle webapp data ──
bot.on("web_app_data", (msg) => {
  const data = msg.web_app_data?.data;
  if (data) {
    try {
      const parsed = JSON.parse(data);
      bot.sendMessage(msg.chat.id, `✅ Action received: ${JSON.stringify(parsed, null, 2)}`);
    } catch {
      bot.sendMessage(msg.chat.id, `✅ Data received from app.`);
    }
  }
});

// ── Error handling ──
bot.on("polling_error", (err) => {
  console.error("Polling error:", err.message);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled rejection:", err);
});
