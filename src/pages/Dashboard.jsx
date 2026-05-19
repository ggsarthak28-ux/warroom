import { LightweightPriceChart } from "../charts/LightweightPriceChart";
import { Card, PortfolioSnapshot, StockList } from "../components/Cards";
import { classForChange, formatINR, formatNumber, formatPercent } from "../utils/format";

export function Dashboard({ market, portfolio }) {
  const { selectedHistory, stocks, globals, sectors, topGainers, topLosers } = market;
  const nifty = stocks.find((stock) => stock.key === "NSE:NIFTY") || stocks[0];

  return (
    <div className="dash-grid">
      <div className="col">
        <PortfolioSnapshot summary={portfolio.summary} portfolio={portfolio.portfolio} />

        <Card title="Market Data Status" badge={market.connection.label || "Provider"}>
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

        <Card title="Market Sentiment">
          <div className="empty-state">Sentiment is unavailable until a real news/sentiment provider is connected.</div>
        </Card>
      </div>

      <div className="col main-col">
        <Card title="AI Daily Brief" badge="Gemini">
          <p className="brief">
            Ask Gemini for explanations or risk analysis from the AI screen. Market prices and candles come only from
            the market data provider, never from AI-generated values.
          </p>
        </Card>

        <div className="two-col">
          <StockList title="Top Gainers" stocks={topGainers} gain />
          <StockList title="Top Losers" stocks={topLosers} gain={false} />
        </div>

        <Card title={`${nifty?.symbol || "Selected"} - Provider Chart`} badge={formatPercent(nifty?.changePercent)}>
          <div className="chart-title-row">
            <span className="hero-price-small">{formatINR(nifty?.price, 2)}</span>
            <span className={classForChange(nifty?.changePercent)}>{formatPercent(nifty?.changePercent)}</span>
          </div>
          <LightweightPriceChart
            data={selectedHistory}
            tone={(nifty?.changePercent || 0) >= 0 ? "up" : "down"}
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
