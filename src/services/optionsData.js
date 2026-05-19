import { readJson } from "./shared";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

export async function getOptionUnderlyings({ signal } = {}) {
  const response = await fetch(apiUrl("/api/options/underlyings"), { signal });
  return readJson(response);
}

export async function getExpiries(symbol, { signal } = {}) {
  const params = new URLSearchParams({ symbol });
  const response = await fetch(apiUrl(`/api/options/expiries?${params}`), { signal });
  return readJson(response);
}

export async function getOptionChain(symbol, expiry, { signal } = {}) {
  const params = new URLSearchParams({ symbol });
  if (expiry) params.set("expiry", expiry);
  const response = await fetch(apiUrl(`/api/options/chain?${params}`), { signal });
  return readJson(response);
}
