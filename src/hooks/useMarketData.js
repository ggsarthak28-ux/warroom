import { useCallback, useEffect, useMemo, useState } from "react";
import { compareDates, fetchHistory, fetchInstruments, fetchQuotes, searchInstruments as apiSearch } from "../services/api";
import { connectMarketStream } from "../services/realtime";
import { getDataFreshness, getProviderStatus, labelForDataFreshness, MARKET_SESSION } from "../services/marketStatusService";
import { instrumentKey, searchStocks, updateOnlyChangedStock } from "../utils/marketMath";
import { getTimeframe } from "../utils/timeframes";
import { useInterval } from "./useInterval";

const DEFAULT_KEYS = ["NSE:NIFTY", "NSE:BANKNIFTY", "BSE:SENSEX"];
export const MARKET_LIST_TABS = ["Popular", "Nifty 50", "Nifty Next 50", "Bank Nifty", "All NSE", "All BSE", "Quote Available", "Chart Available", "Unsupported"];
const POPULAR_KEYS = [
  "NSE:NIFTY", "NSE:BANKNIFTY", "BSE:SENSEX", "NSE:RELIANCE", "NSE:TCS", "NSE:INFY", "NSE:HDFCBANK",
  "NSE:ICICIBANK", "NSE:SBIN", "NSE:LT", "NSE:ITC", "NSE:BHARTIARTL", "NSE:AXISBANK", "NSE:KOTAKBANK",
  "NSE:HINDUNILVR", "NSE:BAJFINANCE", "NSE:ADANIENT", "NSE:ADANIPORTS", "NSE:ADANIGREEN", "NSE:TATAMOTORS",
  "NSE:TATASTEEL", "NSE:MARUTI", "NSE:M&M", "NSE:SUNPHARMA", "NSE:CIPLA", "NSE:WIPRO", "NSE:HCLTECH",
  "NSE:TECHM", "NSE:POWERGRID", "NSE:ONGC", "NSE:NTPC", "NSE:COALINDIA", "NSE:ULTRACEMCO", "NSE:ASIANPAINT",
  "NSE:TITAN", "NSE:NESTLEIND", "NSE:JSWSTEEL", "NSE:GRASIM", "NSE:HINDALCO", "NSE:BAJAJFINSV", "NSE:INDUSINDBK"
];
const BANK_KEYS = ["NSE:BANKNIFTY", "NSE:HDFCBANK", "NSE:ICICIBANK", "NSE:SBIN", "NSE:AXISBANK", "NSE:KOTAKBANK", "NSE:INDUSINDBK", "NSE:BANKBARODA", "NSE:PNB", "NSE:FEDERALBNK"];
const NEXT50_KEYS = ["NSE:ADANIGREEN", "NSE:DMART", "NSE:VEDL", "NSE:PIDILITIND", "NSE:DABUR", "NSE:GODREJCP", "NSE:SIEMENS", "NSE:ICICIGI", "NSE:NAUKRI", "NSE:INDIGO"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function placeholderInstrument(key = "NSE:NIFTY") {
  const [exchange, symbol] = key.split(":");
  return {
    key,
    symbol,
    exchange,
    name: "Loading instruments...",
    instrumentType: "Index",
    price: null,
    previousClose: null,
    change: null,
    changePercent: null,
    volume: null,
    dataState: "loading"
  };
}

export function useMarketData(marketStatus) {
  const [instruments, setInstruments] = useState([]);
  const [selectedKey, setSelectedKey] = useState("NSE:NIFTY");
  const [listTab, setListTab] = useState("Popular");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [timeframe, setTimeframe] = useState("1m");
  const [chartType, setChartType] = useState("candles");
  const [selectedDate, setSelectedDate] = useState("");
  const [compareRange, setCompareRange] = useState({ from: "", to: todayISO() });
  const [compareResult, setCompareResult] = useState(null);
  const [activeIndicators, setActiveIndicators] = useState(["SMA", "EMA", "Volume"]);
  const [banner, setBanner] = useState(null);
  const [loadingInstruments, setLoadingInstruments] = useState(true);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [connection, setConnection] = useState({ status: "connecting", source: "none" });
  const [history, setHistory] = useState({});
  const [historyMeta, setHistoryMeta] = useState({});
  const [quoteFailures, setQuoteFailures] = useState(0);
  const [candleFailures, setCandleFailures] = useState(0);

  const selected = instruments.find((item) => item.key === selectedKey) || placeholderInstrument(selectedKey);
  const selectedHistory = history[selected.key] || [];
  const selectedChartStatus = historyMeta[selected.key] || chartStatusFromSelection(selected, selectedHistory);
  const visibleStocks = useMemo(() => {
    const base = query.trim() ? searchResults : listForTab(listTab, instruments);
    return searchStocks(query, base).slice(0, 80);
  }, [instruments, listTab, query, searchResults]);

  const visibleStockKeyString = useMemo(
    () => visibleStocks.slice(0, 48).map((item) => item.key).join("|"),
    [visibleStocks]
  );

  const activeSymbols = useMemo(() => {
    const popularKeys = POPULAR_KEYS.slice(0, 42);
    const visibleKeys = visibleStockKeyString ? visibleStockKeyString.split("|") : [];
    return Array.from(new Set([...DEFAULT_KEYS, selectedKey, ...popularKeys, ...visibleKeys])).filter(Boolean);
  }, [selectedKey, visibleStockKeyString]);

  const applyQuotes = useCallback((quotes) => {
    if (!quotes?.length) return;
    setInstruments((current) => updateOnlyChangedStock(current, quotes));
    setSearchResults((current) => updateOnlyChangedStock(current, quotes));
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoadingInstruments(true);
    fetchInstruments({ signal: controller.signal })
      .then((items) => {
        setInstruments(items);
        if (!items.some((item) => item.key === selectedKey)) {
          setSelectedKey(items.find((item) => item.key === "NSE:NIFTY")?.key || items[0]?.key || "NSE:NIFTY");
        }
      })
      .catch((error) => {
        if (error.name !== "AbortError") setBanner("Loading instruments failed. Market data unavailable.");
      })
      .finally(() => setLoadingInstruments(false));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return undefined;
    }
    const controller = new AbortController();
    setLoadingSearch(true);
    apiSearch(query, { signal: controller.signal })
      .then(setSearchResults)
      .catch((error) => {
        if (error.name !== "AbortError") setBanner("Searching stocks failed. Try again.");
      })
      .finally(() => setLoadingSearch(false));
    return () => controller.abort();
  }, [query]);

  useEffect(() => {
    if (!activeSymbols.length) return undefined;
    const controller = new AbortController();
    fetchQuotes(activeSymbols, { signal: controller.signal })
      .then((quotes) => {
        applyQuotes(quotes);
        setQuoteFailures(0);
        const unavailable = quotes.filter((quote) => quote.error).length;
        setBanner(unavailable ? "Some market data is unavailable. Previous valid data is kept when possible." : null);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setQuoteFailures((count) => count + 1);
          setBanner("Fetching quote data failed. Keeping previous valid status unless failures continue.");
        }
      });
    return () => controller.abort();
  }, [activeSymbols, applyQuotes]);

  useEffect(() => {
    if (!selected?.symbol || !selected?.exchange) return undefined;
    const controller = new AbortController();
    const tf = getTimeframe(timeframe);
    setLoadingHistory(true);
    setHistory((current) => ({ ...current, [selected.key]: [] }));
    setHistoryMeta((current) => ({
      ...current,
      [selected.key]: {
        ...chartStatusFromSelection(selected, []),
        loading: true,
        interval: tf.yahooInterval,
        lastCandleError: null,
        lastCheckedAt: Math.floor(Date.now() / 1000)
      }
    }));
    fetchHistory(
      {
        symbol: selected.symbol,
        exchange: selected.exchange,
        providerSymbol: selected.providerSymbol,
        range: tf.defaultRange,
        interval: tf.yahooInterval,
        date: selectedDate || undefined
      },
      { signal: controller.signal }
    )
      .then((payload) => {
        setHistory((current) => ({ ...current, [selected.key]: payload.candles || [] }));
        setHistoryMeta((current) => ({
          ...current,
          [selected.key]: chartStatusFromPayload(selected, payload)
        }));
        setConnection((current) => ({ ...current, source: payload.source || current.source }));
        setCandleFailures(0);
        if (payload.error) setBanner(payload.error);
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          setHistory((current) => ({ ...current, [selected.key]: [] }));
          setHistoryMeta((current) => ({
            ...current,
            [selected.key]: {
              ...chartStatusFromSelection(selected, []),
              candlesAvailable: false,
              candleCount: 0,
              loading: false,
              lastCandleError: "No candle data returned",
              lastCheckedAt: Math.floor(Date.now() / 1000)
            }
          }));
          setCandleFailures((count) => count + 1);
          setBanner("Loading chart failed. Chart data unavailable for the selected symbol.");
        }
      })
      .finally(() => setLoadingHistory(false));
    return () => controller.abort();
  }, [selected.key, selected.symbol, selected.exchange, selected.providerSymbol, timeframe, selectedDate]);

  useEffect(() => {
    return connectMarketStream({
      symbols: activeSymbols,
      onTick: applyQuotes,
      onState: setConnection,
      onError: () => {
        setQuoteFailures((count) => count + 1);
        setBanner("Realtime WebSocket interrupted. Retrying without fake prices.");
      }
    });
  }, [activeSymbols, applyQuotes]);

  useInterval(() => {
    if (marketStatus?.session?.marketSession !== MARKET_SESSION.MARKET_LIVE || !activeSymbols.length) return;
    fetchQuotes(activeSymbols)
      .then((quotes) => {
        applyQuotes(quotes);
        setQuoteFailures(0);
      })
      .catch(() => {
        setQuoteFailures((count) => count + 1);
        setBanner("Auto-refresh failed. Keeping previous valid market data.");
      });
  }, 7000);

  useInterval(() => {
    if (marketStatus?.session?.marketSession !== MARKET_SESSION.MARKET_LIVE || selectedDate || !selected?.symbol || !selected?.exchange) return;
    const tf = getTimeframe(timeframe);
    fetchHistory({
      symbol: selected.symbol,
      exchange: selected.exchange,
      providerSymbol: selected.providerSymbol,
      range: tf.defaultRange,
      interval: tf.yahooInterval
    })
      .then((payload) => {
        setHistory((current) => ({ ...current, [selected.key]: payload.candles || [] }));
        setHistoryMeta((current) => ({
          ...current,
          [selected.key]: chartStatusFromPayload(selected, payload)
        }));
        setConnection((current) => ({ ...current, source: payload.source || current.source }));
        setCandleFailures(0);
        if (payload.error) setBanner(payload.error);
      })
      .catch(() => {
        setCandleFailures((count) => count + 1);
        setBanner("Refreshing chart failed. Keeping the selected symbol marked as stale.");
      });
  }, 15000);

  const runCompare = useCallback(async () => {
    if (!compareRange.from || !compareRange.to) return;
    const result = await compareDates({
      symbol: selected.symbol,
      exchange: selected.exchange,
      ...compareRange
    });
    setCompareResult(result);
    if (result.error) setBanner(result.error);
  }, [compareRange, selected.exchange, selected.symbol]);

  const toggleIndicator = useCallback((name) => {
    setActiveIndicators((current) =>
      current.includes(name) ? current.filter((item) => item !== name) : [...current, name]
    );
  }, []);

  const priced = instruments.filter((item) => Number.isFinite(Number(item.changePercent)));
  const topGainers = [...priced].sort((a, b) => b.changePercent - a.changePercent).slice(0, 4);
  const topLosers = [...priced].sort((a, b) => a.changePercent - b.changePercent).slice(0, 4);
  const dataStatus = useMemo(() => {
    const latestCandle = selectedHistory.at(-1);
    const session = marketStatus?.session?.marketSession || MARKET_SESSION.MARKET_CLOSED;
    const quoteFreshness = getDataFreshness({
      lastUpdateTime: selected.lastUpdated,
      marketSession: session,
      providerDelayed: selected.delayed,
      failureCount: quoteFailures
    });
    const candleFreshness = getDataFreshness({
      lastUpdateTime: latestCandle?.time,
      marketSession: session,
      providerDelayed: selected.delayed,
      failureCount: candleFailures,
      staleAfterSeconds: getTimeframe(timeframe).yahooInterval === "1m" ? 1200 : 7200
    });
    const providerStatus = getProviderStatus({
      state: connection.status,
      failureCount: Math.max(quoteFailures, candleFailures),
      fallback: selected.fallback
    });
    if (import.meta.env.DEV) {
      console.debug("[warroom:data-status]", {
        istTime: marketStatus?.time,
        marketSession: session,
        quoteTimestamp: selected.lastUpdated,
        candleTimestamp: latestCandle?.time,
        quoteFreshness,
        candleFreshness,
        providerStatus,
        updatedBy: "useMarketData"
      });
    }
    return {
      quoteFreshness,
      quoteLabel: labelForDataFreshness(quoteFreshness),
      candleFreshness,
      candleLabel: labelForDataFreshness(candleFreshness),
      providerStatus,
      lastQuoteUpdate: selected.lastUpdated || null,
      lastCandleUpdate: latestCandle?.time || null,
      quoteFailures,
      candleFailures
    };
  }, [candleFailures, connection.status, marketStatus?.session?.marketSession, marketStatus?.time, quoteFailures, selected.delayed, selected.fallback, selected.lastUpdated, selectedHistory, timeframe]);

  function selectInstrument(instrumentOrKey) {
    const key = typeof instrumentOrKey === "string" ? instrumentOrKey : instrumentKey(instrumentOrKey);
    if (typeof instrumentOrKey !== "string") {
      setInstruments((current) => upsertInstrument(current, instrumentOrKey));
      setSearchResults((current) => upsertInstrument(current, instrumentOrKey));
    }
    setSelectedKey(key);
    setSelectedDate("");
    setHistory((current) => ({ ...current, [key]: [] }));
    setHistoryMeta((current) => ({
      ...current,
      [key]: {
        ...chartStatusFromSelection(typeof instrumentOrKey === "string" ? placeholderInstrument(key) : instrumentOrKey, []),
        loading: true,
        lastCheckedAt: Math.floor(Date.now() / 1000)
      }
    }));
  }

  return {
    stocks: instruments,
    visibleStocks,
    listTab,
    setListTab,
    listTabs: MARKET_LIST_TABS,
    loadingInstruments,
    loadingSearch,
    globals: [],
    sectors: [],
    selected,
    selectedSymbol: selected.symbol,
    selectedKey,
    selectedHistory,
    chartStatus: selectedChartStatus,
    orderBook: null,
    topGainers,
    topLosers,
    query,
    setQuery,
    selectSymbol: selectInstrument,
    timeframe,
    setTimeframe,
    chartType,
    setChartType,
    selectedDate,
    setSelectedDate,
    compareRange,
    setCompareRange,
    compareResult,
    runCompare,
    activeIndicators,
    toggleIndicator,
    loadingHistory,
    banner,
    setBanner,
    connection,
    dataStatus,
    marketSession: marketStatus?.session,
    applyQuotes
  };
}

