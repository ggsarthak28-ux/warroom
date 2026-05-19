import { useEffect, useState } from "react";
import { Card } from "../components/Cards";
import { getExpiries, getOptionChain, getOptionUnderlyings } from "../services/optionsData";
import { formatINR } from "../utils/format";

const COLUMNS = [
  ["callOi", "OI"],
  ["callOiChange", "Chg OI"],
  ["callVolume", "Vol"],
  ["callIv", "IV"],
  ["callLtp", "LTP"],
  ["callChange", "Chg"],
  ["callBid", "Bid"],
  ["callAsk", "Ask"],
  ["strike", "Strike"],
  ["putBid", "Bid"],
  ["putAsk", "Ask"],
  ["putChange", "Chg"],
  ["putLtp", "LTP"],
  ["putIv", "IV"],
  ["putVolume", "Vol"],
  ["putOiChange", "Chg OI"],
  ["putOi", "OI"]
];

export function Options() {
  const [underlyings, setUnderlyings] = useState([]);
  const [symbol, setSymbol] = useState("NIFTY");
  const [expiries, setExpiries] = useState([]);
  const [expiry, setExpiry] = useState("");
  const [chain, setChain] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    getOptionUnderlyings({ signal: controller.signal })
      .then((payload) => setUnderlyings(payload.underlyings || []))
      .catch(() => setUnderlyings([]));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    getExpiries(symbol, { signal: controller.signal })
      .then((payload) => {
        setExpiries(payload.expiries || []);
        setExpiry(payload.expiries?.[0] || "");
      })
      .catch(() => setExpiries([]));
    return () => controller.abort();
  }, [symbol]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    getOptionChain(symbol, expiry, { signal: controller.signal })
      .then(setChain)
      .catch(() => setChain({ rows: [], providerStatus: "ERROR", message: "Could not fetch option-chain data." }))
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [symbol, expiry]);

  return (
    <div className="options-grid">
      <Card title="Option Chain Controls">
        <label className="field">
          Underlying
          <select value={symbol} onChange={(event) => setSymbol(event.target.value)}>
            {(underlyings.length ? underlyings : [{ symbol: "NIFTY" }, { symbol: "BANKNIFTY" }, { symbol: "FINNIFTY" }]).map((item) => (
              <option key={item.symbol} value={item.symbol}>{item.symbol}</option>
            ))}
          </select>
        </label>
        <label className="field">
          Expiry
          <select value={expiry} onChange={(event) => setExpiry(event.target.value)} disabled={!expiries.length}>
            {expiries.length ? expiries.map((item) => <option key={item} value={item}>{item}</option>) : <option>No real expiries</option>}
          </select>
        </label>
        <Metric label="Spot Price" value={formatINR(chain?.spotPrice, 2)} />
        <Metric label="ATM Strike" value={chain?.atmStrike || "--"} />
        <Metric label="PCR" value={chain?.pcr ?? "--"} />
        <Metric label="Max Pain" value={chain?.maxPain ?? "--"} />
        <Metric label="Data Status" value={chain?.providerStatus || "NOT_CONNECTED"} />
        <Metric label="Last Updated" value={chain?.lastUpdated || "--"} />
      </Card>

      <Card title={`${symbol} Option Chain`} badge={loading ? "Loading option chain..." : "Provider Required"} className="option-chain-card">
        {loading ? (
          <div className="empty-state">Loading option chain...</div>
        ) : !chain?.rows?.length ? (
          <div className="empty-state">
            {chain?.message || "Option-chain provider not connected."} No OI, IV, volume, LTP, bid/ask, PCR, or max pain is generated without real derivatives data.
          </div>
        ) : (
          <div className="option-table real-option-table">
            <div className="option-head">{COLUMNS.map(([key, label]) => <span key={key}>{label}</span>)}</div>
            {chain.rows.map((row) => (
              <div className={`option-row ${row.isATM ? "atm" : ""}`} key={row.strike}>
                {COLUMNS.map(([key]) => <span key={`${row.strike}-${key}`}>{optionCell(row, key)}</span>)}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="Provider Rules">
        <p className="brief">
          Option chain data requires a derivatives provider. Yahoo equity/index quotes are not enough for Indian OI,
          IV, bid/ask, PCR, max pain, or expiry chains.
        </p>
      </Card>
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

function optionCell(row, key) {
  if (key === "strike") return row.strike ?? "--";
  const value = row[key];
  return value == null || value === "" ? "--" : value;
}
