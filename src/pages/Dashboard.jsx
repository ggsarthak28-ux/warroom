import { LightweightPriceChart } from "../charts/LightweightPriceChart";
import { Card, PortfolioSnapshot, StockList } from "../components/Cards";
import { classForChange, formatINR, formatNumber, formatPercent } from "../utils/format";

export function Dashboard({ market, portfolio, onLaunchDesk }) {
  const { selectedHistory, stocks, globals, sectors, topGainers, topLosers } = market;
  const selected = market.selected || stocks.find((stock) => stock.key === "NSE:NIFTY") || stocks[0];

  return (
    <div className="dash-grid">
      <section className="command-hero-panel">
        <div>
          <div className="eyebrow">Cinematic market command</div>
          <h1>Fly through live market depth.</h1>
          <p>
            A WebGL trading universe synced to real provider candles. No fake prices, no fake bars, just a sharper
            way to read the desk.
          </p>
        </div>
        <div className="command-hero-market">
          <span>{selected?.exchange}:{selected?.symbol}</span>
          <b>{formatINR(selected?.price, 2)}</b>
          <em className={classForChange(selected?.changePercent)}>{formatPercent(selected?.changePercent)}</em>
        </div>
        <button className="btn primary command-launch" type="button" onClick={onLaunchDesk}>
          Launch Market Desk
        </button>
      </section>

      <div className="col">
        <PortfolioSnapshot summary={portfolio.summary} portfolio={portfolio.portfolio} />

        <Card title="Feed Status" badge={market.connection.label || "Provider"}>
          <Metric label="Market Session" value={market.marketSession?.label || "MARKET CLOSED"} tone={market.marketSession?.isOpen ? "up" : "neu"} />
          <Metric label="Quote Data" value={market.dataStatus?.quoteLabel || "Data unavailable"} tone={market.dataStatus?.quoteFreshness === "LIVE_DATA" ? "up" : "neu"} />
          <Metric label="Candle Data" value={market.dataStatus?.candleLabel || "Data unavailable"} tone={market.dataStatus?.candleFreshness === "LIVE_DATA" ? "up" : "neu"} />
          <Metric label="Provider" value={market.connection.source || "Unavailable"} tone="" />
          <Metric label="Provider Status" value={market.dataStatus?.providerStatus || "CONNECTING"} tone="" />
          <Metric label="Last Quote" value={formatStatusTime(market.dataStatus?.lastQuoteUpdate)} tone="" />
          <Metric label="Last Candle" value={formatStatusTime(market.dataStatus?.lastCandleUpdate)} tone="" />
          <Metric label="Instrument Master" value={market.loadingInstruments ? "Loading" : `${market.stocks.length} instruments`} tone="" />
          <Metric label="Selected" value={`${market.selected.exchange}:${market.selected.symbol}`} tone="" />
          <Metric label="Data Policy" value="No fake prices" tone="up" />
        </Card>

        <Card title="Signal Desk">
          <div className="empty-state">Sentiment is unavailable until a real news/sentiment provider is connected.</div>
        </Card>
      </div>

      <div className="col main-col">
        <Card title="Market Coach Brief" badge="Gemini">
          <p className="brief">
            Ask for explanations, risk checks, or learning help from the Market Coach. Prices and candles still come
            only from the market data provider, never from AI.
          </p>
        </Card>

        <div className="two-col">
          <StockList title="Top Gainers" stocks={topGainers} gain />
          <StockList title="Top Losers" stocks={topLosers} gain={false} />
        </div>

        <Card title={`${selected?.symbol || "Selected"} - Live Desk Chart`} badge={formatPercent(selected?.changePercent)}>
          <div className="chart-title-row">
            <span className="hero-price-small">{formatINR(selected?.price, 2)}</span>
            <span className={classForChange(selected?.changePercent)}>{formatPercent(selected?.changePercent)}</span>
          </div>
          <LightweightPriceChart
            data={selectedHistory}
            tone={(selected?.changePercent || 0) >= 0 ? "up" : "down"}
            height={260}
            indicators={["Volume"]}
          />
        </Card>
      </div>

      <div className="col">
        <Card title="Global Markets">
          <div className="stack-list compact">
            {globals.length ? (
              globals.map((item) => (
                <div className="market-row" key={item.name}>
                  <span>{item.name}</span>
                  <span className="mono">{formatNumber(item.value, 2)}</span>
                  <span className={classForChange(item.changePercent)}>{formatPercent(item.changePercent)}</span>
                </div>
              ))
            ) : (
              <div className="empty-state">Global market feed unavailable on the current provider.</div>
            )}
          </div>
        </Card>

        <Card title="Sector Heatmap">
          <div className="empty-state">Sector index feed unavailable on the current free provider.</div>
        </Card>

        <Card title="Smart Alerts" badge="Provider Required" className="grow">
          <div className="empty-state">Real-time alerts require a live alert/news provider. No synthetic alerts are shown.</div>
        </Card>
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
