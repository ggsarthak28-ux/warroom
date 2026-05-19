import { useMemo } from "react";
import { CANDLE_PATTERNS, ROADMAP } from "../data/stocks";
import { Card } from "../components/Cards";
import { useLocalStorage } from "../hooks/useLocalStorage";

export function Learning() {
  const [done, setDone] = useLocalStorage("warroom-learning", []);
  const xp = useMemo(() => ROADMAP.filter((item) => done.includes(item.id)).reduce((sum, item) => sum + item.xp, 0), [done]);
  const maxXp = ROADMAP.reduce((sum, item) => sum + item.xp, 0);

  function toggle(item, index) {
    if (index > 0 && !done.includes(ROADMAP[index - 1].id)) return;
    setDone(done.includes(item.id) ? done.filter((id) => id !== item.id) : [...done, item.id]);
  }

  return (
    <div className="learn-grid">
      <Card title="Your Learning Path">
        <div className="progress-line">
          <span>XP Progress</span>
          <b>{xp} / {maxXp} XP</b>
        </div>
        <div className="xp-bar"><i style={{ width: `${(xp / maxXp) * 100}%` }} /></div>
        <div className="level-label">Level {done.length + 1} - {["Beginner", "Learner", "Analyst", "Trader", "Pro Trader", "Expert", "Master"][Math.min(done.length, 6)]}</div>
        <div className="roadmap">
          {ROADMAP.map((item, index) => {
            const locked = index > 0 && !done.includes(ROADMAP[index - 1].id);
            const complete = done.includes(item.id);
            return (
              <button
                className={`lvl-item ${locked ? "locked" : ""} ${complete ? "done" : ""}`}
                type="button"
                key={item.id}
                onClick={() => toggle(item, index)}
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

      <Card title="Candlestick Pattern Library" className="grow">
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
    </div>
  );
}
