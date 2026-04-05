import { Popover as PopoverPrimitive } from "@base-ui/react/popover";

import { resolveAsChild } from "@/components/ui/render-helpers";
import { cn } from "@/lib/cn";

const Popover = ({ ...props }: PopoverPrimitive.Root.Props) => (
  <PopoverPrimitive.Root data-slot="popover" {...props} />
);

const PopoverTrigger = ({
  asChild = false,
  children,
  ...props
}: PopoverPrimitive.Trigger.Props & {
  asChild?: boolean;
}) => {
  const { children: renderedChildren, render } = resolveAsChild(children, asChild);

  return (
    <PopoverPrimitive.Trigger data-slot="popover-trigger" render={render} {...props}>
      {renderedChildren}
    </PopoverPrimitive.Trigger>
  );
};

const PopoverContent = ({
  align = "center",
  alignOffset = 0,
  className,
  side = "bottom",
  sideOffset = 4,
  ...props
}: Pick<PopoverPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset"> &
  PopoverPrimitive.Popup.Props) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Positioner
      align={align}
      alignOffset={alignOffset}
      className="isolate z-50"
      side={side}
      sideOffset={sideOffset}
    >
      <PopoverPrimitive.Popup
        className={cn(
          "z-50 w-72 origin-(--transform-origin) rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-hidden data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className,
        )}
        data-slot="popover-content"
        {...props}
      />
    </PopoverPrimitive.Positioner>
  </PopoverPrimitive.Portal>
);

export { Popover, PopoverContent, PopoverTrigger };
