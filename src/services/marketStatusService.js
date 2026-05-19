import { getMarketStatus } from "../utils/market";

export const MARKET_SESSION = {
  PRE_OPEN: "PRE_OPEN",
  MARKET_LIVE: "MARKET_LIVE",
  MARKET_CLOSED: "MARKET_CLOSED",
  WEEKEND: "WEEKEND",
  HOLIDAY: "HOLIDAY"
};

export const DATA_FRESHNESS = {
  LIVE_DATA: "LIVE_DATA",
  DELAYED_DATA: "DELAYED_DATA",
  STALE_DATA: "STALE_DATA",
  LAST_CLOSE: "LAST_CLOSE",
  DATA_UNAVAILABLE: "DATA_UNAVAILABLE"
};

export const PROVIDER_STATUS = {
  CONNECTED: "CONNECTED",
  CONNECTING: "CONNECTING",
  ERROR: "ERROR",
  RATE_LIMITED: "RATE_LIMITED",
  FALLBACK: "FALLBACK"
};

export function getIndianMarketSession(now = new Date()) {
  const raw = getMarketStatus(now);
  let marketSession = MARKET_SESSION.MARKET_CLOSED;
  if (raw.phase === "open") marketSession = MARKET_SESSION.MARKET_LIVE;
  else if (raw.phase === "pre") marketSession = MARKET_SESSION.PRE_OPEN;
  else if (raw.phase === "holiday") marketSession = MARKET_SESSION.HOLIDAY;
  else if (raw.detail?.toLowerCase().includes("weekend")) marketSession = MARKET_SESSION.WEEKEND;

  return {
    ...raw,
    marketSession,
    label: labelForMarketSession(marketSession),
    isOpen: marketSession === MARKET_SESSION.MARKET_LIVE
  };
}

export function getDataFreshness({
  lastUpdateTime,
  now = new Date(),
  marketSession,
  providerDelayed = false,
  providerDelayMinutes = 15,
  failureCount = 0,
  staleAfterSeconds
} = {}) {
  if (failureCount >= 3) return DATA_FRESHNESS.DATA_UNAVAILABLE;
  if (!lastUpdateTime) return DATA_FRESHNESS.DATA_UNAVAILABLE;

  const timestamp = normalizeTimestamp(lastUpdateTime);
  if (!timestamp) return DATA_FRESHNESS.DATA_UNAVAILABLE;

  if (marketSession !== MARKET_SESSION.MARKET_LIVE) return DATA_FRESHNESS.LAST_CLOSE;

  const ageSeconds = Math.max(0, Math.floor(now.getTime() / 1000) - timestamp);
  const staleLimit = staleAfterSeconds ?? Math.max(providerDelayMinutes * 60 + 180, 300);
  if (ageSeconds > staleLimit) return DATA_FRESHNESS.STALE_DATA;
  if (providerDelayed) return DATA_FRESHNESS.DELAYED_DATA;
  return DATA_FRESHNESS.LIVE_DATA;
}

export function getProviderStatus({ state, failureCount = 0, fallback = false, rateLimited = false } = {}) {
  if (rateLimited) return PROVIDER_STATUS.RATE_LIMITED;
  if (fallback) return PROVIDER_STATUS.FALLBACK;
  if (failureCount >= 3) return PROVIDER_STATUS.ERROR;
  if (state === "connecting" || state === "reconnecting") return PROVIDER_STATUS.CONNECTING;
  if (state === "error") return PROVIDER_STATUS.ERROR;
  return PROVIDER_STATUS.CONNECTED;
}

export function labelForMarketSession(value) {
  if (value === MARKET_SESSION.MARKET_LIVE) return "MARKET LIVE";
  if (value === MARKET_SESSION.PRE_OPEN) return "PRE-OPEN";
  if (value === MARKET_SESSION.WEEKEND) return "WEEKEND";
  if (value === MARKET_SESSION.HOLIDAY) return "HOLIDAY";
  return "MARKET CLOSED";
}

export function labelForDataFreshness(value) {
  if (value === DATA_FRESHNESS.LIVE_DATA) return "Live";
  if (value === DATA_FRESHNESS.DELAYED_DATA) return "Delayed";
  if (value === DATA_FRESHNESS.STALE_DATA) return "Stale";
  if (value === DATA_FRESHNESS.LAST_CLOSE) return "Last close";
  return "Data unavailable";
}

export function normalizeTimestamp(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n > 10_000_000_000 ? Math.floor(n / 1000) : Math.floor(n);
}
