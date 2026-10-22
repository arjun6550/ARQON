import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  Users,
  BookOpen,
  FileCheck2,
  ShieldCheck,
  Activity,
  Plus,
  Search,
  ChevronRight,
  CheckCircle2,
  Lock,
  LogOut,
  Mail,
  BarChart3,
  Sparkles
} from "lucide-react";
import { CommandPalette } from "../components/CommandPalette";
import { Logo } from "../components/Logo";
import { ThemeToggle } from "../components/ThemeToggle";
import { apiFetch } from "../lib/apiClient";
import { useAuth } from "../lib/auth";
import { organizationSchema, pageOf, type Role } from "../lib/schemas";

type NavItem = { to: string; label: string; end?: boolean; icon: React.ReactNode };

const NAV: Record<Role, NavItem[]> = {
  SUPER_ADMIN: [
    { to: "/super-admin", label: "Organizations & Telemetry", end: true, icon: <Building2 className="h-4 w-4" /> },
    { to: "/recruiter", label: "Recruiter Dashboard", end: true, icon: <BarChart3 className="h-4 w-4" /> },
    { to: "/admin", label: "Team Members", end: true, icon: <Users className="h-4 w-4" /> },
    { to: "/questions", label: "Question Bank", icon: <BookOpen className="h-4 w-4" /> },
    { to: "/assessments", label: "Assessments", icon: <FileCheck2 className="h-4 w-4" /> },
    { to: "/proctor", label: "Live Proctoring", end: true, icon: <ShieldCheck className="h-4 w-4" /> },
    { to: "/status", label: "System Health & SRE", icon: <Activity className="h-4 w-4" /> },
  ],
  ORG_ADMIN: [
    { to: "/admin", label: "Team Members", end: true, icon: <Users className="h-4 w-4" /> },
    { to: "/questions", label: "Question Bank", icon: <BookOpen className="h-4 w-4" /> },
    { to: "/assessments", label: "Assessments", icon: <FileCheck2 className="h-4 w-4" /> },
  ],
  RECRUITER: [
    { to: "/recruiter", label: "Recruiter Dashboard", end: true, icon: <BarChart3 className="h-4 w-4" /> },
    { to: "/questions", label: "Question Bank", icon: <BookOpen className="h-4 w-4" /> },
    { to: "/assessments", label: "Assessments", icon: <FileCheck2 className="h-4 w-4" /> },
  ],
  PROCTOR: [
    { to: "/proctor", label: "Live Proctoring", end: true, icon: <ShieldCheck className="h-4 w-4" /> },
  ],
  CANDIDATE: [],
};

const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Platform Super Admin",
  ORG_ADMIN: "Organization Admin",
  RECRUITER: "Talent Recruiter",
  PROCTOR: "Security Proctor",
  CANDIDATE: "Assessment Candidate",
};

