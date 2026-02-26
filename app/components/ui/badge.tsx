import { cva, type VariantProps } from "class-variance-authority";
import { Slot as SlotPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        default: "border-transparent bg-accent text-accent-foreground [a&]:hover:bg-accent/90",
        destructive:
          "border-transparent bg-destructive text-white focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40 [a&]:hover:bg-destructive/90",
        gold: "border-yellow-600/20 bg-yellow-600/10 text-yellow-600 dark:border-yellow-400/20 dark:bg-yellow-400/10 dark:text-yellow-400",
        outline: "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        silver:
          "border-slate-500/20 bg-slate-500/10 text-slate-500 dark:border-slate-400/20 dark:bg-slate-400/10 dark:text-slate-400",
      },
    },
  },
);

const Badge = ({
  asChild = false,
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) => {
  const Comp = asChild ? SlotPrimitive.Slot : "span";

  return (
    <Comp className={cn(badgeVariants({ variant }), className)} data-slot="badge" {...props} />
  );
};

export { Badge, badgeVariants };
