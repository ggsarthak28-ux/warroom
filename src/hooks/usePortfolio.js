import { useMemo } from "react";
import { useLocalStorage } from "./useLocalStorage";

const INITIAL_STATE = {
  cash: 1000000,
  holdings: {},
  orders: [],
  realizedPnl: 0,
  closedTrades: []
};

export function usePortfolio(stocks) {
  const [portfolio, setPortfolio] = useLocalStorage("warroom-portfolio", INITIAL_STATE);

  const priceBySymbol = useMemo(
    () => Object.fromEntries(stocks.map((stock) => [stock.symbol, stock.price])),
    [stocks]
  );
  const priceByKey = useMemo(
    () => Object.fromEntries(stocks.map((stock) => [stock.key, stock.price])),
    [stocks]
  );

  const summary = useMemo(() => {
    const holdingRows = Object.entries(portfolio.holdings)
      .map(([key, holding]) => {
        const symbol = holding.symbol || key;
        const providerPrice = priceByKey[key] ?? priceBySymbol[symbol];
        const price = Number.isFinite(Number(providerPrice)) ? Number(providerPrice) : null;
        const value = price == null ? null : holding.quantity * price;
        const invested = holding.quantity * holding.avgCost;
        const pnl = value == null ? null : value - invested;
        return { key, symbol, ...holding, price, value, invested, pnl };
      })
      .filter((holding) => holding.quantity > 0);

    const invested = holdingRows.reduce((sum, holding) => sum + holding.invested, 0);
    const marketValue = holdingRows.reduce((sum, holding) => sum + (holding.value ?? 0), 0);
    const unrealizedPnl = holdingRows.reduce((sum, holding) => sum + (holding.pnl ?? 0), 0);
    const equity = portfolio.cash + marketValue;
    const wins = portfolio.closedTrades.filter((trade) => trade.pnl > 0).length;
    const losses = portfolio.closedTrades.filter((trade) => trade.pnl <= 0).length;
    const bestTrade = portfolio.closedTrades.length
      ? Math.max(...portfolio.closedTrades.map((trade) => trade.pnl))
      : 0;
    const worstTrade = portfolio.closedTrades.length
      ? Math.min(...portfolio.closedTrades.map((trade) => trade.pnl))
      : 0;

    return {
      holdings: holdingRows,
      invested,
      marketValue,
      unrealizedPnl,
      realizedPnl: portfolio.realizedPnl,
      equity,
      returns: ((equity - INITIAL_STATE.cash) / INITIAL_STATE.cash) * 100,
      winRate: portfolio.closedTrades.length ? (wins / (wins + losses)) * 100 : 0,
      bestTrade,
      worstTrade
    };
  }, [portfolio, priceByKey, priceBySymbol]);

  function placeOrder({ key, symbol, exchange, side, quantity, price }) {
    const qty = Math.floor(Number(quantity));
    const px = Number(price);
    const holdingKey = key || symbol;
    if (!holdingKey || !symbol || !qty || qty <= 0 || !Number.isFinite(px) || px <= 0) {
      return { ok: false, message: "Market data unavailable. A virtual order needs a real provider price." };
    }

    const cost = qty * px;
    const currentHolding = portfolio.holdings[holdingKey] || { quantity: 0, avgCost: 0, symbol, exchange };
    if (side === "BUY" && cost > portfolio.cash) {
      return { ok: false, message: "Insufficient virtual cash for this order." };
    }
    if (side === "SELL" && currentHolding.quantity < qty) {
      return { ok: false, message: "You do not hold enough quantity to sell." };
    }
    if (!["BUY", "SELL"].includes(side)) {
      return { ok: false, message: "Invalid virtual order side." };
    }

    const result = { ok: true, message: `${side} order placed in virtual portfolio.` };
    setPortfolio((current) => {
      const holdings = { ...current.holdings };
      const existing = holdings[holdingKey] || { quantity: 0, avgCost: 0, symbol, exchange };
      const now = new Date().toISOString();

      if (side === "BUY") {
        if (cost > current.cash) {
          return current;
        }
        const totalQty = existing.quantity + qty;
        holdings[holdingKey] = {
          symbol,
          exchange,
          quantity: totalQty,
          avgCost: (existing.quantity * existing.avgCost + cost) / totalQty
        };
        return {
          ...current,
          cash: current.cash - cost,
          holdings,
          orders: [{ key: holdingKey, symbol, exchange, side, quantity: qty, price: px, time: now, pnl: 0 }, ...current.orders]
        };
      }

      if (existing.quantity < qty) {
        return current;
      }

      const pnl = (px - existing.avgCost) * qty;
      const nextQty = existing.quantity - qty;
      if (nextQty > 0) holdings[holdingKey] = { ...existing, quantity: nextQty };
      else delete holdings[holdingKey];

      return {
        ...current,
        cash: current.cash + cost,
        holdings,
        realizedPnl: current.realizedPnl + pnl,
        closedTrades: [{ key: holdingKey, symbol, exchange, quantity: qty, entry: existing.avgCost, exit: px, pnl, time: now }, ...current.closedTrades],
        orders: [{ key: holdingKey, symbol, exchange, side, quantity: qty, price: px, time: now, pnl }, ...current.orders]
      };
    });

    return result;
  }

  function resetPortfolio() {
    setPortfolio(INITIAL_STATE);
  }

  return {
    portfolio,
    summary,
    placeOrder,
    resetPortfolio
  };
}
