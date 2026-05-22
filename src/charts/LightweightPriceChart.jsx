import { useEffect, useMemo, useRef, useState } from "react";
import * as LightweightCharts from "lightweight-charts";
import { bollingerBands, ema, macd, rsi, sma } from "../utils/indicators";
import { dateIST, formatINR, formatVolume, timeIST } from "../utils/format";

function normalizeCandles(data = []) {
  const byTime = new Map();
  for (const point of data) {
    if (!point || point.time == null) continue;
    const open = Number(point.open);
    const high = Number(point.high);
    const low = Number(point.low);
    const close = Number(point.close ?? point.value);
    const rawVolume = Number(point.volume);
    const valid =
      Number.isFinite(open) &&
      Number.isFinite(high) &&
      Number.isFinite(low) &&
      Number.isFinite(close) &&
      open > 0 &&
      high > 0 &&
      low > 0 &&
      close > 0 &&
      high >= open &&
      high >= close &&
      high >= low &&
      low <= open &&
      low <= close;
    if (!valid) continue;
    byTime.set(Number(point.time), {
      time: Number(point.time),
      open,
      high,
      low,
      close,
      value: close,
      volume: Number.isFinite(rawVolume) && rawVolume > 0 ? rawVolume : null
    });
  }
  return [...byTime.values()].sort((a, b) => a.time - b.time);
}

function addSeries(chart, fallback, options) {
  if (fallback === "candles") {
    return chart.addCandlestickSeries
      ? chart.addCandlestickSeries(options)
      : chart.addSeries(LightweightCharts.CandlestickSeries, options);
  }
  if (fallback === "histogram") {
    return chart.addHistogramSeries
      ? chart.addHistogramSeries(options)
      : chart.addSeries(LightweightCharts.HistogramSeries, options);
  }
  if (fallback === "area") {
    return chart.addAreaSeries ? chart.addAreaSeries(options) : chart.addSeries(LightweightCharts.AreaSeries, options);
  }
  return chart.addLineSeries ? chart.addLineSeries(options) : chart.addSeries(LightweightCharts.LineSeries, options);
}

