import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface ButtonProps extends HTMLMotionProps<"button"> {
  children: ReactNode;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  size?: "sm" | "md" | "lg";
}

export const NeonButton = ({ 
  children, 
  className, 
  variant = "primary", 
  size = "md",
  ...props 
}: ButtonProps) => {
  const variants = {
    primary: "bg-primary text-white hover:bg-blue-600 border border-transparent shadow-sm",
    secondary: "bg-secondary text-white hover:bg-zinc-700 border border-transparent",
    outline: "bg-transparent border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white",
    ghost: "bg-transparent text-zinc-400 hover:text-white hover:bg-zinc-800/50",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-5 py-2.5 text-sm",
    lg: "px-8 py-3 text-base",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative font-medium rounded-lg transition-colors duration-200 flex items-center justify-center gap-2",
        variants[variant as keyof typeof variants] || variants.primary,
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </motion.button>
  );
};
