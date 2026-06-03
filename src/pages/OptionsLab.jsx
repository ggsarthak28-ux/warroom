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

export function OptionsLab() {
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

  const hasRows = Boolean(chain?.rows?.length);

  return (
    <div className="options-lab">
      <section className="options-hero">
        <div>
          <div className="eyebrow">F&O Lab</div>
          <h1>Options should be learned with real derivatives data.</h1>
          <p>No synthetic OI, IV, PCR, max pain, bid/ask, or option LTP is generated here.</p>
        </div>
        <ProviderVault active={hasRows} />
      </section>

      <Card title="Option Chain Controls" className="options-controls">
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

      <Card title={`${symbol} Option Chain`} badge={loading ? "Loading" : hasRows ? "Real chain" : "Provider needed"} className="option-chain-card">
        {loading ? (
          <div className="empty-state">Loading option chain...</div>
        ) : !hasRows ? (
          <div className="options-empty-state">
            <ProviderVault active={false} compact />
            <b>{chain?.message || "Real option-chain data requires a derivatives data provider."}</b>
            <span>
              The table structure is ready, but values stay unavailable until a provider supplies verified derivatives data.
            </span>
            <div className="option-education-grid">
              <InfoTile title="OI" body="Open interest shows contracts still open. It cannot be guessed safely." />
              <InfoTile title="IV" body="Implied volatility comes from option prices. It needs real option quotes." />
              <InfoTile title="PCR" body="Put/call ratio needs real OI or volume from both sides of the chain." />
              <InfoTile title="Max Pain" body="Max pain needs full strike-wise OI. No provider means no value." />
            </div>
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

      <Card title="What To Learn First" className="options-guide">
        <div className="mission-strip inline">
          <InfoTile title="1. Underlying" body="Know whether you are trading NIFTY, Bank Nifty, or an F&O stock." />
          <InfoTile title="2. Expiry" body="Near expiry options move faster and decay faster." />
          <InfoTile title="3. Strike" body="ATM has the most direct spot sensitivity. OTM is cheaper but riskier." />
          <InfoTile title="4. Risk" body="Never buy options without knowing max loss and invalidation." />
        </div>
      </Card>
    </div>
  );
}

function ProviderVault({ active, compact = false }) {
  return (
    <div className={`provider-vault ${active ? "unlocked" : ""} ${compact ? "compact" : ""}`} aria-hidden="true">
      <div className="vault-core">
        <i />
        <span>{active ? "DATA" : "LOCKED"}</span>
      </div>
      <div className="vault-ring r1" />
      <div className="vault-ring r2" />
      <div className="vault-ring r3" />
    </div>
  );
}

function InfoTile({ title, body }) {
  return (
    <div className="info-tile">
      <b>{title}</b>
      <span>{body}</span>
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
