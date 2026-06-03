import { useMemo, useState } from "react";
import { Card, Stat } from "../components/Cards";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { calculatePositionSize } from "../utils/calculators";
import { classForChange, dateIST, formatINR, formatPercent, timeIST } from "../utils/format";
import { safeRun } from "../utils/safeRun";

export function PracticeLab({ market, portfolio, onNavigate }) {
  const { summary } = portfolio;
  const [risk, setRisk] = useState({
    capital: 500000,
    riskPercent: 1,
    entry: market.selected?.price || "",
    stopLoss: "",
    target: ""
  });
  const [riskResult, setRiskResult] = useState(null);
  const [riskError, setRiskError] = useState("");
  const [notes, setNotes] = useLocalStorage("warroom-practice-notes", []);
  const [note, setNote] = useState("");

  const openRisk = useMemo(() => {
    const exposed = summary.holdings.reduce((sum, holding) => sum + (holding.value || 0), 0);
    return summary.equity ? (exposed / summary.equity) * 100 : 0;
  }, [summary.equity, summary.holdings]);

  function runRisk() {
    safeRun(
      () => {
        setRiskError("");
        setRiskResult(calculatePositionSize(risk));
      },
      (error) => setRiskError(error.message)
    );
  }

  function saveNote() {
    const text = note.trim();
    if (!text) return;
    setNotes([
      {
        text,
        symbol: market.selected?.symbol || "NIFTY",
        time: new Date().toISOString()
      },
      ...notes
    ].slice(0, 20));
    setNote("");
  }

  return (
    <div className="practice-lab">
      <section className="practice-hero">
        <div>
          <div className="eyebrow">Simulator cockpit</div>
          <h1>Practice before you risk real money.</h1>
          <p>Every virtual trade needs a real provider price. No price means no order.</p>
        </div>
        <button className="btn primary" type="button" onClick={() => onNavigate?.("markets")}>
          Open Market Desk
        </button>
      </section>

      <Card title="Account Pulse" badge="Rs 10L virtual">
        <div className="stat-grid">
          <Stat label="Equity" value={formatINR(summary.equity, 0)} tone={classForChange(summary.returns)} />
          <Stat label="Cash" value={formatINR(portfolio.portfolio.cash, 0)} />
          <Stat label="Invested" value={formatINR(summary.invested, 0)} />
          <Stat label="Returns" value={formatPercent(summary.returns)} tone={classForChange(summary.returns)} />
          <Stat label="Realized P&L" value={formatINR(summary.realizedPnl, 0)} tone={classForChange(summary.realizedPnl)} />
          <Stat label="Unrealized P&L" value={formatINR(summary.unrealizedPnl, 0)} tone={classForChange(summary.unrealizedPnl)} />
          <Stat label="Win Rate" value={`${summary.winRate.toFixed(0)}%`} />
          <Stat label="Open Exposure" value={formatPercent(openRisk, { sign: false })} tone={openRisk > 60 ? "warn" : "up"} />
        </div>
      </Card>

      <Card title="Risk Sizer" badge={market.selected?.symbol || "Selected"}>
        <div className="field-row">
          <Field label="Capital" value={risk.capital} onChange={(value) => setRisk({ ...risk, capital: value })} />
          <Field label="Risk Per Trade (%)" value={risk.riskPercent} onChange={(value) => setRisk({ ...risk, riskPercent: value })} />
        </div>
        <div className="field-row">
          <Field label="Entry" value={risk.entry} onChange={(value) => setRisk({ ...risk, entry: value })} />
          <Field label="Stop Loss" value={risk.stopLoss} onChange={(value) => setRisk({ ...risk, stopLoss: value })} />
        </div>
        <Field label="Target" value={risk.target} onChange={(value) => setRisk({ ...risk, target: value })} />
        <button className="btn primary full" type="button" onClick={runRisk}>
          Calculate Risk
        </button>
        {riskError && <div className="form-msg danger">{riskError}</div>}
        {riskResult ? (
          <div className="result-box">
            <Result label="Max Risk" value={formatINR(riskResult.maxRisk, 0)} tone="dn" />
            <Result label="Position Size" value={`${riskResult.quantity} shares`} tone="up" big />
            <Result label="Investment" value={formatINR(riskResult.investment, 0)} />
            <Result label="Risk : Reward" value={`1 : ${riskResult.rr.toFixed(2)}`} tone={riskResult.rr >= 2 ? "up" : "warn"} />
          </div>
        ) : (
          <div className="mission-note">Use this before placing any virtual order.</div>
        )}
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
            <div className="empty-state">No positions yet. Open Market Desk and place a virtual order.</div>
          )}
        </div>
      </Card>

      <Card title="Review Journal" className="practice-journal">
        <label className="field">
          What did this trade teach you?
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Example: I entered before confirmation and ignored the stop distance."
          />
        </label>
        <button className="btn primary full" type="button" onClick={saveNote}>
          Save Lesson
        </button>
        <div className="trade-list">
          {notes.length ? (
            notes.map((item) => (
              <div className="trade-card-item" key={`${item.symbol}-${item.time}`}>
                <div className="trade-top">
                  <b>{item.symbol}</b>
                  <span>{dateIST(new Date(item.time))} {timeIST(new Date(item.time))}</span>
                </div>
                <p className="note">{item.text}</p>
              </div>
            ))
          ) : (
            <div className="empty-state">Your learning notes will appear here.</div>
          )}
        </div>
      </Card>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <label className="field">
      {label}
      <input type="number" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Result({ label, value, tone = "", big = false }) {
  return (
    <div className="result-row">
      <span>{label}</span>
      <b className={`${tone} ${big ? "big" : ""}`}>{value}</b>
    </div>
  );
}
