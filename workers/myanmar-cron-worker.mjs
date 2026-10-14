// Myanmar Watch: scheduled collection only. Bind CACHE and DB to the existing resources.
// Configure hourly Cron Trigger: 0 * * * *. No public manual refresh endpoint.
// RSS/Atom extraction supports the existing simple feeds; not a general XML parser.
const RSS_FEEDS = [
  // ── Google Alerts généraux ───────────────────────────────────────────────
  "https://www.google.com/alerts/feeds/10193744383605054792/3917955412123422504",
  "https://www.google.com/alerts/feeds/10193744383605054792/17509126990979435299",
  "https://www.google.com/alerts/feeds/10193744383605054792/11485768602952461276",
  "https://www.google.com/alerts/feeds/10193744383605054792/13603249173399867494",
  "https://www.google.com/alerts/feeds/10193744383605054792/13149882533340625314",
  "https://www.google.com/alerts/feeds/10193744383605054792/3390428909787043202",
  "https://www.google.com/alerts/feeds/10193744383605054792/17443746846711545288",
  "https://www.google.com/alerts/feeds/10193744383605054792/1393676249042072422",
  "https://www.google.com/alerts/feeds/10193744383605054792/9786264560827519151",
  "https://www.google.com/alerts/feeds/10193744383605054792/13922438433020960869",
  "https://www.google.com/alerts/feeds/10193744383605054792/4844705533788884676",
  "https://www.google.com/alerts/feeds/10193744383605054792/7032255219482605685",
  "https://www.google.com/alerts/feeds/10193744383605054792/11250821654438423843",
  "https://www.google.com/alerts/feeds/10193744383605054792/3826735847495006396",
  "https://www.google.com/alerts/feeds/10193744383605054792/5754137360927433400",
  "https://www.google.com/alerts/feeds/10193744383605054792/18093160110742449988",
  "https://www.google.com/alerts/feeds/10193744383605054792/12032106194307670149",
  // ── Google Alerts villes ─────────────────────────────────────────────────
  "https://www.google.com/alerts/feeds/10193744383605054792/2587918603379633935",
  "https://www.google.com/alerts/feeds/10193744383605054792/17731639376676297527",
  "https://www.google.com/alerts/feeds/10193744383605054792/17803572372860198235",
  "https://www.google.com/alerts/feeds/10193744383605054792/11452175855264324068",
  "https://www.google.com/alerts/feeds/10193744383605054792/298124501543743393",
  "https://www.google.com/alerts/feeds/10193744383605054792/4971641182303487475",
  "https://www.google.com/alerts/feeds/10193744383605054792/12223779250288450676",
  "https://www.google.com/alerts/feeds/10193744383605054792/7688741016151593065",
  "https://www.google.com/alerts/feeds/10193744383605054792/8315898468675753615",
  "https://www.google.com/alerts/feeds/10193744383605054792/10273789383323810135",
  "https://www.google.com/alerts/feeds/10193744383605054792/17149409678722084701",
  // ── Médias spécialisés Myanmar ───────────────────────────────────────────
  "https://aappb.org/feed/",
  "https://www.bnionline.net/en/feed",
  "https://progressmyanmar.com/feed/",
  "https://www.channelnewsasia.com/api/v1/rss-outbound-feed?_format=xml&category=10416",
  "https://www.irrawaddy.com/feed",
  "https://www.rfa.org/english/news/myanmar/rss2.xml",
  "https://frontiermyanmar.net/en/feed/",
  "https://myanmar-now.org/en/feed/",
  "https://www.dvb.no/feed",
  "https://www.benarnews.org/rss/english/bn-myanmar-news.xml",
  // ── Médias internationaux ────────────────────────────────────────────────
  "https://www.reuters.com/rssFeed/worldNews",
  "https://feeds.bbci.co.uk/news/world/asia/rss.xml",
  "https://www.aljazeera.com/xml/rss/all.xml",
  "https://www.crisisgroup.org/rss.xml",
  // ── Burmese ──────────────────────────────────────────────────────────────
  "https://www.rfa.org/burmese/rss2.xml",
  "https://myanmar-now.org/mm/feed/",
  // ── GDELT ────────────────────────────────────────────────────────────────
  "https://api.gdeltproject.org/api/v2/doc/doc?query=Myanmar+military+airstrike&mode=artlist&maxrecords=15&sort=DateDesc&format=rss",
  "https://api.gdeltproject.org/api/v2/doc/doc?query=Tatmadaw+OR+Myanmar+junta+attack&mode=artlist&maxrecords=15&sort=DateDesc&format=rss",
  "https://api.gdeltproject.org/api/v2/doc/doc?query=Myanmar+resistance+PDF+OR+Arakan+Army&mode=artlist&maxrecords=15&sort=DateDesc&format=rss",
  "https://api.gdeltproject.org/api/v2/doc/doc?query=Myanmar+civilian+killed+OR+bombing&mode=artlist&maxrecords=15&sort=DateDesc&format=rss",
];


const KV_TTL = 7200;
const BATCH_SZ = 4;
const MAX_BYTES = 2 * 1024 * 1024;

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(refreshAllFeeds(env).then(result => {
      console.log(JSON.stringify(result));
      if (result.errors) throw new Error(`Collection incomplete: ${result.errors} feeds failed`);
    }));
  },
  async fetch() {
    // Visitors cannot trigger database writes or consume the collection quota.
    return new Response('Not found', { status: 404 });
  }
};

