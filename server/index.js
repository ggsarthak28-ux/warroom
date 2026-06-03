import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { createServer } from "node:http";
import { WebSocketServer } from "ws";
import { latestIndicatorSummary } from "../src/utils/indicators.js";
import { getMarketStatus } from "../src/utils/market.js";
import { askGemini } from "./aiService.js";
import { getProviderAvailability } from "./cache.js";
import { getExpiries, getOptionChain, getOptionUnderlyings } from "./optionsData.js";
import {
  compareDates,
  getAllInstruments,
  getHistory,
  getQuote,
  getQuotes,
  getStock,
  knownSymbols,
  searchInstruments
} from "./marketData.js";

dotenv.config({ path: ".env.local" });
dotenv.config();

const app = express();
const server = createServer(app);
const port = Number(process.env.PORT || process.env.API_PORT || 8787);
const host = process.env.HOST || process.env.API_HOST || "127.0.0.1";

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", async (_req, res) => {
  try {
    const symbols = await knownSymbols();
    res.json({
      ok: true,
      market: getMarketStatus(),
      quoteProvider: process.env.MARKET_DATA_PROVIDER || "auto:yahoo-free",
      aiProvider: process.env.GEMINI_API_KEY ? "gemini" : "fallback",
      symbols: symbols.slice(0, 20),
      symbolCount: symbols.length
    });
  } catch (error) {
    res.status(200).json({
      ok: false,
      market: getMarketStatus(),
      error: "Instrument master unavailable",
      quoteProvider: process.env.MARKET_DATA_PROVIDER || "auto:yahoo-free",
      aiProvider: process.env.GEMINI_API_KEY ? "gemini" : "fallback"
    });
  }
});

app.get("/api/instruments", async (_req, res) => {
  const instruments = await getAllInstruments();
  res.json({ instruments, count: instruments.length, status: getMarketStatus() });
});

app.get("/api/search", async (req, res) => {
  const q = req.query.q || "";
  const results = await searchInstruments(q, Number(req.query.limit || 40));
  const enriched = q ? await enrichSearchResults(results) : results.map(searchResultPayload);
  res.json({ results: enriched, count: enriched.length, status: getMarketStatus() });
});

app.get("/api/quotes", async (req, res) => {
  const symbols = parseSymbols(req.query.symbols);
  try {
    const quotes = await getQuotes(symbols);
    res.json({ quotes, status: getMarketStatus() });
  } catch (error) {
    console.error("Quote route failed:", error);
    res.status(200).json({ quotes: [], fallback: true, error: "Live market temporarily unavailable", status: getMarketStatus() });
  }
});

app.get("/api/quote", async (req, res) => {
  try {
    const quote = await getQuote(req.query.symbol, req.query.exchange);
    res.json({ quote, status: getMarketStatus() });
  } catch (error) {
    console.error("Single quote route failed:", error);
    res.status(200).json({ quote: null, error: "Market data unavailable", status: getMarketStatus() });
  }
});

app.get("/api/history", async (req, res) => {
  try {
    const payload = await getHistory({
      symbol: req.query.symbol || "NIFTY50",
      exchange: req.query.exchange,
      providerSymbol: req.query.providerSymbol,
      range: req.query.range || "1d",
      interval: req.query.interval,
      date: req.query.date,
      from: req.query.from,
      to: req.query.to
    });
    res.json({ ...payload, status: getMarketStatus() });
  } catch (error) {
    console.error("History route failed:", error);
    res.status(500).json({ error: "Could not load historical candles" });
  }
});

app.get("/api/candles", async (req, res) => {
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
    res.json({ ...payload, status: getMarketStatus() });
  } catch (error) {
    console.error("Candles route failed:", error);
    res.status(500).json({ error: "Could not load candle data", status: getMarketStatus() });
  }
});

app.get("/api/market-status", (_req, res) => {
  res.json(getMarketStatus());
});

app.get("/api/compare", async (req, res) => {
  try {
    const result = await compareDates({
      symbol: req.query.symbol || "NIFTY50",
      exchange: req.query.exchange,
      from: req.query.from,
      to: req.query.to
    });
    res.json(result);
  } catch (error) {
    console.error("Compare route failed:", error);
    res.status(500).json({ error: "Could not compare selected dates" });
  }
});

app.get("/api/options/underlyings", async (_req, res) => {
  res.json({ underlyings: await getOptionUnderlyings() });
});

app.get("/api/options/expiries", async (req, res) => {
  res.json(await getExpiries(String(req.query.symbol || "NIFTY").toUpperCase()));
});

app.get("/api/options/chain", async (req, res) => {
  res.json(await getOptionChain(String(req.query.symbol || "NIFTY").toUpperCase(), req.query.expiry));
});

app.post("/api/ai", async (req, res) => {
  const question = String(req.body?.question || "").trim();
  const mode = String(req.body?.mode || "stock-analysis");
  const clientContext = normalizeAIClientContext(req.body || {});
  if (!question && !mode) return res.status(400).json({ error: "Question or mode is required" });

  const context = await buildAIContext(clientContext);
  const result = await askGemini({ mode, question, context });
  res.json(result);
});

