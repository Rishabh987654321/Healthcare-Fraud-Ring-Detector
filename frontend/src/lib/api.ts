import {
  SearchResponse,
  EntityDetail,
  NetworkGraphData,
  FraudRingsResponse,
} from './types';

export interface ApiErrorResponse {
  error: string;
  detail?: string;
  [key: string]: unknown;
}

export class ApiError extends Error {
  status: number;
  data: ApiErrorResponse;

  constructor(status: number, data: ApiErrorResponse) {
    super(data.detail || data.error || `HTTP Error ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl) {
    return envUrl.endsWith('/') ? envUrl.slice(0, -1) : envUrl;
  }
  return 'http://localhost:8000/api';
};

/**
 * Core HTTP GET wrapper reading VITE_API_BASE_URL and handling structured API errors.
 */
export async function apiGet<T>(path: string): Promise<T> {
  const baseUrl = getBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${baseUrl}${cleanPath}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    let errorData: ApiErrorResponse;
    try {
      errorData = await response.json();
    } catch {
      errorData = {
        error: 'http_error',
        detail: `Request failed with status ${response.status} (${response.statusText})`,
      };
    }
    throw new ApiError(response.status, errorData);
  }

  return response.json() as Promise<T>;
}

export async function searchEntities(
  query: string,
  type: 'provider' | 'patient' | 'all' = 'all'
): Promise<SearchResponse> {
  return apiGet<SearchResponse>(`search/?q=${encodeURIComponent(query)}&type=${type}`);
}

export async function getEntityDetail(
  type: 'provider' | 'patient',
  id: string
): Promise<EntityDetail> {
  return apiGet<EntityDetail>(`entities/${type}/${encodeURIComponent(id)}/`);
}

export async function getEntityNetwork(
  type: 'provider' | 'patient',
  id: string,
  depth: number = 2
): Promise<NetworkGraphData> {
  return apiGet<NetworkGraphData>(
    `entities/${type}/${encodeURIComponent(id)}/network/?depth=${depth}`
  );
}

export async function getFraudRings(): Promise<FraudRingsResponse> {
  return apiGet<FraudRingsResponse>('fraud-rings/');
}
