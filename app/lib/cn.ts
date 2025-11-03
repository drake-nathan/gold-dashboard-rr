import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility for merging Tailwind CSS classes with proper precedence.
 *
 * This is a Shadcn UI utility that combines clsx for conditional classes
 * and tailwind-merge to handle Tailwind class conflicts correctly.
 *
 * Note: This file is separate from app/utils/ which contains domain-specific
 * utilities. This is purely for UI/styling concerns.
 *
 * @example
 * cn("px-2 py-1", condition && "bg-blue-500", className)
 */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