export async function refreshAllFeeds(env) {
  const result = { feeds: RSS_FEEDS.length, success: 0, errors: 0 };
  // Collect the primary source first without increasing the number of requests.
  const ordered = [...RSS_FEEDS].sort((a, b) =>
    Number(b === 'https://www.irrawaddy.com/feed') - Number(a === 'https://www.irrawaddy.com/feed'));
  for (let i = 0; i < ordered.length; i += BATCH_SZ) {
    const batch = ordered.slice(i, i + BATCH_SZ);
    const results = await Promise.allSettled(batch.map(url => fetchAndCache(url, env)));
    results.forEach((r, j) => {
      if (r.status === 'fulfilled') result.success++;
      else {
        result.errors++;
        console.error('[Collection]', new URL(batch[j]).hostname, String(r.reason?.message || r.reason));
      }
    });
  }
  return result;
}

export async function fetchAndCache(feedUrl, env) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  let body;
  try {
    const res = await fetch(feedUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'MyanmarWatch/1.0', 'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml' },
      cf: { cacheTtl: 0, cacheEverything: false }
    });
    if (!res.ok) { await res.body?.cancel(); throw new Error(`HTTP ${res.status}`); }
    if (!res.body) throw new Error('Empty response');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let size = 0;
    body = '';
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_BYTES) { await reader.cancel(); throw new Error('Feed too large'); }
        body += decoder.decode(value, { stream: true });
      }
      body += decoder.decode();
    } finally { reader.releaseLock(); }
  } finally { clearTimeout(timer); }
  // Validate before replacing the last usable cache. Reject HTML error pages and DTDs.
  const items = await parseRSSXML(body, feedUrl);
  await env.CACHE.put(`rss:${feedUrl}`, body, { expirationTtl: KV_TTL });
  // Reuse legacy rows by link. Hash the FULL URL for new rows; no prefix collisions.
  // No schema migration or deletion of historical articles.
  const stmt = env.DB.prepare(
    'INSERT OR IGNORE INTO events (id, title, link, source, published_at, content) ' +
    'SELECT ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM events WHERE link = ?)'
  );
  for (let i = 0; i < items.length; i += 25) {
    const results = await env.DB.batch(items.slice(i, i + 25).map(it =>
      stmt.bind(it.id, it.title, it.link, it.source, it.published_at, it.content, it.link)));
    if (results.some(r => r.success === false)) throw new Error('D1 batch failed');
  }
  return { items: items.length };
}

function decodeXML(text) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (all, entity) => {
    const named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
    if (entity[0] !== '#') return named[entity.toLowerCase()] || all;
    const n = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
    return n > 0 && n <= 0x10ffff && !(n >= 0xd800 && n <= 0xdfff) ? String.fromCodePoint(n) : '';
  });
}
function textOnly(text) {
  return decodeXML(decodeXML(text).replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}
function tag(block, name) {
  const match = block.match(new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + name + '\\s*>', 'i'));
  return match ? match[1].trim().replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, '$1') : '';
}
function attr(block, name) {
  const match = block.match(new RegExp('(?:^|\\s)' + name + '\\s*=\\s*(["\'])([\\s\\S]*?)\\1', 'i'));
  return match ? decodeXML(match[2]) : '';
}
export async function parseRSSXML(xml, feedUrl) {
  const clean = xml.replace(/^\uFEFF/, '').replace(/<\?xml[\s\S]*?\?>/gi, '').replace(/<!--[\s\S]*?-->/g, '').trim();
  if (/<!DOCTYPE/i.test(clean) || !/^(?:<rss\b|<feed\b)/i.test(clean)) throw new Error('Not a supported RSS/Atom feed');
  const atom = /^<feed\b/i.test(clean);
  if (!(atom ? /<\/feed\s*>\s*$/i : /<\/rss\s*>\s*$/i).test(clean)) throw new Error('Truncated feed');
  const rx = atom ? /<entry\b[^>]*>([\s\S]*?)<\/entry\s*>/gi : /<item\b[^>]*>([\s\S]*?)<\/item\s*>/gi;
  const hostname = new URL(feedUrl).hostname.replace(/^www\./, '');
  const source = hostname === 'irrawaddy.com' ? 'The Irrawaddy' :
    hostname === 'google.com' && new URL(feedUrl).pathname.startsWith('/alerts/') ? 'Google Alerts' : hostname;
  const items = [];
  const seen = new Set();
  for (const match of clean.matchAll(rx)) {
    const block = match[1];
    const title = textOnly(tag(block, 'title')).slice(0, 1000);
    let link = decodeXML(tag(block, 'link'));
    if (atom) {
      const links = [...block.matchAll(/<link\b[^>]*>/gi)].map(m => m[0]);
      const alternate = links.find(l => !attr(l, 'rel') || attr(l, 'rel') === 'alternate');
      link = alternate ? attr(alternate, 'href') : '';
    }
    let parsed;
    try { parsed = new URL(link); } catch { continue; }
    if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password || !title) continue;
    if (seen.has(link)) continue;
    const rawDate = tag(block, 'pubDate') || tag(block, 'published') || tag(block, 'updated') || tag(block, 'dc:date');
    const ts = Date.parse(rawDate);
    // Never invent a publication date. Undated entries remain available in raw RSS cache.
    if (!Number.isFinite(ts) || ts > Date.now() + 5 * 60 * 1000) continue;
    const content = textOnly(tag(block, 'description') || tag(block, 'summary') || tag(block, 'content:encoded') || tag(block, 'content')).slice(0, 500);
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(link));
    const id = [...new Uint8Array(hash)].map(n => n.toString(16).padStart(2, '0')).join('');
    items.push({ id, title, link, source, published_at: new Date(ts).toISOString(), content });
    seen.add(link);
  }
  if ((clean.match(atom ? /<entry\b/gi : /<item\b/gi) || []).length !== [...clean.matchAll(rx)].length) throw new Error('Malformed entries');
  return items;
}
