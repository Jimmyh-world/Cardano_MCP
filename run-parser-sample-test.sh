#!/bin/bash

# Compile the TypeScript code
echo "Compiling TypeScript..."
npm run build

# Create the examples directory in the dist folder if it doesn't exist
mkdir -p dist/examples

# Run the test parser script with sample content
echo "Running the test parser with sample content..."
node dist/examples/test-parser-with-sample.js

# Display the test output directory structure
echo -e "\nOutput Directory Structure:"
find test-output -type f | sort

echo -e "\nTest completed. Check the test-output directory for results."

# Show a preview of one of the generated markdown files
echo -e "\nPreview of a generated markdown file:"
find test-output/documentation -name "*.md" | head -n 1 | xargs cat 