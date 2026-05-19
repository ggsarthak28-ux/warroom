import { readJson } from "./shared";

export async function getOptionUnderlyings({ signal } = {}) {
  const response = await fetch("/api/options/underlyings", { signal });
  return readJson(response);
}

export async function getExpiries(symbol, { signal } = {}) {
  const params = new URLSearchParams({ symbol });
  const response = await fetch(`/api/options/expiries?${params}`, { signal });
  return readJson(response);
}

export async function getOptionChain(symbol, expiry, { signal } = {}) {
  const params = new URLSearchParams({ symbol });
  if (expiry) params.set("expiry", expiry);
  const response = await fetch(`/api/options/chain?${params}`, { signal });
  return readJson(response);
}
