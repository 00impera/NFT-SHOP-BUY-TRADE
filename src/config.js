import { defineChain } from "thirdweb";

export const CLIENT_ID = "821819db832d1a313ae3b1a62fbeafb7";

export const MONAD = defineChain({
  id: 143,
  name: "Monad Mainnet",
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  rpc: "https://rpc.monad.xyz",
  blockExplorers: [{ name: "Monadscan", url: "https://monadscan.com" }],
});

export const NFT_ADDRESS         = "0x45336C2E15F2fe58c67Ee4035a520231b2751669";
export const MARKETPLACE_ADDRESS = "0x4b2D922a3e0Fca29A4DC1Fa3936DdAc142074069";
export const VAULT_ADDRESS       = "0x9d5aD64997C26ca505f11fDE71789eb3c664EE60";
export const TG_BOT_URL          = "https://t.me/BuyTradeNFT_Bot";

export const NEAR_JWT = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjIwMjUtMDEtMTItdjEifQ.eyJ2IjoxLCJrZXlfdHlwZSI6ImRpc3RyaWJ1dGlvbl9jaGFubmVsIiwicGFydG5lcl9pZCI6ImNyeXB0b2Nhc2gtbmZ0IiwiaWF0IjoxNzczMDc3MzExLCJleHAiOjE4MDQ2MTMzMTF9.Wi55S8cwVmAXPtOG0ymr7ldX-5CXVygzuanbjAAJHP-Am14_52C6i4cQG5FvjcAorw0KD8k8JD_YX5AM4QKhNqYtU5gsI4-KKe0KavO5_69NowzUKc_ubtjYn85eFjWskzZQvICMqSZkdGOSnMT_hNEePA8qYi_wSov4a4bQh4zIfNA0znEdDIV3rGI_bDM9dgOk0PnJRIpwi_aXOQ8Q4e50IO2UMrZEDtBVmUhK5-Mno3S_iS7tZl4QSui_4_bNCapQolFwUPB9Zqyxay_6rPVEr7j-8Ez5-htwkR5ZYvTb1mJaj3DVPpWPL9QTxhjvhbJ7nKrWpibcWX3AVoXZ6g";

export const NFT_ABI = [
  { inputs:[{internalType:"address",name:"owner_",type:"address"}], stateMutability:"nonpayable", type:"constructor" },
  { inputs:[{internalType:"address",name:"to",type:"address"},{internalType:"uint256",name:"tokenId",type:"uint256"}], name:"approve", outputs:[], stateMutability:"nonpayable", type:"function" },
  { inputs:[{internalType:"uint256",name:"tokenId",type:"uint256"}], name:"ownerOf", outputs:[{internalType:"address",name:"",type:"address"}], stateMutability:"view", type:"function" },
  { inputs:[{internalType:"uint256",name:"tokenId",type:"uint256"}], name:"getApproved", outputs:[{internalType:"address",name:"",type:"address"}], stateMutability:"view", type:"function" },
  { inputs:[{internalType:"address",name:"from",type:"address"},{internalType:"address",name:"to",type:"address"},{internalType:"uint256",name:"tokenId",type:"uint256"}], name:"transferFrom", outputs:[], stateMutability:"nonpayable", type:"function" },
  { inputs:[{internalType:"address",name:"to",type:"address"},{internalType:"uint256",name:"tokenId",type:"uint256"}], name:"mint", outputs:[], stateMutability:"nonpayable", type:"function" },
  { inputs:[{internalType:"address",name:"owner",type:"address"}], name:"balanceOf", outputs:[{internalType:"uint256",name:"",type:"uint256"}], stateMutability:"view", type:"function" },
];

