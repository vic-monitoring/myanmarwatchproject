/* Pure, shared rules: a report is not a confirmed incident. */
(function(root){
  'use strict';
  const categories={military:{en:'Military',fr:'Militaire',color:'#f08b78'},humanitarian:{en:'Humanitarian',fr:'Humanitaire',color:'#72c7b4'},govt:{en:'Politics',fr:'Politique',color:'#9ab8ee'},opposition:{en:'Opposition',fr:'Opposition',color:'#d9b782'},general:{en:'Other',fr:'Autres',color:'#bac6d2'}};
  function safeURL(value){try{const u=new URL(value);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}}
  function signature(a){return JSON.stringify([a.title||'',a.description||'',a.location||'',a.date||'',a.change||'']);}
  function filterArticles(list,{query='',region='',from='',to='',sort='recent'}={}){
    const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const start=from?Date.parse(from+'T00:00:00Z'):null,end=to?Date.parse(to+'T23:59:59.999Z'):null;
    return list.filter(a=>(!region||(region==='unknown'?!a.location:a.location===region))&&words.every(w=>[a.title,a.description,a.source,a.location].join(' ').toLocaleLowerCase().includes(w))&&(!from||(Number.isFinite(a._ts)&&a._ts>=start))&&(!to||(Number.isFinite(a._ts)&&a._ts<=end))).sort((a,b)=>(sort==='irrawaddy'?Number(b.source==='The Irrawaddy')-Number(a.source==='The Irrawaddy'):0)||(b._ts||0)-(a._ts||0));
  }
  function changes(previous,articles){
    const old=new Map(previous.map(x=>[x.url,x]));
    return articles.flatMap(a=>{const prior=old.get(a.url);return !prior?[{type:'new',article:a}]:prior.signature!==signature(a)?[{type:'updated',article:a}]:[];});
  }
  function publication(a){return Number.isFinite(a._ts)?new Date(a._ts).toISOString():null;}
  function cleanReview(value){
    if(!value||!['retained','rejected','corrected'].includes(value.decision))return null;
    const url=safeURL(value.url);if(!url)return null;
    const note=String(value.note||'').trim().slice(0,2000);if(!note)return null;
    return {url,decision:value.decision,note,at:new Date().toISOString()};
  }
  const api={categories,safeURL,signature,filterArticles,changes,publication,cleanReview};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MonitorCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
