import { getMarketStatus } from "../src/utils/market.js";
import { getTimeframe, toUnixSeconds } from "../src/utils/timeframes.js";
import { getCachedCandles, getCachedQuote, saveCandles, saveProviderAvailability, saveQuotes } from "./cache.js";
import { getAllInstruments, getInstrument, searchInstruments } from "./instruments.js";

export { getAllInstruments, searchInstruments };

export async function knownSymbols() {
  const instruments = await getAllInstruments();
  return instruments.map((instrument) => instrument.key);
}

export async function getStock(symbol, exchange) {
  return getInstrument(symbol, exchange);
}

export async function getQuotes(requests = []) {
  const instruments = await resolveInstruments(requests);
  const results = await mapWithConcurrency(instruments, 8, (instrument) => getQuote(instrument.symbol, instrument.exchange));
  return results;
}

export async function getQuote(symbol, exchange) {
  const instrument = await getInstrument(symbol, exchange);
  if (!instrument) return unavailableQuote(symbol, exchange, "Invalid symbol");

  const freshCached = freshCachedQuote(instrument);
  if (freshCached) return freshCached;

  try {
    const quote = await fetchQuoteFromProviders(instrument);
    saveQuotes([quote]);
    saveProviderAvailability({
      key: instrument.key,
      symbol: instrument.symbol,
      exchange: instrument.exchange,
      providerName: quote.source,
      providerSymbol: providerSymbolFor(instrument),
      quoteAvailable: true,
      lastError: null
    });
    devLog("quote", { instrument, quote });
    return quote;
  } catch (error) {
    console.error(`Quote unavailable for ${instrument.key}:`, error.message);
    saveProviderAvailability({
      key: instrument.key,
      symbol: instrument.symbol,
      exchange: instrument.exchange,
      providerName: providerName(),
      providerSymbol: providerSymbolFor(instrument),
      quoteAvailable: false,
      lastError: error.message
    });
    const cached = getCachedQuote(instrument.key) || getCachedQuote(instrument.symbol);
    if (cached) return { ...cached, exchange: instrument.exchange, stale: true, error: "Provider unavailable; showing previous valid quote." };
    return unavailableQuote(instrument.symbol, instrument.exchange, "Market data unavailable");
  }
}

export async function getHistory({ symbol, exchange, providerSymbol, range = "1d", interval = "1m", date, from, to }) {
  const resolved = await getInstrument(symbol, exchange);
  const instrument = withProviderOverride(resolved, providerSymbol);
  if (!instrument) {
    return {
      symbol,
      exchange,
      range,
      interval,
      candles: [],
      source: "none",
      error: "Invalid symbol"
    };
  }

  const rangeKey = date ? `DATE:${date}` : from || to ? `CUSTOM:${from || ""}:${to || ""}` : `${range}:${interval}`;
  const cached = validateCandles(getCachedCandles(instrument.key, rangeKey, interval), instrument.key);
  if (cached.length && shouldUseCachedCandles(rangeKey, cached)) {
    return { ...historyPayload(instrument, rangeKey, interval, cached, "cache"), stale: false };
  }

  try {
    const candles = await fetchHistoryFromProviders(instrument, { range, interval, date, from, to });
    const valid = validateCandles(candles, instrument.key);
    if (!valid.length) {
      const reason = date || from ? "Market was closed on this date or no candles were returned." : "Candle data unavailable";
      saveProviderAvailability({
        key: instrument.key,
        symbol: instrument.symbol,
        exchange: instrument.exchange,
        providerName: providerName(),
        providerSymbol: providerSymbolFor(instrument),
        candlesAvailable: false,
        candleCount: 0,
        lastCandleError: reason,
        lastError: reason
      });
      devLog("chart-fetch-result", chartDiagnostic(instrument, interval, [], reason));
      return { ...historyPayload(instrument, rangeKey, interval, [], "provider"), error: reason, lastCandleError: reason };
    }
    saveCandles(instrument.key, rangeKey, interval, valid, valid[0]?.source || "provider");
    saveProviderAvailability({
      key: instrument.key,
      symbol: instrument.symbol,
      exchange: instrument.exchange,
      providerName: valid[0]?.source || providerName(),
      providerSymbol: providerSymbolFor(instrument),
      candlesAvailable: true,
      candleCount: valid.length,
      lastCandleError: null,
      lastError: null
    });
    devLog("history", { instrument, latestCandle: valid.at(-1), interval, marketStatus: getMarketStatus(), candleCount: valid.length });
    devLog("chart-fetch-result", chartDiagnostic(instrument, interval, valid, null));
    return historyPayload(instrument, rangeKey, interval, valid, valid[0]?.source || "provider");
  } catch (error) {
    console.error(`History unavailable for ${instrument.key}:`, error.message);
    saveProviderAvailability({
      key: instrument.key,
      symbol: instrument.symbol,
      exchange: instrument.exchange,
      providerName: providerName(),
      providerSymbol: providerSymbolFor(instrument),
      candlesAvailable: false,
      candleCount: 0,
      lastCandleError: error.message,
      lastError: error.message
    });
    if (cached.length) {
      saveProviderAvailability({
        key: instrument.key,
        symbol: instrument.symbol,
        exchange: instrument.exchange,
        providerName: "cache",
        providerSymbol: providerSymbolFor(instrument),
        candlesAvailable: true,
        candleCount: cached.length,
        lastCandleError: error.message,
        lastError: error.message
      });
      return { ...historyPayload(instrument, rangeKey, interval, cached, "cache"), stale: true, lastCandleError: error.message };
    }
    devLog("chart-fetch-result", chartDiagnostic(instrument, interval, [], error.message));
    return { ...historyPayload(instrument, rangeKey, interval, [], "none"), error: "Candle data unavailable", lastCandleError: error.message };
  }
}