export const MARKETPLACE_ABI = [
  { inputs:[{internalType:"uint256",name:"tokenId",type:"uint256"},{internalType:"uint256",name:"price",type:"uint256"}], name:"listForSale", outputs:[], stateMutability:"nonpayable", type:"function" },
  { inputs:[{internalType:"uint256",name:"tokenId",type:"uint256"}], name:"buy", outputs:[], stateMutability:"payable", type:"function" },
  { inputs:[{internalType:"uint256",name:"tokenId",type:"uint256"}], name:"cancelListing", outputs:[], stateMutability:"nonpayable", type:"function" },
  { inputs:[{internalType:"uint256",name:"yourTokenId",type:"uint256"},{internalType:"uint256",name:"wantedTokenId",type:"uint256"}], name:"offerTrade", outputs:[], stateMutability:"nonpayable", type:"function" },
  { inputs:[{internalType:"uint256",name:"offeredTokenId",type:"uint256"}], name:"acceptTrade", outputs:[], stateMutability:"nonpayable", type:"function" },
  { inputs:[{internalType:"uint256",name:"",type:"uint256"}], name:"listings", outputs:[{internalType:"address",name:"seller",type:"address"},{internalType:"uint256",name:"price",type:"uint256"},{internalType:"bool",name:"active",type:"bool"}], stateMutability:"view", type:"function" },
  { inputs:[{internalType:"uint256",name:"",type:"uint256"}], name:"tradeOffers", outputs:[{internalType:"address",name:"offerer",type:"address"},{internalType:"uint256",name:"offeredTokenId",type:"uint256"},{internalType:"uint256",name:"wantedTokenId",type:"uint256"},{internalType:"bool",name:"active",type:"bool"}], stateMutability:"view", type:"function" },
  { inputs:[], name:"withdrawFees", outputs:[], stateMutability:"nonpayable", type:"function" },
];

export const VAULT_ABI = [
  { name:"buyKey", type:"function", stateMutability:"payable", inputs:[{name:"vaultId",type:"uint256"},{name:"keyType",type:"uint8"}], outputs:[] },
  { name:"tryUnlock", type:"function", stateMutability:"nonpayable", inputs:[{name:"code",type:"uint256"},{name:"salt",type:"bytes32"}], outputs:[] },
  { name:"getAllPools", type:"function", stateMutability:"view", inputs:[], outputs:[{name:"",type:"uint256"},{name:"",type:"uint256"},{name:"",type:"uint256"},{name:"",type:"uint256"}] },
  { name:"getVault", type:"function", stateMutability:"view", inputs:[{name:"",type:"uint256"}], outputs:[{name:"",type:"string"},{name:"",type:"uint256"},{name:"",type:"bool"},{name:"",type:"address"},{name:"",type:"uint8"}] },
  { name:"getSession", type:"function", stateMutability:"view", inputs:[{name:"",type:"address"}], outputs:[{name:"",type:"uint256"},{name:"",type:"uint256"},{name:"",type:"bool"}] },
];

export const VAULT_KEYS = [
  { name:"BRONZE VAULT", price:"100",   keyType:0, vaultId:1, tier:"bronze",   icon:"🗝️", img:"https://raw.githubusercontent.com/00impera/winnowin/b01f15ef4c94f40439e554c14712b4878669f624/SEIF_1.png" },
  { name:"SILVER VAULT", price:"500",   keyType:1, vaultId:2, tier:"silver",   icon:"🔑", img:"https://raw.githubusercontent.com/00impera/winnowin/b01f15ef4c94f40439e554c14712b4878669f624/SEIF_2.png" },
  { name:"GOLD VAULT",   price:"1000",  keyType:2, vaultId:3, tier:"gold",     icon:"🏆", img:"https://raw.githubusercontent.com/00impera/winnowin/b01f15ef4c94f40439e554c14712b4878669f624/SEIF_3.png" },
  { name:"PLATINUM VAULT",price:"10000",keyType:3, vaultId:4, tier:"platinum", icon:"💎", img:"https://raw.githubusercontent.com/00impera/winnowin/b01f15ef4c94f40439e554c14712b4878669f624/SEIF_4.png" },
];

export const VAULT_SALTS = [
  "0x638d6b1aa06cc1b6fd530d63742db65ffa17631395150b129df19362aa2ac153",
  "0x30065d0d393544cf6d22f1aa29cd73ef6699c0831ca7520748d4e236e071ea6d",
  "0xa58e71b2fabf210084348f0bd740d102e352350df954b713167ca966a949cd4c",
  "0xffdf9bdc91801e779aea4ecbebae257cc4d100003a6bad35aed3303b47a5c89b",
];

export async function getNearIntentsTokens() {
  const res = await fetch("https://1click.chaindefuser.com/v0/tokens", {
    headers: { Authorization: "Bearer " + NEAR_JWT },
  });
  return res.json();
}

export async function getNearIntentsQuote({ originAsset, destinationAsset, amount, recipient }) {
  const deadline = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const res = await fetch("https://1click.chaindefuser.com/v0/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + NEAR_JWT },
    body: JSON.stringify({
      dry: false, swapType: "EXACT_INPUT", slippageTolerance: 100,
      originAsset, depositType: "ORIGIN_CHAIN",
      destinationAsset, amount, recipient,
      recipientType: "DESTINATION_CHAIN",
      refundTo: recipient, refundType: "ORIGIN_CHAIN", deadline,
    }),
  });
  return res.json();
}
