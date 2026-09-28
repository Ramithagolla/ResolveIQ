const API = import.meta.env.VITE_API_BASE_URL || "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = body.detail || JSON.stringify(body);
    } catch {
      /* ignore */
    }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }
  return res.json();
}

export type MemoryVersion = {
  version: number;
  hypothesis_or_root_cause: string;
  resolution?: string | null;
  status: string;
  corrected_by?: string | null;
  created_at: string;
};

export type Incident = {
  public_id: string;
  organization?: string | null;
  title?: string | null;
  date?: string | null;
  service: string;
  severity: string;
  environment: string;
  deployment: string;
  error: string;
  logs: string;
  status: string;
  symptoms: string[];
  impact?: string | null;
  analysis: Analysis | null;
  predicted_root_cause: string | null;
  actual_root_cause: string | null;
  actual_resolution: string | null;
  resolution_notes: string | null;
  lessons_learned?: string | null;
  source_url?: string | null;
  source_title?: string | null;
  is_held_out: boolean;
  correction_history: MemoryVersion[];
  outcome: string | null;
  resolution_time_minutes: number | null;
  memory_retained: boolean;
  is_seed: boolean;
  timeline: { at: string; label: string }[];
  created_at: string;
  analyzed_at: string | null;
  resolved_at: string | null;
};

export type RecalledMemory = {
  incident_id: string | null;
  organization?: string | null;
  relevance: number;
  relevance_label?: string | null;
  service: string | null;
  root_cause: string | null;
  resolution: string | null;
  outcome: string | null;
  source_url?: string | null;
  source_title?: string | null;
  text: string;
  tags: string[];
  is_corrected?: boolean;
  original_hypothesis?: string | null;
};

export type AnalysisModeResult = {
  likely_root_cause: string;
  confidence: string;
  recommended_investigation: string;
  recommended_resolution: string;
  current_evidence: string[];
  historical_evidence: string[];
  memory_count: number;
};

export type Analysis = {
  likely_root_cause: string;
  confidence: string;
  recommended_investigation: string;
  recommended_resolution: string;
  current_evidence: string[];
  historical_evidence: string[];
  why_this_recommendation: string[];
  recalled_memories: RecalledMemory[];
  memory_count: number;
  memory_available: boolean;
  memory_provider: string;
  memory_error: string | null;
  llm_available: boolean;
  analyzer_mode: string;
  without_memory_summary: string;
  with_memory_summary: string;
  mode_without_memory?: AnalysisModeResult;
  mode_with_memory?: AnalysisModeResult;
  what_memory_contributed?: string[];
};

export type LearnResult = {
  incident_id: string;
  memory_created: boolean;
  memory_provider: string;
  predicted_root_cause: string | null;
  actual_root_cause: string;
  match: boolean;
  pattern: string;
  successful_fix: string;
  memories_before: number;
  memories_after: number;
  new_memory: Record<string, unknown>;
  evolution: {
    before: number;
    after: number;
    pattern: string;
    root_cause: string;
    service: string;
    deployment: string;
    error: string;
  };
};

export type HeldOutEvalItem = {
  incident_id: string;
  organization: string;
  title: string;
  date?: string | null;
  service: string;
  ground_truth_root_cause: string;
  without_memory_prediction: string;
  without_memory_correct: boolean;
  with_memory_prediction: string;
  with_memory_correct: boolean;
  recalled_memories: RecalledMemory[];
  source_url?: string | null;
  source_title?: string | null;
};

export type EvaluationSummary = {
  held_out_count: number;
  without_memory_correct_count: number;
  with_memory_correct_count: number;
  improvement_count: number;
  accuracy_without_memory_percent: number;
  accuracy_with_memory_percent: number;
  disclaimer: string;
  items: HeldOutEvalItem[];
};

export type PublicSourceItem = {
  incident_id: string;
  organization: string;
  title: string;
  date: string;
  service: string;
  symptoms: string[];
  impact: string;
  root_cause: string;
  resolution: string;
  lessons_learned: string;
  source_url: string;
  source_title: string;
};

export type PublicSourcesOut = {
  title: string;
  total_incidents: number;
  total_sources: number;
  disclaimer: string;
  incidents: PublicSourceItem[];
  sources: Array<{ incident_id: string; organization: string; source_title: string; source_url: string }>;
};

export const api = {
  health: () => request<{ memory_provider: string; memory_available: boolean; memory_error: string | null; llm_available: boolean }>("/api/health"),
  stats: () => request<{ active_incidents: number; resolved_incidents: number; organizational_memories: number; recurring_patterns: number; average_resolution_time: number | null; note: string }>("/api/stats"),
  incidents: () => request<Incident[]>("/api/incidents"),
  incident: (id: string) => request<Incident>(`/api/incidents/${id}`),
  createIncident: (body: Record<string, string>) =>
    request<Incident>("/api/incidents", { method: "POST", body: JSON.stringify(body) }),
  analyze: (id: string) =>
    request<{ incident: Incident; analysis: Analysis }>(`/api/incidents/${id}/analyze`, { method: "POST" }),
  correctIncident: (id: string, body: { actual_root_cause: string; actual_resolution: string; engineer_note?: string }) =>
    request<{ incident: Incident; correction: Record<string, unknown> }>(`/api/incidents/${id}/correct`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  resolve: (id: string, body: Record<string, unknown>) =>
    request<{ incident: Incident; learn: LearnResult }>(`/api/incidents/${id}/resolve`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  memories: (q?: string) =>
    request<{ count: number; patterns: number; items: Array<Record<string, unknown>>; note: string }>(
      `/api/memory${q ? `?q=${encodeURIComponent(q)}` : ""}`
    ),
  memory: (id: string) => request<Record<string, unknown>>(`/api/memory/${id}`),
  patterns: () => request<Array<{ name: string; count: number; source: string }>>("/api/patterns"),
  getEvaluation: () => request<EvaluationSummary>("/api/evaluation"),
  getSources: () => request<PublicSourcesOut>("/api/sources"),
  launchDemo: () =>
    request<{
      historical: Incident;
      new_incident: Incident;
      demo_already_active: boolean;
      related: string[];
      steps: string[];
      memory_provider: string;
      memory_available: boolean;
    }>("/api/demo/launch", { method: "POST" }),
  followUp: () => request<Incident>("/api/demo/follow-up", { method: "POST" }),
};
