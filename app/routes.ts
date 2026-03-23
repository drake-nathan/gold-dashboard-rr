import { index, layout, route, type RouteConfig } from "@react-router/dev/routes";

export default [
  layout("routes/public/index.tsx", [
    index("routes/dashboard/index.tsx"),
    route("alerts", "routes/alerts/index.tsx"),
    route("privacy", "routes/privacy.tsx"),
    route("terms", "routes/terms.tsx"),
  ]),
  route("admin", "routes/admin/index.tsx"),
] satisfies RouteConfig;
