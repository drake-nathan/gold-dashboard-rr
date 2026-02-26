import { HelpCircle } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
              <button
                aria-label={`Help: ${tooltip}`}
                className="ml-1 hidden items-center align-middle sm:inline-flex"
                type="button"
              >
                <HelpCircle className="h-3 w-3 cursor-help opacity-50 hover:opacity-100 focus:opacity-100" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>{tooltip}</p>
            </TooltipContent>
          </Tooltip>
        : null}
      </span>
      <span className={`text-right ${valueClassName ?? "font-medium"}`}>{value}</span>
    </div>
  );
};
