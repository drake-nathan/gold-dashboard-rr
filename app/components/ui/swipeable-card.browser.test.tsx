import { expect, test, vi } from "vitest";
import { render } from "vitest-browser-react";

import { SwipeableCard } from "./swipeable-card";

const dispatchTouch = async (
  target: Element,
  type: "touchend" | "touchmove" | "touchstart",
  x = 0,
) => {
  const touch =
    type === "touchend"
      ? null
      : new Touch({
          clientX: x,
          clientY: 0,
          force: 1,
          identifier: 1,
          pageX: x,
          pageY: 0,
          radiusX: 2,
          radiusY: 2,
          rotationAngle: 0,
          screenX: x,
          screenY: 0,
          target,
        });
  const touchList = type === "touchend" || touch === null ? [] : [touch];
  const event = new TouchEvent(type, {
    bubbles: true,
    cancelable: true,
    changedTouches: touchList,
    targetTouches: touchList,
    touches: touchList,
  });
  target.dispatchEvent(event);
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });
};

test("triggers delete after a swipe past the threshold", async () => {
  const onDelete = vi.fn();
  const screen = await render(
    <SwipeableCard onDelete={onDelete}>
      <div>Swipe me</div>
    </SwipeableCard>,
  );

  const content = screen.container.querySelector(".transition-transform");
  expect(content).not.toBeNull();

  await dispatchTouch(content!, "touchstart", 140);
  await dispatchTouch(content!, "touchmove", 50);
  await dispatchTouch(content!, "touchend");

  await expect.poll(() => onDelete.mock.calls.length).toBe(1);
});

test("does not trigger delete for short swipes", async () => {
  const onDelete = vi.fn();
  const screen = await render(
    <SwipeableCard onDelete={onDelete}>
      <div>Swipe me</div>
    </SwipeableCard>,
  );

  const content = screen.container.querySelector(".transition-transform");
  expect(content).not.toBeNull();

  await dispatchTouch(content!, "touchstart", 140);
  await dispatchTouch(content!, "touchmove", 95);
  await dispatchTouch(content!, "touchend");

  expect(onDelete).not.toHaveBeenCalled();
});

test("ignores touch gestures when delete is disabled", async () => {
  const screen = await render(
    <SwipeableCard>
      <div>No delete</div>
    </SwipeableCard>,
  );

  const content = screen.container.querySelector(".transition-transform");
  expect(content).not.toBeNull();

  await dispatchTouch(content!, "touchstart", 140);
  await dispatchTouch(content!, "touchmove", 20);
  await dispatchTouch(content!, "touchend");

  await expect.element(content as HTMLElement).toHaveStyle({ transform: "translateX(0px)" });
});