export async function compareDates({ symbol, exchange, from, to }) {
  const first = await getHistory({ symbol, exchange, date: from, interval: "5m" });
  const second = await getHistory({ symbol, exchange, date: to, interval: "5m" });
  const fromClose = first.candles.at(-1)?.close ?? null;
  const toClose = second.candles.at(-1)?.close ?? null;
  return {
    symbol,
    exchange,
    from,
    to,
    fromClose,
    toClose,
    change: fromClose != null && toClose != null ? toClose - fromClose : null,
    changePercent: fromClose != null && toClose != null ? ((toClose - fromClose) / fromClose) * 100 : null,
    error: !first.candles.length || !second.candles.length ? "No candles found for one or both selected dates." : null
  };
}

export async function getPreviousClose(symbol, exchange) {
  const quote = await getQuote(symbol, exchange);
  return quote.previousClose ?? null;
}

async function resolveInstruments(requests) {
  const input = requests.length ? requests : ["NSE:NIFTY", "NSE:BANKNIFTY", "BSE:SENSEX"];
  const resolved = [];
  for (const request of input) {
    const { symbol, exchange } = parseInstrumentRequest(request);
    const instrument = await getInstrument(symbol, exchange);
    if (instrument) resolved.push(instrument);
  }
  return resolved;
}

async function fetchQuoteFromProviders(instrument) {
  const attempts = quoteAttempts(instrument);
  let lastError;
  for (const attempt of attempts) {
    try {
      return await attempt.fetcher();
    } catch (error) {
      lastError = error;
      devLog("quote-provider-failed", {
        instrument,
        provider: attempt.name,
        errorMessage: error.message,
        providerSymbol: providerSymbolFor(instrument, attempt.name)
      });
    }
  }
  throw lastError || new Error("No quote provider configured");
}

async function fetchHistoryFromProviders(instrument, request) {
  const attempts = historyAttempts(instrument, request);
  let lastError;
  for (const attempt of attempts) {
    try {
      const candles = await attempt.fetcher();
      if (candles.length) return candles;
      lastError = new Error(`No candles returned by ${attempt.name}`);
    } catch (error) {
      lastError = error;
      devLog("candle-provider-failed", {
        instrument,
        provider: attempt.name,
        interval: request.interval,
        errorMessage: error.message,
        providerSymbol: providerSymbolFor(instrument, attempt.name)
      });
    }
  }
  throw lastError || new Error("No candle provider configured");
}

