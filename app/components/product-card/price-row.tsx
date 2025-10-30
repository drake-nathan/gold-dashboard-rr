interface PriceRowProps {
  className?: string;
  label: string;
  value: string;
  valueClassName?: string;
}

export const PriceRow = ({
  className,
  label,
  value,
  valueClassName,
}: PriceRowProps) => {
  return (
    <div className={`flex justify-between ${className ?? ""}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className={valueClassName ?? "font-medium"}>{value}</span>
    </div>
  );
};
