import type {
  PipelineAnalysis,
  AnalysisStats,
  AnalysisFilters,
} from "@/types";

const BASE_URL = "/api";

class ApiClient {
  private async request<T>(
    endpoint: string,
    options?: RequestInit
  ): Promise<T> {
    const url = `${BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        detail: `Request failed with status ${response.status}`,
      }));
      throw new Error(error.detail || "An unexpected error occurred");
    }

    return response.json();
  }

  async getAnalyses(filters?: AnalysisFilters): Promise<PipelineAnalysis[]> {
    const params = new URLSearchParams();
    if (filters?.repo) params.set("repo", filters.repo);
    if (filters?.status) params.set("status", filters.status);
    if (filters?.branch) params.set("branch", filters.branch);
    if (filters?.limit) params.set("limit", String(filters.limit));
    if (filters?.offset) params.set("offset", String(filters.offset));

    const query = params.toString();
    return this.request<PipelineAnalysis[]>(
      `/analyses${query ? `?${query}` : ""}`
    );
  }

  async getAnalysis(id: string): Promise<PipelineAnalysis> {
    return this.request<PipelineAnalysis>(`/analyses/${id}`);
  }

  async getStats(): Promise<AnalysisStats> {
    return this.request<AnalysisStats>("/stats");
  }

  async reanalyze(id: string): Promise<PipelineAnalysis> {
    return this.request<PipelineAnalysis>(`/analyses/${id}/reanalyze`, {
      method: "POST",
    });
  }

  async sendTestWebhook(): Promise<{ message: string; analysis_id: string }> {
    return this.request<{ message: string; analysis_id: string }>(
      "/webhook/test",
      { method: "POST" }
    );
  }
}

export const api = new ApiClient();
