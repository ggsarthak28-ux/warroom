import { useMarketStatus } from "./useMarketStatus";

export function useClock() {
  const status = useMarketStatus();
  return { time: status.time, status: status.session };
}
