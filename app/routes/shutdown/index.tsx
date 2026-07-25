export const meta = () => [
  { title: "Dashboard.Gold has shut down" },
  {
    content: "Dashboard.Gold is no longer available.",
    name: "description",
  },
  { content: "noindex, nofollow", name: "robots" },
  { content: "#D4AF37", name: "theme-color" },
];

// Every public path resolves here, so anything that isn't the root is a stale
// link or a bookmark — still a 200 so the notice renders instead of an error.
const Shutdown = () => {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-lg space-y-6 text-center">
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Dashboard.Gold has shut down
        </h1>

        <div className="space-y-4 text-muted-foreground">
          <p>
            After running for a while as a free side project, keeping this site online is no longer
            financially sustainable, so it has been retired.
          </p>
          <p>
            Thanks to everyone who used it, sent feedback, and found it useful. Prices and
            comparisons are no longer being updated, and the data here should not be relied on.
          </p>
        </div>

        <p className="text-sm text-muted-foreground/80">— Nathan</p>
      </div>
    </main>
  );
};

export default Shutdown;
