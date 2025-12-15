import { GlassCard } from "./GlassCard";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
}

export const StatsCard = ({ title, value, icon: Icon, trend, trendUp }: StatsCardProps) => {
  return (
    <GlassCard className="relative overflow-hidden group">
      <div className="absolute -right-6 -top-6 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon size={100} />
      </div>
      <div className="flex items-center gap-4 mb-4">
        <div className="p-3 rounded-lg bg-primary/10 text-primary">
          <Icon size={24} />
        </div>
        <h3 className="text-gray-400 font-medium">{title}</h3>
      </div>
      <div className="flex items-end gap-3">
        <span className="text-3xl font-bold text-white">{value}</span>
        {trend && (
          <span className={`text-sm mb-1 ${trendUp ? 'text-green-400' : 'text-red-400'}`}>
            {trend}
          </span>
        )}
      </div>
    </GlassCard>
  );
};
