const PAGES = [
  { id: "dash", label: "Command", icon: "C", group: "Desk" },
  { id: "markets", label: "Trading Desk", icon: "T", group: "Desk" },
  { id: "options", label: "F&O Desk", icon: "O", badge: "F&O", group: "Desk" },
  { id: "portfolio", label: "Sim Account", icon: "S", group: "Tools" },
  { id: "tools", label: "Calculators", icon: "C", group: "Tools" },
  { id: "journal", label: "Journal", icon: "J", group: "Tools" },
  { id: "learn", label: "Skill Lab", icon: "L", group: "Growth" },
  { id: "psych", label: "Mindset", icon: "M", group: "Growth" },
  { id: "ai", label: "Market Coach", icon: "AI", badge: "AI", group: "Growth" }
];

export function Sidebar({ page, onPage }) {
  let lastGroup = null;
  return (
    <aside className="sidebar">
      {PAGES.map((item) => {
        const showGroup = item.group !== lastGroup;
        lastGroup = item.group;
        return (
          <div key={item.id} className="nav-block">
            {showGroup && <div className="sidebar-label">{item.group}</div>}
            <button
              className={`nav-item ${page === item.id ? "active" : ""}`}
              type="button"
              onClick={() => onPage(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
              {item.badge && <span className="nav-badge">{item.badge}</span>}
            </button>
          </div>
        );
      })}
      <div className="sidebar-bottom">
        <div className="mini-note">Practice desk only. No brokerage, no advice, no fake market data.</div>
      </div>
    </aside>
  );
}
