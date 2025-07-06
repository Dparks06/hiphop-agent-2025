const { fetch } = require('undici');
const { writeFileSync } = require('fs');

// 2025 Free Sources (No API Keys)
const SOURCES = [
  {
    name: "HipHopDX RSS",
    url: "https://hiphopdx.com/feed",
    type: "rss"
  },
  {
    name: "HotNewHipHop HTML",
    url: "https://www.hotnewhiphop.com/news/",
    type: "html"
  }
];

async function fetchWithRetry(url, retries = 3) {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
      }
    });
    return await response.text();
  } catch (error) {
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return fetchWithRetry(url, retries - 1);
    }
    throw error;
  }
}

async function main() {
  const results = [];
  
  for (const source of SOURCES) {
    try {
      const content = await fetchWithRetry(source.url);
      // Simplified parsing (no external deps)
      const articles = content.match(/<title>(.*?)<\/title>.*?<link>(.*?)<\/link>/gs) || [];
      results.push(...articles.map(a => ({
        title: a.match(/<title>(.*?)<\/title>/)[1],
        link: a.match(/<link>(.*?)<\/link>/)[1]
      })));
    } catch (error) {
      console.error(`Failed ${source.name}: ${error.message}`);
    }
  }

  writeFileSync('articles.json', JSON.stringify(results, null, 2));
  console.log(`✅ Saved ${results.length} articles`);
}

main();