function quoteAttempts(instrument) {
  const mode = providerMode();
  const attempts = [];
  const hasTwelve = Boolean(process.env.TWELVE_DATA_API_KEY);
  if ((mode === "twelvedata" || mode === "auto") && hasTwelve) {
    attempts.push({ name: "Twelve Data", fetcher: () => fetchTwelveQuote(instrument) });
  }
  if (mode !== "twelvedata" || yahooSymbolFor(instrument)) {
    attempts.push({ name: "Yahoo Finance delayed/free chart feed", fetcher: () => fetchYahooQuote(instrument) });
  }
  return attempts;
}

function historyAttempts(instrument, request) {
  const mode = providerMode();
  const attempts = [];
  const hasTwelve = Boolean(process.env.TWELVE_DATA_API_KEY);
  if ((mode === "twelvedata" || mode === "auto") && hasTwelve) {
    attempts.push({ name: "Twelve Data", fetcher: () => fetchTwelveHistory(instrument, request) });
  }
  if (mode !== "twelvedata" || yahooSymbolFor(instrument)) {
    attempts.push({ name: "Yahoo Finance delayed/free chart feed", fetcher: () => fetchYahooHistory(instrument, request) });
  }
  return attempts;
}

async function fetchYahooQuote(instrument) {
  const data = await fetchYahooChart(instrument, { range: "1d", interval: "1m" });
  const result = data.result;
  const meta = result.meta || {};
  const latestCandle = data.candles.at(-1);
  const price = finiteOr(meta.regularMarketPrice, latestCandle?.close);
  const previousClose = finiteOr(meta.chartPreviousClose, finiteOr(meta.previousClose, null));
  const rawVolume = finiteOr(meta.regularMarketVolume, latestCandle?.volume ?? null);
  if (!Number.isFinite(price)) throw new Error("No provider price");
  const change = previousClose != null ? price - previousClose : null;
  const changePercent = previousClose ? (change / previousClose) * 100 : null;
  return {
    key: instrument.key,
    symbol: instrument.symbol,
    exchange: instrument.exchange,
    name: instrument.name,
    instrumentType: instrument.instrumentType,
    providerSymbol: providerSymbolFor(instrument),
    providerName: "Yahoo Finance delayed/free chart feed",
    quoteAvailable: true,
    candlesAvailable: Boolean(yahooSymbolFor(instrument)),
    price,
    previousClose,
    change,
    changePercent,
    volume: rawVolume != null && rawVolume > 0 ? rawVolume : null,
    source: "Yahoo Finance delayed/free chart feed",
    delayed: true,
    stale: false,
    timestamp: latestCandle?.time || Math.floor(Date.now() / 1000),
    marketState: meta.marketState || "UNKNOWN"
  };
}

async function fetchYahooHistory(instrument, { range = "1d", interval = "1m", date, from, to } = {}) {
  const data = await fetchYahooChart(instrument, { range, interval, date, from, to });
  return data.candles;
}

