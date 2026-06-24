import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000";

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export interface DocumentInfo {
  name: string;
  size: number;
  path: string;
  status: string;
}


export interface Source {
  file: string;
  chunk?: number;
  score?: number;
  preview: string;
}


export interface LessonsResponse {
  analysis: string;
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

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  metadata?: Record<string, any>;
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

export const api = {
  uploadDocument: async (file: File): Promise<{ status: string; chunks: number; entities: string[] }> => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  },

  getDocuments: async (): Promise<DocumentInfo[]> => {
    const response = await client.get<DocumentInfo[]>("/documents");
    return response.data;
  },

  askCopilot: async (question: string): Promise<ChatResponse> => {
    const response = await client.post<ChatResponse>("/chat", { question });
    return response.data;
  },

  runComplianceCheck: async (documentText: string): Promise<ComplianceResponse> => {
    const response = await client.post<ComplianceResponse>("/compliance", {
      document_text: documentText,
    });
    return response.data;
  },

  runRCA: async (equipment: string, symptoms: string): Promise<RCAResponse> => {
    const response = await client.post<RCAResponse>("/rca", { equipment, symptoms });
    return response.data;
  },

  getGraphData: async (): Promise<GraphData> => {
    const response = await client.get<GraphData>("/graph");
    return response.data;
  },

  getEquipment: async (): Promise<string[]> => {
    const response = await client.get<string[]>("/equipment");
    return response.data;
  },

 runLessons: async (query: string): Promise<LessonsResponse> => {
  const response = await client.post(
    "/lessons",
    {
      query: query
    }
  );

  return response.data;
},
};
