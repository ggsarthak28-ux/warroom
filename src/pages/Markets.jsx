import { useMemo, useState } from "react";
import { LightweightPriceChart } from "../charts/LightweightPriceChart";
import { Card } from "../components/Cards";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { classForChange, formatINR, formatPercent, formatVolume, timeIST } from "../utils/format";
import { safeRun } from "../utils/safeRun";
import { TIMEFRAMES } from "../utils/timeframes";

const INDICATORS = ["Volume", "SMA", "EMA", "Bollinger", "RSI", "MACD"];

export function Markets({ market, portfolio }) {
  const [trade, setTrade] = useState({ side: "BUY", quantity: 10 });
  const [message, setMessage] = useState("");
  const [watchlist, setWatchlist] = useLocalStorage("warroom-watchlist", ["NSE:NIFTY", "NSE:RELIANCE", "NSE:TCS", "NSE:HDFCBANK"]);
  const { selected, selectedHistory, visibleStocks } = market;
  const chartStatus = market.chartStatus || {};

  const holding = portfolio.summary.holdings.find((item) => item.key === selected.key);
  const estimated = useMemo(() => {
    const price = selected.price == null ? null : Number(selected.price);
    return Number.isFinite(price) ? Number(trade.quantity || 0) * price : null;
  }, [trade.quantity, selected.price]);
  const isWatched = watchlist.includes(selected.key);
  const watchedRows = market.stocks.filter((stock) => watchlist.includes(stock.key));
  const latestCandle = useMemo(() => latestValidCandle(selectedHistory), [selectedHistory]);
  const selectedVolume = selected.volume == null ? "Volume unavailable" : `Vol ${formatVolume(selected.volume)}`;
  const canPlaceOrder = selected.price != null && Number.isFinite(Number(selected.price)) && Number(trade.quantity) > 0;

  const submitOrder = () =>
    safeRun(() => {
      const result = portfolio.placeOrder({
        key: selected.key,
        symbol: selected.symbol,
        exchange: selected.exchange,
        side: trade.side,
        quantity: trade.quantity,
        price: selected.price
      });
      setMessage(result.message || `${trade.side} order placed in virtual portfolio.`);
    });

  function toggleWatch() {
    setWatchlist((current) =>
      current.includes(selected.key)
        ? current.filter((key) => key !== selected.key)
        : [...current, selected.key]
    );
  }

  return (
    <div className="markets-grid">
      <Card title="Watchlist" badge={`${watchlist.length} saved`} className="watch-card">
        <div className="market-tabs">
          {market.listTabs.map((tab) => (
            <button
              type="button"
              key={tab}
              className={market.listTab === tab ? "on" : ""}
              onClick={() => market.setListTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
        <input
          className="search"
          placeholder="Search symbol, company, sector..."
          value={market.query}
          onChange={(event) => market.setQuery(event.target.value)}
        />
        <div className="watch-head">
          <span>Symbol</span>
          <span>Price</span>
          <span>Change</span>
        </div>
        <div className="watchlist">
          {market.loadingInstruments && <div className="empty-state">Loading instruments...</div>}
          {market.loadingSearch && <div className="empty-state">Searching stocks...</div>}
          {!market.loadingInstruments && !market.loadingSearch && !visibleStocks.length && (
            <div className="empty-state">No matching stocks found.</div>
          )}
          {!market.loadingInstruments && !market.loadingSearch && visibleStocks.map((stock) => (
            <button
              type="button"
              className={`wl-row ${stock.key === selected.key ? "sel" : ""} ${stock.flash || ""}`}
              key={stock.key}
              onClick={() => market.selectSymbol(stock)}
            >
              <span>
                <b>{stock.symbol}</b>
                <small>{stock.name}</small>
                <em>{stock.exchange} - {stockStatusLabel(stock)}</em>
              </span>
              <span className="mono">{stock.price == null ? stockDataLabel(stock) : formatINR(stock.price, 2)}</span>
              <span className={classForChange(stock.changePercent)}>
                {stock.changePercent == null ? "No quote" : formatPercent(stock.changePercent)}
              </span>
            </button>
          ))}
        </div>
      </Card>

      <div className="market-focus">
        <div className="mobile-desk-search">
          <input
            className="search"
            placeholder="Search any stock, index, or global symbol..."
            value={market.query}
            onChange={(event) => market.setQuery(event.target.value)}
          />
          {market.loadingSearch && <span>Searching...</span>}
        </div>
        <section className={`hero ${classForChange(selected.changePercent)}`}>
          <div>
            <div className="eyebrow">{selected.exchange} / {selected.sector}</div>
            <h1>{selected.symbol}</h1>
            <p>{selected.name}</p>
          </div>
          <div className="hero-right">
            <div className={`hero-price ${classForChange(selected.changePercent)}`}>{formatINR(selected.price, 2)}</div>
            <div className={`hero-pill ${classForChange(selected.changePercent)}`}>{formatPercent(selected.changePercent)}</div>
          </div>
          <div className="hero-meta">
            <span>{selectedVolume}</span>
            <span>Source {selected.source || "unavailable"}</span>
            <span>{selected.delayed ? "Free/delayed data" : "Provider data"}</span>
            <span>{selected.error || selected.dataStatus || stockStatusLabel(selected)}</span>
            <span>{market.marketSession?.label || "MARKET CLOSED"}</span>
          </div>
        </section>

        <Card title="Market Desk Chart" badge={market.timeframe} className="chart-card-full">
          <div className="provider-warning">
            <span>Free/delayed data</span>
            <span>Intraday candles may be limited</span>
            <span>For exact live candles connect Upstox/Dhan/Fyers/Kite-compatible provider</span>
          </div>
          <div className="chart-control-panel">
            <div className="chart-tabs timeline-tabs">
              {TIMEFRAMES.map((tab) => (
                <button
                  className={`ct ${market.timeframe === tab.key ? "on" : ""}`}
                  type="button"
                  key={tab.key}
                  onClick={() => {
                    market.setSelectedDate("");
                    market.setTimeframe(tab.key);
                  }}
                  title={tab.label}
                >
                  {tab.key}
                </button>
              ))}
            </div>
            <div className="chart-tabs">
              {["candles", "line"].map((type) => (
                <button
                  className={`ct ${market.chartType === type ? "on" : ""}`}
                  type="button"
                  key={type}
                  onClick={() => market.setChartType(type)}
                >
                  {type === "candles" ? "Candles" : "Line"}
                </button>
              ))}
            </div>
            <label className="date-picker">
              Historical date
              <input
                type="date"
                value={market.selectedDate}
                onChange={(event) => market.setSelectedDate(event.target.value)}
              />
            </label>
          </div>

          <div className="indicator-toggles">
            {INDICATORS.map((name) => (
              <button
                type="button"
                key={name}
                className={market.activeIndicators.includes(name) ? "on" : ""}
                onClick={() => market.toggleIndicator(name)}
              >
                {name}
              </button>
            ))}
          </div>

          <div className="ohlc-strip">
            {latestCandle ? (
              <>
                <span>{timeIST(new Date(latestCandle.time * 1000), true)}</span>
                <span>O <b>{formatINR(latestCandle.open, 2)}</b></span>
                <span>H <b>{formatINR(latestCandle.high, 2)}</b></span>
                <span>L <b>{formatINR(latestCandle.low, 2)}</b></span>
                <span>C <b>{formatINR(latestCandle.close, 2)}</b></span>
                <span>{latestCandle.volume == null ? "Volume unavailable" : `Vol ${formatVolume(latestCandle.volume)}`}</span>
              </>
            ) : (
              <span>Candle data unavailable</span>
            )}
          </div>

          {(market.loadingHistory || selectedHistory.length > 0) ? (
            <LightweightPriceChart
              data={selectedHistory}
              tone={(selected.changePercent || 0) >= 0 ? "up" : "down"}
              height={560}
              chartType={market.chartType}
              indicators={market.activeIndicators}
              loading={market.loadingHistory}
            />
          ) : (
            <ChartUnavailablePanel selected={selected} status={chartStatus} />
          )}
          {!market.loadingHistory && !selectedHistory.length && (
            <div className="chart-unavailable-actions">
              <b>Chart unavailable on current provider</b>
              <span>{unsupportedCopy(selected, chartStatus)}</span>
              <div className="button-row">
                <button className="btn ghost" type="button" onClick={() => market.selectSymbol("NSE:NIFTY")}>Try NIFTY</button>
                <button className="btn ghost" type="button" onClick={() => market.selectSymbol("NSE:RELIANCE")}>Try RELIANCE</button>
                <button className="btn ghost" type="button" onClick={() => market.selectSymbol("NSE:TCS")}>Try TCS</button>
                <button className="btn ghost" type="button" onClick={() => market.setQuery("")}>Search another stock</button>
              </div>
            </div>
          )}
        </Card>

        <Card title="Time Machine">
          <div className="compare-grid">
            <label className="field">
              From
              <input
                type="date"
                value={market.compareRange.from}
                onChange={(event) => market.setCompareRange((current) => ({ ...current, from: event.target.value }))}
              />
            </label>
            <label className="field">
              To
              <input
                type="date"
                value={market.compareRange.to}
                onChange={(event) => market.setCompareRange((current) => ({ ...current, to: event.target.value }))}
              />
            </label>
            <button className="btn primary" type="button" onClick={market.runCompare}>
              Compare
            </button>
          </div>
          {market.compareResult && (
            <div className="compare-result">
              <span>{market.compareResult.from}: {formatINR(market.compareResult.fromClose, 2)}</span>
              <span>{market.compareResult.to}: {formatINR(market.compareResult.toClose, 2)}</span>
              <b className={classForChange(market.compareResult.changePercent)}>
                {formatPercent(market.compareResult.changePercent || 0)}
              </b>
            </div>
          )}
        </Card>

        <Card title="Depth Feed">
          <div className="empty-state">Order book depth is unavailable on the current free market data provider.</div>
        </Card>
      </div>

      <div className="trade-rail">
        <Card title="Sim Trade Ticket" badge="Rs 10L">
          <div className="segmented">
            {["BUY", "SELL"].map((side) => (
              <button
                type="button"
                key={side}
                className={trade.side === side ? "on" : ""}
                onClick={() => setTrade((current) => ({ ...current, side }))}
              >
                {side}
              </button>
            ))}
          </div>
          <label className="field">
            Quantity
            <input
              value={trade.quantity}
              type="number"
              min="1"
              onChange={(event) => setTrade((current) => ({ ...current, quantity: event.target.value }))}
            />
          </label>
          <div className="ticket-line">
            <span>Market Price</span>
            <b>{formatINR(selected.price, 2)}</b>
          </div>
          <div className="ticket-line">
            <span>Estimated Value</span>
            <b>{formatINR(estimated, 0)}</b>
          </div>
          <div className="ticket-line">
            <span>Held Qty</span>
            <b>{holding?.quantity || 0}</b>
          </div>
          <button className="btn primary full" type="button" onClick={submitOrder} disabled={!canPlaceOrder}>
            Place Virtual Order
          </button>
          <button className="btn ghost full" type="button" onClick={toggleWatch}>
            {isWatched ? "Remove From Watchlist" : "Add To Watchlist"}
          </button>
          {message && <div className="form-msg">{message}</div>}
        </Card>

        <Card title="Saved Watchlist">
          <div className="watch-chip-list">
            {watchedRows.map((stock) => (
              <button key={stock.key} type="button" onClick={() => market.selectSymbol(stock)}>
                <b>{stock.symbol}</b>
                <span className={classForChange(stock.changePercent)}>{formatPercent(stock.changePercent)}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Flow Intel">
          <div className="empty-state">FII/DII, PCR, max pain, and VIX require a real derivatives/flow provider.</div>
        </Card>
      </div>
    </div>
  );
}

function stockDataLabel(stock) {
  if (stock?.error || stock?.dataState === "unavailable") return "Quote unavailable on current provider";
  if (stock?.price != null) return stock?.candlesAvailable ? "Chart Available" : "Quote Available";
  return "Unsupported";
}

function stockStatusLabel(stock) {
  if (stock?.dataStatus) return stock.dataStatus;
  if (stock?.error || stock?.dataState === "unavailable") return "Unsupported";
  if (stock?.quoteAvailable === false) return "Quote unavailable on current provider";
  if (stock?.price != null && stock?.candlesAvailable) return "Chart Available";
  if (stock?.price != null) return "Quote Available";
  return "Checking provider";
}

function unsupportedCopy(selected, status) {
  if (selected.price != null && Number.isFinite(Number(selected.price)) && status?.candlesAvailable === false) {
    return "Quote available, but chart/candle data is unavailable from the current provider.";
  }
  return "This stock exists in the NSE/BSE instrument master, but the current free provider does not support market data for it.";
}

function ChartUnavailablePanel({ selected, status }) {
  const providerSymbol = status.providerSymbol || selected.providerSymbol || expectedYahooSymbol(selected);
  const provider = status.providerName || selected.providerName || selected.source || "Yahoo free feed";
  const reason = status.lastCandleError || selected.error || "No candle data returned";
  return (
    <div className="chart-unavailable-panel">
      <b>Chart unavailable on current provider</b>
      <span>{unsupportedCopy(selected, status)}</span>
      <div className="chart-detail-grid">
        <Metric label="Symbol" value={selected.symbol || "--"} />
        <Metric label="Exchange" value={selected.exchange || "--"} />
        <Metric label="Provider Symbol" value={providerSymbol || "--"} />
        <Metric label="Provider" value={provider} />
        <Metric label="Reason" value={reason} />
        <Metric label="Candle Count" value={status.candleCount ?? 0} />
      </div>
      <div className="indicator-strip">
        <span>SMA 20 --</span>
        <span>EMA 20 --</span>
        <span>RSI --</span>
        <span>MACD --</span>
        <span>Volume unavailable</span>
      </div>
    </div>
  );
}

function expectedYahooSymbol(selected) {
  if (selected.symbol === "NIFTY" || selected.symbol === "NIFTY50") return "^NSEI";
  if (selected.symbol === "BANKNIFTY") return "^NSEBANK";
  if (selected.symbol === "SENSEX") return "^BSESN";
  return `${selected.symbol}.${selected.exchange === "BSE" ? "BO" : "NS"}`;
}

function Metric({ label, value, tone }) {
  return (
    <div className="metric-row">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  );
}

function latestValidCandle(candles = []) {
  let fallback = null;
  for (let index = candles.length - 1; index >= 0; index -= 1) {
    const candle = candles[index];
    if (
      candle &&
      Number.isFinite(Number(candle.time)) &&
      Number.isFinite(Number(candle.open)) &&
      Number.isFinite(Number(candle.high)) &&
      Number.isFinite(Number(candle.low)) &&
      Number.isFinite(Number(candle.close)) &&
      Number(candle.open) > 0 &&
      Number(candle.high) > 0 &&
      Number(candle.low) > 0 &&
      Number(candle.close) > 0 &&
      Number(candle.high) >= Number(candle.open) &&
      Number(candle.high) >= Number(candle.close) &&
      Number(candle.low) <= Number(candle.open) &&
      Number(candle.low) <= Number(candle.close)
    ) {
      const normalized = {
        ...candle,
        time: Number(candle.time),
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
        volume: Number(candle.volume) > 0 ? Number(candle.volume) : null
      };
      fallback ||= normalized;
      if (normalized.high !== normalized.low || normalized.volume != null) return normalized;
    }
  }
  return fallback;
}
