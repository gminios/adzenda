import { cn } from "@/lib/utils";
import type { SemaphoreColor } from "@/lib/benchmarks";

const colorMap: Record<SemaphoreColor, string> = {
  green:  "from-emerald-500 to-green-400 shadow-[0_0_12px_rgba(52,211,153,0.4)]",
  yellow: "from-amber-500 to-yellow-400 shadow-[0_0_12px_rgba(251,191,36,0.4)]",
  red:    "from-red-500 to-rose-400 shadow-[0_0_12px_rgba(248,113,113,0.4)]",
};

const dotMap: Record<SemaphoreColor, string> = {
  green:  "bg-emerald-400",
  yellow: "bg-amber-400",
  red:    "bg-red-400",
};

interface Props {
  color: SemaphoreColor;
  label?: string;
  size?: "sm" | "md";
  title?: string;
}

export function SemaphoreBadge({ color, label, size = "md", title }: Props) {
  if (!label) {
    // Dot only
    return (
      <span
        title={title}
        className={cn(
          "inline-block rounded-full",
          size === "sm" ? "h-2 w-2" : "h-2.5 w-2.5",
          dotMap[color],
          color === "green" && "shadow-[0_0_6px_rgba(52,211,153,0.6)]",
          color === "yellow" && "shadow-[0_0_6px_rgba(251,191,36,0.6)]",
          color === "red" && "shadow-[0_0_6px_rgba(248,113,113,0.6)]",
          title && "cursor-help",
        )}
      />
    );
  }

  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r px-2.5 py-0.5 text-xs font-semibold text-white",
        colorMap[color],
        size === "sm" && "px-2 py-0.5 text-[10px]",
        title && "cursor-help"
      )}
    >
      {label}
    </span>
  );
}
