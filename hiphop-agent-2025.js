const { fetch } = require('undici');
const fs = require('fs');
const path = require('path');

const OUTPUT_DIR = 'data';
const OUTPUT_FILE = 'articles.json';

async function scrapeArticles() {
  try {
    console.log('Fetching HipHopDX feed...');
    const response = await fetch('https://hiphopdx.com/feed');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    
    const xml = await response.text();
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    
    return items.map(item => ({
      title: (item.match(/<title>([\s\S]*?)<\/title>/) || [,'No title'])[1].trim(),
      link: (item.match(/<link>([\s\S]*?)<\/link>/) || [,'#'])[1].trim(),
      date: (item.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [,new Date().toISOString()])[1]
    }));
    
  } catch (error) {
    console.error('Scraping failed:', error);
    return [];
  }
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
    process.exit(1);  // Explicit error code
  }
}

(async () => {
  try {
    const articles = await scrapeArticles();
    if (articles.length === 0) throw new Error('No articles found');
    await saveToFile(articles);
    process.exit(0);  // Explicit success
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
})();
