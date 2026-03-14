export interface AIDiagnosis {
  root_cause: string;
  explanation: string;
  suggested_fixes: string[];
  confidence: number;
}

export interface PipelineAnalysis {
  id: string;
  repo: string;
  workflow_name: string;
  run_id: number;
  run_url: string;
  branch: string;
  commit_sha: string;
  status: "failure" | "success" | "cancelled" | "timed_out";
  failure_logs: string;
  ai_diagnosis: AIDiagnosis | null;
  created_at: string;
  updated_at: string;
}

export interface AnalysisStats {
  total_analyses: number;
  total_failures: number;
  avg_confidence: number;
  recent_count: number;
}

export interface AnalysisFilters {
  repo?: string;
  status?: string;
  branch?: string;
  limit?: number;
  offset?: number;
}

export interface ApiError {
  detail: string;
}
