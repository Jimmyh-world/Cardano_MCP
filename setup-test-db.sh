#!/bin/bash

# Create a script to set up test directory structure for simulating a database locally

echo "Setting up directory structure for testing..."

# Base directory
BASE_DIR="test-output"
mkdir -p "$BASE_DIR"

# Documentation structure
DOC_DIR="$BASE_DIR/documentation"
mkdir -p "$DOC_DIR"

# Repository structure
REPO_DIR="$BASE_DIR/repositories"
mkdir -p "$REPO_DIR/cardano-node"
mkdir -p "$REPO_DIR/plutus"
mkdir -p "$REPO_DIR/cardano-wallet"

# Metadata structure
META_DIR="$BASE_DIR/metadata"
mkdir -p "$META_DIR"

echo "Creating sample documentation files..."

# Plutus Introduction
cat > "$DOC_DIR/plutus-intro.md" << EOL
# Introduction to Plutus

Plutus is the smart contract platform of the Cardano blockchain. It allows users to write applications that interact with the Cardano blockchain.

## Key Concepts

- **Plutus Core**: The on-chain language
- **Plutus Tx**: The subset of Haskell that compiles to Plutus Core
- **Plutus Application Framework**: The off-chain code that interacts with the blockchain

## Getting Started

To get started with Plutus, you need to set up a development environment. The easiest way is to use the Plutus Playground or Demeter.run.

