import { PromptConfig } from '../types';

export const promptConfig: PromptConfig = {
  version: '1.0.0',
  prompts: {
    // Transaction validation prompt
    validateTransaction: {
      name: 'Validate Transaction',
      file: 'validate-transaction.txt',
      tools: ['validatePlutusScript', 'checkUtxos'],
      knowledge_base: {
        categories: ['smart-contracts', 'transaction-validation'],
        min_relevance: 0.8,
      },
    },
    // Smart contract analysis prompt
    analyzeContract: {
      name: 'Analyze Smart Contract',
      file: 'analyze-contract.txt',
      tools: ['analyzePlutusCode', 'checkVulnerabilities'],
      knowledge_base: {
        categories: ['smart-contracts', 'security-patterns'],
        min_relevance: 0.85,
      },
    },
    // Token policy verification prompt
    verifyTokenPolicy: {
      name: 'Verify Token Policy',
      file: 'verify-token-policy.txt',
      tools: ['validateMonetaryPolicy', 'checkTokenomics'],
      knowledge_base: {
        categories: ['monetary-policy', 'tokenomics'],
        min_relevance: 0.9,
      },
    },
  },
  tool_configurations: {
    validatePlutusScript: {
      timeout_ms: 5000,
      max_script_size_bytes: 1048576, // 1MB
      supported_frameworks: ['plutus-v2'],
    },
    analyzePlutusCode: {
      timeout_ms: 10000,
      cache_duration_seconds: 3600,
    },
    validateMonetaryPolicy: {
      timeout_ms: 3000,
      supported_wallets: ['nami', 'eternl', 'flint'],
    },
  },
  knowledge_base_settings: {
    embedding_model: 'cardano-bert-v1',
    chunk_size: 512,
    chunk_overlap: 50,
    update_frequency_hours: 24,
    cache_settings: {
      max_age_seconds: 86400,
      max_size_mb: 1024,
    },
  },
  security_settings: {
    rate_limits: {
      requests_per_minute: 60,
      tokens_per_day: 100000,
    },
    validation: {
      require_tool_validation: true,
      require_security_review: true,
      max_script_complexity: 8,
    },
  },
  integration: {
    api_version: 'v1',
    base_url: 'http://localhost:3000',
    websocket_url: 'ws://localhost:3001',
    timeout_ms: 30000,
    retry: {
      max_attempts: 3,
      initial_delay_ms: 1000,
      max_delay_ms: 5000,
    },
  },
};
