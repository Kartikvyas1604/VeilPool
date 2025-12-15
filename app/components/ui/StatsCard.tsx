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
    <GlassCard className="relative overflow-hidden">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-zinc-400 font-medium mb-1">{title}</p>
          <h3 className="text-3xl font-bold text-white">{value}</h3>
        </div>
        <div className="p-3 rounded-lg bg-zinc-800/50">
          <Icon size={20} className="text-blue-400" />
        </div>
      </div>
      {trend && (
        <div className="flex items-center gap-1 text-xs">
          <span className={trendUp ? 'text-green-400' : 'text-red-400'}>
            {trendUp ? '↑' : '↓'} {trend}
          </span>
        </div>
      )}
    </GlassCard>
  );
};
