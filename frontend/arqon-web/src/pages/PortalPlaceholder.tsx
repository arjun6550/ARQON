import { portals } from "./portals";

export function PortalPlaceholder({ path }: { path: (typeof portals)[number]["path"] }) {
  const p = portals.find((x) => x.path === path)!;
  return (
    <>
      <h1 className="page-title">{p.title}</h1>
      <p className="mt-2 text-muted">{p.description}</p>
      <p className="notice mt-6">PLACEHOLDER: implemented in a later slice.</p>
    </>
  );
}
