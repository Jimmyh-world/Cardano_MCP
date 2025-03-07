#!/bin/bash

# Get GitHub token from user if not set
if [ -z "$GITHUB_TOKEN" ]; then
  echo "GitHub token not set. You may want to set the GITHUB_TOKEN environment variable."
  echo "Without a token, API rate limits will be restricted."
  echo "You can continue without a token or enter one now:"
  read -p "GitHub token (leave empty to continue without token): " GITHUB_TOKEN
  if [ ! -z "$GITHUB_TOKEN" ]; then
    export GITHUB_TOKEN=$GITHUB_TOKEN
  fi
fi

# Compile the TypeScript code
echo "Compiling TypeScript..."
npm run build

# Create the examples directory in the dist folder if it doesn't exist
mkdir -p dist/examples

# Run the automated pipeline
echo "Running the automated pipeline..."
node dist/examples/automated-pipeline.js

# Display the output directory structure
echo -e "\nOutput Directory Structure:"
find test-output/automated-pipeline -type d | sort

echo -e "\nPipeline completed. Check the test-output/automated-pipeline directory for results."

# Show a preview of the combined index
echo -e "\nPreview of combined index (if available):"
if [ -f test-output/automated-pipeline/combined/content-index.json ]; then
  head -n 20 test-output/automated-pipeline/combined/content-index.json
else
  echo "Combined index not found."
fi 