import { PromptConfig } from '../types';

const config: PromptConfig = {
  endpoint: 'http://localhost:3000',
  apiKey: process.env.MCP_API_KEY,
  timeout: 30000,
  prompts: {
    // Transaction validation prompt
    validateTransaction: {
      name: 'validateTransaction',
      file: 'prompts/validate-transaction.md',
      tools: ['validatePlutusScript', 'analyzePlutusCode'],
      knowledge_base: {
        categories: ['smart-contracts', 'validation'],
        min_relevance: 0.8,
      },
    },
    // Wallet integration prompt
    walletIntegration: {
      name: 'walletIntegration',
      file: 'prompts/wallet-integration.md',
      tools: ['validateMonetaryPolicy'],
      knowledge_base: {
        categories: ['wallets', 'integration'],
        min_relevance: 0.7,
      },
    },
  },
  tool_configurations: {
    validatePlutusScript: {
      name: 'validatePlutusScript',
      description: 'Validates Plutus smart contract scripts',
      parameters: {
        timeout_ms: 5000,
        max_script_size_bytes: 1048576,
        supported_frameworks: ['plutus-v1', 'plutus-v2'],
      },
    },
    analyzePlutusCode: {
      name: 'analyzePlutusCode',
      description: 'Analyzes Plutus code for best practices and potential issues',
      parameters: {
        timeout_ms: 10000,
      },
    },
    validateMonetaryPolicy: {
      name: 'validateMonetaryPolicy',
      description: 'Validates monetary policy scripts',
      parameters: {
        timeout_ms: 3000,
        supported_wallets: ['nami', 'eternl', 'flint'],
      },
    },
  },
  security_settings: {
    validation: {
      max_script_complexity: 1000,
      require_tool_validation: true,
      require_security_review: true,
    },
    rate_limits: {
      requests_per_minute: 60,
      tokens_per_day: 100000,
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
