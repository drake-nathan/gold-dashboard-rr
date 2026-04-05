"use client";

import { Select as SelectPrimitive } from "@base-ui/react/select";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "@/lib/cn";

const Select = SelectPrimitive.Root;

const SelectGroup = ({ className, ...props }: SelectPrimitive.Group.Props) => (
  <SelectPrimitive.Group className={cn("p-1", className)} data-slot="select-group" {...props} />
);

const SelectValue = ({ className, ...props }: SelectPrimitive.Value.Props) => (
  <SelectPrimitive.Value
    className={cn("flex flex-1 text-left", className)}
    data-slot="select-value"
    {...props}
  />
);

const SelectTrigger = ({
  children,
  className,
  size = "default",
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "default" | "sm";
}) => (
  <SelectPrimitive.Trigger
    className={cn(
      "flex w-fit cursor-pointer items-center justify-between gap-2 rounded-md border bg-background px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none hover:border-accent hover:bg-accent focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 dark:border-input dark:bg-input/30 dark:hover:border-accent dark:hover:bg-accent dark:hover:text-accent-foreground dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground",
      className,
    )}
    data-size={size}
    data-slot="select-trigger"
    {...props}
  >
    {children}
    <SelectPrimitive.Icon render={<ChevronDownIcon className="size-4 opacity-50" />} />
  </SelectPrimitive.Trigger>
);

const SelectContent = ({
  align = "center",
  alignOffset = 0,
  children,
  className,
  portal = true,
  position = "popper",
  side = "bottom",
  sideOffset = 4,
  ...props
}: Pick<SelectPrimitive.Positioner.Props, "align" | "alignOffset" | "side" | "sideOffset"> &
  SelectPrimitive.Popup.Props & {
    portal?: boolean;
    position?: "item-aligned" | "popper";
  }) => {
  const content = (
    <SelectPrimitive.Positioner
      align={align}
      alignItemWithTrigger={position !== "popper"}
      alignOffset={alignOffset}
      className="isolate z-50"
      side={side}
      sideOffset={sideOffset}
    >
      <SelectPrimitive.Popup
        className={cn(
          "relative z-50 max-h-(--available-height) min-w-[8rem] origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          position === "popper"
            ? "w-(--anchor-width) data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1"
            : "w-auto",
          className,
        )}
        data-slot="select-content"
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.List className={cn("p-1", position === "popper" && "scroll-my-1")}>
          {children}
        </SelectPrimitive.List>
        <SelectScrollDownButton />
      </SelectPrimitive.Popup>
    </SelectPrimitive.Positioner>
  );

  if (!portal) {
    return content;
  }

  return <SelectPrimitive.Portal>{content}</SelectPrimitive.Portal>;
};

const SelectLabel = ({ className, ...props }: SelectPrimitive.GroupLabel.Props) => (
  <SelectPrimitive.GroupLabel
    className={cn("px-2 py-1.5 text-xs text-muted-foreground", className)}
    data-slot="select-label"
    {...props}
  />
);

const SelectItem = ({ children, className, ...props }: SelectPrimitive.Item.Props) => (
  <SelectPrimitive.Item
    className={cn(
      "relative flex w-full cursor-pointer items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
      className,
    )}
    data-slot="select-item"
    {...props}
  >
    <SelectPrimitive.ItemText className="flex flex-1 shrink-0 gap-2 whitespace-nowrap">
      {children}
    </SelectPrimitive.ItemText>
    <SelectPrimitive.ItemIndicator
      render={<span className="absolute right-2 flex size-3.5 items-center justify-center" />}
    >
      <CheckIcon className="size-4" />
    </SelectPrimitive.ItemIndicator>
  </SelectPrimitive.Item>
);

const SelectSeparator = ({ className, ...props }: SelectPrimitive.Separator.Props) => (
  <SelectPrimitive.Separator
    className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
    data-slot="select-separator"
    {...props}
  />
);

const SelectScrollUpButton = ({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) => (
  <SelectPrimitive.ScrollUpArrow
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    data-slot="select-scroll-up-button"
    {...props}
  >
    <ChevronUpIcon className="size-4" />
  </SelectPrimitive.ScrollUpArrow>
);

const SelectScrollDownButton = ({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) => (
  <SelectPrimitive.ScrollDownArrow
    className={cn("flex cursor-default items-center justify-center py-1", className)}
    data-slot="select-scroll-down-button"
    {...props}
  >
    <ChevronDownIcon className="size-4" />
  </SelectPrimitive.ScrollDownArrow>
);

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
