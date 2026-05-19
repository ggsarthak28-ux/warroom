import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";

const dbPath = process.env.VERCEL ? resolve("/tmp", "warroom.sqlite") : resolve("data", "warroom.sqlite");
mkdirSync(dirname(dbPath), { recursive: true });

export const db = new DatabaseSync(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS quotes (
    symbol TEXT PRIMARY KEY,
    ts INTEGER NOT NULL,
    price REAL NOT NULL,
    previousClose REAL,
    changePercent REAL,
    volume REAL,
    provider TEXT,
    payload TEXT
  );

  CREATE TABLE IF NOT EXISTS candles (
    symbol TEXT NOT NULL,
    rangeKey TEXT NOT NULL,
    interval TEXT NOT NULL,
    time INTEGER NOT NULL,
    open REAL,
    high REAL,
    low REAL,
    close REAL NOT NULL,
    volume REAL,
    provider TEXT,
    PRIMARY KEY (symbol, rangeKey, interval, time)
  );

  CREATE TABLE IF NOT EXISTS instruments (
    key TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    exchange TEXT NOT NULL,
    name TEXT NOT NULL,
    instrumentType TEXT NOT NULL,
    token TEXT,
    lotSize REAL,
    tickSize REAL,
    sector TEXT,
    isIndex INTEGER,
    yahooSymbol TEXT,
    providerSymbol TEXT,
    fetchedAt INTEGER NOT NULL,
    payload TEXT
  );

  CREATE TABLE IF NOT EXISTS provider_availability (
    key TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    exchange TEXT NOT NULL,
    providerName TEXT,
    providerSymbol TEXT,
    quoteAvailable INTEGER,
    candlesAvailable INTEGER,
    candleCount INTEGER,
    lastCheckedAt INTEGER NOT NULL,
    lastCandleError TEXT,
    lastError TEXT
  );
`);

ensureColumn("provider_availability", "candleCount", "INTEGER");
ensureColumn("provider_availability", "lastCandleError", "TEXT");

const upsertQuote = db.prepare(`
  INSERT INTO quotes(symbol, ts, price, previousClose, changePercent, volume, provider, payload)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(symbol) DO UPDATE SET
    ts=excluded.ts,
    price=excluded.price,
    previousClose=excluded.previousClose,
    changePercent=excluded.changePercent,
    volume=excluded.volume,
    provider=excluded.provider,
    payload=excluded.payload
`);

const getQuote = db.prepare("SELECT * FROM quotes WHERE symbol = ?");

const upsertCandle = db.prepare(`
  INSERT INTO candles(symbol, rangeKey, interval, time, open, high, low, close, volume, provider)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(symbol, rangeKey, interval, time) DO UPDATE SET
    open=excluded.open,
    high=excluded.high,
    low=excluded.low,
    close=excluded.close,
    volume=excluded.volume,
    provider=excluded.provider
`);

const getCandlesStatement = db.prepare(`
  SELECT time, open, high, low, close, volume, provider
  FROM candles
  WHERE symbol = ? AND rangeKey = ? AND interval = ?
  ORDER BY time ASC
`);

const upsertInstrument = db.prepare(`
  INSERT INTO instruments(
    key, symbol, exchange, name, instrumentType, token, lotSize, tickSize, sector, isIndex,
    yahooSymbol, providerSymbol, fetchedAt, payload
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(key) DO UPDATE SET
    symbol=excluded.symbol,
    exchange=excluded.exchange,
    name=excluded.name,
    instrumentType=excluded.instrumentType,
    token=excluded.token,
    lotSize=excluded.lotSize,
    tickSize=excluded.tickSize,
    sector=excluded.sector,
    isIndex=excluded.isIndex,
    yahooSymbol=excluded.yahooSymbol,
    providerSymbol=excluded.providerSymbol,
    fetchedAt=excluded.fetchedAt,
    payload=excluded.payload
`);

const getInstrumentsStatement = db.prepare(`
  SELECT * FROM instruments ORDER BY isIndex DESC, exchange ASC, symbol ASC
`);

const upsertAvailability = db.prepare(`
  INSERT INTO provider_availability(
    key, symbol, exchange, providerName, providerSymbol, quoteAvailable, candlesAvailable, candleCount, lastCheckedAt, lastCandleError, lastError
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(key) DO UPDATE SET
    symbol=excluded.symbol,
    exchange=excluded.exchange,
    providerName=excluded.providerName,
    providerSymbol=excluded.providerSymbol,
    quoteAvailable=excluded.quoteAvailable,
    candlesAvailable=excluded.candlesAvailable,
    candleCount=excluded.candleCount,
    lastCheckedAt=excluded.lastCheckedAt,
    lastCandleError=excluded.lastCandleError,
    lastError=excluded.lastError
`);

const getAvailabilityStatement = db.prepare("SELECT * FROM provider_availability WHERE key = ?");

export function saveQuotes(quotes = []) {
  const now = Math.floor(Date.now() / 1000);
  for (const quote of quotes) {
    const key = quote.key || `${quote.exchange || ""}:${quote.symbol || ""}`.toUpperCase();
    upsertQuote.run(
      key,
      quote.timestamp || now,
      quote.price,
      quote.previousClose,
      quote.changePercent,
      quote.volume,
      quote.source,
      JSON.stringify(quote)
    );
  }
}

export function getCachedQuote(symbol) {
  const row = getQuote.get(symbol);
  if (!row) return null;
  const payload = row.payload ? JSON.parse(row.payload) : {};
  return {
    ...payload,
    price: row.price,
    previousClose: row.previousClose,
    changePercent: row.changePercent,
    change: payload.change ?? (row.previousClose != null ? row.price - row.previousClose : null),
    volume: row.volume,
    source: `${row.provider || "cache"} cache`,
    timestamp: row.ts
  };
}

export function saveCandles(symbol, rangeKey, interval, candles, provider) {
  for (const candle of candles) {
    upsertCandle.run(
      symbol,
      rangeKey,
      interval,
      candle.time,
      candle.open,
      candle.high,
      candle.low,
      candle.close,
      candle.volume,
      provider
    );
  }
}

export function getCachedCandles(symbol, rangeKey, interval) {
  return getCandlesStatement.all(symbol, rangeKey, interval).map((row) => ({
    time: row.time,
    open: row.open ?? row.close,
    high: row.high ?? row.close,
    low: row.low ?? row.close,
    close: row.close,
    value: row.close,
    volume: row.volume ?? null,
    source: row.provider || "cache"
  }));
}

export function saveInstruments(instruments = []) {
  const now = Math.floor(Date.now() / 1000);
  for (const instrument of instruments) {
    upsertInstrument.run(
      instrument.key,
      instrument.symbol,
      instrument.exchange,
      instrument.name,
      instrument.instrumentType,
      instrument.token || null,
      instrument.lotSize ?? 1,
      instrument.tickSize ?? 0.05,
      instrument.sector || "",
      instrument.isIndex ? 1 : 0,
      instrument.yahooSymbol || null,
      instrument.providerSymbol || null,
      instrument.fetchedAt || now,
      JSON.stringify(instrument)
    );
  }
}

export function getCachedInstruments() {
  return getInstrumentsStatement.all().map((row) => ({
    key: row.key,
    symbol: row.symbol,
    exchange: row.exchange,
    name: row.name,
    instrumentType: row.instrumentType,
    token: row.token,
    lotSize: row.lotSize,
    tickSize: row.tickSize,
    sector: row.sector,
    isIndex: Boolean(row.isIndex),
    yahooSymbol: row.yahooSymbol,
    providerSymbol: row.providerSymbol,
    fetchedAt: row.fetchedAt
  }));
}

export function saveProviderAvailability(update = {}) {
  const key = update.key || `${update.exchange || ""}:${update.symbol || ""}`.toUpperCase();
  if (!key || key === ":") return null;
  const previous = getProviderAvailability(key) || {};
  const symbol = update.symbol || previous.symbol || key.split(":")[1] || "";
  const exchange = update.exchange || previous.exchange || key.split(":")[0] || "";
  const merged = {
    ...previous,
    ...update,
    key,
    symbol,
    exchange,
    lastCheckedAt: update.lastCheckedAt || Math.floor(Date.now() / 1000)
  };

  upsertAvailability.run(
    merged.key,
    merged.symbol,
    merged.exchange,
    merged.providerName || null,
    merged.providerSymbol || null,
    merged.quoteAvailable == null ? null : Number(Boolean(merged.quoteAvailable)),
    merged.candlesAvailable == null ? null : Number(Boolean(merged.candlesAvailable)),
    Number.isFinite(Number(merged.candleCount)) ? Number(merged.candleCount) : null,
    merged.lastCheckedAt,
    merged.lastCandleError || null,
    merged.lastError || null
  );
  return getProviderAvailability(key);
}

export function getProviderAvailability(key) {
  const row = getAvailabilityStatement.get(String(key || "").toUpperCase());
  if (!row) return null;
  return {
    key: row.key,
    symbol: row.symbol,
    exchange: row.exchange,
    providerName: row.providerName,
    providerSymbol: row.providerSymbol,
    quoteAvailable: row.quoteAvailable == null ? null : Boolean(row.quoteAvailable),
    candlesAvailable: row.candlesAvailable == null ? null : Boolean(row.candlesAvailable),
    candleCount: row.candleCount == null ? null : Number(row.candleCount),
    lastCheckedAt: row.lastCheckedAt,
    lastCandleError: row.lastCandleError,
    lastError: row.lastError
  };
}

function ensureColumn(table, column, definition) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  } catch (error) {
    if (!String(error.message || "").includes("duplicate column name")) throw error;
  }
}
