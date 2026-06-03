const PAGES = [
  { id: "command", label: "Command", icon: "C", group: "Core" },
  { id: "markets", label: "Market Desk", icon: "M", group: "Core" },
  { id: "practice", label: "Practice Lab", icon: "P", group: "Core" },
  { id: "options", label: "F&O Lab", icon: "O", badge: "Real data", group: "Labs" },
  { id: "learn", label: "Skill Path", icon: "S", badge: "Coach", group: "Labs" }
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
        <div className="mini-note">Learning simulator only. Real provider data where available, no brokerage and no fake market values.</div>
      </div>
    </aside>
  );
}
