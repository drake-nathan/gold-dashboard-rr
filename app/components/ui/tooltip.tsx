"use client";

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip";

import { resolveAsChild } from "@/components/ui/render-helpers";
import { cn } from "@/lib/cn";

const TooltipProvider = ({
  delayDuration = 0,
  ...props
}: TooltipPrimitive.Provider.Props & {
  delayDuration?: number;
}) => <TooltipPrimitive.Provider data-slot="tooltip-provider" delay={delayDuration} {...props} />;

const Tooltip = ({ ...props }: TooltipPrimitive.Root.Props) => (
  <TooltipProvider>
    <TooltipPrimitive.Root data-slot="tooltip" {...props} />
  </TooltipProvider>
);

const TooltipTrigger = ({
  asChild = false,
  children,
  ...props
}: TooltipPrimitive.Trigger.Props & {
  asChild?: boolean;
}) => {
  const { children: renderedChildren, render } = resolveAsChild(children, asChild);

  return (
    <TooltipPrimitive.Trigger data-slot="tooltip-trigger" render={render} {...props}>
      {renderedChildren}
    </TooltipPrimitive.Trigger>
  );
};

const TooltipContent = ({
  align = "center",
  alignOffset = 0,
  children,
  className,
  side = "top",
  sideOffset = 0,
  ...props
}: Pick<TooltipPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset"> &
  TooltipPrimitive.Popup.Props) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Positioner
      align={align}
      alignOffset={alignOffset}
      className="isolate z-50"
      side={side}
      sideOffset={sideOffset}
    >
      <TooltipPrimitive.Popup
        className={cn(
          "z-50 w-fit origin-(--transform-origin) animate-in rounded-md bg-foreground px-3 py-1.5 text-xs text-balance text-background fade-in-0 zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className,
        )}
        data-slot="tooltip-content"
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground data-[side=bottom]:top-1 data-[side=inline-end]:top-1/2! data-[side=inline-end]:-left-1 data-[side=inline-end]:translate-x-[1.5px] data-[side=inline-end]:-translate-y-1/2 data-[side=inline-start]:top-1/2! data-[side=inline-start]:-right-1 data-[side=inline-start]:translate-x-[-1.5px] data-[side=inline-start]:-translate-y-1/2 data-[side=left]:top-1/2! data-[side=left]:-right-1 data-[side=left]:translate-x-[-1.5px] data-[side=left]:-translate-y-1/2 data-[side=right]:top-1/2! data-[side=right]:-left-1 data-[side=right]:translate-x-[1.5px] data-[side=right]:-translate-y-1/2 data-[side=top]:-bottom-2.5" />
      </TooltipPrimitive.Popup>
    </TooltipPrimitive.Positioner>
  </TooltipPrimitive.Portal>
);

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
