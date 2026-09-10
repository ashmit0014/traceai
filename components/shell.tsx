"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowUpRight,
  Box,
  ChevronDown,
  Command,
  FlaskConical,
  GitBranch,
  Layers,
  LayoutDashboard,
  Settings,
  ShieldCheck,
} from "lucide-react";
const links = [
  ["/", "Overview", LayoutDashboard],
  ["/incidents", "Incidents", Activity],
  ["/services", "Services", Layers],
  ["/evaluations", "Evaluations", FlaskConical],
  ["/settings", "Settings", Settings],
] as const;
export function Shell({
  children,
  mode,
}: {
  children: React.ReactNode;
  mode: string;
}) {
  const path = usePathname();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <GitBranch size={22} />
          </span>
          Trace<span>AI</span>
        </Link>
        <div className="workspace">
          <span className="workspace-icon">S</span>
          <div>
            ShopFlow<small>Production workspace</small>
          </div>
          <ChevronDown size={14} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav>
          {links.map(([href, title, Icon]) => (
            <Link
              key={href}
              className={
                (href === "/" ? path === "/" : path.startsWith(href))
                  ? "nav-link active"
                  : "nav-link"
              }
              href={href}
            >
              <Icon size={17} />
              {title}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="system-state">
            <span className="dot green" /> All evidence sources connected
          </div>
          <div className="mode-panel">
            <Box size={17} />
            <div>
              {mode === "demo" ? "Demo playground" : "Live model connected"}
              <small>
                {mode === "demo"
                  ? "Seeded data. Real investigation flow."
                  : "Tool-based evidence investigation"}
              </small>
            </div>
            <ArrowUpRight size={13} />
          </div>
          <div className="profile">
            <span className="avatar">SF</span>
            <div>
              ShopFlow team<small>Local workspace</small>
            </div>
            <Command size={15} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <span>
            Workspace <span className="slash">/</span> <b>ShopFlow</b>
            <span className="badge muted">Production</span>
          </span>
          <span className="topbar-right">
            <ShieldCheck size={14} /> Local evidence{" "}
            <span className={`badge ${mode === "demo" ? "amber" : "green"}`}>
              {mode === "demo" ? "Demo Mode" : "Live Mode"}
            </span>
          </span>
        </header>
        <main>{children}</main>
        <footer>
          TRACEAI <span>Built for the moments when every second matters.</span>
          <span className="dot green" /> System operational
        </footer>
      </div>
    </div>
  );
}
