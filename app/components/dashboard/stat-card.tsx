import { TrendingDown, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface StatCardProps {
  label: string;
  percentChange?: null | number;
  value: React.ReactNode | string;
  valueColor?: string;
  variant?: "info" | "market";
}

const renderTrendBadge = (percentChange: null | number) => {
  if (percentChange === null) {
    return null;
  }

  const isPositive = percentChange >= 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  const colorClass =
    isPositive ?
      "bg-green-600/10 text-green-600 border-green-600/20 dark:bg-green-400/10 dark:text-green-400 dark:border-green-400/20"
    : "bg-red-600/10 text-red-600 border-red-600/20 dark:bg-red-400/10 dark:text-red-400 dark:border-red-400/20";

  return (
    <Badge className={colorClass}>
      <Icon className="h-3 w-3" />
      <span>{Math.abs(percentChange).toFixed(2)}%</span>
    </Badge>
  );
};

export const StatCard = ({
  label,
  percentChange,
  value,
  valueColor,
  variant = "market",
}: StatCardProps) => {
  const widthClass = variant === "market" ? "w-[180px]" : "w-[140px]";

  return (
    <Card className={`${widthClass} py-4`}>
      <CardContent className="relative space-y-1 p-0 px-3">
        {percentChange !== undefined && (
          <div className="absolute -top-1 right-3">
            {renderTrendBadge(percentChange)}
          </div>
        )}
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={valueColor}>{value}</div>
      </CardContent>
    </Card>
  );
};
