#!/bin/bash

# Compile the TypeScript code
echo "Compiling TypeScript..."
npm run build

# Create the examples directory in the dist folder if it doesn't exist
mkdir -p dist/examples

# Run the enhanced markdown processor
echo "Running the enhanced markdown processor..."
node dist/examples/enhanced-markdown-processor.js

# Display the test output directory structure
echo -e "\nOutput Directory Structure:"
find test-output/enhanced-results -type f | sort | head -n 20

echo -e "\nProcessing completed. Check the test-output/enhanced-results directory for processed data."

# Show a preview of the generated results
echo -e "\nPreview of enhanced JSON results (first 30 lines of one file):"
find test-output/enhanced-results -name "*.json" | head -n 1 | xargs head -n 30 