import { useEffect, useState } from "react";
import { QUICK_PROMPTS } from "../data/stocks";
import { askMarketAI, fetchAIStatus } from "../services/api";
import { safeRunAsync } from "../utils/safeRun";

const WELCOME = {
  role: "assistant",
  text:
    "Ask me about Nifty, options, price action, FII/DII flows, position sizing, or trading psychology. I will answer as a market learning coach, not as a broker."
};

const AI_MODES = [
  ["stock-analysis", "Stock analysis"],
  ["market-trend", "Market trend"],
  ["stock-insights", "Stock insights"],
  ["risk-detection", "Risk detection"],
  ["beginner", "Beginner explain"],
  ["news", "News summary"],
  ["portfolio", "Portfolio insight"],
  ["watchlist", "Watchlist ideas"]
];

export function AiAssistant({ market, portfolio }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([WELCOME]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState("stock-analysis");
  const [aiStatus, setAiStatus] = useState({ connected: false, message: "Checking Gemini..." });

  useEffect(() => {
    const controller = new AbortController();
    fetchAIStatus({ signal: controller.signal })
      .then(setAiStatus)
      .catch(() => setAiStatus({ connected: false, message: "AI Assistant unavailable. Add GEMINI_API_KEY in .env.local." }));
    return () => controller.abort();
  }, []);

  async function send(text = input) {
    const question = text.trim();
    if (!question) return;
    setInput("");
    setMessages((current) => [...current, { role: "user", text: question }]);
    setLoading(true);
    await safeRunAsync(
      async () => {
        const response = await askMarketAI(question, {
          selected: market.selected.symbol,
          exchange: market.selected.exchange,
          range: market.timeframe,
          price: market.selected.price,
          change: market.selected.changePercent,
          portfolio: portfolio.summary,
          candles: market.selectedHistory.slice(-80)
        }, mode);
        setMessages((current) => [...current, { role: "assistant", text: response.answer || response.error }]);
      },
      () => {
        setMessages((current) => [
          ...current,
          {
            role: "assistant",
            text:
              "Live AI is unavailable, so use the fallback lens: define your timeframe, identify support/resistance, calculate position size first, then decide whether the setup still deserves risk."
          }
        ]);
      }
    );
    setLoading(false);
  }

  return (
    <div className="ai-layout">
      <div className="ai-header">
        <div className="ai-avatar">AI</div>
        <div>
          <h2>India Market AI</h2>
          <p>NSE/BSE - F&O - risk management - trading psychology</p>
        </div>
        <span className="card-badge">{aiStatus.connected ? "Gemini connected" : "Gemini unavailable"}</span>
      </div>

      <div className="ai-status-line">
        <span>{aiStatus.message}</span>
        <span>{market.selected.exchange}:{market.selected.symbol} - {market.dataStatus?.quoteLabel || "Market data unavailable"}</span>
      </div>

      <div className="quick-btns">
        {AI_MODES.map(([id, label]) => (
          <button type="button" key={id} className={mode === id ? "on" : ""} onClick={() => setMode(id)}>
            {label}
          </button>
        ))}
      </div>

      <div className="quick-btns">
        {QUICK_PROMPTS.map((prompt) => (
          <button type="button" key={prompt} onClick={() => send(prompt)}>
            {prompt}
          </button>
        ))}
      </div>

      <div className="chat-area">
        {messages.map((message, index) => (
          <div className={`chat ${message.role}`} key={`${message.role}-${index}`}>
            {message.role === "assistant" && <div className="chat-from">Market AI</div>}
            {message.text}
          </div>
        ))}
        {loading && (
          <div className="thinking-dots">
            <i />
            <i />
            <i />
            <span>Analysing markets...</span>
          </div>
        )}
      </div>

      <form
        className="chat-row"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask about Nifty, options, F&O, risk, or psychology..."
        />
        <button className="btn primary" type="submit" disabled={loading}>
          Send
        </button>
      </form>
    </div>
  );
}
