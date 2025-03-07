#!/bin/bash
set -e  # Exit on error

# Ensure test output directory exists
mkdir -p test-output/genius-yield/content
mkdir -p test-output/genius-yield/repositories

# Install puppeteer if not already installed
if ! npm list puppeteer > /dev/null 2>&1; then
  echo "Installing Puppeteer..."
  npm install puppeteer
fi

# Install jsdom if not already installed
if ! npm list jsdom > /dev/null 2>&1; then
  echo "Installing JSDOM..."
  npm install jsdom
fi

# Make sure the knowledge module's ExtractedSection is available
echo "Compiling SectionExtractor prerequisite..."
npx tsc src/knowledge/processors/SectionExtractor.ts \
  --outDir dist/knowledge/processors \
  --target ES2020 \
  --module CommonJS \
  --moduleResolution Node \
  --skipLibCheck \
  --esModuleInterop

# First, make sure all error-related code is compiled
echo "Compiling error utilities..."
npx tsc src/utils/errors/core/app-error.ts \
  src/utils/errors/types/error-codes.ts \
  --outDir dist/utils/errors \
  --target ES2020 \
  --module CommonJS \
  --moduleResolution Node \
  --skipLibCheck \
  --esModuleInterop

# Compile the TypeScript files with more verbose output
echo "Compiling adapter and test files..."
npx tsc src/adapters/interfaces/SiteAdapter.ts \
  src/adapters/GeniusYieldAdapter.ts \
  src/examples/test-genius-yield-adapter.ts \
  --outDir dist \
  --target ES2020 \
  --module CommonJS \
  --moduleResolution Node \
  --skipLibCheck \
  --esModuleInterop \
  --listEmittedFiles

# Verify the file exists
if [ ! -f "dist/examples/test-genius-yield-adapter.js" ]; then
  echo "ERROR: Compilation failed to produce the expected output file."
  echo "Check the TypeScript compilation errors above."
  exit 1
fi

# Run the compiled js file with environment variables to prevent keyring access
echo "Running GeniusYield adapter systematic exploration..."
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
NODE_OPTIONS="--no-warnings --max-old-space-size=4096" \
node dist/examples/test-genius-yield-adapter.js

echo "Exploration complete, check the test-output/genius-yield directory for results"
echo "Summary of files generated:"
find test-output/genius-yield -type f | sort 