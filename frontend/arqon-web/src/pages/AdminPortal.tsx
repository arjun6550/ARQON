import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ErrorPanel } from "../components/ErrorPanel";
import { Skeleton } from "../components/Skeleton";
import { apiFetch, jsonInit } from "../lib/apiClient";
import { pageOf, userSchema } from "../lib/schemas";
import { OrgHomePage } from "./OrgHomePage";

const formSchema = z.object({
  email: z.string().email("Enter a valid work email"),
  password: z.string().min(12, "Password must be at least 12 characters"),
  role: z.enum(["RECRUITER", "PROCTOR", "ORG_ADMIN"]),
});
type FormValues = z.infer<typeof formSchema>;

const roleStyles: Record<string, string> = {
  ORG_ADMIN: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
  RECRUITER: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20",
  PROCTOR: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20",
};

export function AdminPortal() {
  const qc = useQueryClient();
  const users = useQuery({
    queryKey: ["users"],
    queryFn: () => apiFetch("/api/v1/users?size=50", pageOf(userSchema)),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { role: "RECRUITER" },
  });

  const create = useMutation({
    mutationFn: (v: FormValues) => apiFetch("/api/v1/users", userSchema, jsonInit("POST", v)),
    onSuccess: () => {
      reset();
      return qc.invalidateQueries({ queryKey: ["users"] });
    },
  });

  return (
    <div className="space-y-10">
      <OrgHomePage title="Organization Admin Portal" />

      {/* Team Administration Section */}
      <div className="border-t border-line pt-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="section-title text-lg font-bold">Team Members & Access Control</h2>
            <p className="text-xs text-muted">
              Manage organization recruiters, proctors, and co-administrators.
            </p>
          </div>
          <span className="badge font-mono text-xs">
            {users.data ? `${users.data.totalElements} members` : "Loading..."}
          </span>
        </div>

        {/* Add Team Member Card */}
        <div className="panel mt-4 p-5 rounded-xl border border-line bg-panel shadow-xs">
          <h3 className="text-sm font-semibold text-ink">Add a new organization member</h3>
          <p className="text-xs text-muted mt-0.5">
            The member can sign in immediately using the temporary password provided.
          </p>

          <form
            onSubmit={handleSubmit((v) => create.mutate(v))}
            className="mt-4 grid gap-3 sm:grid-cols-4 items-start"
            noValidate
          >
            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                Work Email
              </label>
              <input
                aria-label="Email"
                placeholder="colleague@company.com"
                className="w-full border px-3 py-2 text-sm rounded-lg"
                {...register("email")}
              />
              {errors.email && <p className="mt-1 text-xs text-danger">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                Temporary Password
              </label>
              <input
                aria-label="Temporary password"
                type="password"
                placeholder="Min. 12 characters"
                className="w-full border px-3 py-2 text-sm rounded-lg"
                {...register("password")}
              />
              {errors.password && <p className="mt-1 text-xs text-danger">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
                Access Role
              </label>
              <select
                aria-label="Role"
                className="w-full border px-3 py-2 text-sm rounded-lg"
                {...register("role")}
              >
                <option value="RECRUITER">Recruiter (Assessments & Invitations)</option>
                <option value="PROCTOR">Proctor (Monitoring & Review)</option>
                <option value="ORG_ADMIN">Organization Admin (Full Org Control)</option>
              </select>
            </div>

            <div className="pt-6">
              <button
                type="submit"
                disabled={create.isPending}
                className="btn btn-primary w-full text-sm font-semibold shadow-xs"
              >
                {create.isPending ? "Creating…" : "Add Member"}
              </button>
            </div>
          </form>

          {create.isError && (
            <div className="mt-4">
              <ErrorPanel error={create.error} />
            </div>
          )}
        </div>

        {/* Members Roster */}
        <div className="mt-6">
          {users.isError && <ErrorPanel error={users.error} />}

          {users.isPending ? (
            <Skeleton className="h-40 rounded-xl" />
          ) : (
            <div className="panel overflow-hidden rounded-xl border border-line shadow-xs">
              <ul className="divide-y text-sm">
                {users.data?.items.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-sunk/20 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sunk font-semibold text-xs text-ink">
                        {u.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium text-ink">{u.email}</span>
                        <div className="text-[11px] text-muted">ID: {u.id.substring(0, 8)}…</div>
                      </div>
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        roleStyles[u.role] ?? "bg-sunk text-muted"
                      }`}
                    >
                      {u.role}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
