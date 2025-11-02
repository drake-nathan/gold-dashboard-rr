import { Trash2 } from "lucide-react";
import { type ReactNode, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface SwipeableCardProps {
  children: ReactNode;
  className?: string;
  onDelete?: () => void;
}

export const SwipeableCard = ({
  children,
  className,
  onDelete,
}: SwipeableCardProps) => {
  const [translateX, setTranslateX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!onDelete) return;
    startX.current = e.touches[0].clientX;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!onDelete || !isSwiping) return;
    currentX.current = e.touches[0].clientX;
    const diff = currentX.current - startX.current;

    // Only allow left swipe (negative diff)
    if (diff < 0) {
      setTranslateX(Math.max(diff, -100)); // Max 100px swipe
    }
  };

  const handleTouchEnd = () => {
    if (!isSwiping) return;
    setIsSwiping(false);

    // If swiped more than 60px, trigger delete
    if (translateX < -60 && onDelete) {
      onDelete();
    }

    // Reset position
    setTranslateX(0);
  };

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Delete background - shows when swiping */}
      {onDelete ?
        <div className="absolute inset-0 flex items-center justify-end bg-destructive px-4">
          <Trash2 className="h-4 w-4 text-destructive-foreground" />
        </div>
      : null}

      {/* Card content */}
      <div
        className={cn(
          "transition-transform",
          isSwiping ? "duration-0" : "duration-200",
        )}
        onTouchEnd={handleTouchEnd}
        onTouchMove={handleTouchMove}
        onTouchStart={handleTouchStart}
        style={{
          transform: `translateX(${translateX}px)`,
        }}
      >
        {children}
      </div>
    </div>
  );
};
