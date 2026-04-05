import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";

import { Slot } from "@/components/ui/render-helpers";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-full text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    defaultVariants: {
      size: "default",
      variant: "default",
    },
    variants: {
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        icon: "size-9",
        "icon-xs": "size-6",
        lg: "h-10 px-6 has-[>svg]:px-4",
        sm: "h-8 gap-1.5 px-3 has-[>svg]:px-2.5",
      },
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-accent hover:text-accent-foreground",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40",
        ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent",
        link: "text-primary underline-offset-4 hover:underline",
        outline:
          "border bg-background shadow-xs hover:border-accent hover:bg-accent dark:border-input dark:bg-input/30 dark:hover:border-accent dark:hover:bg-accent dark:hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
      },
    },
  },
);

const Button = ({
  asChild = false,
  children,
  className,
  size,
  variant,
  ...props
}: ButtonPrimitive.Props &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) => {
  const buttonClassName = cn(buttonVariants({ size, variant }), className);

  if (asChild) {
    return (
      <Slot className={buttonClassName} data-slot="button" {...props}>
        {children}
      </Slot>
    );
  }

  return (
    <ButtonPrimitive className={buttonClassName} data-slot="button" {...props}>
      {children}
    </ButtonPrimitive>
  );
};

export { Button, buttonVariants };
