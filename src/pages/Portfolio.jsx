import { Card, Stat } from "../components/Cards";
import { classForChange, dateIST, formatINR, formatPercent, timeIST } from "../utils/format";

export function Portfolio({ portfolio }) {
  const { summary } = portfolio;

  return (
    <div className="portfolio-grid">
      <Card title="Simulator Cockpit" badge="Learning Mode">
        <div className="stat-grid">
          <Stat label="Equity" value={formatINR(summary.equity, 0)} tone={classForChange(summary.returns)} />
          <Stat label="Virtual Cash" value={formatINR(portfolio.portfolio.cash, 0)} />
          <Stat label="Invested" value={formatINR(summary.invested, 0)} />
          <Stat label="Returns" value={formatPercent(summary.returns)} tone={classForChange(summary.returns)} />
          <Stat label="Realized P&L" value={formatINR(summary.realizedPnl, 0)} tone={classForChange(summary.realizedPnl)} />
          <Stat label="Unrealized P&L" value={formatINR(summary.unrealizedPnl, 0)} tone={classForChange(summary.unrealizedPnl)} />
          <Stat label="Win Rate" value={`${summary.winRate.toFixed(0)}%`} />
          <Stat label="Best Trade" value={formatINR(summary.bestTrade, 0)} tone={classForChange(summary.bestTrade)} />
        </div>
      </Card>

      <Card title="Open Positions">
        <div className="table-like">
          <div className="table-head">
            <span>Symbol</span>
            <span>Qty</span>
            <span>Avg</span>
            <span>LTP</span>
            <span>P&L</span>
          </div>
          {summary.holdings.length ? (
            summary.holdings.map((holding) => (
              <div className="table-row" key={holding.key || holding.symbol}>
                <span>{holding.exchange ? `${holding.exchange}:${holding.symbol}` : holding.symbol}</span>
                <span>{holding.quantity}</span>
                <span>{formatINR(holding.avgCost, 2)}</span>
                <span>{formatINR(holding.price, 2)}</span>
                <span className={classForChange(holding.pnl)}>{formatINR(holding.pnl, 0)}</span>
              </div>
            ))
          ) : (
            <div className="empty-state">No holdings yet. Place a virtual order from Markets.</div>
          )}
        </div>
      </Card>

      <Card title="Fill Log" className="grow">
        <div className="trade-list">
          {portfolio.portfolio.orders.length ? (
            portfolio.portfolio.orders.slice(0, 12).map((order) => (
              <div className="trade-card-item" key={`${order.key || order.symbol}-${order.time}-${order.side}`}>
                <div className="trade-top">
                  <b>{order.symbol}</b>
                  <span className={order.side === "BUY" ? "up" : "dn"}>{order.side}</span>
                </div>
                <div className="trade-meta">
                  <span>{order.quantity} qty</span>
                  <span>{formatINR(order.price, 2)}</span>
                  <span>{dateIST(new Date(order.time))} {timeIST(new Date(order.time))}</span>
                  {order.pnl !== 0 && <span className={classForChange(order.pnl)}>{formatINR(order.pnl, 0)}</span>}
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">Your virtual learning fills will appear here.</div>
          )}
        </div>
        <button className="btn ghost" type="button" onClick={portfolio.resetPortfolio}>
          Reset Virtual Account
        </button>
      </Card>
    </div>
  );
}
