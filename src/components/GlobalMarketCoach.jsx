import { useEffect, useMemo, useRef, useState } from "react";
import { askMarketAI, fetchAIStatus } from "../services/api";
import { formatINR, formatPercent } from "../utils/format";

const QUICK_PROMPTS = [
  "Explain this chart",
  "What should I learn here?",
  "Risk check this setup",
  "Explain market mood"
];

const PAGE_LABELS = {
  command: "Command",
  markets: "Market Desk",
  practice: "Practice Lab",
  options: "F&O Lab",
  learn: "Skill Path"
};

export function GlobalMarketCoach({ market, portfolio, page }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [status, setStatus] = useState({ connected: false, message: "Checking AI..." });
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "I am your market coach. Ask about the current symbol, risk, candles, F&O concepts, or what to learn next."
    }
  ]);
  const recognitionRef = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchAIStatus({ signal: controller.signal })
      .then(setStatus)
      .catch(() =>
        setStatus({
          connected: false,
          message: "AI route is not reachable. Text help will use fallback responses."
        })
      );
    return () => controller.abort();
  }, []);

  const speechSupported = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  async function send(text = input) {
    const question = text.trim();
    if (!question || loading) return;
    setInput("");
    setOpen(true);
    setMessages((current) => [...current, { role: "user", text: question }]);
    setLoading(true);
    try {
      const response = await askMarketAI({
        question,
        mode: page === "options" ? "beginner" : "stock-analysis",
        pageContext: {
          page,
          label: PAGE_LABELS[page] || "Command"
        },
        selectedSymbol: {
          symbol: market.selected?.symbol,
          exchange: market.selected?.exchange,
          name: market.selected?.name
        },
        marketContext: {
          selected: market.selected,
          quoteFreshness: market.dataStatus?.quoteLabel,
          candleFreshness: market.dataStatus?.candleLabel,
          marketSession: market.marketSession?.label,
          timeframe: market.timeframe,
          latestCandles: market.selectedHistory?.slice(-12)
        },
        portfolioContext: portfolio.summary
      });
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: response.answer || response.error || "AI response unavailable."
        }
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text:
            error?.message ||
            "AI is unavailable. I can still help with the basics: define timeframe, mark levels, size risk, and avoid forcing trades."
        }
      ]);
    } finally {
      setLoading(false);
    }
  }

  function toggleMic() {
    if (!speechSupported || loading) return;
    if (listening) {
      recognitionRef.current?.stop?.();
      setListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      setInput(transcript);
      if (transcript) send(transcript);
    };
    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);
    recognitionRef.current = recognition;
    setListening(true);
    recognition.start();
  }

  const selected = market.selected || {};

  return (
    <div className={`coach-dock ${open ? "open" : ""}`}>
      {!open && (
        <button className="coach-orb" type="button" onClick={() => setOpen(true)} aria-label="Open Market Coach">
          <span>AI</span>
          <i />
        </button>
      )}

      {open && (
        <section className="coach-panel" aria-label="Global Market Coach">
          <div className="coach-head">
            <div>
              <b>Market Coach</b>
              <span>{status.connected ? "Gemini backend connected" : status.message}</span>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close Market Coach">
              x
            </button>
          </div>

          <div className="coach-context">
            <span>{PAGE_LABELS[page] || "Command"}</span>
            <b>{selected.exchange || "NSE"}:{selected.symbol || "NIFTY"}</b>
            <em>{formatINR(selected.price, 2)} {formatPercent(selected.changePercent)}</em>
          </div>

          <div className="coach-prompts">
            {QUICK_PROMPTS.map((prompt) => (
              <button type="button" key={prompt} onClick={() => send(prompt)}>
                {prompt}
              </button>
            ))}
          </div>

          <div className="coach-messages">
            {messages.slice(-6).map((message, index) => (
              <div className={`coach-msg ${message.role}`} key={`${message.role}-${index}`}>
                {message.text}
              </div>
            ))}
            {loading && <div className="coach-thinking">Thinking...</div>}
          </div>

          <form
            className="coach-input"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <button
              className={listening ? "listening" : ""}
              type="button"
              onClick={toggleMic}
              disabled={!speechSupported || loading}
              title={speechSupported ? "Speak to Market Coach" : "Voice input unavailable in this browser"}
            >
              Mic
            </button>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask anything about this market..."
            />
            <button type="submit" disabled={loading}>
              Send
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
