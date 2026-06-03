import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { GlobalMarketCoach } from "./components/GlobalMarketCoach";
import HeroSection from "./components/HeroSection";
import { Sidebar } from "./components/Sidebar";
import { StatusBanner } from "./components/StatusBanner";
import { SymbolFocusAnimator } from "./components/SymbolFocusAnimator";
import { Ticker } from "./components/Ticker";
import { TopBar } from "./components/TopBar";
import { CommandHome } from "./pages/CommandHome";
import { MarketDesk } from "./pages/MarketDesk";
import { OptionsLab } from "./pages/OptionsLab";
import { PracticeLab } from "./pages/PracticeLab";
import { SkillPath } from "./pages/SkillPath";
import { useMarketData } from "./hooks/useMarketData";
import { useMarketStatus } from "./hooks/useMarketStatus";
import { usePortfolio } from "./hooks/usePortfolio";

const PAGES = {
  command: CommandHome,
  markets: MarketDesk,
  practice: PracticeLab,
  options: OptionsLab,
  learn: SkillPath
};

const WarRoom3DShell = lazy(() =>
  import("./components/WarRoom3DShell").then((module) => ({ default: module.WarRoom3DShell }))
);

export default function App() {
  const [page, setPage] = useState("command");
  const [shockwaveEventId, setShockwaveEventId] = useState(0);
  const [focusEventId, setFocusEventId] = useState(0);
  const [shockwaveActive, setShockwaveActive] = useState(false);
  const firstPageEffect = useRef(true);
  const marketStatus = useMarketStatus();
  const market = useMarketData(marketStatus);
  const portfolio = usePortfolio(market.stocks);
  const Page = PAGES[page] || CommandHome;
  const indices = useMemo(
    () =>
      ["NSE:NIFTY", "BSE:SENSEX", "NSE:BANKNIFTY"].map((key) =>
        market.stocks.find((stock) => stock.key === key)
      ),
    [market.stocks]
  );

  useEffect(() => {
    if (firstPageEffect.current) {
      firstPageEffect.current = false;
    } else {
      document.querySelector("[data-warroom-app]")?.scrollIntoView?.({ block: "start" });
    }

    document.querySelector(".page")?.scrollTo?.({ top: 0, left: 0 });
  }, [page]);

  function navigate(nextPage) {
    setPage(nextPage);
    setFocusEventId((eventId) => eventId + 1);
  }

  function pulseFocus() {
    setFocusEventId((eventId) => eventId + 1);
  }

  function launchMarketDesk() {
    setShockwaveEventId((eventId) => eventId + 1);
    setFocusEventId((eventId) => eventId + 1);
    setShockwaveActive(true);
    setPage("markets");
    window.setTimeout(() => setShockwaveActive(false), 2000);
  }

  return (
    <ErrorBoundary>
      <div className="site-shell">
        <HeroSection />
        <div
          className={`app-shell ${shockwaveActive ? "shockwave-active" : ""}`}
          data-warroom-app
        >
          <Suspense fallback={<div className="three-shell" aria-hidden="true"><div className="three-fallback-grid" /></div>}>
            <WarRoom3DShell
              indices={indices}
              marketStatus={marketStatus}
              selected={market.selected}
              selectedHistory={market.selectedHistory}
              dataStatus={market.dataStatus}
              shockwaveEventId={shockwaveEventId}
              focusEventId={focusEventId}
              page={page}
            />
          </Suspense>
          <TopBar indices={indices} marketStatus={marketStatus} dataStatus={market.dataStatus} connection={market.connection} />
          <div className="layout">
            <Sidebar page={page} onPage={navigate} />
            <main className="content">
              <Ticker stocks={market.stocks.filter((stock) => stock.price != null).slice(0, 30)} />
              <StatusBanner message={market.banner} onClose={() => market.setBanner(null)} />
              <div className="page">
                <Page
                  market={market}
                  portfolio={portfolio}
                  page={page}
                  onLaunchDesk={launchMarketDesk}
                  onNavigate={navigate}
                  onFocusPulse={pulseFocus}
                  shockwaveEventId={shockwaveEventId}
                />
              </div>
            </main>
          </div>
          <SymbolFocusAnimator selected={market.selected} eventId={focusEventId} page={page} />
          <GlobalMarketCoach market={market} portfolio={portfolio} page={page} />
          <footer className="status-bar">
            <span className={`sb-dot ${marketStatus.session.phase}`} />
            <span>{marketStatus.session.detail}</span>
            <span className="sb-right">{marketStatus.time} IST - Data source: {market.connection.source}</span>
          </footer>
        </div>
      </div>
    </ErrorBoundary>
  );
}
