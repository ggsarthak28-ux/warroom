import { useMemo } from "react";
import { Card } from "../components/Cards";
import { CANDLE_PATTERNS, ROADMAP, TRADING_RULES } from "../data/stocks";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { timeIST } from "../utils/format";

export function SkillPath({ market, onNavigate }) {
  const [done, setDone] = useLocalStorage("warroom-learning", []);
  const [checked, setChecked] = useLocalStorage("warroom-rules", []);
  const [moods, setMoods] = useLocalStorage("warroom-moods", []);
  const xp = useMemo(() => ROADMAP.filter((item) => done.includes(item.id)).reduce((sum, item) => sum + item.xp, 0), [done]);
  const maxXp = ROADMAP.reduce((sum, item) => sum + item.xp, 0);
  const score = Math.round((checked.length / TRADING_RULES.length) * 100);

  function toggleLesson(item, index) {
    if (index > 0 && !done.includes(ROADMAP[index - 1].id)) return;
    setDone(done.includes(item.id) ? done.filter((id) => id !== item.id) : [...done, item.id]);
  }

  function toggleRule(index) {
    setChecked(checked.includes(index) ? checked.filter((item) => item !== index) : [...checked, index]);
  }

  function logMood(mood, tone) {
    setMoods([{ mood, tone, time: new Date().toISOString() }, ...moods].slice(0, 30));
  }

  return (
    <div className="skill-path">
      <section className="skill-hero">
        <div>
          <div className="eyebrow">Skill path</div>
          <h1>Build trader skill in small daily reps.</h1>
          <p>Read one chart, learn one concept, follow your rules, then review with the coach.</p>
        </div>
        <div className="skill-level">
          <span>Level {done.length + 1}</span>
          <b>{xp} / {maxXp} XP</b>
          <i><em style={{ width: `${Math.max((xp / maxXp) * 100, 4)}%` }} /></i>
        </div>
      </section>

      <Card title="Today's Lesson Loop" badge={market.selected?.symbol || "NIFTY"}>
        <div className="lesson-loop">
          {[
            ["Chart", "Open the Market Desk and read the latest trend.", "markets"],
            ["Concept", "Pick one pattern or risk idea below.", null],
            ["Practice", "Place a virtual trade only if price exists.", "practice"],
            ["Review", "Ask the floating coach what you missed.", null]
          ].map(([title, body, target], index) => (
            <button
              type="button"
              className="lesson-loop-step"
              key={title}
              onClick={() => target && onNavigate?.(target)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <b>{title}</b>
              <small>{body}</small>
            </button>
          ))}
        </div>
      </Card>

      <Card title="Learning Track">
        <div className="roadmap pro-roadmap">
          {ROADMAP.map((item, index) => {
            const locked = index > 0 && !done.includes(ROADMAP[index - 1].id);
            const complete = done.includes(item.id);
            return (
              <button
                className={`lvl-item ${locked ? "locked" : ""} ${complete ? "done" : ""}`}
                type="button"
                key={item.id}
                onClick={() => toggleLesson(item, index)}
              >
                <span>{complete ? "OK" : item.id}</span>
                <b>{item.title}</b>
                <small>{item.sub}</small>
                <em>+{item.xp} XP</em>
              </button>
            );
          })}
        </div>
      </Card>

      <Card title="Candle Pattern Deck">
        <div className="cand-grid">
          {CANDLE_PATTERNS.map((pattern) => (
            <div className="candle-card" key={pattern.name}>
              <div className={`mini-candle ${pattern.tone}`}><i /></div>
              <b>{pattern.name}</b>
              <span className={pattern.tone}>{pattern.signal}</span>
              <p>{pattern.body}</p>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Mindset Rules" badge={`${score}% discipline`}>
        <div className="rule-list">
          {TRADING_RULES.map((rule, index) => (
            <button className={`rule-item ${checked.includes(index) ? "done" : ""}`} key={rule} type="button" onClick={() => toggleRule(index)}>
              <span>{checked.includes(index) ? "OK" : ""}</span>
              <b>{rule}</b>
            </button>
          ))}
        </div>
        <div className="mood-grid expanded">
          {[
            ["Confident", "up"],
            ["Fearful", "dn"],
            ["Greedy", "dn"],
            ["Disciplined", "up"],
            ["Anxious", "warn"],
            ["Focused", "up"]
          ].map(([mood, tone]) => (
            <button type="button" key={mood} onClick={() => logMood(mood, tone)}>{mood}</button>
          ))}
        </div>
        <div className="mood-history compact">
          {moods.length ? (
            moods.slice(0, 5).map((mood) => (
              <div className="mood-row" key={`${mood.mood}-${mood.time}`}>
                <span className={mood.tone}>{mood.mood}</span>
                <small>{timeIST(new Date(mood.time))} IST</small>
              </div>
            ))
          ) : (
            <div className="mission-note">Log your mood before trading. It changes the decision quality.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
