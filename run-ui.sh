#!/bin/bash

# Check for GITHUB_TOKEN
if [ -z "$GITHUB_TOKEN" ]; then
  echo "WARNING: GITHUB_TOKEN environment variable not set."
  echo "GitHub repository processing will have limited API access."
  echo "Consider setting this variable for better performance."
  echo 
fi

# Compile TypeScript code
echo "Compiling TypeScript code..."
npm run build

# Create necessary directories
mkdir -p test-output/user-content
mkdir -p dist/examples

# Start the server
echo "Starting Cardano MCP UI server..."
node dist/server.js 