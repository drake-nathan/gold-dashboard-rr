import { useAuth } from "@clerk/react-router";
import { api } from "convex/_generated/api";
import { useAction } from "convex/react";
import { ConvexError } from "convex/values";
import { MessageCircleIcon } from "lucide-react";
import { usePostHog } from "posthog-js/react";
import { useState } from "react";
import { useLocation } from "react-router";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { resolveAppRelease, resolveObservabilityEnvironment } from "@/lib/observability-config";

const MAX_MESSAGE_LENGTH = 5000;
const MIN_MESSAGE_LENGTH = 3;

const collectClientContext = () => {
  if (typeof window === "undefined") return {};
  return {
    userAgent: window.navigator.userAgent,
    viewport: `${window.innerWidth.toString()}x${window.innerHeight.toString()}`,
  };
};

export const FeedbackButton = () => {
  const { isSignedIn } = useAuth();
  const submitFeedback = useAction(api.feedback.submit);
  const posthog = usePostHog();
  const location = useLocation();

  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  // Honeypot — kept in React state so we can forward it to the action and
  // assert (in tests) that bots filling this field get silently no-op'd.
  const [website, setWebsite] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setMessage("");
    setEmail("");
    setWebsite("");
  };

  const handleOpenChange = (next: boolean) => {
    if (isSubmitting) return;
    setOpen(next);
    if (!next) resetForm();
  };

  const submit = async () => {
    const trimmedMessage = message.trim();
    setIsSubmitting(true);

    const distinctId = posthog.get_distinct_id();
    const sessionId = posthog.get_session_id();
    const release = resolveAppRelease(import.meta.env.VITE_APP_RELEASE) ?? undefined;
    const environment = resolveObservabilityEnvironment(
      import.meta.env.VITE_APP_ENVIRONMENT,
      import.meta.env.MODE,
    );

    try {
      await submitFeedback({
        ...(isSignedIn ? {} : { email: email.trim() || undefined }),
        environment,
        message: trimmedMessage,
        path: location.pathname + location.search,
        ...(distinctId ? { posthogDistinctId: distinctId } : {}),
        ...(sessionId ? { posthogSessionId: sessionId } : {}),
        ...(release ? { release } : {}),
        ...collectClientContext(),
        ...(website ? { website } : {}),
      });
      posthog.capture("feedback_submitted", {
        is_signed_in: isSignedIn ?? false,
        message_length: trimmedMessage.length,
        path: location.pathname,
      });
      toast.success("Thanks for the feedback!");
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error("Feedback submit failed", error);
      const errorMessage =
        error instanceof ConvexError && typeof error.data === "string"
          ? error.data
          : "Couldn't send feedback. Please try again.";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <Button
        aria-label="Send feedback"
        className="fixed right-4 bottom-4 z-40 size-12 shadow-lg sm:right-6 sm:bottom-6"
        onClick={() => {
          setOpen(true);
          posthog.capture("feedback_dialog_opened", {
            is_signed_in: isSignedIn ?? false,
            path: location.pathname,
          });
        }}
        size="icon"
        type="button"
      >
        <MessageCircleIcon className="size-5" />
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send feedback</DialogTitle>
          <DialogDescription>
            Found a bug, have a question, or want to request a feature? I read everything.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          // Tells password managers (1Password, Dashlane, LastPass) this isn't a
          // login form so they stop offering to fill credentials. The email
          // input still gets native browser autofill via autoComplete="email".
          data-form-type="other"
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          {/*
            Honeypot field — visually and assistively hidden, never tab-reachable.
            Real users will never fill this; bots scraping the form will.
          */}
          <div aria-hidden="true" className="hidden" tabIndex={-1}>
            <label htmlFor="feedback-website">Website</label>
            <input
              autoComplete="off"
              id="feedback-website"
              name="website"
              onChange={(event) => {
                setWebsite(event.target.value);
              }}
              tabIndex={-1}
              type="text"
              value={website}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="feedback-message">Message</Label>
            <Textarea
              disabled={isSubmitting}
              id="feedback-message"
              maxLength={MAX_MESSAGE_LENGTH}
              minLength={MIN_MESSAGE_LENGTH}
              onChange={(event) => {
                setMessage(event.target.value);
              }}
              placeholder="What's on your mind?"
              required
              rows={5}
              value={message}
            />
          </div>
          {!isSignedIn ? (
            <div className="space-y-2">
              <Label htmlFor="feedback-email">
                Email <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                autoComplete="email"
                disabled={isSubmitting}
                id="feedback-email"
                onChange={(event) => {
                  setEmail(event.target.value);
                }}
                placeholder="you@example.com"
                type="email"
                value={email}
              />
              <p className="text-xs text-muted-foreground">
                Leave your email if you&apos;d like a reply.
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              disabled={isSubmitting}
              onClick={() => {
                handleOpenChange(false);
              }}
              type="button"
              variant="outline"
            >
              Cancel
            </Button>
            <Button disabled={isSubmitting} type="submit">
              {isSubmitting ? "Sending..." : "Send feedback"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
