import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface NeonButtonProps extends HTMLMotionProps<"button"> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "accent";
  glow?: boolean;
}

export const NeonButton = ({ 
  children, 
  className, 
  variant = "primary", 
  glow = true,
  ...props 
}: NeonButtonProps) => {
  const variants = {
    primary: "border-primary text-primary hover:bg-primary/10",
    secondary: "border-secondary text-secondary hover:bg-secondary/10",
    accent: "border-accent text-accent hover:bg-accent/10",
  };

  const glows = {
    primary: "shadow-[0_0_20px_rgba(0,240,255,0.3)] hover:shadow-[0_0_30px_rgba(0,240,255,0.5)]",
    secondary: "shadow-[0_0_20px_rgba(112,0,255,0.3)] hover:shadow-[0_0_30px_rgba(112,0,255,0.5)]",
    accent: "shadow-[0_0_20px_rgba(255,0,60,0.3)] hover:shadow-[0_0_30px_rgba(255,0,60,0.5)]",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "relative px-6 py-3 font-bold uppercase tracking-wider border transition-all duration-300 rounded-sm backdrop-blur-sm",
        variants[variant],
        glow && glows[variant],
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
};
