import { beforeEach, expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";

import { UpgradeDialog } from "./upgrade-dialog";

let onConfirm = vi.fn();
let onOpenChange = vi.fn();

beforeEach(() => {
  onConfirm = vi.fn();
  onOpenChange = vi.fn();
});

test("ignores backdrop clicks so touch dismissal does not interrupt checkout", async () => {
  await render(
    <UpgradeDialog isLoading={false} onConfirm={onConfirm} onOpenChange={onOpenChange} open />,
  );

  const overlay = document.querySelector("[data-slot='dialog-overlay']");

  if (!(overlay instanceof HTMLElement)) {
    throw new Error("Dialog overlay not found");
  }

  overlay.click();

  expect(onOpenChange).not.toHaveBeenCalled();
});

test("still closes from the explicit not now action", async () => {
  await render(
    <UpgradeDialog isLoading={false} onConfirm={onConfirm} onOpenChange={onOpenChange} open />,
  );

  const closeButton = [...document.querySelectorAll("button")].find((candidate) =>
    candidate.textContent.includes("Not now"),
  );

  if (!(closeButton instanceof HTMLButtonElement)) {
    throw new Error("Not now button not found");
  }

  closeButton.click();

  expect(onOpenChange).toHaveBeenCalledWith(false);
});
