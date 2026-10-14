// Read-only RSS and archive API. Editorial writes require EDITOR_TOKEN.
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



const ORIGINS=new Set(['https://myanmarwatch.com','https://www.myanmarwatch.com']);
function headers(request,type='application/json; charset=utf-8') {
  const origin=request.headers.get('Origin');
  return {'Content-Type':type,'X-Content-Type-Options':'nosniff','Cache-Control':'no-store','Vary':'Origin',...(ORIGINS.has(origin)?{'Access-Control-Allow-Origin':origin}:{})};
}
function json(request,value,status=200){return new Response(JSON.stringify(value),{status,headers:headers(request)});}
function number(value,fallback,max){if(value===null)return fallback;if(!/^\d+$/.test(value))throw new Error('Invalid pagination');const n=Number(value);if(!Number.isSafeInteger(n)||n>max)throw new Error('Invalid pagination');return n;}
function safeURL(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
async function authorized(request,env){
  if(!env.EDITOR_TOKEN||env.EDITOR_TOKEN.length<32)return false;
  const value=request.headers.get('Authorization')||'';
  const [a,b]=await Promise.all([value,'Bearer '+env.EDITOR_TOKEN].map(x=>crypto.subtle.digest('SHA-256',new TextEncoder().encode(x))));
  const left=new Uint8Array(a),right=new Uint8Array(b);let diff=0;for(let i=0;i<left.length;i++)diff|=left[i]^right[i];return diff===0;
}
export default {async fetch(request,env){
  const url=new URL(request.url),path=url.pathname;
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:{...headers(request),'Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'Authorization, Content-Type'}});
  if(path==='/monitoring/reviews'&&request.method==='POST'){
    if(!await authorized(request,env))return json(request,{error:'Unauthorized'},401);
    if(Number(request.headers.get('content-length'))>10000)return json(request,{error:'Too large'},413);
    try {
      const raw=await limitedText(request,10000),data=JSON.parse(raw);
      const link=safeURL(data.url),note=String(data.note||'').trim();
      if(!link||!['retained','rejected','corrected'].includes(data.decision)||!note||note.length>2000)return json(request,{error:'Invalid review'},400);
      const exists=await env.DB.prepare('SELECT url FROM monitoring_reports WHERE url=?').bind(link).first();
      if(!exists)return json(request,{error:'Report not found'},404);
      const created_at=new Date().toISOString();
      await env.DB.prepare('INSERT INTO monitoring_reviews(url,decision,note,created_at) VALUES(?,?,?,?)').bind(link,data.decision,note,created_at).run();
      return json(request,{ok:true,created_at},201);
    }catch{return json(request,{error:'Review could not be saved'},503);}
  }
  if(request.method!=='GET')return json(request,{error:'Method not allowed'},405);
  try {
    if(path==='/monitoring/session')return json(request,{authorized:await authorized(request,env)},await authorized(request,env)?200:401);
    if(path==='/monitoring/status'){
      const {results}=await env.DB.prepare('SELECT url,last_attempt,last_success,latest_publication,item_count,error FROM monitoring_feeds').all();
      return json(request,{version:1,feeds:results});
    }
    if(path==='/monitoring/reports'){
      const limit=number(url.searchParams.get('limit'),500,1000),offset=number(url.searchParams.get('offset'),0,100000);
      const since=url.searchParams.get('since')||new Date(Date.now()-90*86400000).toISOString();
      if(!Number.isFinite(Date.parse(since)))return json(request,{error:'Invalid date'},400);
      const {results}=await env.DB.prepare(`SELECT url,title,description,source,published_at,first_seen,updated_at FROM monitoring_reports WHERE source='The Irrawaddy' AND published_at>=? ORDER BY published_at DESC,url LIMIT ? OFFSET ?`).bind(new Date(since).toISOString(),limit+1,offset).all();
      return json(request,{reports:results.slice(0,limit),next:results.length>limit?offset+limit:null});
    }
    if(path==='/monitoring/history'){
      const link=safeURL(url.searchParams.get('url'));if(!link)return json(request,{error:'Invalid URL'},400);
      const {results}=await env.DB.prepare('SELECT title,description,source,published_at,observed_at,kind FROM monitoring_history WHERE url=? ORDER BY id DESC LIMIT 100').bind(link).all();
      return json(request,{history:results});
    }
    if(path==='/monitoring/reviews'){
      const link=safeURL(url.searchParams.get('url'));if(!link)return json(request,{error:'Invalid URL'},400);
      const {results}=await env.DB.prepare('SELECT decision,note,created_at FROM monitoring_reviews WHERE url=? ORDER BY id DESC LIMIT 100').bind(link).all();
      return json(request,{reviews:results});
    }
    if(path==='/events'){
      const limit=number(url.searchParams.get('limit'),500,2000),offset=number(url.searchParams.get('offset'),0,100000),since=url.searchParams.get('since');
      if(since&&!Number.isFinite(Date.parse(since)))return json(request,{error:'Invalid date'},400);
      const where=since?' WHERE published_at>=?':'',params=since?[new Date(since).toISOString()]:[];
      const {results}=await env.DB.prepare('SELECT id,title,link,source,published_at,created_at,content FROM events'+where+' ORDER BY published_at DESC,id LIMIT ? OFFSET ?').bind(...params,limit,offset).all();
      const total=await env.DB.prepare('SELECT COUNT(*) as c FROM events'+where).bind(...params).first();
      return json(request,{events:results,total:total.c});
    }
    if(path!=='/')return json(request,{error:'Not found'},404);
    const target=url.searchParams.get('url');
    if(!target||!allowed(target))return json(request,{error:'Feed not allowed'},403);
    const cached=await env.CACHE.get('rss:'+target);
    if(cached)return new Response(cached,{headers:{...headers(request,'application/xml; charset=utf-8'),'X-Cache':'HIT'}});
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),10000);
    try {
      let current=target;
      for(let n=0;n<4;n++){
        const res=await fetch(current,{redirect:'manual',signal:controller.signal,headers:{Accept:'application/rss+xml, application/atom+xml, application/xml, text/xml','User-Agent':'MyanmarWatch/1.0'}});
        if(res.status>=300&&res.status<400){const next=new URL(res.headers.get('Location'),current).href;await res.body?.cancel();if(!allowed(next))return json(request,{error:'Redirect not allowed'},502);current=next;continue;}
        if(!res.ok){await res.body?.cancel();return json(request,{error:'Upstream unavailable'},502);}
        const body=await limitedText(res,2*1024*1024);
        if(!/<(?:rss|feed|rdf:RDF)\b/i.test(body)||/<html\b/i.test(body.slice(0,500)))return json(request,{error:'Invalid feed'},502);
        return new Response(body,{headers:{...headers(request,'application/xml; charset=utf-8'),'X-Cache':'MISS'}});
      }
      return json(request,{error:'Too many redirects'},502);
    }finally{clearTimeout(timer);}
  }catch(error){console.error('[Proxy]',error.message);return json(request,{error:'Service unavailable'},503);}
}};
function allowed(value){
  const safe=safeURL(value);if(!safe)return false;
  const u=new URL(safe);if(u.port&&u.port!=='443')return false;
  if(RSS_FEEDS.some(feed=>new URL(feed).href===safe))return true;
  // Google News queries are built by the site; only the RSS search path is allowed.
  if(u.hostname==='news.google.com'&&u.pathname==='/rss/search')return true;
  // Permit a trailing-slash redirect for a configured feed only.
  return RSS_FEEDS.some(feed=>{const f=new URL(feed);return f.hostname===u.hostname&&f.pathname.replace(/\/$/,'')===u.pathname.replace(/\/$/,'')&&f.search===u.search;});
}
async function limitedText(response,max){
  if(!response.body)return '';const reader=response.body.getReader(),decoder=new TextDecoder();let text='',bytes=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>max){await reader.cancel();throw new Error('Body limit');}text+=decoder.decode(value,{stream:true});}return text+decoder.decode();}finally{reader.releaseLock();}
}
