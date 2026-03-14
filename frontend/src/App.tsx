import { useState } from "react";
import {
  GitBranch,
  Zap,
  RefreshCw,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { StatsCards } from "@/components/StatsCards";
import { AnalysisList } from "@/components/AnalysisList";
import { AnalysisDetail } from "@/components/AnalysisDetail";
import { useAnalyses } from "@/hooks/useAnalyses";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | false)[]) {
  return twMerge(clsx(inputs));
}

export default function App() {
  const {
    analyses,
    stats,
    loading,
    error,
    selectedAnalysis,
    selectAnalysis,
    reanalyze,
    sendTestWebhook,
    refresh,
  } = useAnalyses();

  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookMessage, setWebhookMessage] = useState<string | null>(null);

  const handleTestWebhook = async () => {
    setWebhookLoading(true);
    setWebhookMessage(null);
    const id = await sendTestWebhook();
    setWebhookLoading(false);
    if (id) {
      setWebhookMessage(`Test analysis created: ${id.slice(0, 8)}...`);
      setTimeout(() => setWebhookMessage(null), 4000);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-gray-800/80 bg-gray-950/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-screen-2xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-400">
              <GitBranch className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-white">
                CI/CD Pipeline Analyzer
              </h1>
              <p className="text-xs text-gray-500">
                AI-powered failure diagnosis
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Webhook message toast */}
            {webhookMessage && (
              <span className="animate-fade-in rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-400">
                {webhookMessage}
              </span>
            )}

            <button
              onClick={() => refresh()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs font-medium text-gray-300 transition-colors hover:border-gray-600 hover:text-white"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              Refresh
            </button>

            <button
              onClick={handleTestWebhook}
              disabled={webhookLoading}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-all",
                webhookLoading
                  ? "cursor-not-allowed bg-indigo-500/20 text-indigo-400/60"
                  : "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 hover:shadow-indigo-500/30"
              )}
            >
              {webhookLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Zap className="h-3.5 w-3.5" />
              )}
              {webhookLoading ? "Sending..." : "Test Webhook"}
            </button>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="border-b border-red-500/20 bg-red-500/5 px-4 py-3 sm:px-6 lg:px-8">
          <div className="mx-auto flex max-w-screen-2xl items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="mx-auto w-full max-w-screen-2xl flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {/* Stats Cards */}
        <div className="mb-6">
          <StatsCards stats={stats} loading={loading && !stats} />
        </div>

        {/* Two-panel layout */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* Analysis List */}
          <div
            className={cn(
              "lg:col-span-5 xl:col-span-4",
              selectedAnalysis && "hidden lg:block"
            )}
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-300">
                Pipeline Analyses
              </h2>
              <span className="text-xs tabular-nums text-gray-600">
                {analyses.length} results
              </span>
            </div>
            <div className="max-h-[calc(100vh-320px)] overflow-y-auto pr-1">
              <AnalysisList
                analyses={analyses}
                selectedId={selectedAnalysis?.id ?? null}
                onSelect={selectAnalysis}
                loading={loading}
              />
            </div>
          </div>

          {/* Detail Panel */}
          <div
            className={cn(
              "lg:col-span-7 xl:col-span-8",
              !selectedAnalysis && "hidden lg:block"
            )}
          >
            {selectedAnalysis ? (
              <div className="sticky top-20 max-h-[calc(100vh-200px)]">
                <AnalysisDetail
                  analysis={selectedAnalysis}
                  onReanalyze={reanalyze}
                  onClose={() => selectAnalysis(null)}
                />
              </div>
            ) : (
              <div className="flex h-96 flex-col items-center justify-center rounded-xl border border-dashed border-gray-800 text-center">
                <GitBranch className="mb-3 h-12 w-12 text-gray-800" />
                <p className="text-sm font-medium text-gray-500">
                  Select an analysis to view details
                </p>
                <p className="mt-1 text-xs text-gray-700">
                  Choose a pipeline run from the list to see the AI diagnosis
                </p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-900 py-4 text-center text-xs text-gray-700">
        CI/CD Pipeline Analyzer &mdash; AI-Powered DevOps Intelligence
      </footer>
    </div>
  );
}
