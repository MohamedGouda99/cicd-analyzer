import {
  GitBranch,
  CheckCircle2,
  XCircle,
  Clock,
  Ban,
  Timer,
  Search,
} from "lucide-react";
import type { PipelineAnalysis } from "@/types";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | false)[]) {
  return twMerge(clsx(inputs));
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function StatusBadge({ status }: { status: PipelineAnalysis["status"] }) {
  const config = {
    failure: {
      icon: <XCircle className="h-3.5 w-3.5" />,
      label: "Failed",
      classes: "bg-red-500/15 text-red-400 border-red-500/25",
    },
    success: {
      icon: <CheckCircle2 className="h-3.5 w-3.5" />,
      label: "Success",
      classes: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
    },
    cancelled: {
      icon: <Ban className="h-3.5 w-3.5" />,
      label: "Cancelled",
      classes: "bg-gray-500/15 text-gray-400 border-gray-500/25",
    },
    timed_out: {
      icon: <Timer className="h-3.5 w-3.5" />,
      label: "Timed Out",
      classes: "bg-amber-500/15 text-amber-400 border-amber-500/25",
    },
  };

  const { icon, label, classes } = config[status];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        classes
      )}
    >
      {icon}
      {label}
    </span>
  );
}

function ConfidencePill({ confidence }: { confidence: number }) {
  const pct = (confidence * 100).toFixed(0);
  const color =
    confidence >= 0.8
      ? "text-emerald-400"
      : confidence >= 0.5
        ? "text-amber-400"
        : "text-red-400";

  return (
    <span className={cn("text-xs font-semibold tabular-nums", color)}>
      {pct}%
    </span>
  );
}

interface AnalysisListProps {
  analyses: PipelineAnalysis[];
  selectedId: string | null;
  onSelect: (analysis: PipelineAnalysis) => void;
  loading: boolean;
}

export function AnalysisList({
  analyses,
  selectedId,
  onSelect,
  loading,
}: AnalysisListProps) {
  if (loading && analyses.length === 0) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse rounded-lg border border-gray-800 bg-gray-900/50 p-4"
          >
            <div className="h-4 w-3/4 rounded bg-gray-800" />
            <div className="mt-2 h-3 w-1/2 rounded bg-gray-800" />
            <div className="mt-2 h-3 w-1/3 rounded bg-gray-800" />
          </div>
        ))}
      </div>
    );
  }

  if (analyses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-800 py-16 text-center">
        <Search className="mb-3 h-10 w-10 text-gray-600" />
        <p className="text-sm font-medium text-gray-400">No analyses found</p>
        <p className="mt-1 text-xs text-gray-600">
          Send a test webhook to create your first analysis
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {analyses.map((analysis) => {
        const isSelected = selectedId === analysis.id;
        const repoName = analysis.repo.includes("/")
          ? analysis.repo.split("/").pop()
          : analysis.repo;

        return (
          <button
            key={analysis.id}
            onClick={() => onSelect(analysis)}
            className={cn(
              "group w-full rounded-lg border p-4 text-left transition-all duration-150",
              isSelected
                ? "border-indigo-500/40 bg-indigo-500/10 shadow-lg shadow-indigo-500/5"
                : "border-gray-800/80 bg-gray-900/40 hover:border-gray-700 hover:bg-gray-900/70"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-gray-200 group-hover:text-white">
                    {repoName}
                  </span>
                  <StatusBadge status={analysis.status} />
                </div>

                <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500">
                  <span className="truncate font-medium text-gray-400">
                    {analysis.workflow_name}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitBranch className="h-3 w-3" />
                    {analysis.branch}
                  </span>
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs text-gray-600">
                    <Clock className="h-3 w-3" />
                    {timeAgo(analysis.created_at)}
                  </span>
                  <span className="text-xs text-gray-700">
                    {analysis.commit_sha.slice(0, 7)}
                  </span>
                  {analysis.ai_diagnosis && (
                    <ConfidencePill
                      confidence={analysis.ai_diagnosis.confidence}
                    />
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
