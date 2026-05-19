export const TIMEFRAMES = [
  { key: "1m", label: "1 Min", yahooRange: "1d", yahooInterval: "1m", defaultRange: "1d" },
  { key: "5m", label: "5 Min", yahooRange: "5d", yahooInterval: "5m", defaultRange: "5d" },
  { key: "15m", label: "15 Min", yahooRange: "1mo", yahooInterval: "15m", defaultRange: "1mo" },
  { key: "30m", label: "30 Min", yahooRange: "1mo", yahooInterval: "30m", defaultRange: "1mo" },
  { key: "1h", label: "1 Hour", yahooRange: "3mo", yahooInterval: "1h", defaultRange: "3mo" },
  { key: "1D", label: "1 Day", yahooRange: "1y", yahooInterval: "1d", defaultRange: "1y" },
  { key: "1W", label: "1 Week", yahooRange: "5y", yahooInterval: "1wk", defaultRange: "5y" },
  { key: "1M", label: "1 Month", yahooRange: "max", yahooInterval: "1mo", defaultRange: "max" }
];

export const RANGE_OPTIONS = [
  { key: "1d", label: "1 Day" },
  { key: "5d", label: "1 Week" },
  { key: "1mo", label: "1 Month" },
  { key: "3mo", label: "3 Months" },
  { key: "6mo", label: "6 Months" },
  { key: "1y", label: "1 Year" },
  { key: "5y", label: "5 Years" },
  { key: "max", label: "Max" }
];

export function getTimeframe(key = "1m") {
  return TIMEFRAMES.find((item) => item.key === key) || TIMEFRAMES[0];
}

export function toUnixSeconds(dateLike, endOfDay = false) {
  if (!dateLike) return null;
  const date = new Date(`${dateLike}T${endOfDay ? "23:59:59" : "00:00:00"}+05:30`);
  return Math.floor(date.getTime() / 1000);
}
