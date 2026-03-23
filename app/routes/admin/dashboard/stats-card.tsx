import { Card, CardContent } from "@/components/ui/card";

export const StatsCard = ({
  count,
  icon,
  label,
  variant,
}: {
  count: number;
  icon: React.ReactNode;
  label: string;
  variant: "info" | "muted" | "success" | "warning";
}) => {
  const variantClasses = {
    info: "border-blue-500/30 bg-blue-500/5",
    muted: "border-border bg-muted/30",
    success: "border-green-500/30 bg-green-500/5",
    warning: "border-yellow-500/30 bg-yellow-500/5",
  };

  const iconClasses = {
    info: "text-blue-500",
    muted: "text-muted-foreground",
    success: "text-green-500",
    warning: "text-yellow-500",
  };

  return (
    <Card className={`${variantClasses[variant]} shadow-none`}>
      <CardContent className="flex items-center gap-3 p-4">
        <div className={iconClasses[variant]}>{icon}</div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{count}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
};
