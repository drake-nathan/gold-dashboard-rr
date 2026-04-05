"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";

import { cn } from "@/lib/cn";

const Tabs = ({ className, orientation = "horizontal", ...props }: TabsPrimitive.Root.Props) => (
  <TabsPrimitive.Root
    className={cn("group/tabs flex gap-2 data-[orientation=horizontal]:flex-col", className)}
    data-orientation={orientation}
    data-slot="tabs"
    {...props}
  />
);

const TabsList = ({ className, ...props }: TabsPrimitive.List.Props) => (
  <TabsPrimitive.List
    className={cn(
      "inline-flex h-9 w-fit items-center justify-center rounded-lg bg-muted p-[3px] text-muted-foreground group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col",
      className,
    )}
    data-slot="tabs-list"
    {...props}
  />
);

const TabsTrigger = ({ className, ...props }: TabsPrimitive.Tab.Props) => (
  <TabsPrimitive.Tab
    className={cn(
      "inline-flex h-[calc(100%-1px)] flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground transition-[color,box-shadow] group-data-[orientation=vertical]/tabs:w-full group-data-[orientation=vertical]/tabs:justify-start focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 data-active:bg-background data-active:shadow-sm dark:text-muted-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      className,
    )}
    data-slot="tabs-trigger"
    {...props}
  />
);

const TabsContent = ({ className, ...props }: TabsPrimitive.Panel.Props) => (
  <TabsPrimitive.Panel
    className={cn("flex-1 outline-none", className)}
    data-slot="tabs-content"
    {...props}
  />
);

export { Tabs, TabsContent, TabsList, TabsTrigger };
