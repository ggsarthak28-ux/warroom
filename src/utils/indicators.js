export function sma(candles, period = 20) {
  const source = validCloseCandles(candles);
  if (source.length < period) return [];
  return source
    .map((candle, index) => {
      if (index < period - 1) return null;
      const slice = source.slice(index - period + 1, index + 1);
      const value = slice.reduce((sum, item) => sum + item.close, 0) / period;
      return { time: candle.time, value };
    })
    .filter((point) => point && Number.isFinite(point.value));
}

export function ema(candles, period = 20) {
  const source = validCloseCandles(candles);
  if (source.length < period) return [];
  const multiplier = 2 / (period + 1);
  const result = [];
  let previous = source.slice(0, period).reduce((sum, candle) => sum + candle.close, 0) / period;

  source.forEach((candle, index) => {
    const value = index < period ? previous : (candle.close - previous) * multiplier + previous;
    previous = value;
    if (index >= period - 1) result.push({ time: candle.time, value });
  });

  return result.filter((point) => Number.isFinite(point.value));
}

export function bollingerBands(candles, period = 20, deviations = 2) {
  const source = validCloseCandles(candles);
  const mid = sma(source, period);
  const byTime = new Map(mid.map((point) => [point.time, point.value]));
  const upper = [];
  const lower = [];

  source.forEach((candle, index) => {
    if (index < period - 1) return;
    const slice = source.slice(index - period + 1, index + 1);
    const mean = byTime.get(candle.time);
    if (!Number.isFinite(mean)) return;
    const variance = slice.reduce((sum, item) => sum + (item.close - mean) ** 2, 0) / period;
    const sd = Math.sqrt(variance);
    upper.push({ time: candle.time, value: mean + deviations * sd });
    lower.push({ time: candle.time, value: mean - deviations * sd });
  });

  return { mid, upper, lower };
}

export function rsi(candles, period = 14) {
  const source = validCloseCandles(candles);
  if (source.length <= period) return [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i += 1) {
    const diff = source[i].close - source[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  const result = [];

  for (let i = period + 1; i < source.length; i += 1) {
    const diff = source[i].close - source[i - 1].close;
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push({ time: source[i].time, value: 100 - 100 / (1 + rs) });
  }

  return result.filter((point) => Number.isFinite(point.value));
}

export function macd(candles, fast = 12, slow = 26, signalPeriod = 9) {
  const source = validCloseCandles(candles);
  if (source.length < slow + signalPeriod) return { macdLine: [], signal: [], histogram: [] };
  const fastEma = ema(source, fast);
  const slowEma = ema(source, slow);
  const fastByTime = new Map(fastEma.map((point) => [point.time, point.value]));
  const macdLine = slowEma
    .map((point) => ({ time: point.time, value: (fastByTime.get(point.time) || point.value) - point.value }))
    .filter((point) => Number.isFinite(point.value));
  const signalSource = macdLine.map((point) => ({ time: point.time, close: point.value }));
  const signal = ema(signalSource, signalPeriod);
  const signalByTime = new Map(signal.map((point) => [point.time, point.value]));
  const histogram = macdLine
    .filter((point) => signalByTime.has(point.time))
    .map((point) => ({ time: point.time, value: point.value - signalByTime.get(point.time) }));

  return { macdLine, signal, histogram };
}

export function latestIndicatorSummary(candles) {
  const latestRsi = rsi(candles).at(-1)?.value ?? null;
  const latestMacd = macd(candles).histogram.at(-1)?.value ?? null;
  const latestSma = sma(candles).at(-1)?.value ?? null;
  const latestEma = ema(candles).at(-1)?.value ?? null;
  return { rsi: latestRsi, macd: latestMacd, sma: latestSma, ema: latestEma };
}

function validCloseCandles(candles = []) {
  return candles.filter((candle) => (
    candle &&
    Number.isFinite(Number(candle.time)) &&
    Number.isFinite(Number(candle.close))
  )).map((candle) => ({
    ...candle,
    time: Number(candle.time),
    close: Number(candle.close)
  }));
}
