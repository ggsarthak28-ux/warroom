import { useMemo, useState } from "react";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Sidebar } from "./components/Sidebar";
import { StatusBanner } from "./components/StatusBanner";
import { Ticker } from "./components/Ticker";
import { TopBar } from "./components/TopBar";
import { AiAssistant } from "./pages/AiAssistant";
import { Dashboard } from "./pages/Dashboard";
import { Journal } from "./pages/Journal";
import { Learning } from "./pages/Learning";
import { Markets } from "./pages/Markets";
import { Options } from "./pages/Options";
import { Portfolio } from "./pages/Portfolio";
import { Psychology } from "./pages/Psychology";
import { Tools } from "./pages/Tools";
import { useMarketData } from "./hooks/useMarketData";
import { useMarketStatus } from "./hooks/useMarketStatus";
import { usePortfolio } from "./hooks/usePortfolio";

const PAGES = {
  dash: Dashboard,
  markets: Markets,
  options: Options,
  portfolio: Portfolio,
  tools: Tools,
  journal: Journal,
  learn: Learning,
  psych: Psychology,
  ai: AiAssistant
};

export default function App() {
  const [page, setPage] = useState("dash");
  const marketStatus = useMarketStatus();
  const market = useMarketData(marketStatus);
  const portfolio = usePortfolio(market.stocks);
  const Page = PAGES[page] || Dashboard;
  const indices = useMemo(
    () =>
      ["NSE:NIFTY", "BSE:SENSEX", "NSE:BANKNIFTY"].map((key) =>
        market.stocks.find((stock) => stock.key === key)
      ),
    [market.stocks]
  );

  return (
    <ErrorBoundary>
      <div className="app-shell">
        <div className="mesh" />
        <TopBar indices={indices} marketStatus={marketStatus} dataStatus={market.dataStatus} connection={market.connection} />
        <div className="layout">
          <Sidebar page={page} onPage={setPage} />
          <main className="content">
            <Ticker stocks={market.stocks.filter((stock) => stock.price != null).slice(0, 30)} />
            <StatusBanner message={market.banner} onClose={() => market.setBanner(null)} />
            <div className="page">
              <Page market={market} portfolio={portfolio} />
            </div>
          </main>
        </div>
        <footer className="status-bar">
          <span className={`sb-dot ${marketStatus.session.phase}`} />
          <span>{marketStatus.session.detail}</span>
          <span className="sb-right">{marketStatus.time} IST - Data source: {market.connection.source}</span>
        </footer>
      </div>
    </ErrorBoundary>
  );
}
