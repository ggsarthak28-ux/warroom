import dotenv from "dotenv";
import { latestIndicatorSummary } from "../src/utils/indicators.js";
import { getMarketStatus } from "../src/utils/market.js";
import { askGemini } from "../server/aiService.js";
import { getProviderAvailability } from "../server/cache.js";
import { getExpiries, getOptionChain, getOptionUnderlyings } from "../server/optionsData.js";
import {
  compareDates,
  getAllInstruments,
  getHistory,
  getQuote,
  getQuotes,
  getStock,
  knownSymbols,
  searchInstruments
} from "../server/marketData.js";

dotenv.config({ path: ".env.local" });
dotenv.config();

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  const route = normalizeRoute(req);

  try {
    if (req.method === "GET" && route === "/api/health") return handleHealth(res);
    if (req.method === "GET" && route === "/api/instruments") return handleInstruments(res);
    if (req.method === "GET" && route === "/api/search") return handleSearch(req, res);
    if (req.method === "GET" && route === "/api/quotes") return handleQuotes(req, res);
    if (req.method === "GET" && route === "/api/quote") return handleQuote(req, res);
    if (req.method === "GET" && (route === "/api/history" || route === "/api/candles")) return handleHistory(req, res);
    if (req.method === "GET" && route === "/api/market-status") return res.status(200).json(getMarketStatus());
    if (req.method === "GET" && route === "/api/compare") return handleCompare(req, res);
    if (req.method === "GET" && route === "/api/options/underlyings") return handleOptionUnderlyings(res);
    if (req.method === "GET" && route === "/api/options/expiries") return handleOptionExpiries(req, res);
    if (req.method === "GET" && route === "/api/options/chain") return handleOptionChain(req, res);
    if (req.method === "GET" && route === "/api/ai/status") return handleAIStatus(res);
    if (req.method === "POST" && (route === "/api/ai/chat" || route === "/api/ai")) return handleAIChat(req, res);

    return res.status(404).json({ error: "Route not found", route });
  } catch (error) {
    console.error("Vercel API route failed:", route, error);
    return res.status(200).json({
      error: "Backend route failed",
      message: error.message,
      status: getMarketStatus()
    });
  }
}

async function handleHealth(res) {
  try {
    const symbols = await knownSymbols();
    return res.status(200).json({
      ok: true,
      market: getMarketStatus(),
      quoteProvider: process.env.MARKET_DATA_PROVIDER || "auto:yahoo-free",
      aiProvider: process.env.GEMINI_API_KEY ? "gemini" : "fallback",
      symbols: symbols.slice(0, 20),
      symbolCount: symbols.length
    });
  } catch (error) {
    return res.status(200).json({
      ok: false,
      market: getMarketStatus(),
      error: "Instrument master unavailable",
      quoteProvider: process.env.MARKET_DATA_PROVIDER || "auto:yahoo-free",
      aiProvider: process.env.GEMINI_API_KEY ? "gemini" : "fallback"
    });
  }
}

async function handleInstruments(res) {
  const instruments = await getAllInstruments();
  return res.status(200).json({ instruments, count: instruments.length, status: getMarketStatus() });
}

async function handleSearch(req, res) {
  const q = req.query.q || "";
  const results = await searchInstruments(q, Number(req.query.limit || 40));
  const enriched = q ? await enrichSearchResults(results) : results.map(searchResultPayload);
  return res.status(200).json({ results: enriched, count: enriched.length, status: getMarketStatus() });
}

async function handleQuotes(req, res) {
  try {
    const quotes = await getQuotes(parseSymbols(req.query.symbols));
    return res.status(200).json({ quotes, status: getMarketStatus() });
  } catch (error) {
    console.error("Quote route failed:", error);
    return res.status(200).json({
      quotes: [],
      fallback: true,
      error: "Live market temporarily unavailable",
      status: getMarketStatus()
    });
  }
}

async function handleQuote(req, res) {
  try {
    const quote = await getQuote(req.query.symbol, req.query.exchange);
    return res.status(200).json({ quote, status: getMarketStatus() });
  } catch (error) {
    console.error("Single quote route failed:", error);
    return res.status(200).json({ quote: null, error: "Market data unavailable", status: getMarketStatus() });
  }
}

async function handleHistory(req, res) {
  try {
    const payload = await getHistory({
      symbol: req.query.symbol || "NIFTY",
      exchange: req.query.exchange,
      providerSymbol: req.query.providerSymbol,
      range: req.query.range || "1d",
      interval: req.query.interval,
      date: req.query.date,
      from: req.query.from,
      to: req.query.to
    });
    return res.status(200).json({ ...payload, status: getMarketStatus() });
  } catch (error) {
    console.error("History route failed:", error);
    return res.status(200).json({
      symbol: req.query.symbol || "NIFTY",
      exchange: req.query.exchange,
      candles: [],
      error: "Could not load candle data",
      lastCandleError: error.message,
      status: getMarketStatus()
    });
  }
}

async function handleCompare(req, res) {
  try {
    const result = await compareDates({
      symbol: req.query.symbol || "NIFTY",
      exchange: req.query.exchange,
      from: req.query.from,
      to: req.query.to
    });
    return res.status(200).json(result);
  } catch (error) {
    console.error("Compare route failed:", error);
    return res.status(200).json({ error: "Could not compare selected dates", message: error.message });
  }
}

