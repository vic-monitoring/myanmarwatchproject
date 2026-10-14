import assert from 'node:assert/strict';
import worker, {parseRSSXML, fetchAndCache} from './myanmar-cron-worker.mjs';
const feed='https://www.irrawaddy.com/feed';
const item=(link,date='2026-10-01',title='Test')=>`<item><title><![CDATA[${title}]]></title><link>${link}</link><pubDate>${date}</pubDate><description>Summary</description></item>`;
const rss=x=>`<?xml version="1.0"?><rss version="2.0"><channel>${x}</channel></rss>`;
let passed=0;
async function test(name,fn){await fn();passed++;console.log('PASS '+name);}
await test('public refresh disabled',async()=>assert.equal((await worker.fetch(new Request('https://x/refresh'))).status,404));
await test('full URLs do not collide',async()=>{const prefix='https://www.irrawaddy.com/'+ 'a'.repeat(110);const rows=await parseRSSXML(rss(item(prefix+'1')+item(prefix+'2')),feed);assert.equal(rows.length,2);assert.notEqual(rows[0].id,rows[1].id);assert.equal(rows[0].source,'The Irrawaddy');});
await test('bad dates do not discard valid neighbors or invent dates',async()=>assert.equal((await parseRSSXML(rss(item('https://x/1','invalid')+item('https://x/2')+item('https://x/3','')),feed)).length,1));
await test('unicode and entities',async()=>{const [row]=await parseRSSXML(rss(item('https://x/မြန်မာ?a=1&amp;b=2','2026-10-01','A &amp; B')),feed);assert.equal(row.title,'A & B');assert.equal(row.link,'https://x/မြန်မာ?a=1&b=2');});
await test('Atom alternate link and attributes',async()=>{const [row]=await parseRSSXML(`<feed xmlns="http://www.w3.org/2005/Atom"><entry id="a"><title>Title</title><link rel="self" href="https://x/self"/><link href='https://x/article' rel='alternate'/><published>2026-10-01</published></entry></feed>`,feed);assert.equal(row.link,'https://x/article');});
await test('unsafe URL excluded',async()=>assert.equal((await parseRSSXML(rss(item('javascript:alert(1)')),feed)).length,0));
await test('HTML, DTD and truncation rejected',async()=>{for(const xml of ['<html>Error</html>','<!DOCTYPE rss><rss></rss>','<rss><channel>'])await assert.rejects(parseRSSXML(xml,feed));});
const original=globalThis.fetch;
try{
 let writes=0;let batches=0;
 const env={CACHE:{put:async()=>writes++},DB:{prepare:()=>({bind:()=>({})}),batch:async()=>{batches++;throw new Error('D1 down')}}};
 await test('D1 failures surface after cache write',async()=>{globalThis.fetch=async()=>new Response(rss(item('https://x/ok')));await assert.rejects(fetchAndCache(feed,env),/D1 down/);assert.equal(writes,1);assert.equal(batches,1);});
 await test('invalid upstream does not replace cache',async()=>{globalThis.fetch=async()=>new Response('<html>Access denied</html>');await assert.rejects(fetchAndCache(feed,env));assert.equal(writes,1);});
 await test('oversized response rejected',async()=>{globalThis.fetch=async()=>new Response('x'.repeat(2*1024*1024+1));await assert.rejects(fetchAndCache(feed,env),/too large/);assert.equal(writes,1);});
}finally{globalThis.fetch=original;}
console.log(`${passed} tests passed`);
