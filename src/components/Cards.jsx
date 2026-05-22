import { classForChange, formatINR, formatPercent } from "../utils/format";

export function Card({ title, badge, children, className = "" }) {
  return (
    <section className={`card ${className}`}>
      {(title || badge) && (
        <div className="card-head">
          {title && <div className="card-title">{title}</div>}
          {badge && <div className="card-badge">{badge}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, tone = "", sub }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className={`stat-val ${tone}`}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export function StockList({ title, stocks, gain = true }) {
  return (
    <Card title={title} badge="NSE">
      <div className="stack-list">
        {stocks.map((stock) => (
          <div className="stock-row" key={stock.symbol}>
            <div>
              <div className={`row-symbol ${gain ? "up" : "dn"}`}>{stock.symbol}</div>
              <div className="row-name">{stock.name}</div>
            </div>
            <div className={`row-change ${classForChange(stock.changePercent)}`}>{formatPercent(stock.changePercent)}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function PortfolioSnapshot({ summary, portfolio }) {
  return (
    <div className="port-card">
      <div className="port-label">Simulator Account Value</div>
      <div className="port-val">{formatINR(summary.equity, 0)}</div>
      <div className="port-mini">
        <div className="pm">
          <div className="pm-label">Cash</div>
          <div className="pm-val">{formatINR(portfolio.cash, 0)}</div>
        </div>
        <div className="pm">
          <div className="pm-label">Unrealized</div>
          <div className={`pm-val ${classForChange(summary.unrealizedPnl)}`}>{formatINR(summary.unrealizedPnl, 0)}</div>
        </div>
        <div className="pm">
          <div className="pm-label">Returns</div>
          <div className={`pm-val ${classForChange(summary.returns)}`}>{formatPercent(summary.returns)}</div>
        </div>
        <div className="pm">
          <div className="pm-label">Win Rate</div>
          <div className="pm-val">{summary.winRate.toFixed(0)}%</div>
        </div>
      </div>
    </div>
  );
}
