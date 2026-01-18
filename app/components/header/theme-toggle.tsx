import { Check, Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/providers/theme-provider";

/**
 * Theme menu items - can be used in any dropdown
 */
export const ThemeMenuItems = () => {
  const { setTheme, theme } = useTheme();

  return (
    <>
      <DropdownMenuItem
        onClick={() => {
          setTheme("light");
        }}
      >
        <Sun className="mr-2 h-4 w-4" />
        Light
        {theme === "light" && <Check className="ml-auto h-4 w-4" />}
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => {
          setTheme("dark");
        }}
      >
        <Moon className="mr-2 h-4 w-4" />
        Dark
        {theme === "dark" && <Check className="ml-auto h-4 w-4" />}
      </DropdownMenuItem>
      <DropdownMenuItem
        onClick={() => {
          setTheme("system");
        }}
      >
        <Monitor className="mr-2 h-4 w-4" />
        System
        {theme === "system" && <Check className="ml-auto h-4 w-4" />}
      </DropdownMenuItem>
    </>
  );
};

/**
 * Standalone theme toggle button with dropdown
 */
export const ThemeToggle = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="outline">
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <ThemeMenuItems />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