function upsertInstrument(items, instrument) {
  const key = instrumentKey(instrument);
  if (!key) return items;
  const exists = items.some((item) => item.key === key);
  if (!exists) return [...items, instrument];
  return items.map((item) => (item.key === key ? { ...item, ...instrument } : item));
}

function chartStatusFromSelection(selected, candles) {
  return {
    symbol: selected.symbol,
    exchange: selected.exchange,
    providerSymbol: selected.providerSymbol || null,
    providerName: selected.providerName || selected.source || "Yahoo Finance delayed/free chart feed",
    quoteAvailable: Number.isFinite(Number(selected.price)),
    candlesAvailable: Boolean(candles?.length),
    candleCount: candles?.length || 0,
    lastCandleError: null,
    lastCheckedAt: selected.availabilityCheckedAt || null,
    loading: false
  };
}

function chartStatusFromPayload(selected, payload) {
  const candles = payload.candles || [];
  return {
    symbol: payload.symbol || selected.symbol,
    exchange: payload.exchange || selected.exchange,
    providerSymbol: payload.providerSymbol || selected.providerSymbol || null,
    providerName: payload.providerName || payload.source || selected.providerName || selected.source || "Yahoo Finance delayed/free chart feed",
    quoteAvailable: Number.isFinite(Number(selected.price)),
    candlesAvailable: Boolean(candles.length),
    candleCount: payload.candleCount ?? candles.length,
    lastCandleError: payload.lastCandleError || payload.error || null,
    lastCheckedAt: payload.lastCheckedAt || Math.floor(Date.now() / 1000),
    loading: false
  };
}

