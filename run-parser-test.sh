#!/bin/bash

# Compile the TypeScript code
echo "Compiling TypeScript..."
npm run build

# Create the examples directory in the dist folder if it doesn't exist
mkdir -p dist/examples

# Run the test parser script
echo "Running the test parser..."
node dist/examples/test-parser.js

# Display the test output directory structure
echo "Output Directory Structure:"
find test-output -type f | sort

echo "Test completed. Check the test-output directory for results."

# Show a preview of the Blockfrost API docs
echo "Preview of Blockfrost API docs (first .md file):"
ls test-output/documentation/blockfrost-api-docs/*.md | head -n 1 | xargs cat | head -n 30 