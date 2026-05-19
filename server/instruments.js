import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getCachedInstruments, saveInstruments } from "./cache.js";

const NSE_EQUITY_URL =
  process.env.NSE_INSTRUMENTS_URL || "https://nsearchives.nseindia.com/content/equities/EQUITY_L.csv";

const INDEX_INSTRUMENTS = [
  {
    symbol: "NIFTY",
    exchange: "NSE",
    name: "Nifty 50",
    instrumentType: "Index",
    token: "^NSEI",
    lotSize: 1,
    tickSize: 0.05,
    sector: "Index",
    isIndex: true,
    yahooSymbol: "^NSEI"
  },
  {
    symbol: "NIFTY50",
    exchange: "NSE",
    name: "Nifty 50",
    instrumentType: "Index",
    token: "^NSEI",
    lotSize: 1,
    tickSize: 0.05,
    sector: "Index",
    isIndex: true,
    yahooSymbol: "^NSEI"
  },
  {
    symbol: "BANKNIFTY",
    exchange: "NSE",
    name: "Nifty Bank",
    instrumentType: "Index",
    token: "^NSEBANK",
    lotSize: 1,
    tickSize: 0.05,
    sector: "Index",
    isIndex: true,
    yahooSymbol: "^NSEBANK"
  },
  {
    symbol: "SENSEX",
    exchange: "BSE",
    name: "BSE Sensex",
    instrumentType: "Index",
    token: "^BSESN",
    lotSize: 1,
    tickSize: 0.05,
    sector: "Index",
    isIndex: true,
    yahooSymbol: "^BSESN"
  }
].map(normalizeInstrument);

let memory = null;
let loading = null;

export async function getAllInstruments({ refresh = false } = {}) {
  if (memory && !refresh) return memory;

  const cached = getCachedInstruments();
  const newest = cached.reduce((max, item) => Math.max(max, item.fetchedAt || 0), 0);
  const hasFullMaster = cached.length > INDEX_INSTRUMENTS.length;
  const fresh = hasFullMaster && newest && Date.now() / 1000 - newest < 60 * 60 * 24;
  if (cached.length && fresh && !refresh) {
    memory = cached;
    return memory;
  }

  if (!loading || refresh) {
    loading = loadInstrumentMaster()
      .then((items) => {
        saveInstruments(items);
        memory = items;
        return items;
      })
      .catch((error) => {
        console.error("Instrument master load failed:", error.message);
        if (cached.length) {
          memory = cached;
          return cached;
        }
        memory = INDEX_INSTRUMENTS;
        return memory;
      })
      .finally(() => {
        loading = null;
      });
  }

  return loading;
}

export async function searchInstruments(query, limit = 40) {
  const instruments = await getAllInstruments();
  const q = String(query || "").trim().toLowerCase();
  if (!q) return instruments.slice(0, limit);
  return instruments
    .filter((instrument) =>
      [instrument.symbol, instrument.name, instrument.exchange, instrument.instrumentType, instrument.sector]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    )
    .sort((a, b) => searchRank(a, q) - searchRank(b, q) || Number(b.isIndex) - Number(a.isIndex) || a.symbol.localeCompare(b.symbol))
    .slice(0, limit);
}

export async function getInstrument(symbol, exchange) {
  const instruments = await getAllInstruments();
  const s = String(symbol || "").toUpperCase();
  const e = String(exchange || "").toUpperCase();
  return (
    instruments.find((instrument) => instrument.symbol === s && (!e || instrument.exchange === e)) ||
    instruments.find((instrument) => instrument.symbol === s) ||
    null
  );
}

async function loadInstrumentMaster() {
  const [nse, bse, local] = await Promise.allSettled([fetchNseEquities(), fetchBseEquities(), loadLocalInstruments()]);
  if (nse.status !== "fulfilled" && bse.status !== "fulfilled" && local.status !== "fulfilled") {
    throw new Error(nse.reason?.message || bse.reason?.message || local.reason?.message || "No instrument master available");
  }
  const items = [
    ...INDEX_INSTRUMENTS,
    ...(nse.status === "fulfilled" ? nse.value : []),
    ...(bse.status === "fulfilled" ? bse.value : []),
    ...(local.status === "fulfilled" ? local.value : [])
  ];
  const seen = new Map();
  for (const item of items) seen.set(item.key, item);
  return [...seen.values()].sort((a, b) => Number(b.isIndex) - Number(a.isIndex) || a.symbol.localeCompare(b.symbol));
}

async function fetchNseEquities() {
  const response = await fetch(NSE_EQUITY_URL, {
    headers: {
      "User-Agent": "WarRoom/1.0 instrument master",
      Accept: "text/csv,*/*"
    }
  });
  if (!response.ok) throw new Error(`NSE instrument master HTTP ${response.status}`);
  const rows = parseCsv(await response.text());
  return rows
    .filter((row) => row.SYMBOL && ["EQ", "BE", "BZ"].includes(String(row.SERIES || "EQ").trim().toUpperCase()))
    .map((row) =>
      normalizeInstrument({
        symbol: row.SYMBOL,
        exchange: "NSE",
        name: row["NAME OF COMPANY"] || row.NAME || row.SYMBOL,
        instrumentType: row.SERIES === "EQ" ? "Stock" : "Equity",
        token: row["ISIN NUMBER"] || row.ISIN,
        lotSize: 1,
        tickSize: 0.05,
        sector: "",
        isIndex: false,
        yahooSymbol: `${row.SYMBOL}.NS`
      })
    );
}

