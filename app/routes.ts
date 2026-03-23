import { index, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  index("routes/dashboard/index.tsx"),
  route("admin", "routes/admin/index.tsx"),
  route("alerts", "routes/alerts/index.tsx"),
  route("privacy", "routes/privacy.tsx"),
  route("terms", "routes/terms.tsx"),
] satisfies RouteConfig;
