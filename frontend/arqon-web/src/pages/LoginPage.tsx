import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { z } from "zod";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Info
} from "lucide-react";
import { ErrorPanel } from "../components/ErrorPanel";
import { LogoMark } from "../components/Logo";
import { useAuth } from "../lib/auth";
import { roleHome } from "../lib/schemas";

const formSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid corporate email"),
  password: z.string().min(1, "Password is required"),
});
type FormValues = z.infer<typeof formSchema>;

export function LoginPage() {
  const { state, login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<unknown>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
  });

  if (state.status === "authenticated") return <Navigate to={roleHome[state.user.role]} replace />;

  const fillSuperAdmin = () => {
    setValue("email", "arjunnshinde9@gmail.com", { shouldValidate: true });
    setValue("password", "ArjunAdmin@2026!", { shouldValidate: true });
  };

  const onSubmit = handleSubmit(async (values) => {
    setError(null);
    try {
      const user = await login(values.email, values.password);
      navigate(roleHome[user.role], { replace: true });
    } catch (e) {
      setError(e);
    }
  });

  return (
    <div className="mx-auto mt-4 max-w-lg md:mt-10">
      {/* Brand & Main Card */}
      <div className="panel p-8 shadow-md border border-line bg-panel relative overflow-hidden">
        {/* Subtle top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ink text-white shadow-xs">
              <LogoMark size={24} />
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-ink">ARQON</span>
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Enterprise
              </span>
            </div>
          </div>
          <span className="text-xs font-semibold text-muted flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            <span>Secure Portal</span>
          </span>
        </div>

        <div className="mt-6">
          <h1 className="page-title text-2xl font-black text-ink">Sign in to your portal</h1>
          <p className="hint mt-1 text-xs md:text-sm text-muted">
            Access authorized tenant workspaces, candidate pipelines, and exam management.
          </p>
        </div>

        {/* 1-Click Bootstrap Identity Quick-Fill */}
        <div className="mt-5 rounded-xl border border-line bg-sunk/40 p-3.5 transition-colors hover:bg-sunk/60">
          <div className="flex items-center justify-between text-xs font-semibold text-muted">
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>SUPER ADMIN BOOTSTRAP IDENTITY</span>
            </span>
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted font-bold">PLATFORM_SUPER_ADMIN</span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-ink">Arjun Shinde (Platform Super Admin)</p>
              <p className="truncate font-mono text-[11px] text-muted">arjunnshinde9@gmail.com</p>
            </div>
            <button
              type="button"
              onClick={fillSuperAdmin}
              className="btn btn-quiet btn-sm text-xs font-semibold shrink-0 hover:border-emerald-500 hover:text-emerald-600 transition-colors cursor-pointer"
            >
              Fill Credentials
            </button>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-muted">
              Corporate Email Address
            </label>
            <div className="relative mt-1.5">
              <input
                id="email"
                type="email"
                autoComplete="username"
                placeholder="name@company.com"
                className="w-full border px-3.5 py-2.5 text-sm pl-10 rounded-xl"
                {...register("email")}
              />
              <Mail className="absolute left-3.5 top-3 h-4 w-4 text-muted pointer-events-none" />
            </div>
            {errors.email && <p className="mt-1 text-xs text-danger font-medium">{errors.email.message}</p>}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-muted">
                Secret Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-xs text-muted hover:text-ink cursor-pointer flex items-center gap-1"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                <span>{showPassword ? "Hide" : "Show"}</span>
              </button>
            </div>
            <div className="relative mt-1.5">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder="••••••••••••"
                className="w-full border px-3.5 py-2.5 text-sm pl-10 pr-10 rounded-xl"
                {...register("password")}
              />
              <Lock className="absolute left-3.5 top-3 h-4 w-4 text-muted pointer-events-none" />
            </div>
            {errors.password && <p className="mt-1 text-xs text-danger font-medium">{errors.password.message}</p>}
          </div>

          {error != null && <ErrorPanel error={error} />}

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-primary w-full py-3 text-sm font-semibold shadow-md hover:shadow-emerald-500/20 transition-all cursor-pointer rounded-xl"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                <span>Authenticating Session…</span>
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span>Sign in to Dashboard</span>
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </button>
        </form>
      </div>

      {/* Candidate Guidance Notice */}
      <div className="mt-4 rounded-xl border border-line bg-panel p-4 text-xs text-muted shadow-2xs">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-sky-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-ink">Taking an assessment as a candidate?</p>
            <p className="leading-relaxed">
              Candidates do not need to log in or create an account here. Simply open the unique, secure examination
              link sent to your email outbox or invitation email.
            </p>
            <div className="pt-1">
              <Link to="/status" className="link-action text-xs font-semibold inline-flex items-center gap-1">
                <span>Check platform operational status</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
