import { useEffect, useState } from "react";
import { timeIST } from "../utils/format";
import { getIndianMarketSession } from "../services/marketStatusService";

export function useMarketStatus() {
  const [status, setStatus] = useState(() => {
    const now = new Date();
    return {
      time: timeIST(now, true),
      now,
      session: getIndianMarketSession(now)
    };
  });

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const session = getIndianMarketSession(now);
      setStatus({ time: timeIST(now, true), now, session });
      if (import.meta.env.DEV) {
        console.debug("[warroom:market-status]", {
          istTime: timeIST(now, true),
          marketSession: session.marketSession,
          source: "useMarketStatus"
        });
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  return status;
}
