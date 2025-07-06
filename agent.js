const https = require('https');
const { execSync } = require('child_process');
const fs = require('fs');

// ===== CONFIG =====
const SOURCES = [
  // API (Fastest)
  {
    name: "HotNewHipHop",
    url: "https://www.hotnewhiphop.com/api/v1/posts?limit=20",
    type: "api",
    parse: data => data.data?.map(post => ({
      title: post.title,
      link: `https://www.hotnewhiphop.com${post.url}`,
      date: post.publish_date
    })) || []
  },

  // RSS (No Parsing Lib)
  {
    name: "HipHopDX",
    url: "https://hiphopdx.com/feed",
    type: "rss",
    parse: xml => {
      const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
      return items.map(item => ({
        title: item.match(/<title>([\s\S]*?)<\/title>/)?.[1] || "",
        link: item.match(/<link>([\s\S]*?)<\/link>/)?.[1] || "",
        date: item.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1] || ""
      }));
    }
  },

  // HTML (No Cheerio)
  {
    name: "XXL Magazine",
    url: "https://www.xxlmag.com/news/",
    type: "html",
    parse: html => {
      const regex = /<h2 class="title"><a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
      const matches = [...html.matchAll(regex)];
      return matches.map(m => ({ title: m[2].trim(), link: m[1], date: "" }));
    }
  }
];

// ===== NUCLEAR FETCH =====
async function nuclearFetch(url, options = {}) {
  return new Promise((resolve) => {
    // 1. Try direct fetch
    https.get(url, { 
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Accept': '*/*'
      },
      timeout: 10000
    }, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ success: true, data }));
    }).on('error', async () => {
      // 2. Fallback to TOR
      try {
        execSync('torify curl -s ' + url, { encoding: 'utf-8' });
        resolve({ success: true, data: execSync('torify curl -s ' + url) });
      } catch {
        // 3. Final fallback: Google Cache
        https.get(`http://webcache.googleusercontent.com/search?q=cache:${url}`, res => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => resolve({ success: false, data }));
        });
      }
    });
  });
}

// ===== MAIN =====
async function attack() {
  const results = [];
  
  await Promise.all(SOURCES.map(async (source) => {
    const { data } = await nuclearFetch(source.url);
    if (!data) return;

    try {
      const items = source.parse(data);
      results.push(...items.filter(i => i.title && i.link));
    } catch (e) {
      console.error(`⚠️ ${source.name} parse failed: ${e.message}`);
    }
  }));

  // Save to CSV (better for analysis)
  const csv = results.map(r => 
    `"${r.title.replace(/"/g, '""')}","${r.link}","${r.date}"`
  ).join('\n');
  
  fs.writeFileSync('articles.csv', 'Title,Link,Date\n' + csv);
  console.log(`🔥 Captured ${results.length} articles`);
}

// Run every 3 hours
attack();
setInterval(attack, 3 * 60 * 60 * 1000);