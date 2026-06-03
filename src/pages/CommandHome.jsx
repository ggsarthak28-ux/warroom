import { LightweightPriceChart } from "../charts/LightweightPriceChart";
import { Card, PortfolioSnapshot } from "../components/Cards";
import { MarketAura3D } from "../components/MarketAura3D";
import { classForChange, formatINR, formatPercent, formatVolume, timeIST } from "../utils/format";

export function CommandHome({ market, portfolio, onLaunchDesk, onNavigate, onFocusPulse }) {
  const selected = market.selected || market.stocks.find((stock) => stock.key === "NSE:NIFTY") || {};
  const quickResults = market.query.trim() ? market.visibleStocks.slice(0, 6) : [];
  const latestCandle = latestValidCandle(market.selectedHistory);

  function openStock(stock) {
    market.selectSymbol(stock);
    onFocusPulse?.();
    onNavigate?.("markets");
  }

  return (
    <div className="command-home">
      <section className="command-stage">
        <div className="stage-copy">
          <div className="eyebrow">WarRoom command</div>
          <h1>Learn the market without getting lost in noise.</h1>
          <p>
            Pick one symbol, read the chart, practice the trade, then ask the coach what you missed.
          </p>
          <div className="stage-actions">
            <button className="btn primary command-launch" type="button" onClick={onLaunchDesk}>
              Launch Market Desk
            </button>
            <button className="btn ghost" type="button" onClick={() => onNavigate?.("learn")}>
              Start Skill Path
            </button>
          </div>
        </div>

        <div className="stage-visual-combo">
          <MarketAura3D selected={selected} />
          <div className={`stage-symbol ${classForChange(selected.changePercent)}`}>
            <span>{selected.exchange || "NSE"} / {selected.instrumentType || selected.sector || "Market"}</span>
            <b>{selected.symbol || "NIFTY"}</b>
            <em>{formatINR(selected.price, 2)} {formatPercent(selected.changePercent)}</em>
            <small>{market.dataStatus?.quoteLabel || "Checking data"} - {market.marketSession?.label || "Market session"}</small>
          </div>
        </div>
      </section>

      <section className="mission-strip">
        {[
          ["01", "Scan", "Choose one liquid symbol and timeframe."],
          ["02", "Read", "Mark trend, levels, candle behavior, and data freshness."],
          ["03", "Practice", "Place a virtual trade only when real price exists."],
          ["04", "Review", "Ask the coach for the risk and learning gap."]
        ].map(([step, title, body]) => (
          <div className="mission-step" key={step}>
            <span>{step}</span>
            <b>{title}</b>
            <small>{body}</small>
          </div>
        ))}
      </section>

      <div className="command-layout">
        <Card title="Find Your Market" badge={market.loadingSearch ? "Searching" : "Search"}>
          <input
            className="search command-search"
            placeholder="Search RELIANCE, TCS, NIFTY, AAPL..."
            value={market.query}
            onChange={(event) => market.setQuery(event.target.value)}
          />
          <div className="command-results">
            {quickResults.length ? (
              quickResults.map((stock) => (
                <button type="button" key={stock.key} onClick={() => openStock(stock)}>
                  <span>
                    <b>{stock.symbol}</b>
                    <small>{stock.name}</small>
                  </span>
                  <em>{stock.price == null ? "Provider limited" : formatINR(stock.price, 2)}</em>
                </button>
              ))
            ) : (
              <div className="mission-note">
                Start with NIFTY, RELIANCE, TCS, INFY, SBIN, HDFCBANK, or search any symbol from the master list.
              </div>
            )}
          </div>
        </Card>

        <Card title="Live Desk Preview" badge={market.timeframe}>
          <div className="desk-preview-head">
            <div>
              <b>{selected.symbol || "NIFTY"}</b>
              <span>{selected.name || "Selected market"}</span>
            </div>
            <em className={classForChange(selected.changePercent)}>{formatPercent(selected.changePercent)}</em>
          </div>
          <LightweightPriceChart
            data={market.selectedHistory}
            tone={(selected.changePercent || 0) >= 0 ? "up" : "down"}
            height={320}
            indicators={["Volume"]}
            loading={market.loadingHistory}
          />
          <div className="ohlc-strip compact">
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
              <span>Waiting for provider candles</span>
            )}
          </div>
        </Card>

        <PortfolioSnapshot summary={portfolio.summary} portfolio={portfolio.portfolio} />

        <Card title="Data Source" badge={market.connection.label || "Provider"}>
          <details className="data-drawer">
            <summary>Provider honesty and freshness</summary>
            <Metric label="Market Session" value={market.marketSession?.label || "Market closed"} />
            <Metric label="Quote Data" value={market.dataStatus?.quoteLabel || "Checking"} />
            <Metric label="Candle Data" value={market.dataStatus?.candleLabel || "Checking"} />
            <Metric label="Provider" value={market.connection.source || "HTTP polling"} />
            <Metric label="Instrument Master" value={market.loadingInstruments ? "Loading" : `${market.stocks.length} instruments`} />
          </details>
          <div className="mission-note">
            The app shows provider limits honestly. If exact live NSE/BSE data is needed, connect a broker-grade provider later.
          </div>
        </Card>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="metric-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
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
      Number.isFinite(Number(candle.close))
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
