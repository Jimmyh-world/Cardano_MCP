/**
 * Test JavaScript rendering with Puppeteer
 * This helps properly fetch modern web applications
 */
import * as fs from 'fs';
import * as path from 'path';
import * as puppeteer from 'puppeteer';

async function renderWithJavaScript(url: string): Promise<void> {
  console.log(`Testing JavaScript rendering for: ${url}`);

  let browser = null;
  try {
    // Launch a headless browser with additional arguments to prevent keyring prompts
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--password-store=basic', // Use basic password store instead of system keyring
        '--use-mock-keychain', // Use a mock keychain
        '--disable-features=PasswordGeneration', // Disable password generation
        '--disable-features=PasswordManager', // Disable password manager
      ],
    });

    const page = await browser.newPage();

    // Set a realistic viewport
    await page.setViewport({ width: 1280, height: 800 });

    // Set a user agent
    await page.setUserAgent('Cardano-MCP-Scraper/1.0.0 (Puppeteer)');

    // Navigate to the URL and wait for content to load
    console.log(`Navigating to ${url}...`);
    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Wait a bit for any delayed JavaScript
    // Using setTimeout instead of waitForTimeout which has compatibility issues
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Get the rendered HTML
    const renderedHtml = await page.content();
    console.log(`Fetched ${renderedHtml.length} bytes of rendered HTML`);

    // Basic check for HTML structure
    const hasHtmlTag = renderedHtml.includes('<html');
    const hasBodyTag = renderedHtml.includes('<body');
    const hasHeadTag = renderedHtml.includes('<head');

    console.log('HTML structure check:');
    console.log(`- Has <html> tag: ${hasHtmlTag}`);
    console.log(`- Has <head> tag: ${hasHeadTag}`);
    console.log(`- Has <body> tag: ${hasBodyTag}`);

    // Check for common content markers
    const hasH1Tag = renderedHtml.includes('<h1');
    const hasMainTag = renderedHtml.includes('<main');
    const hasArticleTag = renderedHtml.includes('<article');

    console.log('Content markers check:');
    console.log(`- Has <h1> tags: ${hasH1Tag}`);
    console.log(`- Has <main> tag: ${hasMainTag}`);
    console.log(`- Has <article> tag: ${hasArticleTag}`);

    // Save the rendered HTML for inspection
    const outputDir = path.join(process.cwd(), 'test-output/scraper-tests');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = new URL(url).hostname.replace(/\./g, '_');
    fs.writeFileSync(path.join(outputDir, `${filename}_rendered.html`), renderedHtml);

    console.log(`Saved rendered HTML to ${filename}_rendered.html`);

    // Extract text only (for comparison)
    const textOnly = renderedHtml
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    console.log(`First 100 characters of rendered text: ${textOnly.substring(0, 100)}...`);

    // Take a screenshot
    await page.screenshot({
      path: path.join(outputDir, `${filename}_screenshot.png`),
      fullPage: true,
    });

    console.log(`Saved screenshot to ${filename}_screenshot.png`);
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`Error rendering ${url}:`, error.message);
    } else {
      console.error(`Unknown error rendering ${url}`);
    }
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Main execution
async function main() {
  // List of URLs to test
  const urls = [
    'https://www.geniusyield.co/',
    'https://docs.geniusyield.co/',
    'https://docs.gomaestro.org/',
    'https://docs.cardano.org/',
  ];

  for (const url of urls) {
    await renderWithJavaScript(url);
    console.log('\n' + '-'.repeat(80) + '\n');
  }
}

// Execute the main function
main().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