\`\`\`haskell
module MyContract where

import PlutusTx.Prelude
import Plutus.Contract

myValidator :: Bool
myValidator = True
\`\`\`

---
Source: Cardano Documentation
URL: https://docs.cardano.org/plutus/introduction
ID: doc-plutus-intro
Topics: plutus, smart contracts, cardano, blockchain
Extracted: $(date -Iseconds)
---
EOL

# Stake Delegation Guide
cat > "$DOC_DIR/stake-delegation.md" << EOL
# Stake Delegation in Cardano

Stake delegation is the process by which ADA holders delegate their stake to a stake pool. This allows everyone to participate in the network regardless of technical expertise.

## How Delegation Works

1. Create a stake address
2. Register the stake address on the blockchain
3. Delegate to a stake pool
4. Earn rewards automatically

## Commands

Here's how to delegate using the Cardano CLI:

\`\`\`bash
# Create a stake address
cardano-cli stake-address key-gen \\
  --verification-key-file stake.vkey \\
  --signing-key-file stake.skey

# Register the stake address
cardano-cli stake-address registration-certificate \\
  --stake-verification-key-file stake.vkey \\
  --out-file stake.cert
\`\`\`

---
Source: Cardano Documentation
URL: https://docs.cardano.org/operations/delegate
ID: doc-stake-delegation
Topics: staking, delegation, cardano, ada, rewards
Extracted: $(date -Iseconds)
---
EOL

# Cardano Node Architecture
cat > "$DOC_DIR/node-architecture.md" << EOL
# Cardano Node Architecture

The Cardano Node is the core component of the Cardano network. It maintains a copy of the blockchain and validates transactions.

## Components

- **Consensus Layer**: Implements Ouroboros Praos
- **Ledger Layer**: Implements the ledger rules
- **Network Layer**: Handles peer-to-peer communication

## Deployment Considerations

When deploying a Cardano node, consider:

- Hardware requirements
- Network connectivity
- Security measures

---
Source: Cardano Documentation
URL: https://docs.cardano.org/cardano-components/cardano-node
ID: doc-node-architecture
Topics: cardano, node, architecture, consensus, blockchain
Extracted: $(date -Iseconds)
---
EOL

echo "Creating sample repository files..."

# Cardano Node README
cat > "$REPO_DIR/cardano-node/README.md" << EOL
# Cardano Node

The core component of the Cardano network implementation.

## Build & Run

\`\`\`bash
# Build
cabal build cardano-node

# Run
cabal run cardano-node -- run \\
  --topology path/to/topology.json \\
  --database-path path/to/db \\
  --socket-path path/to/socket \\
  --config path/to/config.json
\`\`\`

## Features

- Implements Ouroboros Praos consensus protocol
- Maintains a copy of the Cardano blockchain
- Validates transactions and blocks
- Connects to the Cardano network

---
Repository: input-output-hk/cardano-node
Branch: master
Last Updated: $(date -Iseconds)
---
EOL

# Cardano Node Setup Guide
cat > "$REPO_DIR/cardano-node/setup-guide.md" << EOL
# Cardano Node Setup Guide

This guide explains how to set up and run a Cardano node.

## Prerequisites

- 8GB RAM minimum (16GB recommended)
- 75GB disk space
- Good network connection
- Linux or macOS (Windows via WSL2)

## Installation Steps

1. Install dependencies
2. Download source code
3. Build the node
4. Configure the node
5. Run the node

## Configuration Example

\`\`\`json
{
  "ApplicationName": "cardano-sl",
  "ApplicationVersion": 1,
  "ByronGenesisFile": "byron-genesis.json",
  "ShelleyGenesisFile": "shelley-genesis.json",
  "RequiresNetworkMagic": "RequiresMagic"
}
\`\`\`

---
Repository: input-output-hk/cardano-node
File: docs/getting-started/install.md
Last Updated: $(date -Iseconds)
---
EOL

# Plutus README
cat > "$REPO_DIR/plutus/README.md" << EOL
# Plutus

Plutus is the smart contract platform for Cardano.

## Components

- Plutus Core: On-chain language
- Plutus Tx: Compiler from Haskell to Plutus Core
- Plutus Application Framework: Off-chain code

## Example Contract

\`\`\`haskell
-- A simple validator script
validateSpend :: Data -> Data -> Data -> ()
validateSpend _ _ _ = ()

validator :: Scripts.Validator
validator = mkValidatorScript $$(PlutusTx.compile [|| validateSpend ||])
\`\`\`

## Documentation

See the Plutus documentation site for more details.

---
Repository: input-output-hk/plutus
Branch: master
Last Updated: $(date -Iseconds)
---
EOL

echo "Creating metadata files..."

# Documentation metadata
cat > "$META_DIR/documentation-metadata.json" << EOL
{
  "timestamp": "$(date -Iseconds)",
  "count": 3,
  "documents": [
    {
      "id": "doc-plutus-intro",
      "title": "Introduction to Plutus",
      "url": "https://docs.cardano.org/plutus/introduction",
      "source": "Cardano Documentation",
      "topics": ["plutus", "smart contracts", "cardano", "blockchain"],
      "lastUpdated": "$(date -Iseconds)",
      "extractedCodeBlocks": 1,
      "estimatedReadingTime": 5
    },
    {
      "id": "doc-stake-delegation",
      "title": "Stake Delegation in Cardano",
      "url": "https://docs.cardano.org/operations/delegate",
      "source": "Cardano Documentation",
      "topics": ["staking", "delegation", "cardano", "ada", "rewards"],
      "lastUpdated": "$(date -Iseconds)",
      "extractedCodeBlocks": 1,
      "estimatedReadingTime": 8
    },
    {
      "id": "doc-node-architecture",
      "title": "Cardano Node Architecture",
      "url": "https://docs.cardano.org/cardano-components/cardano-node",
      "source": "Cardano Documentation",
      "topics": ["cardano", "node", "architecture", "consensus", "blockchain"],
      "lastUpdated": "$(date -Iseconds)",
      "extractedCodeBlocks": 0,
      "estimatedReadingTime": 6
    }
  ]
}
EOL

# Repository metadata
cat > "$META_DIR/repositories-metadata.json" << EOL
{
  "timestamp": "$(date -Iseconds)",
  "count": 2,
  "repositories": [
    {
      "name": "cardano-node",
      "owner": "input-output-hk",
      "url": "https://github.com/input-output-hk/cardano-node",
      "stars": 1320,
      "description": "The core component of the Cardano network implementation",
      "topics": ["cardano", "blockchain", "node", "haskell"],
      "lastUpdated": "$(date -Iseconds)",
      "files": [
        {
          "path": "README.md",
          "lastUpdated": "$(date -Iseconds)",
          "topics": ["cardano", "node", "setup", "installation"]
        },
        {
          "path": "setup-guide.md",
          "lastUpdated": "$(date -Iseconds)",
          "topics": ["guide", "setup", "configuration", "prerequisites"]
        }
      ]
    },
    {
      "name": "plutus",
      "owner": "input-output-hk",
      "url": "https://github.com/input-output-hk/plutus",
      "stars": 1680,
      "description": "The Plutus smart contract platform for Cardano",
      "topics": ["cardano", "plutus", "smart-contracts", "haskell"],
      "lastUpdated": "$(date -Iseconds)",
      "files": [
        {
          "path": "README.md",
          "lastUpdated": "$(date -Iseconds)",
          "topics": ["plutus", "smart-contracts", "example"]
        }
      ]
    }
  ]
}
EOL

# Create JSON structure that combines with Markdown approach
cat > "$META_DIR/hybrid-content.json" << EOL
{
  "timestamp": "$(date -Iseconds)",
  "count": 3,
  "sections": [
    {
      "id": "doc-plutus-intro",
      "content": "# Introduction to Plutus\n\nPlutus is the smart contract platform of the Cardano blockchain. It allows users to write applications that interact with the Cardano blockchain.\n\n## Key Concepts\n\n- **Plutus Core**: The on-chain language\n- **Plutus Tx**: The subset of Haskell that compiles to Plutus Core\n- **Plutus Application Framework**: The off-chain code that interacts with the blockchain",
      "metadata": {
        "source": "Cardano Documentation",
        "url": "https://docs.cardano.org/plutus/introduction",
        "title": "Introduction to Plutus",
        "lastUpdated": "$(date -Iseconds)",
        "topics": ["plutus", "smart contracts", "cardano", "blockchain"],
        "contentType": "markdown",
        "level": 1,
        "extractedCodeBlocks": 1
      },
      "codeBlocks": [
        "module MyContract where\n\nimport PlutusTx.Prelude\nimport Plutus.Contract\n\nmyValidator :: Bool\nmyValidator = True"
      ]
    },
    {
      "id": "doc-stake-delegation",
      "content": "# Stake Delegation in Cardano\n\nStake delegation is the process by which ADA holders delegate their stake to a stake pool. This allows everyone to participate in the network regardless of technical expertise.",
      "metadata": {
        "source": "Cardano Documentation",
        "url": "https://docs.cardano.org/operations/delegate",
        "title": "Stake Delegation in Cardano",
        "lastUpdated": "$(date -Iseconds)",
        "topics": ["staking", "delegation", "cardano", "ada", "rewards"],
        "contentType": "markdown",
        "level": 1,
        "extractedCodeBlocks": 1
      },
      "codeBlocks": [
        "# Create a stake address\ncardano-cli stake-address key-gen \\\n  --verification-key-file stake.vkey \\\n  --signing-key-file stake.skey\n\n# Register the stake address\ncardano-cli stake-address registration-certificate \\\n  --stake-verification-key-file stake.vkey \\\n  --out-file stake.cert"
      ]
    }
  ]
}
EOL

echo "Test database directory structure created successfully!"
echo ""
echo "Structure:"
find "$BASE_DIR" -type f | sort
echo ""
echo "You can now use this structure to test your parser modules." 