async function handleOptionUnderlyings(res) {
  return res.status(200).json({ underlyings: await getOptionUnderlyings() });
}

async function handleOptionExpiries(req, res) {
  return res.status(200).json(await getExpiries(String(req.query.symbol || "NIFTY").toUpperCase()));
}

async function handleOptionChain(req, res) {
  return res.status(200).json(await getOptionChain(String(req.query.symbol || "NIFTY").toUpperCase(), req.query.expiry));
}

function handleAIStatus(res) {
  return res.status(200).json({
    connected: Boolean(process.env.GEMINI_API_KEY),
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    message: process.env.GEMINI_API_KEY
      ? "Gemini connected through backend"
      : "AI Assistant unavailable. Add GEMINI_API_KEY in .env.local."
  });
}

async function handleAIChat(req, res) {
  const body = await readBody(req);
  const question = String(body?.question || "").trim();
  const mode = String(body?.mode || "stock-analysis");
  const clientContext = body?.context || {};
  if (!question && req.url.includes("/chat")) return res.status(400).json({ error: "Question is required" });
  if (!question && !mode) return res.status(400).json({ error: "Question or mode is required" });

  const context = await buildAIContext(clientContext);
  const result = await askGemini({ mode, question, context });
  return res.status(200).json(result);
}

async function enrichSearchResults(results) {
  return Promise.all(results.map(async (instrument) => {
    try {
      const quote = await getQuote(instrument.symbol, instrument.exchange);
      return searchResultPayload(instrument, quote);
    } catch {
      return searchResultPayload(instrument, { error: "Quote unavailable on current provider" });
    }
  }));
}

function searchResultPayload(instrument, quote = {}) {
  const quoteAvailable = Number.isFinite(Number(quote.price));
  const availability = getProviderAvailability(instrument.key) || {};
  const candlesAvailable = availability.candlesAvailable ?? quote.candlesAvailable ?? Boolean(instrument.providerSymbol || instrument.yahooSymbol);
  return {
    key: instrument.key,
    symbol: instrument.symbol,
    name: instrument.name,
    exchange: instrument.exchange,
    instrumentType: instrument.instrumentType,
    providerSymbol: availability.providerSymbol || quote.providerSymbol || instrument.providerSymbol || instrument.yahooSymbol || null,
    quoteAvailable,
    candlesAvailable,
    price: quoteAvailable ? quote.price : null,
    change: quoteAvailable ? quote.change : null,
    changePercent: quoteAvailable ? quote.changePercent : null,
    volume: Number(quote.volume) > 0 ? quote.volume : null,
    delayed: Boolean(quote.delayed),
    source: quote.source || availability.providerName || null,
    providerName: quote.providerName || availability.providerName || quote.source || null,
    availabilityCheckedAt: availability.lastCheckedAt || null,
    candleCount: availability.candleCount ?? null,
    lastCandleError: availability.lastCandleError || null,
    lastError: availability.lastError || null,
    lastUpdated: quote.timestamp || null,
    dataStatus: quoteAvailable ? (candlesAvailable ? "Chart Available" : "Quote Available") : "Quote unavailable on current provider",
    dataState: quoteAvailable ? "available" : "unavailable",
    error: quote.error || availability.lastError || null
  };
}

async function buildAIContext(clientContext) {
  const symbol = clientContext.selected || clientContext.symbol || "NIFTY";
  const exchange = clientContext.exchange || "NSE";
  const stock = await getStock(symbol, exchange);
  if (!stock) {
    return {
      asOf: new Date().toISOString(),
      marketStatus: getMarketStatus(),
      selected: { symbol, exchange, error: "Invalid symbol" },
      indicators: {},
      candles: [],
      portfolio: clientContext.portfolio || null,
      watchlist: clientContext.watchlist || []
    };
  }

  const [quote] = await getQuotes([stock.key]);
  const history = await getHistory({
    symbol: stock.symbol,
    exchange: stock.exchange,
    range: clientContext.range || "1mo",
    interval: clientContext.interval || "1d"
  });
  const candles = history.candles.slice(-120);

  return {
    asOf: new Date().toISOString(),
    marketStatus: getMarketStatus(),
    selected: {
      symbol: stock.symbol,
      name: stock.name,
      exchange: stock.exchange,
      sector: stock.sector,
      price: quote?.price,
      previousClose: quote?.previousClose,
      changePercent: quote?.changePercent,
      volume: quote?.volume,
      dataSource: quote?.source,
      error: quote?.error
    },
    indicators: latestIndicatorSummary(candles),
    candles: candles.map((candle) => ({
      time: candle.time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume
    })),
    portfolio: clientContext.portfolio || null,
    watchlist: clientContext.watchlist || []
  };
}

function normalizeRoute(req) {
  const raw = req.url || "";
  const pathname = new URL(raw, "http://warroom.local").pathname.replace(/\/$/, "") || "/api";
  if (pathname.startsWith("/api/")) return pathname;
  if (pathname === "/api") return pathname;
  return `/api${pathname}`;
}

function parseSymbols(input) {
  return String(input || "")
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);
}

async function readBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");

  let raw = "";
  for await (const chunk of req) raw += chunk;
  return raw ? JSON.parse(raw) : {};
}

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}
