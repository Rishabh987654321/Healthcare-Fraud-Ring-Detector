export interface SearchResult {
  id: string;
  type: 'provider' | 'patient';
  name: string;
  specialty?: string;
  npi?: string;
  dob?: string;
}

export interface SearchResponse {
  results: SearchResult[];
}

export interface AddressInfo {
  line1: string;
  city: string;
  state: string;
  zip: string;
}

export interface PhoneInfo {
  number: string;
}

export interface ClaimItem {
  id: string;
  date: string;
  amount: number;
  status: string;
  procedureCode: string;
  procedureDescription: string;
}

export interface EntityDetail {
  id: string;
  type: 'provider' | 'patient';
  name: string;
  specialty?: string;
  npi?: string;
  dob?: string;
  address?: AddressInfo | null;
  phone?: PhoneInfo | null;
  claims: ClaimItem[];
}

export interface NetworkNode {
  id: string;
  label: string;
  type: 'provider' | 'patient' | 'address' | 'phone' | 'procedure' | 'claim' | 'unknown';
  flagged?: boolean;
  x?: number;
  y?: number;
}

export interface NetworkEdge {
  source: string;
  target: string;
  type: string;
}

export interface NetworkGraphData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

export interface SharedNode {
  type: string;
  id: string;
  label: string;
}

export interface ProcedureInfo {
  code: string;
  description: string;
}

export interface RingProvider {
  id: string;
  name: string;
  claimCount?: number;
  specialtyAvg?: number;
}

export interface FraudRing {
  id: string;
  kind: 'shared_address_procedure' | 'billing_outlier' | string;
  sharedNode: SharedNode;
  procedure: ProcedureInfo;
  providers: RingProvider[];
  patientCount?: number;
  severity: 'high' | 'medium' | 'low';
}

export interface FraudRingsResponse {
  rings: FraudRing[];
}
