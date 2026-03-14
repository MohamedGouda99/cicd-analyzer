import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
} from "lucide-react";
import type { AnalysisStats } from "@/types";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | false)[]) {
  return twMerge(clsx(inputs));
}

interface StatsCardsProps {
  stats: AnalysisStats | null;
  loading: boolean;
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ReactNode;
  color: "indigo" | "red" | "amber" | "emerald";
  loading: boolean;
}

function StatCard({ title, value, subtitle, icon, color, loading }: StatCardProps) {
  const colorMap = {
    indigo: {
      bg: "bg-indigo-500/10",
      border: "border-indigo-500/20",
      icon: "text-indigo-400",
      value: "text-indigo-300",
    },
    red: {
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      icon: "text-red-400",
      value: "text-red-300",
    },
    amber: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      icon: "text-amber-400",
      value: "text-amber-300",
    },
    emerald: {
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      icon: "text-emerald-400",
      value: "text-emerald-300",
    },
  };

  const colors = colorMap[color];

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-5 transition-all duration-200",
        colors.bg,
        colors.border,
        "hover:border-opacity-40"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-400">{title}</p>
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded bg-gray-800" />
          ) : (
            <p className={cn("text-3xl font-bold tracking-tight", colors.value)}>
              {value}
            </p>
          )}
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
        <div
          className={cn(
            "rounded-lg p-2.5",
            colors.bg,
            colors.icon
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

export function StatsCards({ stats, loading }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Analyses"
        value={stats?.total_analyses ?? 0}
        subtitle="All pipeline runs analyzed"
        icon={<Activity className="h-5 w-5" />}
        color="indigo"
        loading={loading}
      />
      <StatCard
        title="Failures Detected"
        value={stats?.total_failures ?? 0}
        subtitle="Failed pipeline runs"
        icon={<AlertTriangle className="h-5 w-5" />}
        color="red"
        loading={loading}
      />
      <StatCard
        title="Avg Confidence"
        value={
          stats?.avg_confidence != null
            ? `${(stats.avg_confidence * 100).toFixed(1)}%`
            : "N/A"
        }
        subtitle="AI diagnosis confidence"
        icon={<BarChart3 className="h-5 w-5" />}
        color="amber"
        loading={loading}
      />
      <StatCard
        title="Recent (24h)"
        value={stats?.recent_count ?? 0}
        subtitle="Analyses in the last 24 hours"
        icon={<Clock className="h-5 w-5" />}
        color="emerald"
        loading={loading}
      />
    </div>
  );
}
