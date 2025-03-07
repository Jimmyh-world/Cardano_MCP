/**
 * Test script for the GeniusYield adapter
 *
 * This script demonstrates how to use the GeniusYield adapter to fetch
 * and process content from the GeniusYield website using a step-down approach.
 */

import fs from 'fs';
import path from 'path';
import { GeniusYieldAdapter } from '../adapters/GeniusYieldAdapter';
import { SiteContent } from '../adapters/interfaces/SiteAdapter';
import { ExtractedSection } from '../knowledge/processors/SectionExtractor';

// Base URLs to explore
const BASE_URLS = {
  main: 'https://www.geniusyield.co/',
  docs: 'https://docs.geniusyield.co/',
};

/**
 * Main exploration function using a step-down approach:
 * 1. Start at the home page
 * 2. Discover main sections and navigation
 * 3. Explore each section systematically
 * 4. Find and explore referenced repositories
 */
async function exploreGeniusYield(): Promise<void> {
  console.log('====================================');
  console.log('GeniusYield Adapter - Site Exploration');
  console.log('====================================\n');

  const outputDir = path.join(process.cwd(), 'test-output/genius-yield');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Create adapter instance for exploration
  const adapter = new GeniusYieldAdapter({
    useJsRendering: false, // Start with HTTP for faster initial exploration
    timeout: 30000,
    userAgent: 'Cardano-MCP-Scraper/1.0.0',
  });

  // Step 1: Explore main website with limited depth to discover structure
  console.log(`\n--- Exploring main website structure ---\n`);
  try {
    const mainSiteResult = await adapter.exploreSite(BASE_URLS.main, 2, true);

    // Save the content tree to a file
    fs.writeFileSync(
      path.join(outputDir, 'main_site_structure.json'),
      JSON.stringify(mainSiteResult.contentTree, null, 2),
    );

    console.log(`Discovered ${mainSiteResult.allPages.length} pages on main site`);
    console.log(`Found ${mainSiteResult.repositories.length} repository references`);

    // Save list of all discovered pages
    fs.writeFileSync(
      path.join(outputDir, 'main_site_pages.json'),
      JSON.stringify(mainSiteResult.allPages, null, 2),
    );

    // Step 2: Explore documentation site if it exists
    if (mainSiteResult.allPages.some((url) => url.includes('docs.geniusyield.co'))) {
      console.log(`\n--- Exploring documentation website ---\n`);

      const docsAdapter = new GeniusYieldAdapter({
        useJsRendering: true, // Use JavaScript rendering for docs
        timeout: 60000, // Longer timeout for docs
        userAgent: 'Cardano-MCP-Scraper/1.0.0 (Puppeteer)',
      });

      try {
        const docsSiteResult = await docsAdapter.exploreSite(BASE_URLS.docs, 3, true);

        // Save the content tree to a file
        fs.writeFileSync(
          path.join(outputDir, 'docs_site_structure.json'),
          JSON.stringify(docsSiteResult.contentTree, null, 2),
        );

        console.log(`Discovered ${docsSiteResult.allPages.length} pages in documentation`);
        console.log(`Found ${docsSiteResult.repositories.length} repository references in docs`);

        // Save list of all discovered doc pages
        fs.writeFileSync(
          path.join(outputDir, 'docs_site_pages.json'),
          JSON.stringify(docsSiteResult.allPages, null, 2),
        );

        // Merge repositories from both sites
        const allRepositories = [
          ...mainSiteResult.repositories,
          ...docsSiteResult.repositories,
        ].filter((v, i, a) => a.indexOf(v) === i); // Remove duplicates

        fs.writeFileSync(
          path.join(outputDir, 'all_repositories.json'),
          JSON.stringify(allRepositories, null, 2),
        );

        // Step 3: Explore repositories if any were found
        if (allRepositories.length > 0) {
          console.log(`\n--- Exploring ${allRepositories.length} repositories ---\n`);

          // Create a directory for repository data
          const repoDir = path.join(outputDir, 'repositories');
          if (!fs.existsSync(repoDir)) {
            fs.mkdirSync(repoDir, { recursive: true });
          }

          // Explore each repository
          for (const repoUrl of allRepositories) {
            try {
              console.log(`Exploring repository: ${repoUrl}`);
              const repoResult = await adapter.exploreRepository(repoUrl, 2);

              // Create a sanitized filename from the repo URL
              const repoFilename = new URL(repoUrl).pathname.replace(/\//g, '_').slice(1);

              // Save the repository structure
              fs.writeFileSync(
                path.join(repoDir, `${repoFilename}_structure.json`),
                JSON.stringify(repoResult.structure, null, 2),
              );

              // Save the file list
              fs.writeFileSync(
                path.join(repoDir, `${repoFilename}_files.json`),
                JSON.stringify(repoResult.files, null, 2),
              );

              console.log(`Found ${repoResult.files.length} files in repository ${repoUrl}`);
            } catch (error) {
              console.error(`Error exploring repository ${repoUrl}:`, error);
            }
          }
        }
      } catch (error) {
        console.error('Error exploring documentation site:', error);
      }
    }

    // Step 4: Select key pages for detailed content extraction
    console.log(`\n--- Extracting detailed content from key pages ---\n`);

    // Combine all discovered pages
    const allPages = [
      ...mainSiteResult.allPages,
      ...(mainSiteResult.allPages.some((url) => url.includes('docs.geniusyield.co'))
        ? []
        : [BASE_URLS.docs]),
    ];

    // Create a directory for detailed content
    const contentDir = path.join(outputDir, 'content');
    if (!fs.existsSync(contentDir)) {
      fs.mkdirSync(contentDir, { recursive: true });
    }

    // Define key page patterns to prioritize
    const keyPagePatterns = [
      '/docs/',
      '/developers/',
      '/api/',
      '/guide/',
      '/getting-started/',
      '/tutorial/',
      '/sdk/',
      '/examples/',
      '/faq/',
    ];

    // Filter for key pages based on patterns
    const keyPages = allPages.filter((url) => {
      const urlObj = new URL(url);
      return keyPagePatterns.some((pattern) => urlObj.pathname.includes(pattern));
    });

    // If no key pages found based on patterns, use the base URLs
    if (keyPages.length === 0) {
      keyPages.push(...Object.values(BASE_URLS));
    }

    console.log(`Selected ${keyPages.length} key pages for detailed extraction`);

    // Extract detailed content from each key page
    for (const url of keyPages) {
      try {
        console.log(`\nExtracting detailed content from: ${url}`);

        // Use JavaScript rendering for content extraction
        const jsAdapter = new GeniusYieldAdapter({
          useJsRendering: true,
          timeout: 60000,
        });

        const content = await jsAdapter.fetchContent(url);

        // Generate a filename from URL
        const filename =
          new URL(url).hostname.replace(/\./g, '_') + new URL(url).pathname.replace(/\//g, '_');

        // Save the content
        await saveContent(url, content, filename, contentDir);
      } catch (error) {
        console.error(`Error extracting content from ${url}:`, error);
      }
    }
  } catch (error) {
    console.error('Error during site exploration:', error);
  }

  console.log('\n====================================');
  console.log('Exploration completed');
  console.log('====================================');
}

/**
 * Saves the extracted content to various file formats
 * @param url The URL of the content source
 * @param content The extracted site content
 * @param filename The base filename to use for saving
 * @param outputDir The output directory
 */
async function saveContent(
  url: string,
  content: SiteContent,
  filename: string,
  outputDir: string,
): Promise<void> {
  // Save the raw HTML
  fs.writeFileSync(path.join(outputDir, `${filename}_raw.html`), content.rawHtml);

  // Save the metadata
  fs.writeFileSync(
    path.join(outputDir, `${filename}_metadata.json`),
    JSON.stringify(content.metadata, null, 2),
  );

  // Save the extracted sections
  fs.writeFileSync(
    path.join(outputDir, `${filename}_sections.json`),
    JSON.stringify(content.sections, null, 2),
  );

  // Create markdown from sections
  const markdown = content.sections
    .map((section: ExtractedSection) => {
      const heading = '#'.repeat(section.level);
      const codeBlocks = section.codeBlocks
        .map((code: string) => `\`\`\`\n${code}\n\`\`\``)
        .join('\n\n');

      return `${heading} ${section.title}\n\n${section.content}\n\n${codeBlocks}`;
    })
    .join('\n\n---\n\n');

  // Save the markdown
  fs.writeFileSync(path.join(outputDir, `${filename}_content.md`), markdown);

  // Log some basic stats
  console.log(`Content Statistics for ${url}:`);
  console.log(`- Title: ${content.metadata.title}`);
  console.log(`- Sections: ${content.sections.length}`);
  console.log(
    `- Code Blocks: ${content.sections.reduce((sum: number, s: ExtractedSection) => sum + s.codeBlocks.length, 0)}`,
  );
  console.log(`- Tags: ${content.metadata.tags?.join(', ') || 'None'}`);

  // Save each section as markdown
  if (content.sections && content.sections.length > 0) {
    const sectionsDir = path.join(outputDir, `${filename}-sections`);
    fs.mkdirSync(sectionsDir, { recursive: true });

    // Save sections
    content.sections.forEach((section, index) => {
      const sectionFilename = section.title
        ? section.title.toLowerCase().replace(/[^a-z0-9]/g, '-')
        : `section-${index}`;

      // Save the section content as markdown
      fs.writeFileSync(
        path.join(sectionsDir, `${sectionFilename}.md`),
        `# ${section.title}\n\n${section.content}`,
      );

      // Save code blocks separately if they exist
      if (section.codeBlocks && section.codeBlocks.length > 0) {
        const codeDir = path.join(sectionsDir, 'code');
        fs.mkdirSync(codeDir, { recursive: true });

        // Process code blocks based on their type:
        // If it's an array of strings, treat each string as code content with unknown language
        // If it's an array of objects with language and content, use those fields directly
        if (typeof section.codeBlocks[0] === 'string') {
          // It's an array of strings
          (section.codeBlocks as string[]).forEach((codeContent, codeIndex) => {
            fs.writeFileSync(
              path.join(codeDir, `${filename}-section-${index}-code-${codeIndex}.txt`),
              codeContent,
            );
          });
        } else {
          // It's an array of objects with language and content
          try {
            // First convert to unknown, then to the target type to avoid direct conversion error
            const codeBlocksAsObjects = section.codeBlocks as unknown as Array<{
              language: string;
              content: string;
            }>;

            codeBlocksAsObjects.forEach((codeBlock, codeIndex) => {
              const extension = codeBlock.language || 'txt';
              fs.writeFileSync(
                path.join(codeDir, `${filename}-section-${index}-code-${codeIndex}.${extension}`),
                codeBlock.content,
              );
            });
          } catch (error) {
            console.error('Error processing code blocks:', error);
            console.log('Code blocks type:', typeof section.codeBlocks[0], section.codeBlocks[0]);
          }
        }
      }
    });
  }
}

// Run the exploration
exploreGeniusYield().catch((error) => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
