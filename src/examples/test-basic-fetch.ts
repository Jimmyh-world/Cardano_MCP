/**
 * Simple test to fetch a web page and check if it contains valid HTML
 * This helps identify if we need JavaScript rendering
 */
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

async function testBasicFetch(url: string): Promise<void> {
  console.log(`Testing basic fetch for: ${url}`);

  try {
    // Make a standard HTTP request
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Cardano-MCP-Scraper/1.0.0',
      },
      timeout: 30000,
    });

    const html = response.data;
    console.log(`Fetched ${html.length} bytes`);

    // Basic check for HTML structure
    const hasHtmlTag = html.includes('<html');
    const hasBodyTag = html.includes('<body');
    const hasHeadTag = html.includes('<head');

    console.log('HTML structure check:');
    console.log(`- Has <html> tag: ${hasHtmlTag}`);
    console.log(`- Has <head> tag: ${hasHeadTag}`);
    console.log(`- Has <body> tag: ${hasBodyTag}`);

    // Check for common content markers
    const hasH1Tag = html.includes('<h1');
    const hasMainTag = html.includes('<main');
    const hasArticleTag = html.includes('<article');

    console.log('Content markers check:');
    console.log(`- Has <h1> tags: ${hasH1Tag}`);
    console.log(`- Has <main> tag: ${hasMainTag}`);
    console.log(`- Has <article> tag: ${hasArticleTag}`);

    // Check for JavaScript loading indicators
    const needsJS =
      html.includes('data-reactroot') ||
      html.includes('id="root"') ||
      html.includes('id="app"') ||
      html.includes('ng-app');

    console.log(`Likely requires JavaScript rendering: ${needsJS}`);

    // Save the HTML for inspection
    const outputDir = path.join(__dirname, '../../test-output/scraper-tests');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = new URL(url).hostname.replace(/\./g, '_');
    fs.writeFileSync(path.join(outputDir, `${filename}_basic.html`), html);

    console.log(`Saved HTML to ${filename}_basic.html`);

    // Extract text only (for comparison later)
    const textOnly = html
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log(`First 100 characters of text: ${textOnly.substring(0, 100)}...`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`Error fetching ${url}:`, error.message);
    } else {
      console.error(`Unknown error fetching ${url}`);
    }
  }
}

// Test with Genius Yield and a few other sites for comparison
async function runTests(): Promise<void> {
  const urls = [
    'https://www.geniusyield.co/',
    'https://docs.geniusyield.co/',
    'https://docs.gomaestro.org/', // Failed in previous tests
    'https://docs.cardano.org/', // Succeeded in previous tests
  ];

  for (const url of urls) {
    await testBasicFetch(url);
    console.log('-'.repeat(80));
  }
}

// Run the tests
runTests().catch((error: unknown) => {
  if (error instanceof Error) {
    console.error('Test failed:', error.message);
  } else {
    console.error('Unknown error occurred during tests');
  }
});
