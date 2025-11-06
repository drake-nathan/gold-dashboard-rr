import { expect, test } from "vitest";
import { render } from "vitest-browser-react";

import { Button } from "./button";

test("button renders with default variant", async () => {
  const screen = await render(<Button>Click me</Button>);
  const button = screen.getByRole("button", { name: "Click me" });

  await expect.element(button).toBeInTheDocument();
  await expect.element(button).toHaveTextContent("Click me");
});

test("button click interaction", async () => {
  let clicked = false;
  const handleClick = () => {
    clicked = true;
  };

  const screen = await render(<Button onClick={handleClick}>Click me</Button>);
  const button = screen.getByRole("button", { name: "Click me" });

  await button.click();

  expect(clicked).toBe(true);
});

test("button can be disabled", async () => {
  const screen = await render(<Button disabled>Disabled</Button>);
  const button = screen.getByRole("button", { name: "Disabled" });

  await expect.element(button).toBeDisabled();
});

test("button renders different variants", async () => {
  const screen = await render(<Button variant="default">Default</Button>);
  let button = screen.getByRole("button", { name: "Default" });

  await expect.element(button).toBeInTheDocument();

  await screen.rerender(<Button variant="destructive">Destructive</Button>);
  button = screen.getByRole("button", { name: "Destructive" });

  await expect.element(button).toBeInTheDocument();

  await screen.rerender(<Button variant="outline">Outline</Button>);
  button = screen.getByRole("button", { name: "Outline" });

  await expect.element(button).toBeInTheDocument();
});

test("button renders different sizes", async () => {
  const screen = await render(<Button size="default">Default</Button>);
  let button = screen.getByRole("button", { name: "Default" });

  await expect.element(button).toBeInTheDocument();

  await screen.rerender(<Button size="sm">Small</Button>);
  button = screen.getByRole("button", { name: "Small" });

  await expect.element(button).toBeInTheDocument();

  await screen.rerender(<Button size="lg">Large</Button>);
  button = screen.getByRole("button", { name: "Large" });

  await expect.element(button).toBeInTheDocument();

  await screen.rerender(<Button size="icon">Icon</Button>);
  button = screen.getByRole("button", { name: "Icon" });

  await expect.element(button).toBeInTheDocument();
});
