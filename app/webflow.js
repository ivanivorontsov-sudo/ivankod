(function(root){
function hash(s){ let h=2166136261; s=String(s||''); for(let i=0;i<s.length;i++){ h^=s.charCodeAt(i); h=Math.imul(h,16777619) } return (h>>>0).toString(36)+':'+s.length }
function create(drv){
 const W={site:null,key:null,fresh:false,sys:{},urls:{},stats:[]};
 const now=()=>drv.now?drv.now():Date.now(), sleep=ms=>drv.sleep(ms), log=t=>{ if(drv.log) drv.log(t) };
 const J=async e=>{ const r=await drv.exec(e); try{ return typeof r==='string'&&/^[{\[]/.test(r)?JSON.parse(r):r }catch{ return r } };
 async function waitReady(maxMs){ const t0=now(); while(now()-t0<(maxMs||15000)){ try{ if(await drv.exec("!!(document.body&&[...document.querySelectorAll('textarea,[contenteditable=true],div[role=textbox]')].find(e=>e.getClientRects().length))")) { await sleep(250); return true } }catch{} await sleep(150) } return false }
 async function open(url){ const t0=now(); await drv.open(url); const ok=await waitReady(); log('страница открыта за '+(now()-t0)+' мс'+(ok?'':' (поле ввода не появилось)')); return ok }
 const ck=(s,key)=>s.id+'|'+key;
 async function newChat(s,key){ key=key||W.key||'default'; delete W.sys[ck(s,key)]; delete W.urls[ck(s,key)]; await open(s.url); W.site=s.id; W.key=key; W.fresh=true }
 async function prepare(s,key){ if(W.site!==s.id){ W.site=s.id; W.key=null; await open(s.url); W.fresh=true }
  if(W.key!==key){ const u=W.urls[ck(s,key)]; const cur=drv.url?await drv.url():''; if(u&&u!==cur){ await open(u); W.fresh=false } else if(!u&&!W.fresh){ await open(s.url); W.fresh=true } W.key=key } }
 async function ask(s,o){ const key=o.key||'default'; const T=o.timeouts||{first:180,idle:90}; const t0=now(); const tm={};
  await prepare(s,key); tm.ready=now()-t0;
  const k=ck(s,key); const needSys=o.sys&&W.sys[k]!==hash(o.sys); const prompt=(needSys?o.sys+'\n\n':'')+o.user;
  const doSend=async()=>{ await drv.exec('window.__pp.mark('+JSON.stringify(prompt)+')'); return drv.exec('window.__pp.send('+JSON.stringify(prompt)+')') };
  let r=await doSend();
  if(r==='noinput'&&!W.fresh){ log('поле ввода пропало — сайт закрыл чат, открываю новый'); await newChat(s,key); return ask(s,o) }
  if(r==='noinput') return {text:null,err:'NOINPUT: нет поля ввода (нужен вход на сайте)',tm};
  let sent=false; for(const t1=now();now()-t1<4000;){ await sleep(250); try{ if(await drv.exec('window.__pp.sent()')){ sent=true; break } if(now()-t1>1500&&await drv.exec('window.__pp.pending()')){ await drv.exec('window.__pp.clickLast()') } }catch{} }
  tm.sent=now()-t0; log('запрос отправлен за '+tm.sent+' мс'+(sent?'':' (подтверждения нет, жду ответ)'));
  let lastT='', lastCh=now(), tFirst=0, retried=false, tw=now();
  while(true){ if(o.stop&&o.stop()) return {text:null,err:'ABORT',tm};
   await sleep(o.pollMs||500); let j; try{ j=await J('window.__pp.poll()') }catch{ continue } if(!j||typeof j!=='object') continue;
   const text=j.text||''; if(text!==lastT){ lastCh=now(); lastT=text; if(text&&!tFirst){ tFirst=now(); tm.first=tFirst-t0 } if(o.onText) o.onText(text,j.busy) }
   if(j.limit){ const e=new Error('WEB_LIMIT'); e.limit=true; throw e }
   const quiet=now()-lastCh;
   if(text&&!j.busy&&quiet>=(o.doneMs||2000)) break;
   if(text&&j.busy&&quiet>=(o.stuckMs||15000)){ log('индикатор «печатает» завис, а текст не меняется '+Math.round(quiet/1000)+' с — беру ответ'); break }
   if(!text&&!retried&&now()-tw>(o.resendMs||30000)){ retried=true; let ok=false; try{ ok=await drv.exec('window.__pp.sent()') }catch{} if(!ok){ log('сайт не принял запрос — перезагружаю этот же чат и отправляю снова'); const u=drv.url?await drv.url():s.url; await open(u||s.url); r=await doSend(); tw=now() } }
   if(!text&&now()-t0>T.first*1000) return {text:null,err:'TIMEOUT: сайт молчит',tm};
   if(text&&quiet>T.idle*1000) return {text:text.length>200?text:null,err:text.length>200?'':'TIMEOUT',tm} }
  tm.done=now()-t0; W.fresh=false; if(o.sys) W.sys[k]=hash(o.sys); try{ if(drv.url) W.urls[k]=await drv.url() }catch{} W.stats.push({site:s.id,...tm}); return {text:lastT,err:'',tm,sysSent:!!needSys} }
 return {W,ask,newChat,prepare,waitReady,hash} }
const api={create,hash};
if(typeof module!=='undefined') module.exports=api; else root.WebFlow=api;
})(typeof window!=='undefined'?window:globalThis);
