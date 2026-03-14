import { useState, useEffect, useCallback, useRef } from "react";
import type { PipelineAnalysis, AnalysisStats, AnalysisFilters } from "@/types";
import { api } from "@/lib/api";

const POLL_INTERVAL = 15_000;

interface UseAnalysesReturn {
  analyses: PipelineAnalysis[];
  stats: AnalysisStats | null;
  loading: boolean;
  error: string | null;
  selectedAnalysis: PipelineAnalysis | null;
  selectAnalysis: (analysis: PipelineAnalysis | null) => void;
  reanalyze: (id: string) => Promise<void>;
  sendTestWebhook: () => Promise<string | null>;
  refresh: () => Promise<void>;
  filters: AnalysisFilters;
  setFilters: (filters: AnalysisFilters) => void;
}

export function useAnalyses(): UseAnalysesReturn {
  const [analyses, setAnalyses] = useState<PipelineAnalysis[]>([]);
  const [stats, setStats] = useState<AnalysisStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAnalysis, setSelectedAnalysis] =
    useState<PipelineAnalysis | null>(null);
  const [filters, setFilters] = useState<AnalysisFilters>({ limit: 50 });
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [analysesData, statsData] = await Promise.all([
        api.getAnalyses(filters),
        api.getStats(),
      ]);
      setAnalyses(analysesData);
      setStats(statsData);
      setError(null);

      // Update selected analysis if it exists in new data
      if (selectedAnalysis) {
        const updated = analysesData.find((a) => a.id === selectedAnalysis.id);
        if (updated) setSelectedAnalysis(updated);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch data";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [filters, selectedAnalysis]);

  const refresh = useCallback(async () => {
    setLoading(true);
    await fetchData();
  }, [fetchData]);

  const reanalyze = useCallback(
    async (id: string) => {
      try {
        const updated = await api.reanalyze(id);
        setAnalyses((prev) =>
          prev.map((a) => (a.id === id ? updated : a))
        );
        if (selectedAnalysis?.id === id) {
          setSelectedAnalysis(updated);
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Reanalysis failed";
        setError(message);
      }
    },
    [selectedAnalysis]
  );

  const sendTestWebhook = useCallback(async (): Promise<string | null> => {
    try {
      const result = await api.sendTestWebhook();
      // Refresh data after webhook
      setTimeout(() => fetchData(), 1500);
      return result.analysis_id;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Test webhook failed";
      setError(message);
      return null;
    }
  }, [fetchData]);

  const selectAnalysis = useCallback(
    (analysis: PipelineAnalysis | null) => {
      setSelectedAnalysis(analysis);
    },
    []
  );

  // Initial fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Polling
  useEffect(() => {
    pollRef.current = setInterval(fetchData, POLL_INTERVAL);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchData]);

  return {
    analyses,
    stats,
    loading,
    error,
    selectedAnalysis,
    selectAnalysis,
    reanalyze,
    sendTestWebhook,
    refresh,
    filters,
    setFilters,
  };
}
