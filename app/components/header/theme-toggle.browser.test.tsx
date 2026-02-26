import { expect, test } from "vitest";
import { render } from "vitest-browser-react";

import { ThemeProvider } from "@/providers/theme-provider";

import { ThemeToggle } from "./theme-toggle";

test("theme toggle button is visible", async () => {
  const screen = await render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );

  const button = screen.getByRole("button", { name: "Toggle theme" });

  await expect.element(button).toBeInTheDocument();
});

test("theme toggle opens dropdown menu on click", async () => {
  const screen = await render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );

  const button = screen.getByRole("button", { name: "Toggle theme" });
  await button.click();

  // Check that menu items appear
  const lightOption = screen.getByText("Light");
  const darkOption = screen.getByText("Dark");
  const systemOption = screen.getByText("System");

  await expect.element(lightOption).toBeInTheDocument();
  await expect.element(darkOption).toBeInTheDocument();
  await expect.element(systemOption).toBeInTheDocument();
});

test("can select light theme from dropdown", async () => {
  const screen = await render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );

  // Open dropdown
  const button = screen.getByRole("button", { name: "Toggle theme" });
  await button.click();

  // Click light option
  const lightOption = screen.getByText("Light");
  await lightOption.click();

  // Verify theme was applied to document
  await expect.poll(() => document.documentElement.classList.contains("dark")).toBe(false);
  await expect.poll(() => document.documentElement.classList.contains("light")).toBe(true);
});

test("can select dark theme from dropdown", async () => {
  const screen = await render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );

  // Open dropdown
  const button = screen.getByRole("button", { name: "Toggle theme" });
  await button.click();

  // Click dark option
  const darkOption = screen.getByText("Dark");
  await darkOption.click();

  // Verify theme was applied to document
  await expect.poll(() => document.documentElement.classList.contains("dark")).toBe(true);
});
