export function calculatePositionSize({ capital, riskPercent, entry, stopLoss, target }) {
  const cap = Number(capital);
  const risk = Number(riskPercent) / 100;
  const en = Number(entry);
  const sl = Number(stopLoss);
  const tg = Number(target);

  if (!cap || !risk || !en || !sl) {
    throw new Error("Fill capital, risk, entry, and stop-loss.");
  }

  const stopDistance = Math.abs(en - sl);
  if (!stopDistance) throw new Error("Stop-loss cannot equal entry.");

  const maxRisk = cap * risk;
  const quantity = Math.max(Math.floor(maxRisk / stopDistance), 0);
  const investment = quantity * en;
  const actualRisk = quantity * stopDistance;
  const reward = tg ? Math.abs(tg - en) * quantity : 0;
  const rr = tg ? Math.abs(tg - en) / stopDistance : 0;

  return { maxRisk, quantity, investment, actualRisk, reward, rr };
}

export function calculateBrokerage({ type, buy, sell, quantity }) {
  const b = Number(buy);
  const s = Number(sell);
  const qty = Number(quantity);

  if (!b || !s || !qty) throw new Error("Fill buy price, sell price, and quantity.");

  const turnoverBuy = b * qty;
  const turnoverSell = s * qty;
  const turnover = turnoverBuy + turnoverSell;
  let brokerage = 0;
  let stt = 0;

  if (type === "delivery") {
    brokerage = Math.min(turnover * 0.003, 40);
    stt = turnoverSell * 0.001;
  } else if (type === "fno") {
    brokerage = 40;
    stt = turnoverSell * 0.000625;
  } else {
    brokerage = Math.min(turnoverBuy * 0.0003, 20) + Math.min(turnoverSell * 0.0003, 20);
    stt = turnoverSell * 0.00025;
  }

  const exchange = turnover * 0.0000345;
  const gst = (brokerage + exchange) * 0.18;
  const sebi = turnover * 0.000001;
  const stamp = turnoverBuy * 0.00003;
  const totalCharges = brokerage + stt + exchange + gst + sebi + stamp;
  const gross = (s - b) * qty;
  const net = gross - totalCharges;

  return { gross, brokerage, stt, exchange, gst, sebi, stamp, totalCharges, net };
}

export function calculateRiskReward({ risk, reward, winRate }) {
  const r = Number(risk) || 0;
  const rw = Number(reward) || 0;
  const wr = Number(winRate || 50) / 100;
  const rr = r > 0 ? rw / r : 0;
  const expectedValue = wr * rw - (1 - wr) * r;
  const quality =
    rr >= 3
      ? { label: "Excellent", tone: "good" }
      : rr >= 2
        ? { label: "Good trade", tone: "info" }
        : rr >= 1
          ? { label: "Acceptable", tone: "warn" }
          : { label: "Avoid", tone: "danger" };

  return { rr, expectedValue, quality, max: Math.max(r, rw, 1) };
}
