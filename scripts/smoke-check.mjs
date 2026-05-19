import { calculateBrokerage, calculatePositionSize, calculateRiskReward } from "../src/utils/calculators.js";
import { getMarketStatus } from "../src/utils/market.js";
import { searchStocks } from "../src/utils/marketMath.js";

const instruments = [
  { key: "NSE:RELIANCE", symbol: "RELIANCE", exchange: "NSE", name: "Reliance Industries", instrumentType: "Stock" },
  { key: "NSE:HDFCBANK", symbol: "HDFCBANK", exchange: "NSE", name: "HDFC Bank", instrumentType: "Stock" },
  { key: "NSE:NIFTY", symbol: "NIFTY", exchange: "NSE", name: "Nifty 50", instrumentType: "Index" }
];

const position = calculatePositionSize({ capital: 500000, riskPercent: 1, entry: 2000, stopLoss: 1940, target: 2180 });
if (position.quantity !== 83) throw new Error("Position sizing check failed");

const brokerage = calculateBrokerage({ type: "intraday", buy: 2000, sell: 2100, quantity: 100 });
if (!Number.isFinite(brokerage.net)) throw new Error("Brokerage check failed");

const rr = calculateRiskReward({ risk: 500, reward: 1500, winRate: 50 });
if (rr.rr !== 3) throw new Error("Risk/reward check failed");

const matches = searchStocks("bank", instruments);
if (!matches.length) throw new Error("Search check failed");

const status = getMarketStatus(new Date("2026-05-18T04:00:00.000Z"));
if (!status.open) throw new Error("Market session check failed");

console.log("WarRoom smoke checks passed");
