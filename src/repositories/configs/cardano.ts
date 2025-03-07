import { DomainRepositoryConfig } from '../types';

/**
 * Configuration for Cardano blockchain repositories.
 *
 * This includes official repositories from Cardano organizations like
 * Input Output Global (IOG), Cardano Foundation, and other important
 * community repositories.
 */
export const cardanoRepositoryConfig: DomainRepositoryConfig = {
  domain: 'cardano',
  repositories: [
    // IOG Core repositories
    {
      owner: 'input-output-hk',
      name: 'cardano-node',
      domain: 'cardano',
      importance: 10,
      isOfficial: true,
      tags: ['node', 'core', 'consensus', 'networking'],
    },
    {
      owner: 'input-output-hk',
      name: 'cardano-ledger',
      domain: 'cardano',
      importance: 10,
      isOfficial: true,
      tags: ['ledger', 'core', 'consensus', 'plutus'],
    },
    {
      owner: 'input-output-hk',
      name: 'ouroboros-network',
      domain: 'cardano',
      importance: 9,
      isOfficial: true,
      tags: ['networking', 'consensus', 'core'],
    },
    {
      owner: 'input-output-hk',
      name: 'cardano-wallet',
      domain: 'cardano',
      importance: 9,
      isOfficial: true,
      tags: ['wallet', 'api'],
    },

    // Cardano Foundation repositories
    {
      owner: 'cardano-foundation',
      name: 'CIPs',
      domain: 'cardano',
      importance: 9,
      isOfficial: true,
      tags: ['standards', 'improvement-proposals', 'documentation'],
    },
    {
      owner: 'cardano-foundation',
      name: 'cardano-token-registry',
      domain: 'cardano',
      importance: 8,
      isOfficial: true,
      tags: ['token-registry', 'metadata'],
    },

    // Smart Contract & Development platforms
    {
      owner: 'input-output-hk',
      name: 'plutus',
      domain: 'cardano',
      importance: 9,
      isOfficial: true,
      tags: ['smart-contracts', 'plutus'],
    },
    {
      owner: 'MeshJS',
      name: 'mesh',
      domain: 'cardano',
      importance: 8,
      isOfficial: false,
      tags: ['development', 'javascript', 'sdk'],
    },
    {
      owner: 'bloxbean',
      name: 'cardano-client-lib',
      domain: 'cardano',
      importance: 7,
      isOfficial: false,
      tags: ['java', 'sdk'],
    },
    {
      owner: 'Emurgo',
      name: 'cardano-serialization-lib',
      domain: 'cardano',
      importance: 8,
      isOfficial: true,
      tags: ['serialization', 'wasm', 'rust'],
    },

    // Explorers and Tools
    {
      owner: 'cardano-foundation',
      name: 'cardano-explorer-app',
      domain: 'cardano',
      importance: 7,
      isOfficial: true,
      tags: ['explorer', 'frontend'],
    },
    {
      owner: 'blockfrost',
      name: 'blockfrost-backend-ryo',
      domain: 'cardano',
      importance: 8,
      isOfficial: false,
      tags: ['api', 'backend', 'indexer'],
    },

    // Documentation
    {
      owner: 'input-output-hk',
      name: 'cardano-documentation',
      domain: 'cardano',
      importance: 8,
      isOfficial: true,
      tags: ['documentation'],
    },
    {
      owner: 'cardano-foundation',
      name: 'developer-portal',
      domain: 'cardano',
      importance: 8,
      isOfficial: true,
      tags: ['documentation', 'developer'],
    },
  ],
};