async function fetchYahooChart(instrument, { range = "1d", interval = "1m", date, from, to } = {}) {
  const yahooSymbol = yahooSymbolFor(instrument);
  if (!yahooSymbol) throw new Error("Provider symbol unavailable");
  const params = new URLSearchParams({
    interval,
    events: "history",
    includePrePost: "false"
  });

  if (date || from || to) {
    const start = toUnixSeconds(date || from);
    const end = toUnixSeconds(date || to || from, true);
    params.set("period1", String(start));
    params.set("period2", String(end));
  } else {
    params.set("range", normalizeYahooRange(range, interval));
  }

  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(yahooSymbol)}?${params}`;
  devLog("chart-fetch", {
    instrument,
    provider: "Yahoo Finance delayed/free chart feed",
    providerSymbol: yahooSymbol,
    interval,
    requestUrl: sanitizeUrl(url),
    quoteSuccess: null,
    candleSuccess: null
  });
  const payload = await fetchJsonWithRetry(url);
  const result = payload?.chart?.result?.[0];
  const error = payload?.chart?.error;
  if (error || !result) throw new Error(error?.description || `No chart data for ${instrument.key}`);

  const quote = result.indicators?.quote?.[0] || {};
  const candles = (result.timestamp || [])
    .map((time, index) => {
      const open = finiteOr(quote.open?.[index], null);
      const high = finiteOr(quote.high?.[index], null);
      const low = finiteOr(quote.low?.[index], null);
      const close = finiteOr(quote.close?.[index], null);
      const rawVolume = finiteOr(quote.volume?.[index], null);
      return {
        time,
        open,
        high,
        low,
        close,
        value: close,
        volume: rawVolume != null && rawVolume > 0 ? rawVolume : null,
        source: "Yahoo Finance delayed/free chart feed"
      };
    });

  return { result, candles };
}

async function fetchTwelveQuote(instrument) {
  const symbol = instrument.providerSymbol || instrument.twelveSymbol || instrument.yahooSymbol;
  if (!symbol) throw new Error("Provider symbol unavailable");
  const url = new URL("https://api.twelvedata.com/quote");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("apikey", process.env.TWELVE_DATA_API_KEY);
  const data = await fetchJsonWithRetry(url.toString());
  if (data.status === "error") throw new Error(data.message || `Twelve Data quote failed for ${instrument.key}`);
  const price = finiteOr(data.close, finiteOr(data.price, null));
  const previousClose = finiteOr(data.previous_close, null);
  const change = previousClose != null && price != null ? price - previousClose : finiteOr(data.change, null);
  const rawVolume = finiteOr(data.volume, null);
  return {
    key: instrument.key,
    symbol: instrument.symbol,
    exchange: instrument.exchange,
    name: instrument.name,
    instrumentType: instrument.instrumentType,
    providerSymbol: providerSymbolFor(instrument),
    providerName: "Twelve Data",
    quoteAvailable: true,
    candlesAvailable: Boolean(symbol),
    price,
    previousClose,
    change,
    changePercent: finiteOr(data.percent_change, previousClose ? (change / previousClose) * 100 : null),
    volume: rawVolume != null && rawVolume > 0 ? rawVolume : null,
    source: "Twelve Data",
    delayed: false,
    stale: false,
    timestamp: Math.floor(Date.now() / 1000)
  };
}

async function fetchTwelveHistory(instrument, { range = "1d", interval = "1m", date, from, to } = {}) {
  const symbol = instrument.providerSymbol || instrument.twelveSymbol || instrument.yahooSymbol;
  if (!symbol) throw new Error("Provider symbol unavailable");
  const url = new URL("https://api.twelvedata.com/time_series");
  url.searchParams.set("symbol", symbol);
  url.searchParams.set("interval", interval);
  url.searchParams.set("outputsize", range === "max" ? "5000" : "800");
  url.searchParams.set("apikey", process.env.TWELVE_DATA_API_KEY);
  if (date || from) url.searchParams.set("start_date", `${date || from} 09:15:00`);
  if (date || to) url.searchParams.set("end_date", `${date || to || from} 15:30:00`);
  devLog("chart-fetch", {
    instrument,
    provider: "Twelve Data",
    providerSymbol: symbol,
    interval,
    requestUrl: sanitizeUrl(url.toString()),
    quoteSuccess: null,
    candleSuccess: null
  });
  const data = await fetchJsonWithRetry(url.toString());
  if (data.status === "error") throw new Error(data.message || `Twelve Data history failed for ${instrument.key}`);
  return (data.values || [])
    .map((row) => ({
      time: Math.floor(new Date(`${row.datetime}+05:30`).getTime() / 1000),
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      value: Number(row.close),
      volume: Number(row.volume) > 0 ? Number(row.volume) : null,
      source: "Twelve Data"
    }))
    .sort((a, b) => a.time - b.time);
}

function validateCandles(candles, key) {
  const validCandles = candles.filter((candle) => {
    const volume = candle.volume == null ? null : Number(candle.volume);
    const valid =
      Number.isFinite(candle.time) &&
      Number.isFinite(candle.open) &&
      Number.isFinite(candle.high) &&
      Number.isFinite(candle.low) &&
      Number.isFinite(candle.close) &&
      candle.open > 0 &&
      candle.high > 0 &&
      candle.low > 0 &&
      candle.close > 0 &&
      candle.high >= candle.open &&
      candle.high >= candle.close &&
      candle.high >= candle.low &&
      candle.low <= candle.open &&
      candle.low <= candle.close &&
      (volume == null || volume >= 0);
    if (!valid && process.env.NODE_ENV !== "production") {
      console.warn("Invalid candle ignored", key, candle);
    }
    return valid;
  });

  if (looksLikeCloseOnlyCandles(validCandles)) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("Close-only candle set ignored", key, validCandles.at(-1));
    }
    return [];
  }

  return validCandles;
}

async function fetchJsonWithRetry(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "WarRoom/1.0 learning platform",
          Accept: "application/json"
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await delay(400 * attempt);
    }
  }
  throw lastError;
}

function historyPayload(instrument, range, interval, candles, source) {
  const lastUpdated = candles.at(-1)?.time || null;
  return {
    key: instrument.key,
    symbol: instrument.symbol,
    exchange: instrument.exchange,
    name: instrument.name,
    instrumentType: instrument.instrumentType,
    range,
    interval,
    candles,
    source,
    lastUpdated,
    providerSymbol: providerSymbolFor(instrument),
    providerName: source,
    candlesAvailable: candles.length > 0,
    candleCount: candles.length,
    lastCandleError: candles.length ? null : "No candle data returned",
    lastCheckedAt: Math.floor(Date.now() / 1000),
    volumeAvailable: candles.some((candle) => Number(candle.volume) > 0),
    status: getMarketStatus()
  };
}

function unavailableQuote(symbol, exchange, message) {
  return {
    key: `${String(exchange || "")}:${String(symbol || "")}`.toUpperCase(),
    symbol,
    exchange,
    price: null,
    previousClose: null,
    change: null,
    changePercent: null,
    volume: null,
    source: "none",
    providerSymbol: null,
    providerName: "none",
    quoteAvailable: false,
    candlesAvailable: false,
    delayed: false,
    stale: false,
    error: message,
    dataState: "unavailable",
    timestamp: Math.floor(Date.now() / 1000)
  };
}

function withProviderOverride(instrument, providerSymbol) {
  if (!instrument || !providerSymbol) return instrument;
  const normalized = String(providerSymbol).trim().toUpperCase();
  return {
    ...instrument,
    providerSymbol: normalized,
    yahooSymbol: isYahooProviderSymbol(normalized) ? normalized : instrument.yahooSymbol
  };
}

function providerSymbolFor(instrument, provider = providerName()) {
  if (!instrument) return null;
  if (String(provider).toLowerCase().includes("yahoo")) return yahooSymbolFor(instrument);
  return instrument.providerSymbol || instrument.yahooSymbol || yahooSymbolFor(instrument);
}

function yahooSymbolFor(instrument) {
  if (!instrument) return null;
  const symbol = String(instrument.symbol || "").toUpperCase();
  const exchange = String(instrument.exchange || "").toUpperCase();
  if (symbol === "NIFTY" || symbol === "NIFTY50") return "^NSEI";
  if (symbol === "BANKNIFTY") return "^NSEBANK";
  if (symbol === "SENSEX") return "^BSESN";
  const current = String(instrument.yahooSymbol || instrument.providerSymbol || "").toUpperCase();
  if (isYahooProviderSymbol(current)) return current;
  if (exchange === "NSE") return `${symbol}.NS`;
  if (exchange === "BSE") return `${symbol}.BO`;
  return current || null;
}

function isYahooProviderSymbol(value) {
  return Boolean(value) && (value.startsWith("^") || value.endsWith(".NS") || value.endsWith(".BO"));
}

function providerName() {
  if (providerMode() === "twelvedata" && process.env.TWELVE_DATA_API_KEY) return "Twelve Data";
  return "Yahoo Finance delayed/free chart feed";
}

function providerMode() {
  return String(process.env.MARKET_DATA_PROVIDER || "auto").toLowerCase();
}

function shouldUseCachedCandles(rangeKey, candles) {
  const status = getMarketStatus();
  if (rangeKey.startsWith("DATE:") || rangeKey.startsWith("CUSTOM:")) return true;
  if (!status.open) return true;
  const latest = candles.at(-1)?.time || 0;
  return Math.floor(Date.now() / 1000) - latest < 20;
}

function freshCachedQuote(instrument) {
  const cached = getCachedQuote(instrument.key) || getCachedQuote(instrument.symbol);
  if (!cached || !shouldUseCachedQuote(cached)) return null;
  const cleanSource = String(cached.source || providerName()).replace(/\s+cache$/i, "");
  return {
    ...cached,
    key: instrument.key,
    symbol: instrument.symbol,
    exchange: instrument.exchange,
    name: instrument.name,
    instrumentType: instrument.instrumentType,
    providerSymbol: providerSymbolFor(instrument, cleanSource),
    providerName: cached.providerName || cleanSource,
    source: cleanSource,
    quoteAvailable: true,
    candlesAvailable: Boolean(yahooSymbolFor(instrument)),
    stale: false,
    delayed: cached.delayed ?? String(cached.source || "").toLowerCase().includes("yahoo")
  };
}

function shouldUseCachedQuote(cached) {
  const timestamp = Number(cached.cachedAt || cached.timestamp);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return false;
  const ageSeconds = Math.floor(Date.now() / 1000) - timestamp;
  if (ageSeconds < 0) return false;
  const ttl = getMarketStatus().open ? 10 : 300;
  return ageSeconds <= ttl;
}

function normalizeYahooRange(range, interval) {
  if (["1m"].includes(interval)) return "1d";
  if (["5m"].includes(interval)) return range === "1d" ? "5d" : range;
  if (["15m", "30m"].includes(interval)) return ["1d", "5d"].includes(range) ? "1mo" : range;
  if (interval === "1h") return ["1d", "5d", "1mo"].includes(range) ? "3mo" : range;
  return range || getTimeframe(interval).defaultRange || "1y";
}

function parseInstrumentRequest(request) {
  if (typeof request === "object" && request) return request;
  const raw = String(request || "").trim();
  if (raw.includes(":")) {
    const [exchange, symbol] = raw.split(":");
    return { exchange: exchange.toUpperCase(), symbol: symbol.toUpperCase() };
  }
  return { symbol: raw.toUpperCase(), exchange: "" };
}

function finiteOr(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function looksLikeCloseOnlyCandles(candles) {
  if (candles.length < 10) return false;
  const flat = candles.filter((candle) => candle.open === candle.high && candle.high === candle.low && candle.low === candle.close).length;
  const missingVolume = candles.filter((candle) => candle.volume == null || Number(candle.volume) === 0).length;
  return flat / candles.length > 0.75 && missingVolume / candles.length > 0.75;
}

function chartDiagnostic(instrument, interval, candles, errorMessage) {
  const latest = candles.at(-1);
  return {
    instrument,
    provider: latest?.source || providerName(),
    providerSymbol: providerSymbolFor(instrument, latest?.source),
    interval,
    quoteSuccess: null,
    candleSuccess: Boolean(candles.length),
    candleCount: candles.length,
    latestCandle: latest,
    latestCandleTime: latest?.time || null,
    errorMessage: errorMessage || null,
    marketStatus: getMarketStatus()
  };
}

function sanitizeUrl(value) {
  try {
    const url = new URL(value);
    if (url.searchParams.has("apikey")) url.searchParams.set("apikey", "REDACTED");
    if (url.searchParams.has("token")) url.searchParams.set("token", "REDACTED");
    return url.toString();
  } catch {
    return String(value || "").replace(/(apikey|token)=([^&]+)/gi, "$1=REDACTED");
  }
}

function devLog(label, payload) {
  if (process.env.NODE_ENV === "production") return;
  const safe = {
    selected: payload.instrument?.symbol,
    exchange: payload.instrument?.exchange,
    token: payload.instrument?.token,
    providerSymbol: payload.providerSymbol || providerSymbolFor(payload.instrument, payload.provider),
    provider: payload.provider || payload.quote?.source || payload.latestCandle?.source,
    interval: payload.interval,
    requestUrl: payload.requestUrl,
    quoteSuccess: payload.quoteSuccess,
    candleSuccess: payload.candleSuccess,
    candleCount: payload.candleCount,
    latestQuote: payload.quote,
    latestCandle: payload.latestCandle,
    latestCandleTime: payload.latestCandleTime,
    previousClose: payload.quote?.previousClose,
    errorMessage: payload.errorMessage,
    timeframe: payload.interval,
    marketStatus: payload.marketStatus || getMarketStatus(),
    lastUpdated: new Date().toISOString()
  };
  console.log(`[warroom:${label}]`, safe);
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function mapWithConcurrency(items, limit, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;
  const workerCount = Math.min(limit, items.length);

  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      results[index] = await mapper(items[index], index);
    }
  }));

  return results;
}