const ROLE_BADGE_STYLE: Record<Role, string> = {
  SUPER_ADMIN: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  ORG_ADMIN: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  RECRUITER: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  PROCTOR: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  CANDIDATE: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

export function PortalLayout() {
  const { state, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    const start = performance.now();
    fetch("/api/v1/system/ping")
      .then((r) => {
        if (r.ok && active) {
          setLatency(Math.round(performance.now() - start));
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [pathname]);

  const isSuperAdmin = state.status === "authenticated" && state.user.role === "SUPER_ADMIN";

  const orgs = useQuery({
    queryKey: ["orgs"],
    enabled: isSuperAdmin,
    queryFn: () => apiFetch("/api/v1/organizations?size=100", pageOf(organizationSchema)),
  });

  const [activeTenantId, setActiveTenantId] = useState<string>(
    () => (typeof window !== "undefined" ? localStorage.getItem("arqon-active-tenant-id") || "" : "")
  );

  useEffect(() => {
    if (isSuperAdmin && !activeTenantId && orgs.data?.items?.length) {
      const firstId = orgs.data.items[0].id;
      setActiveTenantId(firstId);
      localStorage.setItem("arqon-active-tenant-id", firstId);
    }
  }, [isSuperAdmin, activeTenantId, orgs.data?.items]);

  const handleTenantChange = (newTenantId: string) => {
    setActiveTenantId(newTenantId);
    if (newTenantId) {
      localStorage.setItem("arqon-active-tenant-id", newTenantId);
    } else {
      localStorage.removeItem("arqon-active-tenant-id");
    }
    void qc.invalidateQueries();
  };

  if (pathname === "/exam" || pathname.startsWith("/invite") || pathname === "/demo-exam") {
    return (
      <div className="min-h-screen bg-paper text-ink selection:bg-emerald-500/20">
        <header className="border-b border-white/10 bg-rail text-white shadow-lg sticky top-0 z-30 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3">
            <div className="flex items-center gap-4">
              <Logo size={24} />
              <div className="hidden sm:flex items-center gap-2.5 rounded-full bg-white/5 border border-white/10 px-3 py-1">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] font-semibold tracking-wider uppercase text-emerald-400">
                  AI Proctoring & Integrity Active
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="hidden md:inline-flex items-center gap-1.5 text-xs text-white/60 font-mono bg-white/5 px-2.5 py-1 rounded-md border border-white/10">
                <Lock className="h-3 w-3 text-emerald-400" />
                Session Encrypted
              </span>
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main>
          <Outlet />
        </main>
      </div>
    );
  }

  if (state.status !== "authenticated") {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <header className="border-b border-line bg-panel/70 backdrop-blur-md px-6 py-4 sticky top-0 z-10 flex items-center justify-between">
          <Link to="/" className="no-underline">
            <Logo size={26} />
          </Link>
          <div className="flex items-center gap-2.5">
            <Link
              to="/demo-exam"
              className="btn btn-quiet btn-sm text-xs font-semibold cursor-pointer border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 hover:bg-emerald-500/10 no-underline"
            >
              Demo Exam
            </Link>
            <Link to="/login" className="btn btn-quiet btn-sm text-xs font-semibold cursor-pointer">
              Sign In
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">
          <Outlet />
        </main>
      </div>
    );
  }

  const user = state.user;

  const initial = user.email.charAt(0).toUpperCase();
  const currentNavItem = NAV[user.role]?.find((n) =>
    n.end ? pathname === n.to : pathname.startsWith(n.to)
  );
  const pageTitle = currentNavItem?.label || "Workspace";

  return (
    <div className="min-h-screen bg-paper text-ink md:grid md:grid-cols-[260px_1fr]">
      {/* Left Sidebar Shell */}
      <aside className="flex flex-col border-r border-white/10 bg-rail px-4 py-5 text-white shadow-xl md:sticky md:top-0 md:h-screen z-20">
        {/* Logo & Platform Badge */}
        <div className="flex items-center justify-between px-2">
          <Link to="/" className="no-underline group flex items-center gap-2">
            <Logo size={28} />
          </Link>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>{latency ? `${latency}ms` : "Live"}</span>
          </div>
        </div>

        {/* Quick Action Pill for Recruiters & Admins */}
        {(user.role === "RECRUITER" || user.role === "ORG_ADMIN" || user.role === "SUPER_ADMIN") && (
          <div className="mt-5 px-1">
            <Link
              to="/assessments/new"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-semibold text-xs py-2.5 px-3 shadow-md hover:shadow-emerald-500/20 transition-all duration-150 no-underline"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Assessment</span>
            </Link>
          </div>
        )}

        {/* Navigation Links */}
        <nav aria-label="Main" className="mt-5 flex flex-wrap gap-1 md:flex-col">
          <div className="text-[10px] font-semibold tracking-wider text-white/40 uppercase px-3 mb-1">
            Main Menu
          </div>
          {NAV[user.role].map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end={n.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs md:text-sm font-medium transition-all duration-150 no-underline ${
                  isActive
                    ? "bg-white/15 text-white shadow-sm border border-white/10 font-semibold"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <span className="shrink-0">{n.icon}</span>
              <span className="truncate">{n.label}</span>
            </NavLink>
          ))}

          {(user.role === "RECRUITER" || user.role === "ORG_ADMIN" || user.role === "SUPER_ADMIN") && (
            <>
              <div className="text-[10px] font-semibold tracking-wider text-white/40 uppercase px-3 mt-4 mb-1">
                Candidate Pipeline
              </div>
              <NavLink
                to="/assessments"
                className="flex items-center gap-3 px-3.5 py-2 text-xs text-white/70 hover:bg-white/5 hover:text-white rounded-xl no-underline"
              >
                <Mail className="h-4 w-4 shrink-0 text-pink-400" />
                <span>Real-Time Invites</span>
              </NavLink>
            </>
          )}
        </nav>

        {/* User Profile Card & Quick Actions */}
        <div className="mt-auto hidden border-t border-white/10 pt-4 md:block">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3 shadow-inner">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-ink to-slate-800 text-white font-bold text-sm border border-white/20 shadow-xs">
                {initial}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-white">{user.email}</p>
                <span
                  className={`mt-0.5 inline-block rounded border px-1.5 py-0.2 text-[10px] font-medium ${
                    ROLE_BADGE_STYLE[user.role]
                  }`}
                >
                  {ROLE_LABEL[user.role]}
                </span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between text-xs text-white/50 border-t border-white/10 pt-2.5">
              <span>Theme Preference</span>
              <ThemeToggle />
            </div>

            <button
              className="w-full flex items-center justify-center gap-2 mt-2.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white py-2 text-xs font-medium transition-all duration-150 cursor-pointer"
              onClick={() => logout().finally(() => navigate("/login"))}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign out</span>
            </button>
          </div>
        </div>

        {/* Mobile User Bar */}
        <div className="flex items-center justify-between border-t border-white/10 pt-3 md:hidden">
          <span className="truncate text-xs text-white/70">{user.email}</span>
          <button
            className="text-xs text-white/90 underline cursor-pointer"
            onClick={() => logout().finally(() => navigate("/login"))}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Global Command Palette */}
      <CommandPalette
        commands={[
          ...NAV[user.role].map((n) => ({ label: n.label, to: n.to })),
          { label: "Create assessment", to: "/assessments/new", category: "Actions" },
          { label: "Create question", to: "/questions/new", category: "Actions" },
          { label: "Candidate Invitations", to: "/assessments", category: "Candidates" },
        ]}
      />

      {/* Top Header Bar for Main Content Area */}
      <div className="flex flex-col min-w-0">
        <header className="border-b border-line bg-panel/80 backdrop-blur-md px-6 py-3.5 sticky top-0 z-10 flex items-center justify-between shadow-2xs">
          {/* Breadcrumb Path & Super Admin Context */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="font-medium text-ink/70">ARQON</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted/60" />
              <span className="font-semibold text-ink">{pageTitle}</span>
            </div>

            {/* Super Admin Active Tenant Context Switcher */}
            {user.role === "SUPER_ADMIN" && (
              <div className="hidden sm:flex items-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs shadow-2xs">
                <Building2 className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                <span className="font-bold text-[11px] text-purple-300">Tenant:</span>
                <select
                  value={activeTenantId}
                  onChange={(e) => handleTenantChange(e.target.value)}
                  className="bg-transparent font-semibold text-ink text-xs focus:outline-none cursor-pointer max-w-[180px] truncate"
                >
                  {orgs.data?.items.map((o) => (
                    <option key={o.id} value={o.id} className="bg-panel text-ink">
                      {o.name} ({o.slug})
                    </option>
                  ))}
                </select>
                <span className="inline-flex items-center gap-1 rounded bg-purple-500/20 px-1.5 py-0.2 text-[9px] font-mono font-bold text-purple-300">
                  <Sparkles className="h-2.5 w-2.5 text-purple-400" />
                  Universal Access
                </span>
              </div>
            )}
          </div>

          {/* Quick Spotlight Trigger & Health Indicator */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                window.dispatchEvent(new KeyboardEvent("keydown", { ctrlKey: true, key: "k" }));
              }}
              className="hidden sm:flex items-center gap-3 rounded-lg border border-line bg-paper/60 hover:bg-paper px-3 py-1.5 text-xs text-muted hover:text-ink transition-colors cursor-pointer shadow-2xs"
            >
              <Search className="h-3.5 w-3.5" />
              <span>Search anything...</span>
              <span className="kbd text-[10px]">Ctrl K</span>
            </button>

            <div className="h-4 w-px bg-line hidden sm:block" />

            <div className="flex items-center gap-1.5 text-xs text-muted">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="font-mono text-[11px]">System Ready</span>
            </div>
          </div>
        </header>

        {/* Main Content Body */}
        <main className="min-w-0 flex-1 px-5 py-6 md:px-10">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
