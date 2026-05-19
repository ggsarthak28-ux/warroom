import {
  fetchCandles,
  fetchInstruments,
  fetchMarketStatus,
  fetchQuote,
  fetchQuotes,
  searchInstruments
} from "./api";

export const getAllInstruments = fetchInstruments;
export const getQuote = fetchQuote;
export const getQuotes = fetchQuotes;
export const getCandles = fetchCandles;
export const getMarketStatus = fetchMarketStatus;
export { searchInstruments };

export async function getPreviousClose(symbol, exchange, options) {
  const quote = await fetchQuote(symbol, exchange, options);
  return quote?.previousClose ?? null;
}