export function LightweightPriceChart({
  data,
  tone = "up",
  height = 300,
  chartType = "candles",
  indicators = ["SMA", "EMA", "Volume"],
  loading = false
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const [hover, setHover] = useState(null);
  const [visibleWindow, setVisibleWindow] = useState(null);
  const candles = useMemo(() => normalizeCandles(data), [data]);
  const latest = candles.at(-1);
  const displayLatest = useMemo(() => latestInformativeCandle(candles), [candles]);
  const hasVolume = candles.some((candle) => candle.volume != null);
  const indicatorData = useMemo(() => {
    const bounds = priceBounds(candles);
    return {
      sma20: sanitizeIndicator(sma(candles, 20), bounds),
      ema20: sanitizeIndicator(ema(candles, 20), bounds),
      bands: (() => {
        const bands = bollingerBands(candles, 20, 2);
        return {
          upper: sanitizeIndicator(bands.upper, bounds),
          lower: sanitizeIndicator(bands.lower, bounds)
        };
      })()
    };
  }, [candles]);
  const indicatorSummary = useMemo(() => {
    const latestRsi = rsi(candles).at(-1)?.value;
    const latestMacd = macd(candles).histogram.at(-1)?.value;
    return { rsi: latestRsi, macd: latestMacd };
  }, [candles]);

  useEffect(() => {
    if (!containerRef.current) return undefined;
    containerRef.current.innerHTML = "";

    const chart = LightweightCharts.createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height,
      autoSize: false,
      layout: {
        background: { color: "transparent" },
        textColor: "rgba(226,232,240,0.72)"
      },
      grid: {
        vertLines: { color: "rgba(148,163,184,0.07)" },
        horzLines: { color: "rgba(148,163,184,0.07)" }
      },
      rightPriceScale: {
        borderVisible: false,
        textColor: "rgba(226,232,240,0.55)"
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: true
      },
      crosshair: {
        mode: LightweightCharts.CrosshairMode?.Normal ?? 0
      },
      localization: {
        priceFormatter: (price) => formatINR(price, 2)
      }
    });

    const green = "#18c683";
    const red = "#ff5f6f";
    const blue = "#5ca8ff";
    const amber = "#f5b84b";
    const lineColor = tone === "down" ? red : green;

    const mainSeries =
      chartType === "line"
        ? addSeries(chart, "area", {
            priceScaleId: "right",
            lineColor,
            topColor: tone === "down" ? "rgba(255,95,111,0.22)" : "rgba(24,198,131,0.22)",
            bottomColor: "rgba(4,7,17,0)",
            lineWidth: 2
          })
        : addSeries(chart, "candles", {
            priceScaleId: "right",
            upColor: green,
            downColor: red,
            wickUpColor: green,
            wickDownColor: red,
            borderVisible: false
          });

    mainSeries.setData(chartType === "line" ? candles.map((c) => ({ time: c.time, value: c.close })) : candles);
    mainSeries.priceScale().applyOptions({
      autoScale: true,
      scaleMargins: { top: 0.08, bottom: indicators.includes("Volume") ? 0.26 : 0.1 }
    });

    if (indicators.includes("Volume") && hasVolume) {
      const volume = addSeries(chart, "histogram", {
        priceFormat: { type: "volume" },
        priceScaleId: "",
        color: "rgba(92,168,255,0.3)"
      });
      volume.priceScale().applyOptions({ scaleMargins: { top: 0.78, bottom: 0 } });
      volume.setData(
        candles.filter((candle) => candle.volume != null).map((candle) => ({
          time: candle.time,
          value: candle.volume,
          color: candle.close >= candle.open ? "rgba(24,198,131,0.28)" : "rgba(255,95,111,0.28)"
        }))
      );
    }

    if (indicators.includes("SMA") && indicatorData.sma20.length) {
      const series = addSeries(chart, "line", { color: blue, lineWidth: 1, title: "SMA 20" });
      series.setData(indicatorData.sma20);
    }

    if (indicators.includes("EMA") && indicatorData.ema20.length) {
      const series = addSeries(chart, "line", { color: amber, lineWidth: 1, title: "EMA 20" });
      series.setData(indicatorData.ema20);
    }

    if (indicators.includes("Bollinger") && indicatorData.bands.upper.length && indicatorData.bands.lower.length) {
      addSeries(chart, "line", { color: "rgba(157,123,255,0.78)", lineWidth: 1, title: "BB Upper" }).setData(indicatorData.bands.upper);
      addSeries(chart, "line", { color: "rgba(157,123,255,0.38)", lineWidth: 1, title: "BB Lower" }).setData(indicatorData.bands.lower);
    }

    chart.subscribeCrosshairMove?.((param) => {
      if (!param?.time) {
        setHover(null);
        return;
      }
      const candle = candles.find((item) => item.time === param.time);
      setHover(candle || null);
    });

    const updateVisibleWindow = () => {
      const range = chart.timeScale().getVisibleLogicalRange?.();
      if (!range || !candles.length) {
        setVisibleWindow(candles.length ? visibleWindowFromCandles(candles) : null);
        return;
      }
      const fromIndex = Math.max(0, Math.floor(range.from));
      const toIndex = Math.min(candles.length - 1, Math.ceil(range.to));
      const visible = candles.slice(fromIndex, toIndex + 1);
      setVisibleWindow(visible.length ? visibleWindowFromCandles(visible) : visibleWindowFromCandles(candles));
    };

    chart.timeScale().fitContent();
    updateVisibleWindow();
    chart.timeScale().subscribeVisibleLogicalRangeChange?.(updateVisibleWindow);
    chartRef.current = chart;

    const ro = new ResizeObserver(() => {
      chart.applyOptions({ width: containerRef.current.clientWidth, height });
    });
    ro.observe(containerRef.current);

    return () => {
      chart.timeScale().unsubscribeVisibleLogicalRangeChange?.(updateVisibleWindow);
      ro.disconnect();
      chart.remove();
      chartRef.current = null;
    };
  }, [candles, chartType, hasVolume, height, indicatorData, indicators, tone]);

  function zoom(direction) {
    const chart = chartRef.current;
    if (!chart) return;
    const range = chart.timeScale().getVisibleLogicalRange?.();
    if (!range) {
      chart.timeScale().fitContent();
      return;
    }
    const center = (range.from + range.to) / 2;
    const width = (range.to - range.from) * (direction === "in" ? 0.72 : 1.32);
    chart.timeScale().setVisibleLogicalRange?.({ from: center - width / 2, to: center + width / 2 });
  }

  return (
    <div className="pro-chart-wrap">
      <div className="chart-toolbar">
        <div className="chart-hover">
          {hover || displayLatest ? (
            <>
              <b>{formatCandleDateTime((hover || displayLatest).time)}</b>
              <span>O {formatINR((hover || displayLatest).open, 2)}</span>
              <span>H {formatINR((hover || displayLatest).high, 2)}</span>
              <span>L {formatINR((hover || displayLatest).low, 2)}</span>
              <span>C {formatINR((hover || displayLatest).close, 2)}</span>
              <span>{(hover || displayLatest).volume == null ? "Volume unavailable" : `Vol ${formatVolume((hover || displayLatest).volume)}`}</span>
            </>
          ) : (
            <span>No candle selected</span>
          )}
        </div>
        <div className="chart-window-pill">
          {visibleWindow ? (
            <>
              <b>Viewing</b>
              <span>{formatCandleDateTime(visibleWindow.from)}</span>
              <span>to</span>
              <span>{formatCandleDateTime(visibleWindow.to)}</span>
              <span>{visibleWindow.count} candles</span>
            </>
          ) : (
            <span>Viewing --</span>
          )}
        </div>
        <div className="chart-zoom">
          <button type="button" onClick={() => zoom("in")}>+</button>
          <button type="button" onClick={() => zoom("out")}>-</button>
          <button type="button" onClick={() => chartRef.current?.timeScale().fitContent()}>Fit</button>
        </div>
      </div>
      <div className="chart-host" ref={containerRef} style={{ minHeight: height }} />
      {loading && <div className="chart-loading">Loading market candles...</div>}
      {!loading && !candles.length && <div className="chart-loading">Candle data unavailable</div>}
      <div className="indicator-strip">
        <span>SMA 20 {indicatorData.sma20.at(-1)?.value == null ? "--" : formatINR(indicatorData.sma20.at(-1).value, 2)}</span>
        <span>EMA 20 {indicatorData.ema20.at(-1)?.value == null ? "--" : formatINR(indicatorData.ema20.at(-1).value, 2)}</span>
        <span>RSI {indicatorSummary.rsi == null ? "--" : indicatorSummary.rsi.toFixed(1)}</span>
        <span>MACD {indicatorSummary.macd == null ? "--" : indicatorSummary.macd.toFixed(2)}</span>
        <span>{hasVolume ? "Volume pane" : "Volume unavailable"}</span>
        <span>{candles.length} candles</span>
      </div>
    </div>
  );
}

