import { Dialog as SheetPrimitive } from "@base-ui/react/dialog";
import { XIcon } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { mergeRenderStyle, resolveAsChild } from "@/components/ui/render-helpers";
import { cn } from "@/lib/cn";

const Sheet = ({ ...props }: SheetPrimitive.Root.Props) => (
  <SheetPrimitive.Root data-slot="sheet" {...props} />
);

const SheetTrigger = ({
  asChild = false,
  children,
  ...props
}: SheetPrimitive.Trigger.Props & {
  asChild?: boolean;
}) => {
  const { children: renderedChildren, render } = resolveAsChild(children, asChild);

  return (
    <SheetPrimitive.Trigger data-slot="sheet-trigger" render={render} {...props}>
      {renderedChildren}
    </SheetPrimitive.Trigger>
  );
};

const SheetClose = ({
  asChild = false,
  children,
  ...props
}: SheetPrimitive.Close.Props & {
  asChild?: boolean;
}) => {
  const { children: renderedChildren, render } = resolveAsChild(children, asChild);

  return (
    <SheetPrimitive.Close data-slot="sheet-close" render={render} {...props}>
      {renderedChildren}
    </SheetPrimitive.Close>
  );
};

const SheetPortal = ({ ...props }: SheetPrimitive.Portal.Props) => (
  <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />
);

const SheetOverlay = ({ className, style, ...props }: SheetPrimitive.Backdrop.Props) => (
  <SheetPrimitive.Backdrop
    className={cn(
      "fixed inset-0 z-50 bg-black/28 transition-opacity duration-150 ease-out data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-[2px]",
      className,
    )}
    data-slot="sheet-overlay"
    style={mergeRenderStyle<SheetPrimitive.Backdrop.State>(
      {
        inset: 0,
        position: "fixed",
        zIndex: 50,
      },
      style,
    )}
    {...props}
  />
);

const SheetContent = ({
  children,
  className,
  side = "right",
  style,
  ...props
}: SheetPrimitive.Popup.Props & {
  side?: "bottom" | "left" | "right" | "top";
}) => {
  const sideStyle =
    side === "right"
      ? { bottom: 0, right: 0, top: 0, width: "75%" }
      : side === "left"
        ? { bottom: 0, left: 0, top: 0, width: "75%" }
        : side === "top"
          ? { height: "auto", left: 0, right: 0, top: 0 }
          : { bottom: 0, height: "auto", left: 0, right: 0 };

  return (
    <SheetPortal>
      <SheetOverlay />
      <SheetPrimitive.Popup
        className={cn(
          "fixed z-50 flex flex-col gap-4 bg-background bg-clip-padding shadow-xl transition duration-200 ease-in-out will-change-[transform,opacity] outline-none data-ending-style:opacity-0 data-starting-style:opacity-0 data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=bottom]:data-ending-style:translate-y-full data-[side=bottom]:data-starting-style:translate-y-full data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=left]:data-ending-style:-translate-x-full data-[side=left]:data-starting-style:-translate-x-full data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=right]:data-ending-style:translate-x-full data-[side=right]:data-starting-style:translate-x-full data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:data-ending-style:-translate-y-full data-[side=top]:data-starting-style:-translate-y-full motion-reduce:transition-none data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm",
          className,
        )}
        data-side={side}
        data-slot="sheet-content"
        style={mergeRenderStyle<SheetPrimitive.Popup.State>(
          {
            maxWidth: side === "left" || side === "right" ? "28rem" : undefined,
            position: "fixed",
            zIndex: 51,
            ...sideStyle,
          },
          style,
        )}
        {...props}
      >
        {children}
      </SheetPrimitive.Popup>
    </SheetPortal>
  );
};

const SheetHeader = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    className={cn("flex flex-col gap-2 py-2 pr-2 pl-4", className)}
    data-slot="sheet-header"
    {...props}
  />
);

const SheetFooter = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    className={cn("mt-auto flex flex-col gap-2 p-4", className)}
    data-slot="sheet-footer"
    {...props}
  />
);

const SheetTitle = ({ className, ...props }: SheetPrimitive.Title.Props) => (
  <div className="flex items-center justify-between gap-4">
    <SheetPrimitive.Title
      className={cn("font-semibold text-foreground", className)}
      data-slot="sheet-title"
      {...props}
    />
    <SheetPrimitive.Close data-slot="sheet-close" render={<Button size="icon" variant="outline" />}>
      <XIcon className="h-[1.2rem] w-[1.2rem]" />
      <span className="sr-only">Close</span>
    </SheetPrimitive.Close>
  </div>
);

const SheetDescription = ({ className, ...props }: SheetPrimitive.Description.Props) => (
  <SheetPrimitive.Description
    className={cn("text-sm text-muted-foreground", className)}
    data-slot="sheet-description"
    {...props}
  />
);

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
