const { fetch } = require('undici');
const fs = require('fs');
const path = require('path');

// Configure output
const OUTPUT_DIR = 'data';
const OUTPUT_FILE = 'articles.json';

// New: Multiple fallback sources
const SOURCES = [
  {
    name: "HipHopDX",
    url: "https://hiphopdx.com/feed",
    type: "rss"
  },
  {
    name: "XXL",
    url: "https://www.xxlmag.com/feed",
    type: "rss"
  }
];

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
}

async function scrapeAll() {
  const allArticles = [];
  
  for (const source of SOURCES) {
    try {
      console.log(`Scraping ${source.name}...`);
      const xml = await fetchWithRetry(source.url);
      
      const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
      items.forEach(item => {
        allArticles.push({
          title: (item.match(/<title>([\s\S]*?)<\/title>/) || [,'No title'])[1].trim(),
          link: (item.match(/<link>([\s\S]*?)<\/link>/) || [,'#'])[1].trim(),
          date: (item.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [,new Date().toISOString()])[1],
          source: source.name
        });
      });
      
    } catch (error) {
      console.error(`Failed to scrape ${source.name}:`, error.message);
    }
  }
  
  if (allArticles.length === 0) {
    // Fallback: Create test data if all sources fail
    console.warn('No articles found - using test data');
    return [{
      title: "TEST: Scraper is working but no live articles found",
      link: "https://example.com",
      date: new Date().toISOString(),
      source: "System"
    }];
  }
  
  return allArticles;
}

async function saveToFile(articles) {
  try {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    const outputPath = path.join(OUTPUT_DIR, OUTPUT_FILE);
    fs.writeFileSync(outputPath, JSON.stringify(articles, null, 2));
    console.log(`✅ Saved ${articles.length} articles to ${outputPath}`);
    
  } catch (error) {
    console.error('File save failed:', error);
    process.exit(1);
  }
}

(async () => {
  try {
    const articles = await scrapeAll();
    await saveToFile(articles);
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();
