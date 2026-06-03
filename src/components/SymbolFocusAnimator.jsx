import { useEffect, useState } from "react";
import { classForChange, formatPercent } from "../utils/format";

export function SymbolFocusAnimator({ selected, eventId, page }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!eventId || !selected?.symbol) return undefined;
    setVisible(true);
    const timer = window.setTimeout(() => setVisible(false), 1300);
    return () => window.clearTimeout(timer);
  }, [eventId, selected?.symbol]);

  if (!visible || !selected?.symbol) return null;

  return (
    <div className={`symbol-focus-pop ${classForChange(selected.changePercent)}`} aria-hidden="true">
      <span>{pageLabel(page)}</span>
      <b>{selected.symbol}</b>
      <em>{formatPercent(selected.changePercent)}</em>
    </div>
  );
}

function pageLabel(page) {
  if (page === "markets") return "Desk locked";
  if (page === "practice") return "Practice mode";
  if (page === "options") return "F&O lab";
  if (page === "learn") return "Skill path";
  return "Command focus";
}
