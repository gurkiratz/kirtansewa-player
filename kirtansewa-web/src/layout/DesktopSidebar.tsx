import { NavLink, Link } from "react-router-dom";
import {
  Home,
  Library,
  Info,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { SiGithub } from "@icons-pack/react-simple-icons";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/library", label: "Library", icon: Library },
];

const GITHUB_URL = "https://github.com/gurkiratz/kirtansewa-player";

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export function DesktopSidebar({ collapsed, onToggle }: Props) {
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;

  return (
    <aside
      className={`hidden md:flex flex-col shrink-0 bg-panel border-r border-border transition-[width] duration-200 ${
        collapsed ? "w-16" : "w-56"
      }`}
    >
      {/* Brand + collapse toggle */}
      <div className="h-14 flex items-center px-4 gap-3 shrink-0">
        {!collapsed && (
          <Link
            to="/"
            className="text-text-primary text-sm font-semibold uppercase tracking-widest hover:text-gold transition-colors truncate"
          >
            <img
              src="/logo-2.svg"
              alt="Kirtan Sewa Logo"
              className="h-7 w-auto inline mr-2 align-middle"
            />
          </Link>
        )}
        <button
          onClick={onToggle}
          className={`text-text-muted hover:text-text-primary transition-colors shrink-0 ${
            collapsed ? "mx-auto" : "ml-auto"
          }`}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ToggleIcon size={18} />
        </button>
      </div>

      {/* Nav links */}
      <nav className="flex-1 flex flex-col gap-0.5 px-2 mt-2">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === "/"}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                collapsed ? "justify-center" : ""
              } ${
                isActive
                  ? "bg-white/5 text-gold"
                  : "text-text-primary/80 hover:text-text-primary hover:bg-white/5"
              }`
            }
            title={collapsed ? label : undefined}
          >
            <Icon size={18} className="shrink-0" />
            {!collapsed && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Footer links */}
      <div className="flex flex-col gap-0.5 px-2 pb-3">
        <NavLink
          to="/about"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
              collapsed ? "justify-center" : ""
            } ${
              isActive
                ? "bg-white/5 text-gold"
                : "text-text-primary/80 hover:text-text-primary hover:bg-white/5"
            }`
          }
          title={collapsed ? "About" : undefined}
        >
          <Info size={18} className="shrink-0" />
          {!collapsed && <span className="truncate">About</span>}
        </NavLink>

        <a
          href={GITHUB_URL}
          target="_blank"
          rel="noreferrer"
          className={`flex hidden items-center gap-3 rounded-md px-3 py-2 text-sm text-text-primary/80 hover:text-text-primary hover:bg-white/5 transition-colors ${
            collapsed ? "justify-center" : ""
          }`}
          title={collapsed ? "GitHub" : undefined}
        >
          <SiGithub size={18} className="shrink-0" />

          {!collapsed && <span className="truncate">GitHub</span>}
        </a>
      </div>
    </aside>
  );
}
