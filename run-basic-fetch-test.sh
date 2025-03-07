#!/bin/bash
# run-basic-fetch-test.sh

# Ensure test output directory exists
mkdir -p test-output/scraper-tests

# Install axios if not already installed
if ! npm list axios >/dev/null 2>&1; then
  echo "Installing axios..."
  npm install axios
fi

# Compile the TypeScript file
echo "Compiling TypeScript..."
npx tsc src/examples/test-basic-fetch.ts --outDir dist/examples

# Run the test
echo "Running basic fetch test..."
node dist/examples/test-basic-fetch.js 