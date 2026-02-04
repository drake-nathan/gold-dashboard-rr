import { registerRoutes } from "@convex-dev/stripe";
import { httpRouter } from "convex/server";

import { components } from "./_generated/api";

const http = httpRouter();

// Register Stripe webhook handler at /stripe/webhook
registerRoutes(http, components.stripe, {
  webhookPath: "/stripe/webhook",
});

export default http;
