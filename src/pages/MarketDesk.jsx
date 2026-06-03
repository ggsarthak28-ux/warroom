import { useMemo, useState } from "react";
import { LightweightPriceChart } from "../charts/LightweightPriceChart";
import { Card } from "../components/Cards";
import { FinancialGlobe3D } from "../components/FinancialGlobe3D";
import { MarketDepth3DChart } from "../components/MarketDepth3DChart";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { classForChange, formatINR, formatPercent, formatVolume, timeIST } from "../utils/format";
import { safeRun } from "../utils/safeRun";
import { TIMEFRAMES } from "../utils/timeframes";

const INDICATORS = ["Volume", "SMA", "EMA", "Bollinger", "RSI", "MACD"];

export function MarketDesk({ market, portfolio, shockwaveEventId, onFocusPulse }) {
  const [trade, setTrade] = useState({ side: "BUY", quantity: 10 });
  const [message, setMessage] = useState("");
  const [watchlist, setWatchlist] = useLocalStorage("warroom-watchlist", ["NSE:NIFTY", "NSE:RELIANCE", "NSE:TCS", "NSE:HDFCBANK"]);
  const { selected, selectedHistory, visibleStocks } = market;
  const chartStatus = market.chartStatus || {};
  const latestCandle = useMemo(() => latestValidCandle(selectedHistory), [selectedHistory]);
  const watchedRows = market.stocks.filter((stock) => watchlist.includes(stock.key));
  const holding = portfolio.summary.holdings.find((item) => item.key === selected.key);
  const isWatched = watchlist.includes(selected.key);
  const estimated = useMemo(() => {
    const price = selected.price == null ? null : Number(selected.price);
    return Number.isFinite(price) ? Number(trade.quantity || 0) * price : null;
  }, [trade.quantity, selected.price]);
  const canPlaceOrder = selected.price != null && Number.isFinite(Number(selected.price)) && Number(trade.quantity) > 0;

  function selectSymbol(stock) {
    market.selectSymbol(stock);
    onFocusPulse?.();
  }

  function submitOrder() {
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
      onFocusPulse?.();
    });
  }

  function toggleWatch() {
    setWatchlist((current) =>
      current.includes(selected.key)
        ? current.filter((key) => key !== selected.key)
        : [...current, selected.key]
    );
    onFocusPulse?.();
  }

  return (
    <div className="market-desk">
      <aside className="desk-search-panel">
        <Card title="Market Scanner" badge={market.loadingSearch ? "Searching" : `${visibleStocks.length} shown`}>
          <input
            className="search"
            placeholder="Search any stock, index, ETF, or global symbol..."
            value={market.query}
            onChange={(event) => market.setQuery(event.target.value)}
          />
          <div className="market-tabs compact-tabs">
            {market.listTabs.slice(0, 8).map((tab) => (
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
          <div className="desk-results">
            {market.loadingInstruments && <div className="empty-state">Loading instruments...</div>}
            {market.loadingSearch && <div className="empty-state">Searching stocks...</div>}
            {!market.loadingInstruments && !market.loadingSearch && !visibleStocks.length && (
              <div className="empty-state">No matching stocks found.</div>
            )}
            {!market.loadingInstruments && !market.loadingSearch && visibleStocks.map((stock) => (
              <button
                type="button"
                className={`desk-result ${stock.key === selected.key ? "sel" : ""} ${stock.flash || ""}`}
                key={stock.key}
                onClick={() => selectSymbol(stock)}
              >
                <span>
                  <b>{stock.symbol}</b>
                  <small>{stock.name}</small>
                  <em>{stock.exchange} - {stockStatusLabel(stock)}</em>
                </span>
                <strong>{stock.price == null ? "Provider limited" : formatINR(stock.price, 2)}</strong>
                <i className={classForChange(stock.changePercent)}>
                  {stock.changePercent == null ? "No quote" : formatPercent(stock.changePercent)}
                </i>
              </button>
            ))}
          </div>
        </Card>
      </aside>

      <main className="desk-main-panel">
        <section className={`desk-hero ${classForChange(selected.changePercent)}`}>
          <div>
            <div className="eyebrow">{selected.exchange} / {selected.sector || selected.instrumentType || "Market"}</div>
            <h1>{selected.symbol}</h1>
            <p>{selected.name}</p>
          </div>
          <div className="hero-right">
            <div className={`hero-price ${classForChange(selected.changePercent)}`}>{formatINR(selected.price, 2)}</div>
            <div className={`hero-pill ${classForChange(selected.changePercent)}`}>{formatPercent(selected.changePercent)}</div>
          </div>
          <div className="hero-meta">
            <span>{selected.volume == null ? "Volume limited" : `Vol ${formatVolume(selected.volume)}`}</span>
            <span>{selected.delayed ? "Free/delayed data" : "Provider data"}</span>
            <span>{market.dataStatus?.quoteLabel || stockStatusLabel(selected)}</span>
            <span>{market.marketSession?.label || "Market session"}</span>
          </div>
        </section>

        <Card title="Main Chart" badge={market.timeframe} className="chart-card-full desk-chart-card">
          <div className="provider-warning slim">
            <span>{selected.source || "Yahoo Finance delayed/free chart feed"}</span>
            <span>{market.dataStatus?.quoteLabel || "Quote checking"}</span>
            <span>{market.dataStatus?.candleLabel || "Candles checking"}</span>
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
                    onFocusPulse?.();
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
                onChange={(event) => {
                  market.setSelectedDate(event.target.value);
                  onFocusPulse?.();
                }}
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
                <span>{latestCandle.volume == null ? "Volume limited" : `Vol ${formatVolume(latestCandle.volume)}`}</span>
              </>
            ) : (
              <span>Candle data not available from the current provider</span>
            )}
          </div>

          {(market.loadingHistory || selectedHistory.length > 0) ? (
            <LightweightPriceChart
              data={selectedHistory}
              tone={(selected.changePercent || 0) >= 0 ? "up" : "down"}
              height={600}
              chartType={market.chartType}
              indicators={market.activeIndicators}
              loading={market.loadingHistory}
            />
          ) : (
            <ChartUnavailablePanel selected={selected} status={chartStatus} onSelect={selectSymbol} />
          )}
        </Card>

        <div className="desk-lower-grid">
          <Card title="3D Candle Companion" badge="Real candles only" className="depth-card">
            <MarketDepth3DChart
              candles={selectedHistory}
              selected={selected}
              loading={market.loadingHistory}
              shockwaveEventId={shockwaveEventId}
            />
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
            {market.compareResult ? (
              <div className="compare-result">
                <span>{market.compareResult.from}: {formatINR(market.compareResult.fromClose, 2)}</span>
                <span>{market.compareResult.to}: {formatINR(market.compareResult.toClose, 2)}</span>
                <b className={classForChange(market.compareResult.changePercent)}>
                  {formatPercent(market.compareResult.changePercent || 0)}
                </b>
              </div>
            ) : (
              <div className="mission-note">Pick two dates to compare old price behavior with current context.</div>
            )}
          </Card>
        </div>
      </main>

      <aside className="desk-side-panel">
        <Card title="Global Flow Globe" badge="Drag">
          <FinancialGlobe3D selected={selected} marketStatus={market.marketSession} shockwaveEventId={shockwaveEventId} />
        </Card>

        <Card title="Virtual Trade Ticket" badge="Rs 10L">
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
          <div className="ticket-line"><span>Market Price</span><b>{formatINR(selected.price, 2)}</b></div>
          <div className="ticket-line"><span>Estimated Value</span><b>{formatINR(estimated, 0)}</b></div>
          <div className="ticket-line"><span>Held Qty</span><b>{holding?.quantity || 0}</b></div>
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
              <button key={stock.key} type="button" onClick={() => selectSymbol(stock)}>
                <b>{stock.symbol}</b>
                <span className={classForChange(stock.changePercent)}>{formatPercent(stock.changePercent)}</span>
              </button>
            ))}
          </div>
        </Card>

        <Card title="Data Source">
          <details className="data-drawer" open>
            <summary>Provider status</summary>
            <Metric label="Quote" value={market.dataStatus?.quoteLabel || "Checking"} />
            <Metric label="Candles" value={market.dataStatus?.candleLabel || "Checking"} />
            <Metric label="Provider" value={market.connection.source || "HTTP polling"} />
            <Metric label="Last Quote" value={formatStatusTime(market.dataStatus?.lastQuoteUpdate)} />
            <Metric label="Last Candle" value={formatStatusTime(market.dataStatus?.lastCandleUpdate)} />
          </details>
        </Card>
      </aside>
    </div>
  );
}

