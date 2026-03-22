import migrations from "@convex-dev/migrations/convex.config.js";
import stripe from "@convex-dev/stripe/convex.config.js";
import { defineApp } from "convex/server";

const app = defineApp();

app.use(migrations);
app.use(stripe);

export default app;
