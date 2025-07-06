const fs = require('fs');
const path = require('path');

// 1. Configure output
const OUTPUT_DIR = 'data';
const OUTPUT_FILE = 'articles.json';

async function scrapeArticles() {
  try {
    const response = await fetch('https://hiphopdx.com/feed');
    const xml = await response.text();
    
    const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
    return items.map(item => ({
      title: item.match(/<title>([\s\S]*?)<\/title>/)[1].trim(),
      link: item.match(/<link>([\s\S]*?)<\/link>/)[1].trim(),
      date: item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)[1] || new Date().toISOString()
    }));
    
  } catch (error) {
    console.error('Scraping failed:', error);
    return [];
  }

}

// 3. Save to File
async function saveToFile(articles) {
  try {
    // Create data directory if needed
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    // Write to file
    const outputPath = path.join(OUTPUT_DIR, OUTPUT_FILE);
    fs.writeFileSync(outputPath, JSON.stringify(articles, null, 2));
    
    console.log(`✅ Saved ${articles.length} articles to ${outputPath}`);
    return true;
    
  } catch (error) {
    console.error('❌ Failed to save file:', error);
    return false;
  }
}

// 4. Main Function
async function main() {
  const articles = await scrapeArticles();
  await saveToFile(articles);
}

main();
