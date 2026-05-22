import { classForChange, formatINR, formatNumber, formatPercent } from "../utils/format";
import { getStatusClass, getStatusDotClass } from "../utils/market";

export function TopBar({ indices, marketStatus }) {
  const [nifty, sensex, banknifty] = indices;
  const status = marketStatus.session;
  const items = [
    ["Nifty 50", nifty, false],
    ["Sensex", sensex, false],
    ["Bank Nifty", banknifty, false],
    ["India VIX", null, false],
    ["USD/INR", null, true]
  ];

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-icon">S</div>
        <div>
          <div className="brand-name">Stock Market</div>
          <div className="brand-tag">MARKET COMMAND</div>
        </div>
      </div>

      <div className="top-indices">
        {items.map(([label, item, currency]) => (
          <div className="idx-item" key={label}>
            <div className="idx-label">{label}</div>
            <div className="idx-value">{currency ? formatINR(item?.price, 2) : formatNumber(item?.price, 2)}</div>
            <div className={`idx-chg ${classForChange(item?.changePercent)}`}>{formatPercent(item?.changePercent)}</div>
          </div>
        ))}
      </div>

      <div className="top-right">
        <div className={`stream-pill stream-${status.phase === "open" ? "live" : "closed"}`}>
          {status.label}
        </div>
        <div className={`mkt-status ${getStatusClass(status.phase)}`} title={status.detail}>
          <span className={`blink ${getStatusDotClass(status.phase)}`} />
          <span>{status.label}</span>
        </div>
        <div className="ist-clock">{marketStatus.time} IST</div>
      </div>
    </header>
  );
}
