import { index, route, type RouteConfig } from "@react-router/dev/routes";

// Site is shut down: the dashboard, alerts, privacy, and terms routes are
// unhooked (files kept in-tree) and every public path serves the notice.
export default [
  index("routes/shutdown/index.tsx"),
  route("admin", "routes/admin/index.tsx"),
  route("version", "routes/version.ts"),
  route("*", "routes/shutdown/index.tsx", { id: "shutdown-catchall" }),
] satisfies RouteConfig;