app.get("/api/ai/status", (_req, res) => {
  res.json({
    connected: Boolean(process.env.GEMINI_API_KEY),
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    message: process.env.GEMINI_API_KEY
      ? "Gemini connected through backend"
      : "AI Assistant unavailable. Add GEMINI_API_KEY in Vercel Environment Variables or local .env.local."
  });
});

app.post("/api/ai/chat", async (req, res) => {
  const question = String(req.body?.question || "").trim();
  const mode = String(req.body?.mode || "stock-analysis");
  const clientContext = normalizeAIClientContext(req.body || {});
  if (!question) return res.status(400).json({ error: "Question is required" });
  const context = await buildAIContext(clientContext);
  const result = await askGemini({ mode, question, context });
  res.status(result.ok === false ? 200 : 200).json(result);
});

const wss = new WebSocketServer({ server, path: "/ws/prices" });

wss.on("connection", (socket, request) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const symbols = parseSymbols(url.searchParams.get("symbols"));
  const send = (payload) => {
    if (socket.readyState === socket.OPEN) socket.send(JSON.stringify(payload));
  };

  send({ type: "status", state: streamState() });

  const push = async () => {
    try {
      const quotes = await getQuotes(symbols.length ? symbols : ["NSE:NIFTY", "NSE:BANKNIFTY", "BSE:SENSEX"]);
      send({ type: "tick", quotes, status: getMarketStatus(), state: streamState(quotes) });
    } catch (error) {
      send({ type: "error", message: "Live stream interrupted. Retrying.", status: getMarketStatus() });
    }
  };

  push();
  const timer = setInterval(push, getMarketStatus().open ? 3500 : 15000);
  socket.on("close", () => clearInterval(timer));
});

server.listen(port, host, () => {
  console.log(`WarRoom API + WS running at http://${host}:${port}`);
});

function parseSymbols(input) {
  return String(input || "")
    .split(",")
    .map((symbol) => symbol.trim().toUpperCase())
    .filter(Boolean);
}

async function enrichSearchResults(results) {
  return Promise.all(results.map(async (instrument) => {
    try {
      const quote = await getQuote(instrument.symbol, instrument.exchange);
      return searchResultPayload(instrument, quote);
    } catch (error) {
      return searchResultPayload(instrument, { error: "Quote unavailable on current provider" });
    }
  }));
}

function searchResultPayload(instrument, quote = {}) {
  const quoteAvailable = quote.price != null && Number.isFinite(Number(quote.price));
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

function streamState(quotes = []) {
  const status = getMarketStatus();
  const provider = quotes[0]?.source || process.env.MARKET_DATA_PROVIDER || "Yahoo Finance free chart feed";
  return {
    status: "connected",
    source: provider,
    marketPhase: status.phase,
    label: "Provider connected"
  };
}

async function buildAIContext(clientContext) {
  const selectedContext = clientContext.selectedSymbol || clientContext.marketContext?.selected || {};
  const symbol =
    clientContext.selected ||
    clientContext.symbol ||
    selectedContext.symbol ||
    clientContext.marketContext?.symbol ||
    "NIFTY";
  const exchange = clientContext.exchange || selectedContext.exchange || clientContext.marketContext?.exchange || "NSE";
  const stock = await getStock(symbol, exchange);
  if (!stock) {
    return {
      asOf: new Date().toISOString(),
      pageContext: clientContext.pageContext || null,
      marketStatus: getMarketStatus(),
      selected: { symbol, exchange, error: "Invalid symbol" },
      indicators: {},
      candles: [],
      portfolio: clientContext.portfolio || clientContext.portfolioContext || null,
      watchlist: clientContext.watchlist || []
    };
  }
  const [quote] = stock ? await getQuotes([stock.key]) : [];
  const historyRequest = aiHistoryRequest(clientContext);
  const history = stock ? await getHistory({
    symbol: stock.symbol,
    exchange: stock.exchange,
    range: historyRequest.range,
    interval: historyRequest.interval
  }) : { candles: [] };
  const candles = history.candles.slice(-120);
  const indicators = latestIndicatorSummary(candles);

  return {
    asOf: new Date().toISOString(),
    pageContext: clientContext.pageContext || null,
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
    indicators,
    candles: candles.map((candle) => ({
      time: candle.time,
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume
    })),
    portfolio: clientContext.portfolio || clientContext.portfolioContext || null,
    watchlist: clientContext.watchlist || []
  };
}

function normalizeAIClientContext(body) {
  return {
    ...(body.context || {}),
    pageContext: body.pageContext || body.context?.pageContext || null,
    selectedSymbol: body.selectedSymbol || body.context?.selectedSymbol || null,
    marketContext: body.marketContext || body.context?.marketContext || null,
    portfolioContext: body.portfolioContext || body.context?.portfolioContext || null
  };
}

function aiHistoryRequest(clientContext) {
  const timeframe = clientContext.marketContext?.timeframe || "";
  if (["1m", "5m", "15m", "30m"].includes(timeframe)) {
    return { range: "5d", interval: timeframe };
  }
  if (timeframe === "1h") {
    return { range: "1mo", interval: "60m" };
  }
  if (timeframe === "1W") {
    return { range: "1y", interval: "1wk" };
  }
  if (timeframe === "1M") {
    return { range: "5y", interval: "1mo" };
  }
  return { range: clientContext.range || "1mo", interval: clientContext.interval || "1d" };
}