function latestInformativeCandle(candles) {
  for (let index = candles.length - 1; index >= 0; index -= 1) {
    const candle = candles[index];
    if (candle.high !== candle.low || candle.volume != null) return candle;
  }
  return candles.at(-1) || null;
}

function visibleWindowFromCandles(candles) {
  return {
    from: candles[0].time,
    to: candles.at(-1).time,
    count: candles.length
  };
}

function formatCandleDateTime(unixSeconds) {
  if (!unixSeconds) return "--";
  const date = new Date(Number(unixSeconds) * 1000);
  return `${dateIST(date)} ${timeIST(date, true)}`;
}

function priceBounds(candles) {
  if (!candles.length) return null;
  const lows = candles.map((candle) => candle.low).filter(Number.isFinite);
  const highs = candles.map((candle) => candle.high).filter(Number.isFinite);
  const min = Math.min(...lows);
  const max = Math.max(...highs);
  const range = Math.max(max - min, max * 0.002, 1);
  return { min: min - range * 0.5, max: max + range * 0.5 };
}

function sanitizeIndicator(points, bounds) {
  if (!bounds) return [];
  return points.filter((point) => (
    point &&
    Number.isFinite(Number(point.time)) &&
    Number.isFinite(Number(point.value)) &&
    point.value >= bounds.min &&
    point.value <= bounds.max
  ));
}
