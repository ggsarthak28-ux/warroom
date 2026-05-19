import { useMemo, useState } from "react";
import { Card, Stat } from "../components/Cards";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { classForChange, dateIST, formatINR, timeIST } from "../utils/format";

export function Journal() {
  const [trades, setTrades] = useLocalStorage("warroom-journal", []);
  const [form, setForm] = useState({
    symbol: "",
    entry: "",
    exit: "",
    quantity: "",
    direction: "LONG",
    mood: "",
    strategy: "Breakout",
    note: ""
  });

  const stats = useMemo(() => {
    const closed = trades.filter((trade) => Number.isFinite(trade.pnl));
    const wins = closed.filter((trade) => trade.pnl > 0).length;
    const pnl = closed.reduce((sum, trade) => sum + trade.pnl, 0);
    const best = closed.length ? Math.max(...closed.map((trade) => trade.pnl)) : 0;
    return { count: trades.length, winRate: closed.length ? (wins / closed.length) * 100 : 0, pnl, best };
  }, [trades]);

  function saveTrade() {
    if (!form.symbol || !form.entry || !form.quantity) return;
    const entry = Number(form.entry);
    const exit = Number(form.exit);
    const quantity = Number(form.quantity);
    const pnl = exit ? (form.direction === "LONG" ? exit - entry : entry - exit) * quantity : null;
    setTrades([
      {
        ...form,
        symbol: form.symbol.toUpperCase(),
        entry,
        exit: exit || null,
        quantity,
        pnl,
        time: new Date().toISOString()
      },
      ...trades
    ]);
    setForm({ symbol: "", entry: "", exit: "", quantity: "", direction: "LONG", mood: "", strategy: "Breakout", note: "" });
  }

  return (
    <div className="journal-grid">
      <Card title="Log New Trade">
        <label className="field">Symbol<input value={form.symbol} onChange={(event) => setForm({ ...form, symbol: event.target.value })} /></label>
        <div className="field-row">
          <label className="field">Entry<input type="number" value={form.entry} onChange={(event) => setForm({ ...form, entry: event.target.value })} /></label>
          <label className="field">Exit<input type="number" value={form.exit} onChange={(event) => setForm({ ...form, exit: event.target.value })} /></label>
        </div>
        <div className="field-row">
          <label className="field">Quantity<input type="number" value={form.quantity} onChange={(event) => setForm({ ...form, quantity: event.target.value })} /></label>
          <label className="field">Direction<select value={form.direction} onChange={(event) => setForm({ ...form, direction: event.target.value })}><option>LONG</option><option>SHORT</option></select></label>
        </div>
        <div className="mood-grid">
          {["Confident", "Fearful", "Greedy", "Disciplined"].map((mood) => (
            <button type="button" className={form.mood === mood ? "on" : ""} key={mood} onClick={() => setForm({ ...form, mood })}>
              {mood}
            </button>
          ))}
        </div>
        <label className="field">Strategy<select value={form.strategy} onChange={(event) => setForm({ ...form, strategy: event.target.value })}><option>Breakout</option><option>VWAP Pullback</option><option>EMA Crossover</option><option>Support/Resistance</option><option>Scalping</option><option>Swing Trade</option><option>Options Buying</option><option>Options Selling</option></select></label>
        <label className="field">Lesson<textarea value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></label>
        <button className="btn primary full" type="button" onClick={saveTrade}>Save Trade Entry</button>
      </Card>

      <Card title="Trade History & Analytics" className="grow">
        <div className="stat-grid four">
          <Stat label="Total Trades" value={stats.count} />
          <Stat label="Win Rate" value={`${stats.winRate.toFixed(0)}%`} tone="up" />
          <Stat label="Net P&L" value={formatINR(stats.pnl, 0)} tone={classForChange(stats.pnl)} />
          <Stat label="Best Trade" value={formatINR(stats.best, 0)} tone="up" />
        </div>
        <div className="trade-list">
          {trades.length ? (
            trades.map((trade) => (
              <div className="trade-card-item" key={`${trade.symbol}-${trade.time}`}>
                <div className="trade-top">
                  <b>{trade.symbol}</b>
                  <span className={trade.pnl == null ? "" : classForChange(trade.pnl)}>
                    {trade.pnl == null ? "Open" : formatINR(trade.pnl, 0)}
                  </span>
                </div>
                <div className="trade-meta">
                  <span>{trade.direction}</span>
                  <span>Entry {formatINR(trade.entry, 2)}</span>
                  {trade.exit && <span>Exit {formatINR(trade.exit, 2)}</span>}
                  <span>{trade.quantity} shares</span>
                  <span>{trade.strategy}</span>
                  {trade.mood && <span>{trade.mood}</span>}
                </div>
                {trade.note && <p className="note">"{trade.note}"</p>}
                <small>{dateIST(new Date(trade.time))} - {timeIST(new Date(trade.time))}</small>
              </div>
            ))
          ) : (
            <div className="empty-state">No trades logged yet.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