function listForTab(tab, instruments) {
  const byKey = new Map(instruments.map((instrument) => [instrument.key, instrument]));
  const pick = (keys) => keys.map((key) => byKey.get(key)).filter(Boolean);
  const hasQuote = (instrument) => Number.isFinite(Number(instrument.price));
  const isUnsupported = (instrument) => instrument.error || instrument.dataState === "unavailable";
  const hasCandles = (instrument) => instrument.candlesAvailable === true || Boolean(instrument.providerSymbol);

  if (tab === "Popular") {
    const popular = pick(POPULAR_KEYS);
    const priced = popular.filter(hasQuote);
    return priced.length ? priced : popular;
  }
  if (tab === "Nifty 50") return pick(POPULAR_KEYS.filter((key) => key.startsWith("NSE:")));
  if (tab === "Nifty Next 50") return pick(NEXT50_KEYS);
  if (tab === "Bank Nifty") return pick(BANK_KEYS);
  if (tab === "All NSE") return instruments.filter((item) => item.exchange === "NSE").slice(0, 500);
  if (tab === "All BSE") return instruments.filter((item) => item.exchange === "BSE").slice(0, 500);
  if (tab === "Quote Available") return instruments.filter(hasQuote);
  if (tab === "Chart Available") return instruments.filter((item) => hasQuote(item) && hasCandles(item));
  if (tab === "Unsupported") return instruments.filter(isUnsupported);
  return pick(POPULAR_KEYS);
}
