export function instrumentKey(instrument) {
  if (!instrument) return "";
  return `${instrument.exchange || ""}:${instrument.symbol || ""}`.toUpperCase();
}

export function searchStocks(query, instruments) {
  const q = query.trim().toLowerCase();
  if (!q) return instruments;
  return instruments.filter((instrument) =>
    [
      instrument.symbol,
      instrument.name,
      instrument.exchange,
      instrument.instrumentType,
      instrument.sector
    ]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q))
  );
}

export function mergeQuote(instrument, quote) {
  if (!quote || quote.error) {
    return {
      ...instrument,
      dataState: instrument.price == null ? "unavailable" : "stale",
      quoteAvailable: instrument.price != null,
      candlesAvailable: quote?.candlesAvailable ?? instrument.candlesAvailable,
      providerSymbol: quote?.providerSymbol || instrument.providerSymbol,
      error: quote?.error || instrument.error || null
    };
  }

  return {
    ...instrument,
    price: quote.price,
    previousClose: quote.previousClose,
    change: quote.change,
    changePercent: quote.changePercent,
    volume: Number(quote.volume) > 0 ? Number(quote.volume) : null,
    source: quote.source,
    stale: Boolean(quote.stale),
    delayed: Boolean(quote.delayed),
    providerSymbol: quote.providerSymbol || instrument.providerSymbol,
    quoteAvailable: true,
    candlesAvailable: quote.candlesAvailable ?? instrument.candlesAvailable,
    providerName: quote.providerName || quote.source || instrument.providerName,
    availabilityCheckedAt: quote.availabilityCheckedAt || instrument.availabilityCheckedAt,
    dataState: quote.stale ? "stale" : "available",
    dataStatus: quote.dataStatus || "Quote Available",
    lastUpdated: quote.timestamp,
    error: null
  };
}

export function updateOnlyChangedStock(instruments, updates) {
  const byKey = new Map(
    updates.map((update) => [
      `${update.exchange || ""}:${update.symbol || ""}`.toUpperCase(),
      update
    ])
  );
  const bySymbol = new Map(updates.map((update) => [String(update.symbol).toUpperCase(), update]));

  return instruments.map((instrument) => {
    const update = byKey.get(instrumentKey(instrument)) || bySymbol.get(String(instrument.symbol).toUpperCase());
    return update ? mergeQuote(instrument, update) : instrument;
  });
}
