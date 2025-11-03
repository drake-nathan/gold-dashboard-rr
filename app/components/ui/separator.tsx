import * as SeparatorPrimitive from "@radix-ui/react-separator";
import * as React from "react";

import { cn } from "@/lib/cn";

const Separator = ({
  className,
  decorative = true,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) => (
  <SeparatorPrimitive.Root
    className={cn(
      "shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
      className,
    )}
    data-slot="separator"
    decorative={decorative}
    orientation={orientation}
    {...props}
  />
);

export { Separator };
