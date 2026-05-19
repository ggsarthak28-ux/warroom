import { TRADING_RULES } from "../data/stocks";
import { Card } from "../components/Cards";
import { useLocalStorage } from "../hooks/useLocalStorage";
import { timeIST } from "../utils/format";

export function Psychology() {
  const [checked, setChecked] = useLocalStorage("warroom-rules", []);
  const [moods, setMoods] = useLocalStorage("warroom-moods", []);
  const score = Math.round((checked.length / TRADING_RULES.length) * 100);

  function toggle(index) {
    setChecked(checked.includes(index) ? checked.filter((item) => item !== index) : [...checked, index]);
  }

  function logMood(mood, tone) {
    setMoods([{ mood, tone, time: new Date().toISOString() }, ...moods].slice(0, 30));
  }

  return (
    <div className="psych-grid">
      <Card title="Daily Trading Rules" badge={`${checked.length}/${TRADING_RULES.length}`}>
        <div className="rule-list">
          {TRADING_RULES.map((rule, index) => (
            <button className={`rule-item ${checked.includes(index) ? "done" : ""}`} key={rule} type="button" onClick={() => toggle(index)}>
              <span>{checked.includes(index) ? "OK" : ""}</span>
              <b>{rule}</b>
            </button>
          ))}
        </div>
        <div className="button-row">
          <button className="btn ghost" type="button" onClick={() => setChecked([])}>Reset</button>
          <button className="btn primary" type="button" onClick={() => setChecked(TRADING_RULES.map((_, i) => i))}>Confirm All</button>
        </div>
      </Card>

      <Card title="Discipline Score & Mood Tracker">
        <div className={`discipline ${score >= 80 ? "up" : score >= 50 ? "warn" : "dn"}`}>{score}%</div>
        <div className="mood-grid expanded">
          {[
            ["Confident", "up"],
            ["Fearful", "dn"],
            ["Greedy", "dn"],
            ["Disciplined", "up"],
            ["Anxious", "warn"],
            ["Frustrated", "dn"],
            ["Focused", "up"],
            ["Neutral", "info"]
          ].map(([mood, tone]) => (
            <button type="button" key={mood} onClick={() => logMood(mood, tone)}>{mood}</button>
          ))}
        </div>
        <div className="mood-history">
          {moods.length ? (
            moods.map((mood) => (
              <div className="mood-row" key={`${mood.mood}-${mood.time}`}>
                <span className={mood.tone}>{mood.mood}</span>
                <small>{timeIST(new Date(mood.time))} IST</small>
              </div>
            ))
          ) : (
            <div className="empty-state">No moods logged yet.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
