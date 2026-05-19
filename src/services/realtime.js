export function connectMarketStream({ symbols, onTick, onState, onError }) {
  const query = encodeURIComponent(symbols.join(","));
  let closed = false;
  let socket = null;
  let reconnectTimer = null;
  let attempt = 0;
  const explicitWsBase = import.meta.env.VITE_WS_BASE_URL;
  const canUseRelativeWebSocket = import.meta.env.DEV;

  if (!explicitWsBase && !canUseRelativeWebSocket) {
    onState?.({
      status: "connected",
      source: "HTTP polling",
      label: "API polling"
    });
    return () => {
      closed = true;
    };
  }

  const connect = () => {
    if (closed || typeof WebSocket === "undefined") return;
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const base = explicitWsBase || `${protocol}://${window.location.host}`;
    const url = `${base.replace(/\/$/, "")}/ws/prices?symbols=${query}`;
    onState?.({ status: "connecting", source: "websocket" });
    socket = new WebSocket(url);

    socket.onopen = () => {
      attempt = 0;
      onState?.({ status: "connected", source: "websocket" });
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "tick") onTick?.(payload.quotes || []);
        if (payload.type === "status") onState?.(payload.state);
        if (payload.state) onState?.(payload.state);
        if (payload.type === "error") onError?.(new Error(payload.message));
      } catch (error) {
        onError?.(error);
      }
    };

    socket.onerror = () => {
      socket?.close();
    };

    socket.onclose = () => {
      if (closed) return;
      attempt += 1;
      const wait = Math.min(1500 * attempt, 8000);
      onState?.({ status: "reconnecting", source: "websocket", wait });
      reconnectTimer = window.setTimeout(connect, wait);
    };
  };

  connect();

  return () => {
    closed = true;
    window.clearTimeout(reconnectTimer);
    socket?.close();
  };
}
