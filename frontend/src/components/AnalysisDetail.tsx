import { useState } from "react";
import {
  ExternalLink,
  RefreshCw,
  AlertOctagon,
  FileText,
  Lightbulb,
  Gauge,
  GitBranch,
  Hash,
  Calendar,
  X,
} from "lucide-react";
import type { PipelineAnalysis } from "@/types";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | false)[]) {
  return twMerge(clsx(inputs));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ConfidenceMeter({ confidence }: { confidence: number }) {
  const pct = confidence * 100;
  const color =
    pct >= 80
      ? "from-emerald-500 to-emerald-400"
      : pct >= 50
        ? "from-amber-500 to-amber-400"
        : "from-red-500 to-red-400";

  const label =
    pct >= 80 ? "High" : pct >= 50 ? "Medium" : "Low";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Gauge className="h-4 w-4" />
          <span>Confidence</span>
        </div>
        <span className="text-sm font-bold tabular-nums text-gray-200">
          {pct.toFixed(1)}%{" "}
          <span className="font-normal text-gray-500">({label})</span>
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-800">
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-all duration-500",
            color
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

interface AnalysisDetailProps {
  analysis: PipelineAnalysis;
  onReanalyze: (id: string) => Promise<void>;
  onClose: () => void;
}

export function AnalysisDetail({
  analysis,
  onReanalyze,
  onClose,
}: AnalysisDetailProps) {
  const [reanalyzing, setReanalyzing] = useState(false);

  const handleReanalyze = async () => {
    setReanalyzing(true);
    try {
      await onReanalyze(analysis.id);
    } finally {
      setReanalyzing(false);
    }
  };

  const diagnosis = analysis.ai_diagnosis;

  return (
    <div className="animate-fade-in flex h-full flex-col overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-white">
            {analysis.repo}
          </h2>
          <p className="text-sm text-gray-400">{analysis.workflow_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={analysis.run_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-800 px-3 py-1.5 text-xs font-medium text-gray-300 transition-colors hover:border-gray-600 hover:text-white"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            GitHub Run
          </a>
          <button
            onClick={handleReanalyze}
            disabled={reanalyzing}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
              reanalyzing
                ? "cursor-not-allowed border-gray-700 bg-gray-800 text-gray-500"
                : "border-indigo-500/30 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20"
            )}
          >
            <RefreshCw
              className={cn("h-3.5 w-3.5", reanalyzing && "animate-spin")}
            />
            {reanalyzing ? "Analyzing..." : "Reanalyze"}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 transition-colors hover:bg-gray-800 hover:text-gray-300 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="space-y-5">
          {/* Metadata */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MetaItem
              icon={<GitBranch className="h-3.5 w-3.5" />}
              label="Branch"
              value={analysis.branch}
            />
            <MetaItem
              icon={<Hash className="h-3.5 w-3.5" />}
              label="Commit"
              value={analysis.commit_sha.slice(0, 7)}
            />
            <MetaItem
              icon={<Calendar className="h-3.5 w-3.5" />}
              label="Created"
              value={formatDate(analysis.created_at)}
            />
            <MetaItem
              icon={<Calendar className="h-3.5 w-3.5" />}
              label="Updated"
              value={formatDate(analysis.updated_at)}
            />
          </div>

          {/* Confidence Meter */}
          {diagnosis && <ConfidenceMeter confidence={diagnosis.confidence} />}

          {/* Root Cause */}
          {diagnosis && (
            <div className="animate-slide-up">
              <SectionHeader
                icon={<AlertOctagon className="h-4 w-4 text-red-400" />}
                title="Root Cause"
              />
              <div className="mt-2 rounded-lg border border-red-500/20 bg-red-500/5 p-4">
                <p className="text-sm leading-relaxed text-red-300">
                  {diagnosis.root_cause}
                </p>
              </div>
            </div>
          )}

          {/* Explanation */}
          {diagnosis && (
            <div className="animate-slide-up">
              <SectionHeader
                icon={<FileText className="h-4 w-4 text-blue-400" />}
                title="Explanation"
              />
              <div className="mt-2 rounded-lg border border-gray-800 bg-gray-900 p-4">
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
                  {diagnosis.explanation}
                </p>
              </div>
            </div>
          )}

          {/* Suggested Fixes */}
          {diagnosis && diagnosis.suggested_fixes.length > 0 && (
            <div className="animate-slide-up">
              <SectionHeader
                icon={<Lightbulb className="h-4 w-4 text-amber-400" />}
                title="Suggested Fixes"
              />
              <div className="mt-2 space-y-3">
                {diagnosis.suggested_fixes.map((fix, index) => (
                  <div
                    key={index}
                    className="flex gap-3 rounded-lg border border-gray-800 bg-gray-900 p-4"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-400">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <FixContent content={fix} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Failure Logs */}
          {analysis.failure_logs && (
            <div>
              <SectionHeader
                icon={<FileText className="h-4 w-4 text-gray-400" />}
                title="Failure Logs"
              />
              <pre className="code-block mt-2 max-h-64 overflow-auto text-xs">
                {analysis.failure_logs}
              </pre>
            </div>
          )}

          {/* No diagnosis */}
          {!diagnosis && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertOctagon className="mb-3 h-10 w-10 text-gray-600" />
              <p className="text-sm font-medium text-gray-400">
                No AI diagnosis available
              </p>
              <p className="mt-1 text-xs text-gray-600">
                Click "Reanalyze" to generate an AI diagnosis for this run
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
}: {
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2">
      {icon}
      <h3 className="text-sm font-semibold text-gray-200">{title}</h3>
    </div>
  );
}

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900/70 p-2.5">
      <div className="flex items-center gap-1.5 text-gray-500">
        {icon}
        <span className="text-[10px] font-medium uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="mt-1 truncate text-xs font-medium text-gray-300">
        {value}
      </p>
    </div>
  );
}

function FixContent({ content }: { content: string }) {
  // Split content by code blocks (triple backtick blocks)
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const code = part.replace(/```\w*\n?/, "").replace(/\n?```$/, "");
          return (
            <pre key={i} className="code-block text-xs">
              {code}
            </pre>
          );
        }
        if (part.trim()) {
          return (
            <p key={i} className="text-sm leading-relaxed text-gray-300">
              {part}
            </p>
          );
        }
        return null;
      })}
    </div>
  );
}
