const PAGES = [
  { id: "dash", label: "Dashboard", icon: "D", group: "Overview" },
  { id: "markets", label: "Markets", icon: "M", group: "Overview" },
  { id: "options", label: "Options", icon: "O", badge: "F&O", group: "Overview" },
  { id: "portfolio", label: "Simulator", icon: "S", group: "Tools" },
  { id: "tools", label: "Calculators", icon: "C", group: "Tools" },
  { id: "journal", label: "Journal", icon: "J", group: "Tools" },
  { id: "learn", label: "Learning", icon: "L", group: "Growth" },
  { id: "psych", label: "Psychology", icon: "P", group: "Growth" },
  { id: "ai", label: "AI Assistant", icon: "AI", badge: "AI", group: "Growth" }
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
        <div className="mini-note">Learning simulator only. Not brokerage or investment advice.</div>
      </div>
    </aside>
  );
}
