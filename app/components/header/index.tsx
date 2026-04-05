import { Show } from "@clerk/react-router";

import { UpgradeButton } from "@/components/subscription/upgrade-button";

import { HeaderActions } from "./header-actions";
import { Logo } from "./logo";
import { MobileMenu } from "./mobile-menu";
import { ThemeToggle } from "./theme-toggle";
import { UserButtonWithPro } from "./user-button-with-pro";

export const Header = () => {
  return (
    <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Logo />

        {/* Desktop: Actions + Theme toggle + Avatar */}
        <div className="hidden items-center gap-2 sm:flex">
          <HeaderActions />
          <ThemeToggle />
          <Show when="signed-in">
            <UserButtonWithPro avatarSize="size-[32px]" />
          </Show>
        </div>

        {/* Mobile: Upgrade button + Hamburger menu */}
        <div className="flex items-center gap-2 sm:hidden">
          <Show when="signed-in">
            <UpgradeButton size="sm" />
          </Show>
          <MobileMenu />
        </div>
      </div>
    </header>
  );
};
