import assert from 'node:assert/strict';
import proxy from '../workers/myanmar-proxy-monitoring.mjs';
let n=0;const test=async(name,fn)=>{await fn();n++;console.log('PASS '+name)};
let writes=0,fetches=0;const original=globalThis.fetch;globalThis.fetch=async()=>{fetches++;throw Error('Unexpected network')};
const env={EDITOR_TOKEN:'x'.repeat(32),CACHE:{get:async()=>null},DB:{prepare:sql=>({bind(...params){return this},first:async()=>({url:'https://www.irrawaddy.com/a',c:0}),all:async()=>({results:[]}),run:async()=>{writes++;return {success:true}}})}};
try{
 await test('Unauthenticated editorial writes denied',async()=>assert.equal((await proxy.fetch(new Request('https://proxy/monitoring/reviews',{method:'POST',body:'{}'}),env)).status,401));
 await test('Missing editorial secret disables writes',async()=>assert.equal((await proxy.fetch(new Request('https://proxy/monitoring/reviews',{method:'POST',body:'{}'}),{...env,EDITOR_TOKEN:undefined})).status,401));
 await test('Unsupported review decision rejected',async()=>assert.equal((await proxy.fetch(new Request('https://proxy/monitoring/reviews',{method:'POST',headers:{Authorization:'Bearer '+env.EDITOR_TOKEN},body:JSON.stringify({url:'https://www.irrawaddy.com/a',note:'Test',decision:'verified'})}),env)).status,400));
 await test('Authenticated annotation stored without inventing verification',async()=>{const r=await proxy.fetch(new Request('https://proxy/monitoring/reviews',{method:'POST',headers:{Authorization:'Bearer '+env.EDITOR_TOKEN},body:JSON.stringify({url:'https://www.irrawaddy.com/a',note:'Proposed correction with source',decision:'corrected'})}),env);assert.equal(r.status,201);assert.equal(writes,1)});
 await test('Public read routes never write',async()=>{for(const path of ['/events','/monitoring/status','/monitoring/reports','/monitoring/history?url=https://www.irrawaddy.com/a','/monitoring/reviews?url=https://www.irrawaddy.com/a'])assert.equal((await proxy.fetch(new Request('https://proxy'+path),env)).status,200);assert.equal(writes,1)});
 await test('Arbitrary targets cannot use the proxy',async()=>{for(const target of ['https://example.com/','http://127.0.0.1/','https://www.irrawaddy.com/private','https://www.google.com:8443/'])assert.equal((await proxy.fetch(new Request('https://proxy/?url='+encodeURIComponent(target)),env)).status,403);assert.equal(fetches,0)});
 await test('HTML cache delivery is not executable HTML',async()=>{const r=await proxy.fetch(new Request('https://proxy/?url='+encodeURIComponent('https://www.irrawaddy.com/feed')),{...env,CACHE:{get:async()=>'<rss></rss>'}});assert.equal(r.headers.get('content-type'),'application/xml; charset=utf-8');assert.equal(r.headers.get('x-content-type-options'),'nosniff')});
 await test('Unexpected origin receives no CORS access',async()=>{const r=await proxy.fetch(new Request('https://proxy/monitoring/status',{headers:{Origin:'https://untrusted.example'}}),env);assert.equal(r.headers.get('access-control-allow-origin'),null)});
 await test('Public refresh remains disabled',async()=>assert.equal((await proxy.fetch(new Request('https://proxy/refresh'),env)).status,404));
}finally{globalThis.fetch=original}
console.log(n+' worker checks passed');
