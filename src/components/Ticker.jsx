import { classForChange, formatINR, formatPercent } from "../utils/format";

export function Ticker({ stocks }) {
  const items = [...stocks, ...stocks];
  return (
    <div className="ticker-wrap">
      <div className="ticker-inner">
        {items.map((stock, index) => (
          <span className="tick-i" key={`${stock.symbol}-${index}`}>
            <span className="tick-s">{stock.symbol}</span>
            <span className="mono">{formatINR(stock.price, 2)}</span>
            <span className={classForChange(stock.changePercent)}>{formatPercent(stock.changePercent)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
