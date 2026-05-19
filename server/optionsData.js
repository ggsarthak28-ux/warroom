const DEFAULT_UNDERLYINGS = ["NIFTY", "BANKNIFTY", "FINNIFTY"];

export async function getOptionUnderlyings() {
  return DEFAULT_UNDERLYINGS.map((symbol) => ({
    symbol,
    supported: false,
    reason: "Real derivatives provider not connected"
  }));
}

export async function getExpiries(symbol) {
  return {
    symbol,
    expiries: [],
    providerStatus: "NOT_CONNECTED",
    message: "Real option-chain data requires a derivatives data provider."
  };
}

export async function getOptionChain(symbol, expiry) {
  return {
    symbol,
    expiry,
    spotPrice: null,
    atmStrike: null,
    pcr: null,
    maxPain: null,
    rows: [],
    providerStatus: "NOT_CONNECTED",
    lastUpdated: null,
    message: "Real option-chain data requires a derivatives data provider."
  };
}

export function getMaxPain(optionChain = []) {
  if (!optionChain.length) return null;
  return null;
}

export function getPCR(optionChain = []) {
  if (!optionChain.length) return null;
  return null;
}

export function getATMStrike(spotPrice, strikes = []) {
  const price = Number(spotPrice);
  if (!Number.isFinite(price) || !strikes.length) return null;
  return strikes.reduce((closest, strike) => (
    Math.abs(strike - price) < Math.abs(closest - price) ? strike : closest
  ), strikes[0]);
}
