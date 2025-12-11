import { cn } from "@/lib/cn";

const Skeleton = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    className={cn("animate-pulse rounded-md bg-background", className)}
    data-slot="skeleton"
    {...props}
  />
);

export { Skeleton };
