import { HelpCircle } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PriceRowProps {
  className?: string;
  label: string;
  labelClassName?: string;
  tooltip?: string;
  value: React.ReactNode;
  valueClassName?: string;
}

export const PriceRow = ({
  className,
  label,
  labelClassName,
  tooltip,
  value,
  valueClassName,
}: PriceRowProps) => {
  return (
    <div className={`flex justify-between ${className ?? ""}`}>
      <span className={labelClassName ?? "text-muted-foreground"}>
        {label}
        {tooltip ?
          <Tooltip>
            <TooltipTrigger asChild>
              <HelpCircle className="ml-1 inline-block h-3 w-3 cursor-help opacity-50" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        : null}
      </span>
      <span className={valueClassName ?? "font-medium"}>{value}</span>
    </div>
  );
};
