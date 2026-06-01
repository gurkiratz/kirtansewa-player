import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { X, Home, Library, Info } from "lucide-react";
import { SiGithub } from "@icons-pack/react-simple-icons";

const GITHUB_URL = "https://github.com/gurkiratz/kirtansewa-player";

const NAV_ITEMS = [
  { to: "/", label: "Home", icon: Home },
  { to: "/library", label: "Library", icon: Library },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function MobileNavDrawer({ open, onClose }: Props) {
  const location = useLocation();

  // Close drawer on route change
  useEffect(() => {
    onClose();
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/60 z-30 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`
          fixed inset-y-0 left-0 z-[35] w-52 bg-panel border-r border-border
          flex flex-col md:hidden
          transition-transform duration-200 ease-out
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Header */}
        <div className="h-14 flex items-center justify-between px-4 shrink-0 border-b border-border">
          <img
            src="/logo-2.svg"
            alt="Kirtan Sewa Logo"
            className="h-7 w-auto inline mr-2 align-middle"
          />
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 flex flex-col gap-0.5 px-2 mt-3">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                  isActive
                    ? "bg-white/5 text-gold"
                    : "text-text-primary/80 hover:text-text-primary hover:bg-white/5"
                }`
              }
            >
              <Icon size={18} className="shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="flex flex-col gap-0.5 px-2 pb-4">
          <NavLink
            to="/about"
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                isActive
                  ? "bg-white/5 text-gold"
                  : "text-text-secondary hover:text-text-primary hover:bg-white/5"
              }`
            }
          >
            <Info size={18} className="shrink-0" />
            <span>About</span>
          </NavLink>

          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer"
            className="flex hidden items-center gap-3 rounded-md px-3 py-2.5 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors"
          >
            <SiGithub size={18} className="shrink-0" />
            <span>GitHub</span>
          </a>
        </div>
      </div>
    </>
  );
}
