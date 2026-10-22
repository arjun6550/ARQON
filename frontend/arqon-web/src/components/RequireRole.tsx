import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth";
import type { Role } from "../lib/schemas";

/** UX guard only. Every API call is authorized again by the backend. */
export function RequireRole({ roles }: { roles: Role[] }) {
  const { state } = useAuth();
  if (state.status === "loading") return <p className="text-muted">Loading…</p>;
  if (state.status === "anonymous") return <Navigate to="/login" replace />;
  // Super Admin has universal access to all portals and administrative surfaces
  if (state.user.role !== "SUPER_ADMIN" && !roles.includes(state.user.role)) {
    return <p role="alert" className="text-danger">You do not have access to this area.</p>;
  }
  return <Outlet />;
}
