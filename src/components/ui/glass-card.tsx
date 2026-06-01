"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  delay?: number;
}

export function GlassCard({
  children,
  className,
  hover = true,
  delay = 0,
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.06] p-6",
        "backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]",
        hover &&
          "transition-all duration-300 hover:bg-white/[0.10] hover:shadow-[0_8px_40px_rgba(0,0,0,0.4)]",
        className
      )}
    >
      {children}
    </motion.div>
  );
}
