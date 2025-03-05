import { ToolConfiguration } from '../types';

export interface ToolResult<T = any> {
  success: boolean;
  data: T;
  errors?: string[];
  warnings?: string[];
  metrics?: {
    execution_time_ms: number;
    memory_usage_bytes?: number;
    [key: string]: any;
  };
}

export interface PlutusScript {
  type: 'plutus_v1' | 'plutus_v2';
  code: string;
  hash?: string;
}

export interface TransactionData {
  inputs: {
    txHash: string;
    index: number;
    amount: bigint;
    address: string;
    datumHash?: string;
    datum?: any;
  }[];
  outputs: {
    address: string;
    amount: bigint;
    datum?: any;
  }[];
  fee: bigint;
  ttl?: number;
  validityStart?: number;
  metadata?: Record<string, any>;
  scripts?: PlutusScript[];
}

export interface TokenPolicy {
  policyId: string;
  script: PlutusScript;
  metadata?: {
    name: string;
    description: string;
    ticker?: string;
    url?: string;
    decimals?: number;
    [key: string]: any;
  };
  parameters?: {
    maxSupply?: bigint;
    mintingEndTime?: number;
    [key: string]: any;
  };
}

export interface ContractAnalysis {
  complexity: number;
  resourceUsage: {
    memory: number;
    cpu: number;
    size: number;
  };
  vulnerabilities: {
    severity: 'high' | 'medium' | 'low';
    type: string;
    description: string;
    location: string;
  }[];
}

export interface TokenomicsAnalysis {
  distribution: {
    fairness: number;
    concentration: number;
    initialAllocation: Record<string, number>;
  };
  economics: {
    inflation: number;
    velocity: number;
    sustainability: number;
  };
  governance: {
    decentralization: number;
    votingPower: Record<string, number>;
  };
}

export interface CardanoTool<T = any, R = any> {
  name: string;
  description: string;
  version: string;
  config: ToolConfiguration;
  execute: (input: T) => Promise<ToolResult<R>>;
  validate?: (input: T) => Promise<boolean>;
  cleanup?: () => Promise<void>;
}
