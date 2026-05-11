import { ConvexError, v } from "convex/values";

import { action } from "./_generated/server";
import { resendSendEmailUrl } from "./alerts/core";

export const maxFeedbackMessageLength = 5000;
export const minFeedbackMessageLength = 3;
export const maxFeedbackEmailLength = 320;
export const maxFeedbackPathLength = 500;
export const maxFeedbackUserAgentLength = 500;
export const maxFeedbackContextStringLength = 200;

interface MetaItem {
  label: string;
  url?: string;
  value: string;
}

const truncate = (value: string | undefined, max: number): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
};

const buildPostHogUrls = (
  distinctId: string | undefined,
  sessionId: string | undefined,
): { personUrl?: string; sessionUrl?: string } => {
  const baseRaw = process.env.POSTHOG_PROJECT_URL?.trim();
  if (!baseRaw) return {};
  const base = baseRaw.replace(/\/+$/u, "");
  return {
    personUrl: distinctId ? `${base}/person/${encodeURIComponent(distinctId)}` : undefined,
    sessionUrl: sessionId ? `${base}/replay/${encodeURIComponent(sessionId)}` : undefined,
  };
};

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

// RFC 5322-lite: good enough to reject obvious garbage without false-rejecting valid addresses.
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;

export interface FeedbackSubmitResult {
  ok: boolean;
}

export const submit = action({
  args: {
    email: v.optional(v.string()),
    environment: v.optional(v.string()),
    message: v.string(),
    path: v.optional(v.string()),
    posthogDistinctId: v.optional(v.string()),
    posthogSessionId: v.optional(v.string()),
    release: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    viewport: v.optional(v.string()),
    // Honeypot: hidden field that real users never fill. Any non-empty value
    // means a bot auto-filled the form — silently no-op so the bot thinks it
    // succeeded and doesn't retry with a different payload shape.
    website: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<FeedbackSubmitResult> => {
    if (args.website !== undefined && args.website.trim().length > 0) {
      console.warn("Feedback honeypot tripped", { length: args.website.length });
      return { ok: true };
    }

    const message = args.message.trim();
    if (message.length < minFeedbackMessageLength) {
      throw new ConvexError("Please write a longer message before sending.");
    }
    if (message.length > maxFeedbackMessageLength) {
      throw new ConvexError(
        `Feedback messages are limited to ${maxFeedbackMessageLength.toString()} characters.`,
      );
    }

    const path = args.path?.trim().slice(0, maxFeedbackPathLength);

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    const supportEmail = process.env.SUPPORT_EMAIL?.trim();
    if (!apiKey || !fromEmail || !supportEmail) {
      console.error("Feedback delivery is not configured", {
        hasApiKey: Boolean(apiKey),
        hasFromEmail: Boolean(fromEmail),
        hasSupportEmail: Boolean(supportEmail),
      });
      throw new ConvexError("Feedback isn't configured yet. Email support@dashboard.gold instead.");
    }

    // Resolve sender identity. For signed-in users, always trust the Clerk identity
    // and ignore any client-supplied email — otherwise an authenticated caller could
    // forge the reply_to and metadata. Anonymous callers may supply their own email.
    const identity = await ctx.auth.getUserIdentity();
    const identityEmail = identity?.email?.trim();
    const senderName = identity?.name?.trim();
    const userSubject = identity?.subject;

    let senderEmail: string | undefined;
    if (identity) {
      senderEmail = identityEmail && identityEmail.length > 0 ? identityEmail : undefined;
    } else {
      const providedEmail = args.email?.trim();
      const hasProvidedEmail = providedEmail !== undefined && providedEmail.length > 0;
      if (
        hasProvidedEmail &&
        (providedEmail.length > maxFeedbackEmailLength || !emailPattern.test(providedEmail))
      ) {
        throw new ConvexError("That email address doesn't look right.");
      }
      senderEmail = hasProvidedEmail ? providedEmail : undefined;
    }

    const subjectPreview = message.split("\n")[0]?.slice(0, 80) ?? "Feedback";
    const subject = `[Feedback] ${subjectPreview}`;

    const distinctId = truncate(args.posthogDistinctId, maxFeedbackContextStringLength);
    const sessionId = truncate(args.posthogSessionId, maxFeedbackContextStringLength);
    const userAgent = truncate(args.userAgent, maxFeedbackUserAgentLength);
    const viewport = truncate(args.viewport, maxFeedbackContextStringLength);
    const release = truncate(args.release, maxFeedbackContextStringLength);
    const environment = truncate(args.environment, maxFeedbackContextStringLength);
    const { personUrl, sessionUrl } = buildPostHogUrls(distinctId, sessionId);

    const meta: MetaItem[] = [];
    if (senderName) meta.push({ label: "Name", value: senderName });
    if (senderEmail) meta.push({ label: "Email", value: senderEmail });
    meta.push({ label: "User ID", value: userSubject ?? "anonymous" });
    if (distinctId) meta.push({ label: "PostHog person", url: personUrl, value: distinctId });
    if (sessionId) meta.push({ label: "PostHog session", url: sessionUrl, value: sessionId });
    if (path) meta.push({ label: "Path", value: path });
    if (userAgent) meta.push({ label: "User agent", value: userAgent });
    if (viewport) meta.push({ label: "Viewport", value: viewport });
    if (release) meta.push({ label: "Release", value: release });
    if (environment) meta.push({ label: "Environment", value: environment });
    meta.push({ label: "Submitted", value: new Date().toISOString() });

    const text = [
      ...meta.map((item) => `${item.label}: ${item.value}${item.url ? ` (${item.url})` : ""}`),
      "",
      "---",
      "",
      message,
    ].join("\n");

    const html = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f5f5f0;padding:20px;">
<div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e5e5e5;border-radius:8px;padding:24px;">
<h2 style="margin:0 0 16px;font-size:18px;color:#333;">New feedback</h2>
<dl style="margin:0 0 16px;font-size:14px;color:#555;">
${meta
  .map(
    (item) =>
      `<div style="margin-bottom:4px;"><strong style="color:#333;">${escapeHtml(item.label)}:</strong> ${
        item.url
          ? `<a href="${escapeHtml(item.url)}" style="color:#b8860b;">${escapeHtml(item.value)}</a>`
          : escapeHtml(item.value)
      }</div>`,
  )
  .join("")}
</dl>
<hr style="border:none;border-top:1px solid #eee;margin:16px 0;" />
<pre style="white-space:pre-wrap;word-wrap:break-word;font-family:inherit;font-size:14px;color:#222;margin:0;">${escapeHtml(message)}</pre>
</div>
</body></html>`;

    const emailHeaders: Record<string, string> = {};
    const replyTo = senderEmail && senderEmail.length > 0 ? senderEmail : undefined;

    const response = await fetch(resendSendEmailUrl, {
      body: JSON.stringify({
        from: fromEmail,
        headers: emailHeaders,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
        subject,
        text,
        to: [supportEmail],
      }),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    });

    if (!response.ok) {
      const body = (await response.json().catch(() => null)) as null | {
        error?: string;
        message?: string;
      };
      const failureMessage =
        body?.message ?? body?.error ?? `${response.status.toString()} ${response.statusText}`;
      console.error("Failed to send feedback email", {
        error: failureMessage,
        hasIdentity: identity !== null,
        status: response.status,
      });
      throw new ConvexError("Couldn't send feedback. Please try again in a minute.");
    }

    return { ok: true };
  },
});
