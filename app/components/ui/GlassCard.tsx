import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  hoverEffect?: boolean;
}

export const GlassCard = ({ children, className, hoverEffect = true }: GlassCardProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className={cn(
        "glass-card p-6 rounded-xl border border-white/5 bg-white/5 backdrop-blur-md",
        hoverEffect && "hover:border-primary/50 hover:bg-white/10 transition-all duration-300",
        className
      )}
    >
      {children}
    </motion.div>
  );
};
