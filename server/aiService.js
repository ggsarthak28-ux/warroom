const FEATURE_PROMPTS = {
  "stock-analysis": "Analyze the selected stock using price action, trend, volume, and risk levels.",
  "market-trend": "Explain the broader market trend in beginner-friendly language.",
  "stock-insights": "Generate practical watch points and learning insights for this stock.",
  "risk-detection": "Detect position, volatility, concentration, and emotional trading risks.",
  beginner: "Explain the concept simply for a beginner without jargon.",
  news: "Summarize relevant market/news context from the supplied context. Do not invent headlines.",
  portfolio: "Analyze portfolio holdings, P&L, exposure, and learning next steps.",
  watchlist: "Recommend watchlist ideas from the provided stocks and explain why."
};

export async function askGemini({ mode = "stock-analysis", question, context }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      error: "AI Assistant unavailable. Add GEMINI_API_KEY in .env.local.",
      answer: "AI Assistant unavailable. Add GEMINI_API_KEY in .env.local.",
      source: "unavailable",
      mode
    };
  }

  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const body = {
    contents: [
      {
        role: "user",
        parts: [
          {
            text: buildPrompt({ mode, question, context })
          }
        ]
      }
    ],
    generationConfig: {
      temperature: 0.35,
      topP: 0.85,
      maxOutputTokens: 900
    }
  };

  try {
    const data = await postJsonWithRetry(endpoint, body);
    const answer = data.candidates?.[0]?.content?.parts?.map((part) => part.text).filter(Boolean).join("\n")?.trim();
    return {
      ok: true,
      answer: answer || fallbackResponse({ mode, question, context, reason: "Gemini returned empty text" }).answer,
      source: "gemini",
      mode
    };
  } catch (error) {
    console.error("Gemini API Error:", error.message);
    return fallbackResponse({ mode, question, context, reason: error.message });
  }
}

function buildPrompt({ mode, question, context }) {
  return [
    "You are WarRoom AI, a professional Indian stock-market learning assistant.",
    "You are an educational stock-market assistant for a learning simulator. Do not provide financial advice.",
    "Use only the supplied market context. If a fact is missing, say what data is missing.",
    "Do not invent prices, candles, option-chain values, OI, IV, volume, PCR, or max pain.",
    "Use only market data passed by the backend. If data is missing, say it is unavailable.",
    "Never guarantee returns, never claim certainty, and never behave like a licensed broker.",
    "Give concise, actionable, beginner-friendly output with risk controls.",
    `Task: ${FEATURE_PROMPTS[mode] || FEATURE_PROMPTS["stock-analysis"]}`,
    `User question: ${question || "Provide the requested analysis."}`,
    `Market context JSON: ${JSON.stringify(context, null, 2)}`
  ].join("\n\n");
}

function fallbackResponse({ mode, context, reason }) {
  const selected = context?.selected?.symbol || "the selected stock";
  const changeValue = Number(context?.selected?.changePercent);
  const change = Number.isFinite(changeValue) ? `${changeValue.toFixed(2)}%` : "unavailable";
  const rsi = context?.indicators?.rsi != null ? Number(context.indicators.rsi).toFixed(1) : "not available";
  const riskLine =
    mode === "risk-detection"
      ? "Risk check: keep one-trade loss small, avoid averaging down, and confirm stop-loss distance before sizing."
      : "Learning check: confirm trend, support/resistance, volume, and invalidation before acting.";

  return {
    answer: [
      `Gemini is temporarily unavailable (${reason}).`,
      `${selected} latest change is ${change}. RSI is ${rsi}.`,
      riskLine,
      "If market data is missing or stale, treat this as concept explanation only and wait for the backend feed to reconnect."
    ].join(" "),
    source: "fallback",
    mode
  };
}

async function postJsonWithRetry(url, body, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Gemini HTTP ${response.status}: ${text.slice(0, 180)}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await delay(600 * attempt);
    }
  }
  throw lastError;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
