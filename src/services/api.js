const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

async function readJson(response) {
  const text = await response.text();
  const data = text ? JSON.parse(text) : {};
  if (!response.ok) {
    throw new Error(data.error || `Request failed with ${response.status}`);
  }
  return data;
}

export async function fetchQuotes(symbols, { signal } = {}) {
  if (!symbols?.length) return [];
  const params = new URLSearchParams({ symbols: symbols.join(",") });
  const response = await fetch(apiUrl(`/api/quotes?${params}`), { signal });
  const data = await readJson(response);
  return data.quotes || [];
}

export async function fetchQuote(symbol, exchange, { signal } = {}) {
  const params = new URLSearchParams({ symbol });
  if (exchange) params.set("exchange", exchange);
  const response = await fetch(apiUrl(`/api/quote?${params}`), { signal });
  const data = await readJson(response);
  return data.quote || null;
}

export async function fetchInstruments({ signal } = {}) {
  const response = await fetch(apiUrl("/api/instruments"), { signal });
  const data = await readJson(response);
  return data.instruments || [];
}

export async function searchInstruments(query, { signal } = {}) {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(apiUrl(`/api/search?${params}`), { signal });
  const data = await readJson(response);
  return data.results || [];
}

export async function fetchHistory(request, { signal } = {}) {
  const { symbol, exchange, providerSymbol, range, interval, date, from, to } = request;
  const params = new URLSearchParams({ symbol, range });
  if (interval) params.set("interval", interval);
  if (exchange) params.set("exchange", exchange);
  if (providerSymbol) params.set("providerSymbol", providerSymbol);
  if (date) params.set("date", date);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const response = await fetch(apiUrl(`/api/history?${params}`), { signal });
  return readJson(response);
}

export async function fetchCandles(request, { signal } = {}) {
  const { symbol, exchange, providerSymbol, range = "1d", interval, date, from, to } = request;
  const params = new URLSearchParams({ symbol, range });
  if (interval) params.set("interval", interval);
  if (exchange) params.set("exchange", exchange);
  if (providerSymbol) params.set("providerSymbol", providerSymbol);
  if (date) params.set("date", date);
  if (from) params.set("from", from);
  if (to) params.set("to", to);
  const response = await fetch(apiUrl(`/api/candles?${params}`), { signal });
  return readJson(response);
}

export async function compareDates(request, { signal } = {}) {
  const { symbol, exchange, from, to } = request;
  const params = new URLSearchParams({ symbol, from, to });
  if (exchange) params.set("exchange", exchange);
  const response = await fetch(apiUrl(`/api/compare?${params}`), { signal });
  return readJson(response);
}

export async function askMarketAI(question, context = {}, mode = "stock-analysis") {
  const response = await fetch(apiUrl("/api/ai/chat"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question, context, mode })
  });
  return readJson(response);
}

export async function fetchAIStatus({ signal } = {}) {
  const response = await fetch(apiUrl("/api/ai/status"), { signal });
  return readJson(response);
}

export async function fetchHealth() {
  const response = await fetch(apiUrl("/api/health"));
  return readJson(response);
}

export async function fetchMarketStatus({ signal } = {}) {
  const response = await fetch(apiUrl("/api/market-status"), { signal });
  return readJson(response);
}
