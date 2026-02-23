export interface RiskCategory {
  name: string;
  score: number;
  weight: number;
  findings: string[];
  impact: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface AnalysisResult {
  overallScore: number;
  confidence: number;
  categories: RiskCategory[];
  summary: string;
  recommendations: string[];
  metadata?: {
    linesOfCode?: number;
    complexity?: number;
    compilerVersion?: string;
    optimizationEnabled?: boolean;
  };
}

export interface ContractInput {
  code?: string;
  address?: string;
  chain?: string;
}

export interface UserPayload {
  id: string;
  email: string;
  tier: 'FREE' | 'PRO' | 'ENTERPRISE';
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    requestId: string;
    processingTime?: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface ChainConfig {
  id: string;
  name: string;
  rpcUrl: string;
  explorerApiUrl: string;
  explorerApiKey: string;
}

export interface ComparisonResult {
  analysisA: AnalysisResult;
  analysisB: AnalysisResult;
  differences: {
    scoreΔ: number;
    categoryDifferences: Array<{
      category: string;
      scoreΔ: number;
      description: string;
    }>;
    summary: string;
  };
}
