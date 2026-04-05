import { useState } from "react";
import { expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";

import { Button } from "./button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";

test("dialog action buttons remain clickable in browser mode", async () => {
  const onConfirm = vi.fn();

  await render(
    <Dialog open>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm action</DialogTitle>
          <DialogDescription>
            Dialog actions should stay clickable in browser tests.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={onConfirm}>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>,
  );

  const confirmButton = [...document.querySelectorAll("button")].find((button) =>
    button.textContent.includes("Confirm"),
  );

  if (!confirmButton) {
    throw new Error("Confirm button not found");
  }

  confirmButton.click();

  expect(onConfirm).toHaveBeenCalledTimes(1);
});

test("dialog close button can dismiss an open dialog", async () => {
  const TestDialog = () => {
    const [open, setOpen] = useState(true);

    return (
      <Dialog onOpenChange={setOpen} open={open}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dismiss me</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  };

  const screen = await render(<TestDialog />);

  const closeButton = [...document.querySelectorAll("button")].find((button) =>
    button.textContent.includes("Close"),
  );

  if (!closeButton) {
    throw new Error("Close button not found");
  }

  closeButton.click();

  await expect.element(screen.getByRole("dialog")).not.toBeInTheDocument();
});
