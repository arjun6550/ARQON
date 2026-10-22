import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Building2,
  Users,
  FileCode,
  Activity,
  Terminal,
  ShieldCheck,
  Search,
  Plus
} from "lucide-react";
import { ErrorPanel } from "../components/ErrorPanel";
import { apiFetch, jsonInit } from "../lib/apiClient";
import { organizationSchema, pageOf, platformOverviewSchema, userSchema } from "../lib/schemas";

const orgForm = z.object({
  name: z.string().min(1, "Name is required").max(200),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/, "3-50 chars: lowercase letters, digits, hyphens"),
});
const adminForm = z.object({
  tenantId: z.string().min(1, "Choose an organization"),
  email: z.string().email("Enter a valid email"),
  password: z.string().min(12, "At least 12 characters"),
});

export function SuperAdminPortal() {
  const qc = useQueryClient();
  const [tenantSearch, setTenantSearch] = useState("");

  const overview = useQuery({
    queryKey: ["platform-overview"],
    queryFn: () => apiFetch("/api/v1/platform/overview", platformOverviewSchema),
    refetchInterval: 30000,
  });

  const orgs = useQuery({
    queryKey: ["orgs"],
    queryFn: () => apiFetch("/api/v1/organizations?size=100", pageOf(organizationSchema)),
  });

  const orgFormState = useForm<z.infer<typeof orgForm>>({ resolver: zodResolver(orgForm) });
  const createOrg = useMutation({
    mutationFn: (v: z.infer<typeof orgForm>) => apiFetch("/api/v1/organizations", organizationSchema, jsonInit("POST", v)),
    onSuccess: () => {
      orgFormState.reset();
      qc.invalidateQueries({ queryKey: ["orgs"] });
      return qc.invalidateQueries({ queryKey: ["platform-overview"] });
    },
  });

  const adminFormState = useForm<z.infer<typeof adminForm>>({ resolver: zodResolver(adminForm) });
  const createAdmin = useMutation({
    mutationFn: (v: z.infer<typeof adminForm>) => apiFetch("/api/v1/users", userSchema, jsonInit("POST", { ...v, role: "ORG_ADMIN" })),
    onSuccess: () => {
      adminFormState.reset();
      return qc.invalidateQueries({ queryKey: ["platform-overview"] });
    },
  });

  const toggleStatus = useMutation({
    mutationFn: ({ id, nextStatus }: { id: string; nextStatus: string }) =>
      apiFetch(`/api/v1/organizations/${id}/status`, organizationSchema, jsonInit("PATCH", { status: nextStatus })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orgs"] });
      return qc.invalidateQueries({ queryKey: ["platform-overview"] });
    },
  });

  const filteredOrgs = useMemo(() => {
    if (!orgs.data?.items) return [];
    if (!tenantSearch.trim()) return orgs.data.items;
    const q = tenantSearch.toLowerCase().trim();
    return orgs.data.items.filter((o) => o.name.toLowerCase().includes(q) || o.slug.toLowerCase().includes(q));
  }, [orgs.data?.items, tenantSearch]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="border-b border-line pb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="page-title text-2xl md:text-3xl font-extrabold text-ink">
                Platform Super Admin Portal
              </h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                System {overview.data?.status ?? "UP"}
              </span>
            </div>
            <p className="text-xs md:text-sm text-muted mt-1">
              Platform-wide operational telemetry, tenant lifecycle management, and administrative control.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="badge font-mono text-xs font-bold bg-sunk text-ink">
              Multi-Tenant Cluster Live
            </span>
          </div>
        </div>
      </div>

      {overview.isError && <ErrorPanel error={overview.error} />}

      {/* Platform Telemetry Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="panel p-4 rounded-2xl border border-line bg-panel shadow-xs transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-muted text-xs font-bold uppercase tracking-wider">
            <span>Organizations</span>
            <Building2 className="h-4 w-4 text-sky-500" />
          </div>
          <div className="mt-2 text-2xl md:text-3xl font-extrabold text-ink font-mono">
            {overview.data?.organizations.total ?? "—"}
          </div>
          <div className="mt-1 text-xs text-muted flex items-center gap-1.5">
            <span className="text-emerald-600 font-semibold">{overview.data?.organizations.active ?? 0} active</span>
            {overview.data?.organizations.suspended ? (
              <span className="text-rose-500 font-semibold">· {overview.data.organizations.suspended} suspended</span>
            ) : null}
          </div>
        </div>

        <div className="panel p-4 rounded-2xl border border-line bg-panel shadow-xs transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-muted text-xs font-bold uppercase tracking-wider">
            <span>Platform Users</span>
            <Users className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl md:text-3xl font-extrabold text-ink font-mono">
            {overview.data?.users.total ?? "—"}
          </div>
          <div className="mt-1 text-xs text-muted">
            <span>{overview.data?.users.orgAdmins ?? 0} Admins · {overview.data?.users.recruiters ?? 0} Recruiters</span>
          </div>
        </div>

        <div className="panel p-4 rounded-2xl border border-line bg-panel shadow-xs transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-muted text-xs font-bold uppercase tracking-wider">
            <span>Assessments</span>
            <FileCode className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl md:text-3xl font-extrabold text-ink font-mono">
            {overview.data?.assessments.total ?? "—"}
          </div>
          <div className="mt-1 text-xs text-muted">
            <span className="text-emerald-600 font-semibold">{overview.data?.assessments.published ?? 0} published</span>
            <span className="text-muted ml-1.5">· {overview.data?.assessments.draft ?? 0} draft</span>
          </div>
        </div>

        <div className="panel p-4 rounded-2xl border border-line bg-panel shadow-xs transition-transform hover:-translate-y-0.5">
          <div className="flex items-center justify-between text-muted text-xs font-bold uppercase tracking-wider">
            <span>Exam Sessions</span>
            <Activity className="h-4 w-4 text-purple-500" />
          </div>
          <div className="mt-2 text-2xl md:text-3xl font-extrabold text-ink font-mono">
            {overview.data?.exams.total ?? "—"}
          </div>
          <div className="mt-1 text-xs text-muted">
            <span className="text-sky-500 font-semibold">{overview.data?.exams.inProgress ?? 0} live</span>
            <span className="text-muted ml-1.5">· {overview.data?.exams.completed ?? 0} finished</span>
          </div>
        </div>
      </div>

      {/* Supported Code Execution Environments */}
      <div className="panel p-6 rounded-2xl border border-line bg-panel shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-sky-500" />
            <div>
              <h2 className="text-base font-bold text-ink">Supported Code Execution Sandboxes</h2>
              <p className="text-xs text-muted mt-0.5">
                Isolated worker runtime configurations and default execution quotas.
              </p>
            </div>
          </div>
          <span className="badge font-mono text-[10px] bg-sunk text-muted">Docker Sandboxed</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          {overview.data?.supportedLanguages.map((l) => (
            <div key={l.id} className="rounded-xl border border-line p-3.5 bg-sunk/20 hover:border-ink transition-colors">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-ink">{l.name}</span>
                <span className="text-[10px] text-muted font-mono bg-panel px-1.5 py-0.5 rounded border border-line">
                  {l.version}
                </span>
              </div>
              <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted font-mono">
                <span>Mem: {l.defaultMemoryLimit}</span>
                <span>Timeout: {l.defaultTimeout}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Organization Lifecycle Table */}
      <div className="panel p-6 rounded-2xl border border-line bg-panel shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-emerald-500" />
            <div>
              <h2 className="text-base font-bold text-ink">Tenant Organizations</h2>
              <p className="text-xs text-muted">Manage tenant status, membership, and isolation boundaries.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted pointer-events-none" />
              <input
                type="text"
                placeholder="Search tenant or slug…"
                value={tenantSearch}
                onChange={(e) => setTenantSearch(e.target.value)}
                className="w-full rounded-xl border border-line bg-panel pl-9 pr-3 py-1.5 text-xs shadow-2xs focus:border-ink"
              />
            </div>
            <span className="badge text-xs font-mono bg-sunk text-ink font-bold">
              {orgs.data?.totalElements ?? 0} Tenants
            </span>
          </div>
        </div>

        {orgs.isError && <ErrorPanel error={orgs.error} />}

        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-line bg-sunk/30 uppercase tracking-wider text-muted font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-4">Organization</th>
                <th className="py-3 px-4">Slug (Tenant Key)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Lifecycle Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredOrgs.map((o) => {
                const isActive = o.status === "ACTIVE";
                return (
                  <tr key={o.id} className="hover:bg-sunk/20 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-ink flex items-center gap-2">
                      <div className="h-7 w-7 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold">
                        {o.name.substring(0, 1)}
                      </div>
                      <span>{o.name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-muted">{o.slug}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-bold ${
                          isActive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        }`}
                      >
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-muted">
                      {new Date(o.createdAt).toLocaleDateString(undefined, {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => toggleStatus.mutate({ id: o.id, nextStatus: isActive ? "SUSPENDED" : "ACTIVE" })}
                        disabled={toggleStatus.isPending}
                        className={`text-xs font-semibold px-3 py-1 rounded-lg transition-colors cursor-pointer border ${
                          isActive
                            ? "border-rose-500/30 text-rose-600 hover:bg-rose-500/10 dark:text-rose-400"
                            : "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                        }`}
                      >
                        {isActive ? "Suspend Tenant" : "Activate Tenant"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filteredOrgs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-muted italic">
                    No matching organizations found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Forms Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Create Organization */}
        <div className="panel p-6 rounded-2xl border border-line bg-panel shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-line pb-3">
            <Plus className="h-4 w-4 text-sky-500" />
            <div>
              <h2 className="text-sm font-bold text-ink">Register New Organization</h2>
              <p className="text-xs text-muted">Provision an isolated B2B tenant boundary.</p>
            </div>
          </div>
          <form onSubmit={orgFormState.handleSubmit((v) => createOrg.mutate(v))} className="space-y-3" noValidate>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Organization Name</label>
              <input
                aria-label="Name"
                placeholder="e.g. Acme Corporation"
                className="w-full rounded-xl border border-line bg-panel px-3 py-2 text-xs focus:border-ink shadow-2xs"
                {...orgFormState.register("name")}
              />
              {orgFormState.formState.errors.name && (
                <p className="text-xs text-rose-500 mt-1">{orgFormState.formState.errors.name.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Tenant Slug (Unique URL identifier)</label>
              <input
                aria-label="Slug"
                placeholder="e.g. acme-corp"
                className="w-full rounded-xl border border-line bg-panel px-3 py-2 text-xs font-mono focus:border-ink shadow-2xs"
                {...orgFormState.register("slug")}
              />
              {orgFormState.formState.errors.slug && (
                <p className="text-xs text-rose-500 mt-1">{orgFormState.formState.errors.slug.message}</p>
              )}
            </div>
            <button
              disabled={createOrg.isPending}
              className="btn btn-primary w-full py-2.5 text-xs font-bold cursor-pointer shadow-xs"
            >
              {createOrg.isPending ? "Creating Tenant..." : "Create Organization"}
            </button>
          </form>
          {createOrg.isError && <ErrorPanel error={createOrg.error} />}
          {createOrg.isSuccess && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              ✓ Organization created successfully.
            </p>
          )}
        </div>

        {/* Create Organization Admin */}
        <div className="panel p-6 rounded-2xl border border-line bg-panel shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-line pb-3">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <div>
              <h2 className="text-sm font-bold text-ink">Provision Organization Admin</h2>
              <p className="text-xs text-muted">Generate initial admin credentials for a tenant.</p>
            </div>
          </div>
          <form onSubmit={adminFormState.handleSubmit((v) => createAdmin.mutate(v))} className="space-y-3" noValidate>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Select Tenant</label>
              <select
                aria-label="Organization"
                className="w-full rounded-xl border border-line bg-panel px-3 py-2 text-xs focus:border-ink shadow-2xs"
                {...adminFormState.register("tenantId")}
              >
                <option value="">Select organization…</option>
                {orgs.data?.items.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.slug})
                  </option>
                ))}
              </select>
              {adminFormState.formState.errors.tenantId && (
                <p className="text-xs text-rose-500 mt-1">{adminFormState.formState.errors.tenantId.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Admin Email</label>
              <input
                aria-label="Admin email"
                type="email"
                placeholder="admin@tenant.com"
                className="w-full rounded-xl border border-line bg-panel px-3 py-2 text-xs focus:border-ink shadow-2xs"
                {...adminFormState.register("email")}
              />
              {adminFormState.formState.errors.email && (
                <p className="text-xs text-rose-500 mt-1">{adminFormState.formState.errors.email.message}</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted mb-1">Temporary Password (min 12 chars)</label>
              <input
                aria-label="Temporary password"
                type="password"
                placeholder="Secure temporary password"
                className="w-full rounded-xl border border-line bg-panel px-3 py-2 text-xs focus:border-ink shadow-2xs"
                {...adminFormState.register("password")}
              />
              {adminFormState.formState.errors.password && (
                <p className="text-xs text-rose-500 mt-1">{adminFormState.formState.errors.password.message}</p>
              )}
            </div>
            <button
              disabled={createAdmin.isPending}
              className="btn btn-primary w-full py-2.5 text-xs font-bold cursor-pointer shadow-xs"
            >
              {createAdmin.isPending ? "Provisioning Admin..." : "Provision Organization Admin"}
            </button>
          </form>
          {createAdmin.isError && <ErrorPanel error={createAdmin.error} />}
          {createAdmin.isSuccess && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
              ✓ Admin provisioned successfully. Share credentials securely.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
