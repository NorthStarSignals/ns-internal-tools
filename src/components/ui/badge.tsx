import { cn } from "@/lib/utils";

interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "critical" | "warning" | "note" | "success";
}

const variants = {
  default: "bg-slate-500/20 text-slate-300",
  critical: "bg-red-500/20 text-red-300",
  warning: "bg-amber-500/20 text-amber-300",
  note: "bg-blue-500/20 text-blue-300",
  success: "bg-green-500/20 text-green-300",
};

export function Badge({ children, className, variant = "default" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