function ChartUnavailablePanel({ selected, status, onSelect }) {
  const providerSymbol = status.providerSymbol || selected.providerSymbol || expectedYahooSymbol(selected);
  const provider = status.providerName || selected.providerName || selected.source || "Yahoo Finance delayed/free chart feed";
  const reason = status.lastCandleError || selected.error || "No candle data returned";
  return (
    <div className="chart-unavailable-panel pro-empty">
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
      <div className="button-row">
        {["NSE:NIFTY", "NSE:RELIANCE", "NSE:TCS", "NSE:INFY"].map((key) => (
          <button className="btn ghost" type="button" key={key} onClick={() => onSelect(key)}>
            Try {key.split(":")[1]}
          </button>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value, tone }) {
  return (
    <div className="metric-row">
      <span>{label}</span>
      <strong className={tone}>{value}</strong>
    </div>
  );
}

function stockStatusLabel(stock) {
  if (stock?.dataStatus) return stock.dataStatus;
  if (stock?.error || stock?.dataState === "unavailable") return "Provider limited";
  if (stock?.quoteAvailable === false) return "Quote limited";
  if (stock?.price != null && stock?.candlesAvailable) return "Chart available";
  if (stock?.price != null) return "Quote available";
  return "Checking provider";
}

function unsupportedCopy(selected, status) {
  if (selected.price != null && Number.isFinite(Number(selected.price)) && status?.candlesAvailable === false) {
    return "Quote exists, but candle/chart data is not available from the current free provider.";
  }
  return "This instrument exists in the search master, but the current provider cannot supply usable chart data for it.";
}

function expectedYahooSymbol(selected) {
  if (selected.symbol === "NIFTY" || selected.symbol === "NIFTY50") return "^NSEI";
  if (selected.symbol === "BANKNIFTY") return "^NSEBANK";
  if (selected.symbol === "SENSEX") return "^BSESN";
  return `${selected.symbol}.${selected.exchange === "BSE" ? "BO" : "NS"}`;
}

function latestValidCandle(candles = []) {
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
      return {
        ...candle,
        time: Number(candle.time),
        open: Number(candle.open),
        high: Number(candle.high),
        low: Number(candle.low),
        close: Number(candle.close),
        volume: Number(candle.volume) > 0 ? Number(candle.volume) : null
      };
    }
  }
  return null;
}

function formatStatusTime(timestamp) {
  if (!timestamp) return "--";
  return new Date(Number(timestamp) * 1000).toLocaleTimeString("en-IN", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
}
