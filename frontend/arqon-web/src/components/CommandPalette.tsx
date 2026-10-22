import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  ArrowRight,
  CornerDownLeft,
  FileText,
  Code2,
  Users,
  Activity,
  PlusCircle,
  Mail,
  SunMoon,
  LogOut,
  FolderKanban
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { toggleTheme } from "../lib/theme";

export type Command = {
  label: string;
  to?: string;
  category?: string;
  icon?: string;
  run?: () => void;
};

/** Linear/Raycast style Command Palette (Ctrl/Cmd+K) */
export function CommandPalette({ commands }: { commands: Command[] }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const { logout } = useAuth();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
        setQ("");
        setActive(0);
      }
      if (e.key === "Escape" && open) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const defaultCommands: Command[] = useMemo(() => [
    ...commands,
    {
      label: "Toggle Dark / Light Theme",
      category: "Preferences",
      icon: "theme",
      run: () => toggleTheme()
    },
    {
      label: "Sign out of session",
      category: "Account",
      icon: "logout",
      run: () => logout().finally(() => navigate("/login"))
    }
  ], [commands, logout, navigate]);

  const shown = useMemo(
    () => defaultCommands.filter((c) => c.label.toLowerCase().includes(q.trim().toLowerCase())),
    [defaultCommands, q]
  );

  const choose = (c: Command | undefined) => {
    if (!c) return;
    setOpen(false);
    if (c.to) navigate(c.to);
    else c.run?.();
  };

  const getIcon = (item: Command) => {
    if (item.icon === "theme") return <SunMoon className="h-4 w-4 text-amber-400" />;
    if (item.icon === "logout") return <LogOut className="h-4 w-4 text-rose-400" />;
    if (item.label.toLowerCase().includes("assessment")) return <FolderKanban className="h-4 w-4 text-emerald-400" />;
    if (item.label.toLowerCase().includes("question")) return <Code2 className="h-4 w-4 text-sky-400" />;
    if (item.label.toLowerCase().includes("user") || item.label.toLowerCase().includes("team")) return <Users className="h-4 w-4 text-indigo-400" />;
    if (item.label.toLowerCase().includes("health") || item.label.toLowerCase().includes("telemetry") || item.label.toLowerCase().includes("sre"))
      return <Activity className="h-4 w-4 text-purple-400" />;
    if (item.label.toLowerCase().includes("mail") || item.label.toLowerCase().includes("invite"))
      return <Mail className="h-4 w-4 text-pink-400" />;
    if (item.label.toLowerCase().startsWith("create")) return <PlusCircle className="h-4 w-4 text-teal-400" />;
    return <FileText className="h-4 w-4 text-muted" />;
  };

  if (!open) return null;

  return (
    <div className="overlay bg-black/60 backdrop-blur-md" onClick={() => setOpen(false)}>
      <div
        className="dialog !max-w-2xl !p-0 !border-white/10 !bg-rail/95 !text-white shadow-2xl backdrop-blur-xl rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3.5 bg-white/5">
          <Search className="h-5 w-5 text-white/50 shrink-0" />
          <input
            autoFocus
            className="w-full bg-transparent border-0 p-0 text-sm md:text-base text-white placeholder-white/40 focus:outline-none focus:ring-0"
            placeholder="Type a command, page name, or search action..."
            aria-label="Filter commands"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((a) => Math.min(a + 1, shown.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((a) => Math.max(a - 1, 0));
              }
              if (e.key === "Enter") choose(shown[active]);
            }}
          />
          <span className="kbd !border-white/20 !bg-white/10 !text-white/60 text-xs px-2 py-0.5">ESC</span>
        </div>

        {/* Results List */}
        <div className="max-h-[360px] overflow-y-auto p-2">
          {shown.length === 0 ? (
            <div className="p-8 text-center text-sm text-white/50">
              <Search className="mx-auto h-8 w-8 mb-2 opacity-30" />
              <p>No results found for “{q}”</p>
              <p className="text-xs text-white/30 mt-1">Try searching for assessments, questions, or system health</p>
            </div>
          ) : (
            <ul className="space-y-1" role="listbox" aria-label="Commands">
              {shown.map((c, i) => (
                <li key={c.label + i} role="option" aria-selected={i === active}>
                  <button
                    className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-all duration-150 text-left cursor-pointer border ${
                      i === active
                        ? "bg-white/15 border-white/20 text-white shadow-sm font-semibold translate-x-0.5"
                        : "border-transparent text-white/80 hover:bg-white/5 hover:text-white"
                    }`}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(c)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                          i === active ? "bg-white/20" : "bg-white/5"
                        }`}
                      >
                        {getIcon(c)}
                      </div>
                      <span className="truncate">{c.label}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {c.category && (
                        <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-white/5 text-white/40 border border-white/10">
                          {c.category}
                        </span>
                      )}
                      {i === active ? (
                        <CornerDownLeft className="h-3.5 w-3.5 text-white/60" />
                      ) : (
                        <ArrowRight className="h-3.5 w-3.5 text-white/20" />
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-2.5 text-[11px] text-white/40 bg-white/5">
          <div className="flex items-center gap-2">
            <span>Navigation:</span>
            <span className="flex items-center gap-1 font-mono">
              <span className="kbd !border-white/20 !bg-white/5 !text-white/60 text-[10px]">↑</span>
              <span className="kbd !border-white/20 !bg-white/5 !text-white/60 text-[10px]">↓</span>
              <span>to navigate</span>
            </span>
            <span className="mx-1">•</span>
            <span className="flex items-center gap-1 font-mono">
              <span className="kbd !border-white/20 !bg-white/5 !text-white/60 text-[10px]">↵</span>
              <span>to select</span>
            </span>
          </div>
          <div className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            ARQON Spotlight
          </div>
        </div>
      </div>
    </div>
  );
}
