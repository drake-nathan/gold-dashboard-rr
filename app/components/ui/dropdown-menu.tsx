"use client";

import { Menu as DropdownMenuPrimitive } from "@base-ui/react/menu";
import { CheckIcon, ChevronRightIcon, CircleIcon } from "lucide-react";
import type * as React from "react";

import { resolveAsChild } from "@/components/ui/render-helpers";
import { cn } from "@/lib/cn";

const DropdownMenu = ({ ...props }: DropdownMenuPrimitive.Root.Props) => (
  <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />
);

const DropdownMenuPortal = ({ ...props }: DropdownMenuPrimitive.Portal.Props) => (
  <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />
);

const DropdownMenuTrigger = ({
  asChild = false,
  children,
  ...props
}: DropdownMenuPrimitive.Trigger.Props & {
  asChild?: boolean;
}) => {
  const { children: renderedChildren, render } = resolveAsChild(children, asChild);

  return (
    <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" render={render} {...props}>
      {renderedChildren}
    </DropdownMenuPrimitive.Trigger>
  );
};

const DropdownMenuContent = ({
  align = "start",
  alignOffset = 0,
  className,
  side = "bottom",
  sideOffset = 4,
  ...props
}: DropdownMenuPrimitive.Popup.Props &
  Pick<
    DropdownMenuPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Positioner
      align={align}
      alignOffset={alignOffset}
      className="isolate z-50 outline-none"
      side={side}
      sideOffset={sideOffset}
    >
      <DropdownMenuPrimitive.Popup
        className={cn(
          "z-50 min-w-[8rem] origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
          className,
        )}
        data-slot="dropdown-menu-content"
        {...props}
      />
    </DropdownMenuPrimitive.Positioner>
  </DropdownMenuPrimitive.Portal>
);

const DropdownMenuGroup = ({ ...props }: DropdownMenuPrimitive.Group.Props) => (
  <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />
);

const DropdownMenuItem = ({
  asChild = false,
  children,
  className,
  inset,
  variant = "default",
  ...props
}: DropdownMenuPrimitive.Item.Props & {
  asChild?: boolean;
  inset?: boolean;
  variant?: "default" | "destructive";
}) => {
  const { children: renderedChildren, render } = resolveAsChild(children, asChild);

  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        "relative flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 data-inset:pl-8 data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground data-[variant=destructive]:*:[svg]:text-destructive!",
        className,
      )}
      data-inset={inset}
      data-slot="dropdown-menu-item"
      data-variant={variant}
      render={render}
      {...props}
    >
      {renderedChildren}
    </DropdownMenuPrimitive.Item>
  );
};

const DropdownMenuCheckboxItem = ({
  checked,
  children,
  className,
  ...props
}: DropdownMenuPrimitive.CheckboxItem.Props) => (
  <DropdownMenuPrimitive.CheckboxItem
    checked={checked}
    className={cn(
      "relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      className,
    )}
    data-slot="dropdown-menu-checkbox-item"
    {...props}
  >
    <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
      <DropdownMenuPrimitive.CheckboxItemIndicator>
        <CheckIcon className="size-4" />
      </DropdownMenuPrimitive.CheckboxItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
);

const DropdownMenuRadioGroup = ({ ...props }: DropdownMenuPrimitive.RadioGroup.Props) => (
  <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />
);

const DropdownMenuRadioItem = ({
  children,
  className,
  ...props
}: DropdownMenuPrimitive.RadioItem.Props) => (
  <DropdownMenuPrimitive.RadioItem
    className={cn(
      "relative flex cursor-default items-center gap-2 rounded-sm py-1.5 pr-2 pl-8 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      className,
    )}
    data-slot="dropdown-menu-radio-item"
    {...props}
  >
    <span className="pointer-events-none absolute left-2 flex size-3.5 items-center justify-center">
      <DropdownMenuPrimitive.RadioItemIndicator>
        <CircleIcon className="size-2 fill-current" />
      </DropdownMenuPrimitive.RadioItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
);

const DropdownMenuLabel = ({
  className,
  inset,
  ...props
}: React.ComponentProps<"div"> & {
  inset?: boolean;
}) => (
  <div
    className={cn("px-2 py-1.5 text-sm font-medium data-inset:pl-8", className)}
    data-inset={inset}
    data-slot="dropdown-menu-label"
    {...props}
  />
);

const DropdownMenuSeparator = ({ className, ...props }: DropdownMenuPrimitive.Separator.Props) => (
  <DropdownMenuPrimitive.Separator
    className={cn("-mx-1 my-1 h-px bg-border", className)}
    data-slot="dropdown-menu-separator"
    {...props}
  />
);

const DropdownMenuShortcut = ({ className, ...props }: React.ComponentProps<"span">) => (
  <span
    className={cn("ml-auto text-xs tracking-widest text-muted-foreground", className)}
    data-slot="dropdown-menu-shortcut"
    {...props}
  />
);

const DropdownMenuSub = ({ ...props }: DropdownMenuPrimitive.SubmenuRoot.Props) => (
  <DropdownMenuPrimitive.SubmenuRoot data-slot="dropdown-menu-sub" {...props} />
);

const DropdownMenuSubTrigger = ({
  children,
  className,
  inset,
  ...props
}: DropdownMenuPrimitive.SubmenuTrigger.Props & {
  inset?: boolean;
}) => (
  <DropdownMenuPrimitive.SubmenuTrigger
    className={cn(
      "flex cursor-default items-center rounded-sm px-2 py-1.5 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-inset:pl-8 data-open:bg-accent data-open:text-accent-foreground data-popup-open:bg-accent data-popup-open:text-accent-foreground",
      className,
    )}
    data-inset={inset}
    data-slot="dropdown-menu-sub-trigger"
    {...props}
  >
    {children}
    <ChevronRightIcon className="ml-auto size-4" />
  </DropdownMenuPrimitive.SubmenuTrigger>
);

const DropdownMenuSubContent = ({
  align = "start",
  alignOffset = -3,
  className,
  side = "right",
  sideOffset = 0,
  ...props
}: React.ComponentProps<typeof DropdownMenuContent>) => (
  <DropdownMenuContent
    align={align}
    alignOffset={alignOffset}
    className={cn("min-w-[8rem]", className)}
    data-slot="dropdown-menu-sub-content"
    side={side}
    sideOffset={sideOffset}
    {...props}
  />
);

export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
};
