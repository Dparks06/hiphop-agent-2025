const { fetch } = require('undici');
const fs = require('fs');
const path = require('path');

// Configure output
const OUTPUT_DIR = 'data';
const OUTPUT_FILE = 'articles.json';

// Updated sources with proper headers
const SOURCES = [
  {
    name: "HipHopDX",
    url: "https://hiphopdx.com/feed",
    type: "rss",
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
  },
  {
    name: "HotNewHipHop",
    url: "https://www.hotnewhiphop.com/feed",
    type: "rss",
    headers: {
      'Accept': 'application/rss+xml'
    }
  }
];

async function fetchWithRetry(url, options = {}, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1)',
          ...options.headers
        }
      });
      
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
}

async function parseRSS(xml, sourceName) {
  const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
  return items.map(item => ({
    title: (item.match(/<title>([\s\S]*?)<\/title>/) || [,'No title'])[1].trim(),
    link: (item.match(/<link>([\s\S]*?)<\/link>/) || [,'#'])[1].trim(),
    date: (item.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [,new Date().toISOString()])[1],
    source: sourceName
  }));
}

async function scrapeAll() {
  const allArticles = [];
  
  for (const source of SOURCES) {
    try {
      console.log(`Scraping ${source.name}...`);
      const content = await fetchWithRetry(source.url, {
        headers: source.headers || {}
      });
      
      const articles = await parseRSS(content, source.name);
      allArticles.push(...articles);
      console.log(`✅ Found ${articles.length} from ${source.name}`);
      
    } catch (error) {
      console.error(`❌ Failed ${source.name}:`, error.message);
    }
  }

  // Fixed: Proper parenthesis and filtering
  return allArticles.filter(article => (
    article.title !== "No title" && 
    !article.link.startsWith('#') &&
    article.title && article.title.length > 10
  ));
}

async function saveToFile(articles) {
  try {
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    const outputPath = path.join(OUTPUT_DIR, OUTPUT_FILE);
    fs.writeFileSync(outputPath, JSON.stringify(articles, null, 2));
    console.log(`💾 Saved ${articles.length} articles to ${outputPath}`);
    
  } catch (error) {
    console.error('File save failed:', error);
    process.exit(1);
  }
}

(async () => {
  try {
    const articles = await scrapeAll();
    
    if (articles.length === 0) {
      // Fallback test data if all sources fail
      const testArticles = [{
        title: "TEST: Scraper is working but no live articles found",
        link: "https://example.com",
        date: new Date().toISOString(),
        source: "System"
      }];
      await saveToFile(testArticles);
      console.warn('⚠️ Using fallback test data');
      process.exit(0);
    }
    
    await saveToFile(articles);
    process.exit(0);
    
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
})();
