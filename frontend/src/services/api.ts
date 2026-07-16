import axios from "axios";

const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000"
).replace(/\/+$/, "");

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DocumentInfo {
  name: string;
  size: number;
  path: string;
  status: string;
}

export interface Source {
  file: string;
  chunk: number;
  confidence: number;   // 0–100 similarity score
  preview: string;
}

export interface ChatResponse {
  answer: string;
  sources: Source[];
}

export interface ComplianceResponse {
  analysis: string;
}

export interface RCAResponse {
  analysis: string;
}

export interface LessonsResponse {
  analysis: string;
}
export interface CrossReferenceResponse {
  answer: string;
  latency: number;
  documents: string[];
  sources: {
    file: string;
    chunks: number;
  }[];
}
export interface GraphNode {
  id: string;
  label: string;
  type: string;
  metadata?: Record<string, unknown>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label: string;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface SystemStats {
  documents: number;
  chunks: number;
  equipment: number;
}

export interface UploadResult {
  status: string;
  filename: string;
  chunks: number;
  entities: Record<string, string[]>;
}

export interface ActivityEvent {
  type: string;
  filename?: string;
  size_kb?: number;
  chunks?: number;
  message?: string;
  timestamp: number;
}
export interface MaintenanceScheduleResponse {
  equipment: string;
  horizon: string;
  schedule: string;
  latency: number;
  sources: string[];
}
// ─── API client ─────────────────────────────────────────────────────────────

export const api = {
  maintenanceSchedule: async (
  equipment: string,
  horizon: string
): Promise<MaintenanceScheduleResponse> => {

  const response =
    await client.post<MaintenanceScheduleResponse>(
      "/maintenance-schedule",
      {
        equipment,
        horizon,
      }
    );

  return response.data;
},
  // Cross Document Comparison
  crossReference: async (
  question: string,
  docA: string,
  docB: string
): Promise<CrossReferenceResponse> => {

  const response = await client.post<CrossReferenceResponse>(
    "/cross-reference",
    {
      question,
      doc_a: docA,
      doc_b: docB,
    }
  );

  return response.data;
},
  // Documents
  uploadDocument: async (file: File): Promise<UploadResult> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await client.post<UploadResult>(
  "/upload",
  formData,
  {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  }
);

return response.data;
  },

  getDocuments: async (): Promise<DocumentInfo[]> => {
    const response = await client.get<DocumentInfo[]>("/documents");
    return response.data;
  },

  deleteDocument: async (filename: string): Promise<{ status: string; chunks_removed: number }> => {
    const response = await client.delete(`/documents/${encodeURIComponent(filename)}`);
    return response.data;
  },

  extractDocumentText: async (filename: string): Promise<{ filename: string; text: string }> => {
    const response = await client.get<{ filename: string; text: string }>(`/extract-text/${encodeURIComponent(filename)}`);
    return response.data;
  },

  // Copilot
  askCopilot: async (question: string, sourceFilter?: string): Promise<ChatResponse> => {
    const response = await client.post<ChatResponse>("/chat", {
      question,
      source_filter: sourceFilter ?? null,
    });
    return response.data;
  },

  // Compliance
  runComplianceCheck: async (documentText: string): Promise<ComplianceResponse> => {
    const response = await client.post<ComplianceResponse>("/compliance", {
      document_text: documentText,
    });
    return response.data;
  },

  // RCA
  runRCA: async (equipment: string, symptoms: string): Promise<RCAResponse> => {
    const response = await client.post<RCAResponse>("/rca", { equipment, symptoms });
    return response.data;
  },

  // Lessons Learned
  runLessons: async (query: string): Promise<LessonsResponse> => {
    const response = await client.post<LessonsResponse>("/lessons", { query });
    return response.data;
  },

  // Graph
  getGraphData: async (): Promise<GraphData> => {
    const response = await client.get<GraphData>("/graph");
    return response.data;
  },

  getEquipment: async (): Promise<string[]> => {
    const response = await client.get<string[]>("/equipment");
    return response.data;
  },

  // Stats
  getStats: async (): Promise<SystemStats> => {
    const response = await client.get<SystemStats>("/stats");
    return response.data;
  },

  // Activity
  getActivity: async (): Promise<ActivityEvent[]> => {
    const response = await client.get<ActivityEvent[]>("/activity");
    return response.data;
  },
};
