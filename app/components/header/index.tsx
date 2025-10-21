import { AuthButtons } from "./auth-buttons";
import { ThemeToggle } from "./theme-toggle";

export const Header = () => {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <h1 className="text-xl font-bold">Gold Dashboard</h1>

        <div className="flex items-center gap-2">
          <AuthButtons />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
};
