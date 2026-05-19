export const ROADMAP = [
  { id: 1, title: "Market Fundamentals", sub: "NSE/BSE, indices, orders, demat basics", xp: 50 },
  { id: 2, title: "Reading Price Charts", sub: "Timeframes, support, resistance, trend lines", xp: 80 },
  { id: 3, title: "Candlestick Patterns", sub: "Core reversal and continuation patterns", xp: 100 },
  { id: 4, title: "Technical Indicators", sub: "RSI, MACD, moving averages, Bollinger Bands", xp: 120 },
  { id: 5, title: "Price Action Trading", sub: "Structure breaks, zones, liquidity and gaps", xp: 120 },
  { id: 6, title: "Options & F&O", sub: "Calls, puts, OI, Greeks, strategy risk", xp: 150 },
  { id: 7, title: "Risk Management", sub: "Position sizing, SL discipline, portfolio heat", xp: 80 }
];

export const CANDLE_PATTERNS = [
  { name: "Doji", signal: "Indecision", tone: "warn", body: "Open and close are nearly equal. Wait for confirmation." },
  { name: "Hammer", signal: "Bullish", tone: "good", body: "Long lower wick. Buyers rejected lower prices near support." },
  { name: "Shooting Star", signal: "Bearish", tone: "danger", body: "Long upper wick. Sellers rejected higher prices near resistance." },
  { name: "Bull Engulf", signal: "Bullish", tone: "good", body: "Green candle fully absorbs the prior red candle." },
  { name: "Bear Engulf", signal: "Bearish", tone: "danger", body: "Red candle fully absorbs the prior green candle." },
  { name: "Morning Star", signal: "Bullish", tone: "good", body: "Three-candle bottoming pattern after a decline." },
  { name: "Marubozu", signal: "Trend", tone: "info", body: "Large body with tiny wicks. Momentum is one-sided." },
  { name: "Pin Bar", signal: "Reversal", tone: "good", body: "Small body and long wick. Shows price rejection." },
  { name: "Spinning Top", signal: "Pause", tone: "warn", body: "Small body with similar wicks. Momentum is undecided." }
];

export const TRADING_RULES = [
  "I have set a maximum loss limit for today.",
  "Every open position has a stop-loss.",
  "I am not trading to recover yesterday's loss.",
  "I will not average down a losing trade.",
  "I checked global markets and sector breadth.",
  "I know today's key support and resistance zones.",
  "My quantity follows the risk calculator.",
  "I am calm, focused, and not emotionally driven.",
  "I will stop after three consecutive losses.",
  "I will journal every trade I take today."
];

export const QUICK_PROMPTS = [
  "Why is Bank Nifty falling?",
  "Explain FII vs DII",
  "What is India VIX?",
  "Best Nifty intraday strategy?",
  "How to read option chain?",
  "Put/Call ratio explained",
  "RBI rate cut impact on stocks",
  "How to manage revenge trading?",
  "Explain Nifty max pain",
  "What is OI buildup?"
];
