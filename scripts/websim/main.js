const { app, BrowserWindow } = require('electron');
const http=require('http'), fs=require('fs'), path=require('path');
const {SITES,page}=require('./sites.js'); const WF=require('../../app/webflow.js');
const AUTO=fs.readFileSync(path.join(__dirname,'..','..','app','webauto.js'),'utf8');
const OUT=process.env.WEBSIM_OUT||path.join(__dirname,'result.json');
app.commandLine.appendSwitch('disable-gpu');
app.whenReady().then(async()=>{ const srv=http.createServer((q,r)=>{ if(q.url.startsWith('/hang')) return; const id=(q.headers.host||'').split('.')[0]; if(!SITES[id]){ r.writeHead(404); return r.end() } r.writeHead(200,{'content-type':'text/html; charset=utf-8'}); r.end(page(id,true)) });
 await new Promise(r=>srv.listen(0,'127.0.0.1',r)); const port=srv.address().port;
 const res={}; const w=new BrowserWindow({show:false,width:1000,height:800,webPreferences:{backgroundThrottling:false}});
 w.webContents.session.setProxy({proxyRules:'http=127.0.0.1:'+port}).catch(()=>{});
 const wc=w.webContents;
 const go=(url,maxMs)=>new Promise(res=>{ let done=false; const fin=()=>{ if(done) return; done=true; clearTimeout(t); wc.off('dom-ready',fin); wc.off('did-fail-load',fin); res(wc.getURL()) }; const t=setTimeout(fin,maxMs||8000); wc.once('dom-ready',fin); wc.once('did-fail-load',fin); wc.loadURL(url).catch(()=>{}) });
 const exec=e=>Promise.race([wc.executeJavaScript(AUTO+';\n'+e,true),new Promise((_,j)=>setTimeout(()=>j(new Error('exec timeout')),20000))]);
 for(const id of Object.keys(SITES)){ const url='http://'+id+'.test:'+port+'/'; const t0=Date.now();
  const old=await Promise.race([wc.loadURL(url).then(()=>Date.now()-t0,()=>Date.now()-t0),new Promise(r=>setTimeout(()=>r('>20000 (не дождался)'),20000))]);
  await wc.loadURL('about:blank').catch(()=>{});
  const flow=WF.create({open:u=>go(u),exec:e=>exec("window.__ppForce="+JSON.stringify(id==='alice'?'alice.yandex':id)+";"+e),sleep:ms=>new Promise(r=>setTimeout(r,ms)),url:async()=>wc.getURL(),log:()=>{}});
  const S={id,name:id,url}; const runs=[];
  for(let i=0;i<3;i++){ const r=await flow.ask(S,{key:'proj',sys:'СИСТЕМНАЯ ИНСТРУКЦИЯ '+'x'.repeat(10000),user:'запрос '+i,timeouts:{first:60,idle:30}}); runs.push({ready:r.tm.ready,sent:r.tm.sent,first:r.tm.first,done:r.tm.done,ok:/Ответ номер/.test(r.text||''),text:(r.text||'').slice(0,40),sys:r.sysSent,url:wc.getURL().replace(/^http:\/\/[^/]+/,'')}) }
  const chats=new Set(runs.map(r=>r.url.split('/').slice(0,-0).join('/'))).size;
  res[id]={oldLoadUrlMs:old,runs,sameChat:runs.every(r=>r.url===runs[0].url),userMsgs:await wc.executeJavaScript("document.querySelectorAll('.user-msg').length")} }
 fs.writeFileSync(OUT,JSON.stringify(res,null,1)); console.log(JSON.stringify(res,null,1)); srv.close(); app.exit(0) });
