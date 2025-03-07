#!/bin/bash
# run-js-render-test.sh

# Ensure test output directory exists
mkdir -p test-output/scraper-tests

# Install Puppeteer if not already installed
if ! npm list puppeteer > /dev/null 2>&1; then
  echo "Installing Puppeteer..."
  npm install puppeteer
fi

# Compile the TypeScript file with CommonJS module support
echo "Compiling TypeScript..."
npx tsc src/examples/test-js-rendering.ts \
  --outDir dist/examples \
  --target ES2020 \
  --module CommonJS \
  --moduleResolution Node \
  --skipLibCheck \
  --esModuleInterop

# Run the compiled js file with environment variables to prevent keyring access
echo "Running JS render test..."
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
NODE_OPTIONS="--no-warnings" \
node dist/examples/test-js-rendering.js 