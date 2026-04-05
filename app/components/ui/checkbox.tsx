import { Checkbox as CheckboxPrimitive } from "@base-ui/react/checkbox";
import { CheckIcon } from "lucide-react";

import { cn } from "@/lib/cn";

const Checkbox = ({ className, ...props }: CheckboxPrimitive.Root.Props) => (
  <CheckboxPrimitive.Root
    className={cn(
      "peer size-4 shrink-0 rounded-[4px] border border-input shadow-xs transition-shadow outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:bg-input/30 dark:aria-invalid:ring-destructive/40 dark:data-checked:bg-primary",
      className,
    )}
    data-slot="checkbox"
    {...props}
  >
    <CheckboxPrimitive.Indicator
      className="flex items-center justify-center text-current transition-none [&>svg]:size-3.5"
      data-slot="checkbox-indicator"
    >
      <CheckIcon />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
);

export { Checkbox };
