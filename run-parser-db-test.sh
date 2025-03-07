#!/bin/bash

# Compile the TypeScript code
echo "Compiling TypeScript..."
npm run build

# Create the examples directory in the dist folder if it doesn't exist
mkdir -p dist/examples

# Run the test parser script with the local database
echo "Running the test parser with the local database..."
node dist/examples/test-parser-with-db.js

# Display the test output directory structure
echo -e "\nOutput Directory Structure:"
find test-output/results -type f | sort

echo -e "\nTest completed. Check the test-output/results directory for processed data."

# Show a preview of the generated results
echo -e "\nPreview of processed documents:"
head -n 30 test-output/results/hybrid-results.json 