async function loadLocalInstruments() {
  const file = process.env.INSTRUMENTS_FILE ? resolve(process.env.INSTRUMENTS_FILE) : resolve("data", "instruments.csv");
  if (!existsSync(file)) return [];
  const text = readFileSync(file, "utf8");
  const rows = file.toLowerCase().endsWith(".json") ? JSON.parse(text) : parseCsv(text);
  return rows
    .filter((row) => row.symbol || row.SYMBOL)
    .map((row) => {
      const symbol = row.symbol || row.SYMBOL;
      const exchange = row.exchange || row.EXCHANGE || "NSE";
      return normalizeInstrument({
        symbol,
        exchange,
        name: row.name || row.NAME || row["NAME OF COMPANY"] || symbol,
        instrumentType: row.instrumentType || row.type || row.TYPE || "Stock",
        token: row.token || row.id || row.ISIN || row["ISIN NUMBER"] || symbol,
        lotSize: row.lotSize || row["MARKET LOT"] || 1,
        tickSize: row.tickSize || 0.05,
        sector: row.sector || row.SECTOR || "",
        isIndex: row.isIndex === true || String(row.isIndex).toLowerCase() === "true",
        yahooSymbol: row.yahooSymbol || row.providerSymbol || `${symbol}.${String(exchange).toUpperCase() === "BSE" ? "BO" : "NS"}`,
        providerSymbol: row.providerSymbol || row.yahooSymbol
      });
    });
}

async function fetchBseEquities() {
  if (!process.env.BSE_INSTRUMENTS_URL) return [];
  const response = await fetch(process.env.BSE_INSTRUMENTS_URL, {
    headers: {
      "User-Agent": "WarRoom/1.0 instrument master",
      Accept: "text/csv,*/*"
    }
  });
  if (!response.ok) throw new Error(`BSE instrument master HTTP ${response.status}`);
  const rows = parseCsv(await response.text());
  return rows
    .filter((row) => row.symbol || row.SYMBOL || row.Scrip_Id || row.SC_NAME)
    .map((row) => {
      const symbol = row.symbol || row.SYMBOL || row.Scrip_Id || row.SC_CODE;
      return normalizeInstrument({
        symbol,
        exchange: "BSE",
        name: row.name || row["Security Name"] || row.SC_NAME || symbol,
        instrumentType: "Stock",
        token: row.isin || row.ISIN || row.SC_CODE,
        lotSize: 1,
        tickSize: 0.05,
        sector: row.sector || "",
        isIndex: false,
        yahooSymbol: `${symbol}.BO`
      });
    });
}

function normalizeInstrument(instrument) {
  const symbol = String(instrument.symbol || "").trim().toUpperCase();
  const exchange = String(instrument.exchange || "").trim().toUpperCase();
  return {
    key: `${exchange}:${symbol}`,
    symbol,
    exchange,
    name: String(instrument.name || symbol).trim(),
    instrumentType: instrument.instrumentType || "Stock",
    token: instrument.token || instrument.yahooSymbol || symbol,
    lotSize: Number(instrument.lotSize || 1),
    tickSize: Number(instrument.tickSize || 0.05),
    sector: instrument.sector || "",
    isIndex: Boolean(instrument.isIndex),
    yahooSymbol: instrument.yahooSymbol,
    providerSymbol: instrument.providerSymbol || instrument.yahooSymbol,
    quoteAvailable: null,
    candlesAvailable: Boolean(instrument.providerSymbol || instrument.yahooSymbol),
    fetchedAt: Math.floor(Date.now() / 1000)
  };
}

function searchRank(instrument, q) {
  const symbol = String(instrument.symbol || "").toLowerCase();
  const name = String(instrument.name || "").toLowerCase();
  const exchange = String(instrument.exchange || "").toLowerCase();
  if (symbol === q) return 0;
  if (name === q) return 1;
  if (symbol.startsWith(q)) return 2;
  if (name.startsWith(q)) return 3;
  if (exchange === q) return 4;
  if (symbol.includes(q)) return 5;
  if (name.includes(q)) return 6;
  return 9;
}

function parseCsv(text) {
  const rows = [];
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter(Boolean);
  if (!lines.length) return rows;
  const headers = splitCsvLine(lines[0]).map((header) => header.trim());
  for (const line of lines.slice(1)) {
    const values = splitCsvLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = (values[index] || "").trim();
    });
    rows.push(row);
  }
  return rows;
}

function splitCsvLine(line) {
  const values = [];
  let current = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      values.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}
