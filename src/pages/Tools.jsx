import { useMemo, useState } from "react";
import { Card } from "../components/Cards";
import { calculateBrokerage, calculatePositionSize, calculateRiskReward } from "../utils/calculators";
import { formatINR } from "../utils/format";
import { safeRun } from "../utils/safeRun";

export function Tools() {
  const [position, setPosition] = useState({ capital: 500000, riskPercent: 1, entry: "", stopLoss: "", target: "" });
  const [positionResult, setPositionResult] = useState(null);
  const [posError, setPosError] = useState("");
  const [brokerage, setBrokerage] = useState({ type: "intraday", buy: "", sell: "", quantity: "" });
  const [brokerageResult, setBrokerageResult] = useState(null);
  const [brokError, setBrokError] = useState("");
  const [rr, setRr] = useState({ risk: "", reward: "", winRate: 50 });

  const rrResult = useMemo(() => calculateRiskReward(rr), [rr]);

  const calcPos = () =>
    safeRun(
      () => {
        setPosError("");
        setPositionResult(calculatePositionSize(position));
      },
      (error) => setPosError(error.message)
    );

  const calcBrok = () =>
    safeRun(
      () => {
        setBrokError("");
        setBrokerageResult(calculateBrokerage(brokerage));
      },
      (error) => setBrokError(error.message)
    );

  return (
    <div className="tools-grid">
      <Card title="Position Size Calculator">
        <Field label="Capital" value={position.capital} onChange={(value) => setPosition({ ...position, capital: value })} />
        <Field label="Risk Per Trade (%)" value={position.riskPercent} onChange={(value) => setPosition({ ...position, riskPercent: value })} />
        <Field label="Entry Price" value={position.entry} onChange={(value) => setPosition({ ...position, entry: value })} />
        <Field label="Stop Loss" value={position.stopLoss} onChange={(value) => setPosition({ ...position, stopLoss: value })} />
        <Field label="Target Price" value={position.target} onChange={(value) => setPosition({ ...position, target: value })} />
        <button className="btn primary full" type="button" onClick={calcPos}>
          Calculate Position Size
        </button>
        {posError && <div className="form-msg danger">{posError}</div>}
        {positionResult ? (
          <div className="result-box">
            <Result label="Max Risk" value={formatINR(positionResult.maxRisk, 0)} tone="dn" />
            <Result label="Position Size" value={`${positionResult.quantity} shares`} tone="up" big />
            <Result label="Investment" value={formatINR(positionResult.investment, 0)} />
            <Result label="Actual Risk" value={formatINR(positionResult.actualRisk, 0)} tone="dn" />
            <Result label="Potential Reward" value={formatINR(positionResult.reward, 0)} tone="up" />
            <Result label="Risk : Reward" value={`1 : ${positionResult.rr.toFixed(2)}`} tone={positionResult.rr >= 2 ? "up" : "warn"} />
          </div>
        ) : (
          <div className="empty-state">Enter values above to see results.</div>
        )}
      </Card>

      <Card title="Brokerage Calculator">
        <label className="field">
          Trade Type
          <select value={brokerage.type} onChange={(event) => setBrokerage({ ...brokerage, type: event.target.value })}>
            <option value="delivery">Equity Delivery</option>
            <option value="intraday">Equity Intraday</option>
            <option value="fno">F&O</option>
          </select>
        </label>
        <Field label="Buy Price" value={brokerage.buy} onChange={(value) => setBrokerage({ ...brokerage, buy: value })} />
        <Field label="Sell Price" value={brokerage.sell} onChange={(value) => setBrokerage({ ...brokerage, sell: value })} />
        <Field label="Quantity" value={brokerage.quantity} onChange={(value) => setBrokerage({ ...brokerage, quantity: value })} />
        <button className="btn primary full" type="button" onClick={calcBrok}>
          Calculate Charges
        </button>
        {brokError && <div className="form-msg danger">{brokError}</div>}
        {brokerageResult ? (
          <div className="result-box">
            <Result label="Gross P&L" value={formatINR(brokerageResult.gross, 2)} tone={brokerageResult.gross >= 0 ? "up" : "dn"} />
            <Result label="Brokerage" value={`-${formatINR(brokerageResult.brokerage, 2)}`} tone="dn" />
            <Result label="STT" value={`-${formatINR(brokerageResult.stt, 2)}`} tone="dn" />
            <Result label="GST" value={`-${formatINR(brokerageResult.gst, 2)}`} tone="dn" />
            <Result label="Total Charges" value={`-${formatINR(brokerageResult.totalCharges, 2)}`} tone="dn" />
            <Result label="Net P&L" value={formatINR(brokerageResult.net, 2)} tone={brokerageResult.net >= 0 ? "up" : "dn"} big />
          </div>
        ) : (
          <div className="empty-state">Fill fields above and calculate.</div>
        )}
      </Card>

      <Card title="Risk : Reward Visualizer">
        <Field label="Risk Amount" value={rr.risk} onChange={(value) => setRr({ ...rr, risk: value })} />
        <Field label="Reward Amount" value={rr.reward} onChange={(value) => setRr({ ...rr, reward: value })} />
        <Field label="Win Rate (%)" value={rr.winRate} onChange={(value) => setRr({ ...rr, winRate: value })} />
        <div className={`rr-score ${rrResult.quality.tone}`}>
          <span>1 : {rrResult.rr.toFixed(2)}</span>
          <b>{rrResult.quality.label}</b>
        </div>
        <Bar label="Risk" value={Number(rr.risk) || 0} max={rrResult.max} tone="danger" />
        <Bar label="Reward" value={Number(rr.reward) || 0} max={rrResult.max} tone="good" />
        <div className="ticket-line">
          <span>Expected Value / trade</span>
          <b className={rrResult.expectedValue >= 0 ? "up" : "dn"}>{formatINR(rrResult.expectedValue, 0)}</b>
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

function Bar({ label, value, max, tone }) {
  return (
    <div className="rr-bar">
      <div>{label}</div>
      <span>
        <i className={`bar-${tone}`} style={{ width: `${Math.max((value / max) * 100, value ? 8 : 0)}%` }}>
          {formatINR(value, 0)}
        </i>
      </span>
    </div>
  );
}
