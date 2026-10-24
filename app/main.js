const { app, BrowserWindow, ipcMain, dialog, shell, safeStorage, clipboard } = require('electron');
const path = require('path'), fs = require('fs'), https = require('https'), cp = require('child_process'), crypto = require('crypto');
let win; const procs = {}; const T=require('./tools.js'); const ENV=()=>T.buildEnv();
const cfgFile = () => path.join(app.getPath('userData'), 'settings.json');
function loadCfg(){ try{ const c=JSON.parse(fs.readFileSync(cfgFile(),'utf8'));
  for(const p of c.providers||[]) if(p.keyEnc){ try{p.key=safeStorage.decryptString(Buffer.from(p.keyEnc,'base64'))}catch{p.key=''} delete p.keyEnc }
  return c }catch{ return {} } }
function saveCfg(c){ const o=JSON.parse(JSON.stringify(c));
  for(const p of o.providers||[]) if(p.key){ if(safeStorage.isEncryptionAvailable()){p.keyEnc=safeStorage.encryptString(p.key).toString('base64'); delete p.key} }
  fs.mkdirSync(path.dirname(cfgFile()),{recursive:true}); fs.writeFileSync(cfgFile(),JSON.stringify(o,null,1)); return true }
const SS=require('./safesend'); const wsend=SS.makeSend(()=>win);
try{ SS.guard(process,path.join(app.getPath('userData'),'crash.log')) }catch{}
function killAll(){ for(const k in procs) try{ procs[k].kill() }catch{} }
function create(){
  win = new BrowserWindow({ width:1400, height:900, title:'ИванКод', backgroundColor:'#1e1e1e', icon:path.join(__dirname,'icon.png'),
    webPreferences:{ preload:path.join(__dirname,'preload.js'), contextIsolation:true, webviewTag:true, sandbox:false } });
  win.setMenuBarVisibility(false); win.loadFile(path.join(__dirname,'index.html'));
  win.webContents.setWindowOpenHandler(({url})=>{ shell.openExternal(url); return {action:'deny'} });
  win.on('close',killAll); win.on('closed',()=>{ killAll(); win=null });
}
try{ if(process.platform==='win32') app.setAppUserModelId('ru.vorontsov.ivancode') }catch{}
app.whenReady().then(()=>{ try{ T.refreshPath() }catch{} create() }); require('./fastmain').init(T); require('./nativemain').init(T); app.on('window-all-closed',()=>{ for(const k in procs) try{procs[k].kill()}catch{}; app.quit() });
const IGN=new Set(['.ivancode','ivancode-out','.gradle','node_modules','.git','bin','obj','__pycache__','.venv','venv','dist','build','.vs']);
ipcMain.handle('cfg:get',()=>loadCfg()); ipcMain.handle('cfg:set',(e,c)=>saveCfg(c));
ipcMain.handle('dlg:folder',async()=>{ const r=await dialog.showOpenDialog(win,{properties:['openDirectory']}); return r.canceled?null:r.filePaths[0] });
ipcMain.handle('fs:list',(e,dir)=>fs.readdirSync(dir,{withFileTypes:true}).filter(d=>!d.name.startsWith('.')||d.name=='.gitignore').map(d=>({name:d.name,dir:d.isDirectory(),path:path.join(dir,d.name)})).sort((a,b)=>(b.dir-a.dir)||a.name.localeCompare(b.name)));
const ENC=require('./enc.js');
ipcMain.handle('fs:read',(e,f)=>ENC.read(f));
ipcMain.handle('fs:exists',(e,f)=>fs.existsSync(f));
const withBom=(f,t)=>/\.ps1$|\.psm1$|\.psd1$/i.test(f)&&!String(t).startsWith('\uFEFF')?'\uFEFF'+t:t; // Windows PowerShell 5 читает .ps1 без BOM как ANSI — кириллица ломается
ipcMain.handle('fs:write',(e,f,t)=>{ fs.mkdirSync(path.dirname(f),{recursive:true}); ENC.write(f,withBom(f,t)); return true });
ipcMain.handle('fs:rename',(e,a,b)=>{ fs.renameSync(a,b); return true });
ipcMain.handle('fs:delete',(e,f)=>shell.trashItem(f).then(()=>true));
ipcMain.handle('fs:mkdir',(e,f)=>{ fs.mkdirSync(f,{recursive:true}); return true });
ipcMain.handle('fs:search',(e,root,q,opts={})=>{ const out=[]; let re;
  try{ re=opts.regex?new RegExp(q,opts.case?'g':'gi'):new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),opts.case?'g':'gi') }catch(err){ return {error:String(err)} }
  (function walk(d,depth){ if(out.length>2000||depth>12) return; let ents=[]; try{ents=fs.readdirSync(d,{withFileTypes:true})}catch{return}
    for(const x of ents){ if(IGN.has(x.name)) continue; const p=path.join(d,x.name);
      if(x.isDirectory()) walk(p,depth+1); else { let st; try{st=fs.statSync(p)}catch{continue} if(st.size>2e6) continue;
        let t; try{t=fs.readFileSync(p,'utf8')}catch{continue} if(t.includes('\0')) continue;
        t.split(/\r?\n/).forEach((l,i)=>{ re.lastIndex=0; if(re.test(l)) out.push({file:p,line:i+1,text:l.slice(0,300)}) }) } } })(root,0);
  return {results:out} });
ipcMain.handle('fs:allfiles',(e,root)=>{ const out=[]; (function walk(d,depth){ if(out.length>5000||depth>12) return; let ents=[]; try{ents=fs.readdirSync(d,{withFileTypes:true})}catch{return}
  for(const x of ents){ if(IGN.has(x.name)) continue; const p=path.join(d,x.name); x.isDirectory()?walk(p,depth+1):out.push(p) } })(root,0); return out });
ipcMain.handle('clip:write',(e,t)=>{ clipboard.writeText(t); return true }); ipcMain.handle('clip:read',()=>clipboard.readText());
ipcMain.handle('open:ext',(e,u)=>shell.openExternal(u));
ipcMain.handle('util:translit',(e,n)=>T.translit(n));
ipcMain.handle('open:path',(e,p)=>shell.openPath(p));
ipcMain.handle('app:docs',()=>{ const d=path.join(app.getPath('documents'),'ИванКод — мои программы'); fs.mkdirSync(d,{recursive:true}); return d });
// простой режим: собрать готовые файлы в папку «Готовая программа»
ipcMain.handle('simple:collect',(e,root)=>{ const out=path.join(root,'Готовая программа'); fs.mkdirSync(out,{recursive:true}); const got=[]; const cpf=(src,name)=>{ if(fs.existsSync(src)){ const d=path.join(out,name||path.basename(src)); fs.copyFileSync(src,d); got.push(d) } };
 const io=path.join(root,'ivancode-out'); if(fs.existsSync(io)){ for(const f of fs.readdirSync(io)) if(/\.(exe|zip)$/i.test(f)) cpf(path.join(io,f)); const pub=path.join(io,'publish'); if(fs.existsSync(pub)) for(const f of fs.readdirSync(pub)) if(/\.exe$/i.test(f)) cpf(path.join(pub,f)) }
 for(const t of ['release','debug']){ const d=path.join(root,'app','build','outputs','apk',t); if(fs.existsSync(d)) for(const f of fs.readdirSync(d)) if(f.endsWith('.apk')) cpf(path.join(d,f),path.basename(root).replace(/[^\wа-яё .-]/gi,'_')+(t==='debug'?'':'-release')+'.apk') }
 return {dir:out,files:got} });
// процессы: терминал и запуск
ipcMain.handle('proc:start',(e,id,cmd,cwd)=>{ if(procs[id]) try{procs[id].kill()}catch{}
  const isWin=process.platform==='win32';
  if(cmd) cmd=T.fixPy(cmd); const p = cmd ? cp.spawn(cmd,{cwd,shell:true,env:ENV()})
               : cp.spawn(isWin?'powershell.exe':'bash', isWin?['-NoLogo','-NoExit','-Command','[Console]::OutputEncoding=[Text.Encoding]::UTF8; function prompt{"PS "+$PWD+"> "}']:['-i'],{cwd,env:ENV()});
  procs[id]=p; const dd=T.mkDec(); const send=d=>wsend('proc:data',id,dd(d));
  p.stdout.on('data',send); p.stderr.on('data',send);
  p.on('exit',c=>{ delete procs[id]; wsend('proc:exit',id,c) }); p.on('error',er=>send(Buffer.from('\r\n[ошибка] '+er.message+'\r\n'))); return p.pid });
ipcMain.handle('proc:write',(e,id,d)=>{ procs[id]&&procs[id].stdin.write(d); return !!procs[id] });
ipcMain.handle('proc:kill',(e,id)=>{ const p=procs[id]; if(!p) return false;
  if(process.platform==='win32') cp.exec('taskkill /pid '+p.pid+' /T /F'); else p.kill(); return true });
ipcMain.handle('git',(e,cwd,args)=>new Promise(r=>cp.execFile('git',args,{cwd,maxBuffer:2e7,env:ENV()},(err,so,se)=>r({ok:!err,out:so,err:se||(err&&err.message)}))));
// ИИ
function gigaToken(p){ return new Promise((res,rej)=>{ if(p._tok&&p._exp>Date.now()+60000) return res(p._tok);
  const body='scope='+(p.scope||'GIGACHAT_API_PERS');
  const rq=https.request('https://ngw.devices.sberbank.ru:9443/api/v2/oauth',{method:'POST',rejectUnauthorized:false,headers:{Authorization:'Basic '+p.key,RqUID:crypto.randomUUID(),'Content-Type':'application/x-www-form-urlencoded',Accept:'application/json'}},r=>{let d='';r.on('data',c=>d+=c);r.on('end',()=>{try{const j=JSON.parse(d); if(!j.access_token) return rej(new Error(d)); p._tok=j.access_token; p._exp=j.expires_at; res(j.access_token)}catch(x){rej(new Error(d))}})});
  rq.on('error',rej); rq.end(body) }) }
const giga={};
const aiReq={};
ipcMain.handle('ai:abort',(e,reqId)=>{ const q=aiReq[reqId]; if(q){ try{ q.destroy(new Error('ABORT: остановлено')) }catch{} delete aiReq[reqId]; return true } return false });
ipcMain.handle('ai:chat',async(e,reqId,prov,messages)=>{
  let finished=false; const send=(t,done,err)=>{ if(finished) return; if(done) finished=true; try{ wsend('ai:chunk',reqId,t,done,err) }catch{} };
  const act=(kind,n)=>{ try{ wsend('ai:act',reqId,kind,n) }catch{} };
  try{
    let url=(prov.base||'').replace(/\/+$/,'')+'/chat/completions', headers={'Content-Type':'application/json'}, agent;
    if(prov.type==='gigachat'){ giga[prov.id]=giga[prov.id]||{...prov}; giga[prov.id].key=prov.key; const t=await gigaToken(giga[prov.id]);
      url='https://gigachat.devices.sberbank.ru/api/v1/chat/completions'; headers.Authorization='Bearer '+t; agent=new https.Agent({rejectUnauthorized:false}) }
    else if(prov.key) headers.Authorization='Bearer '+prov.key;
    const body=JSON.stringify({model:prov.model,messages,stream:true,temperature:0.2,...(prov.maxTokens?{max_tokens:prov.maxTokens}:{}),...(/pollinations/.test(prov.base||'')?{reasoning_effort:'low',seed:Math.floor(Math.random()*1e9)}:{}),...(prov.extra||{})});
    // сторож: нет новых токенов (ни текста, ни «размышлений») дольше idle/first секунд → обрыв с понятной ошибкой
    const idleS=prov.idleTimeout||75, firstS=prov.firstTimeout||Math.max(idleS,90);
    // бесплатный Pollinations: «1 ответ в 30 с» (HTTP 402 FREE_LIMIT) — жду сколько сказано и повторяю один раз, а не сыплю ошибкой
    if(/pollinations/.test(prov.base||'')){ const gap=31000-(Date.now()-(global.__polLast||0)); if(gap>0){ act('wait',Math.ceil(gap/1000)); await new Promise(r=>setTimeout(r,gap)) } }
    for(let att=0;;att++){ try{ await new Promise((resolve,reject)=>{ const u=new URL(url); const mod=u.protocol==='http:'?require('http'):https; let got=false, wd=null;
      const arm=()=>{ clearTimeout(wd); const s=got?idleS:firstS; wd=setTimeout(()=>rq.destroy(new Error(`TIMEOUT: ИИ молчит ${s} с`)),s*1000) };
      const rq=mod.request(u,{method:'POST',headers,agent},r=>{ let buf='';
        if(r.statusCode>=400){ let d='';r.on('data',c=>d+=c);r.on('end',()=>reject(new Error('HTTP '+r.statusCode+': '+d.slice(0,500))));return }
        const raw=[]; const dec=new (require('string_decoder').StringDecoder)('utf8'); r.on('data',c=>{ const s=dec.write(c); if(process.env.IVANCODE_DEBUGAI) raw.push(s); buf+=s; /* русская буква, разрезанная между кусками сети, больше не превращается в «�» */ let i; while((i=buf.indexOf('\n'))>=0){ const l=buf.slice(0,i).trim(); buf=buf.slice(i+1);
          if(!l.startsWith('data:')) continue; const d=l.slice(5).trim(); if(d==='[DONE]') continue;
          try{ const j=JSON.parse(d); const ch=j.choices&&j.choices[0]; const dl=ch&&ch.delta||{}; const t=dl.content; const th=dl.reasoning_content||dl.reasoning;
            if(t){ got=true; arm(); send(t) } else if(th){ got=true; arm(); act('think',String(th).length) }
            if(ch&&ch.finish_reason==='length') send('\n\n[ответ оборван лимитом длины]') }catch{} } });
        r.on('end',()=>{ if(process.env.IVANCODE_DEBUGAI) fs.writeFileSync('/tmp/aidebug-'+Date.now()+'.json',JSON.stringify({req:JSON.parse(body),raw:raw.join('').slice(-20000)})); resolve() }) });
      aiReq[reqId]=rq; act('sent',body.length); arm(); rq.on('error',reject); const hard=setTimeout(()=>rq.destroy(new Error('TIMEOUT: ответ дольше '+(prov.hardTimeout||360)+' с')),(prov.hardTimeout||360)*1000); rq.on('close',()=>{ clearTimeout(hard); clearTimeout(wd); delete aiReq[reqId] }); rq.end(body) }); break }catch(er){ const m=String(er&&er.message||er).match(/FREE_LIMIT[\s\S]*?Retry after (\d+)\s*s/i)||(/^HTTP 429/.test(String(er&&er.message))?[0,'30']:null); if(att<1&&m&&!finished){ const s=Math.min(90,+m[1]+1); act('wait',s); await new Promise(r=>setTimeout(r,s*1000)); continue } throw er } }
    if(/pollinations/.test(prov.base||'')) global.__polLast=Date.now(); send('',true) }catch(err){ if(/pollinations/.test(prov.base||'')) global.__polLast=Date.now(); send('',true,String(err.message||err)) } });
ipcMain.handle('ai:models',async(e,prov)=>{ try{ const r=await fetch(prov.base.replace(/\/+$/,'')+'/models',{headers:prov.key?{Authorization:'Bearer '+prov.key}:{}}); const j=await r.json(); return (j.data||j.models||[]).map(m=>m.id||m.name) }catch(err){ return {error:String(err)} } });
const sitesUser=()=>path.join(app.getPath('userData'),'sites.json');
ipcMain.handle('sites:get',()=>{ try{return fs.readFileSync(sitesUser(),'utf8')}catch{ return fs.readFileSync(path.join(__dirname,'sites.json'),'utf8') } });
ipcMain.handle('sites:set',(e,t)=>{ JSON.parse(t); fs.writeFileSync(sitesUser(),t); return true });
ipcMain.handle('sites:reset',()=>{ try{fs.unlinkSync(sitesUser())}catch{} return true });
ipcMain.handle('webauto:js',()=>fs.readFileSync(path.join(__dirname,'webauto.js'),'utf8'));
if(process.env.IVANCODE_TEST){ app.whenReady().then(async()=>{ const sl=ms=>new Promise(r=>setTimeout(r,ms)); const wc=()=>win.webContents; const ex=j=>wc().executeJavaScript(j);
  const shot=async n=>{ await sl(900); fs.writeFileSync(path.join(process.env.IVANCODE_TEST,n+'.png'),(await win.capturePage()).toPNG()) };
  win.setBounds({x:0,y:0,width:1500,height:920}); await sl(4000); for(let i=0;i<20&&!(await ex('!!window.__ready'));i++) await sl(500);
  const log=[]; await shot('00-firstrun'); await ex(`document.querySelector('#askv').value='Иван'; document.querySelector('#mbtns .pri').click()`); await sl(500); const chk=async(n,j)=>{ let r; try{ r=await ex(j) }catch(e){ r='ERR '+e.message } log.push(n+': '+JSON.stringify(r)) };
  await ex(`__test.openRoot(${JSON.stringify(process.env.IVANCODE_PROJ)})`); await sl(800);
  await ex(`__test.openFile(${JSON.stringify(path.join(process.env.IVANCODE_PROJ,'main.py'))})`); await shot('01-editor');
  await chk('parse',`JSON.stringify(__test.parseBlocks("Исправил.\\nФАЙЛ: main.py\\n\`\`\`python main.py\\ndef summa(a, b):\\n    return a + b\\n\`\`\`\\n\`\`\`js src/new.js\\nconsole.log(1)\\n\`\`\`\\n\`\`\`python\\n# file: util.py\\nx=1\\n\`\`\`").map(b=>[b.lang,b.path]))`);
  await ex(`__test.aiTab('paste'); document.querySelector('#pasted').value="Исправил ошибку:\\nФАЙЛ: main.py\\n\`\`\`python main.py\\ndef summa(a, b):\\n    return a + b\\n\\nprint(\\"Сумма:\\", summa(2, 3))\\n\`\`\`"; __test.drawBlocks(document.querySelector('#pasted').value)`); await shot('02-paste');
  await ex(`document.querySelector('#blocks .pri').click()`); await shot('03-diff');
  await ex(`document.querySelector('#mbtns .pri').click()`); await sl(800);
  await chk('applied',`require?0:0`); await chk('file',`window.api.read(${JSON.stringify(path.join(process.env.IVANCODE_PROJ,'main.py'))})`);
  await ex(`__test.aiTab('chat'); __test.addMsg('user','**Исправить** выделенное'); __test.addMsg('🌐 DeepSeek','Ошибка в знаке.\\n\\nФАЙЛ: main.py\\n\`\`\`python main.py\\ndef summa(a, b):\\n    return a + b\\n\`\`\`')`); await shot('04-chat');
  await ex(`document.querySelector('[data-act=run]').click()`); await sl(2500); await shot('05-run'); await chk('runout',`document.querySelector('#p-out').textContent`);
  await ex(`document.querySelector('#sq').value='Сумма';document.querySelector('[data-side=search]').click();document.querySelector('#sq').dispatchEvent(new KeyboardEvent('keydown',{key:'Enter'}))`); await shot('06-search');
  await ex(`document.querySelector('[data-side=files]').click();__test.settings()`); await shot('07-settings');
  await ex(`document.querySelector('#mclose').click();document.querySelector('[data-act=theme]').click()`); await shot('08-themes'); await ex(`document.querySelector('#mclose').click()`);
  for(const th of ['ivanchai','night','paper','sea','hc']){ await ex(`setTheme('${th}')`); await shot('theme-'+th+'-editor'); }
  await ex(`setTheme('ivanchai'); window.__test.S.cur=null; showWelcome()`); for(const th of ['ivanchai','night','paper','sea','hc']){ await ex(`setTheme('${th}')`); await shot('theme-'+th+'-welcome'); }
  await ex(`setTheme('ivanchai')`); await ex(`document.body.classList.add('focus')`); await shot('15-focus'); await ex(`document.body.classList.remove('focus')`);
  await ex(`document.querySelector('[data-side=build]').click()`); await shot('10-build');
  await ex(`document.querySelector('#btools').click()`); await sl(800); await shot('11-tools'); await ex(`document.querySelector('#mclose').click(); window.__test.S.cfg.providers[0].base='http://127.0.0.1:18080/v1'; document.querySelector('#prov').value='ollama'`);
  await ex(`window.__test.openRoot(${JSON.stringify(process.env.IVANCODE_PROJ2)})`); await sl(1500); await ex(`document.querySelector('#bn').value=3; document.querySelector('#btargets [data-t=check]').click()`); await sl(9000); await shot('12-autofix');
  await chk('autofix',`document.querySelector('#p-build').textContent`); await chk('fixed',`window.api.read(${JSON.stringify(path.join(process.env.IVANCODE_PROJ2||'','bad.py'))})`);
  await ex(`document.querySelector('#bnew').click()`); await sl(500); await shot('13-newproj'); await ex(`document.querySelector('#mclose').click(); document.querySelector('[data-act=about]').click()`); await shot('14-about'); await ex(`document.querySelector('#mclose').click();__test.aiTab('web')`); await sl(9000); await shot('09-web');
  await chk('webauto',`(async()=>{ const wv=document.querySelector('webview'); return wv?wv.getURL():'nowv' })()`);
  await chk('term',`document.querySelector('#p-term').innerText.slice(0,200)`);
  fs.writeFileSync(path.join(process.env.IVANCODE_TEST,'log.txt'),log.join('\n')); app.quit() }) }

if(process.env.IVANCODE_ICONTEST){ app.whenReady().then(async()=>{ const sl=ms=>new Promise(r=>setTimeout(r,ms)); await sl(2500); const ex=j=>win.webContents.executeJavaScript(j); const out=process.env.IVANCODE_ICONTEST; const P=process.env.IVANCODE_PROJ;
  const shot=async n=>{ await sl(900); fs.writeFileSync(path.join(out,n+'.png'),(await win.capturePage()).toPNG()) };
  try{ await ex(`window.__test.openRoot(${JSON.stringify(P)})`); await sl(1500); await ex(`document.querySelector('[data-side=build]')?.click()`); await sl(800); await ex(`document.querySelector('#bicon').click()`); await sl(1000); await shot('icon-01-letter');
   if(process.env.IVANCODE_ICONIMG){ const b64=fs.readFileSync(process.env.IVANCODE_ICONIMG).toString('base64'); const nm=path.basename(process.env.IVANCODE_ICONIMG);
    await ex(`(async()=>{ const r=await fetch('data:${/svg$/i.test(nm)?'image/svg+xml':'image/png'};base64,${b64}'); const f=new File([await r.blob()],${JSON.stringify(nm)}); const dt=new DataTransfer(); dt.items.add(f); const i=document.querySelector('#icfile'); i.files=dt.files; i.dispatchEvent(new Event('change')); try{ const im=await ICON.load(URL.createObjectURL(new Blob([await f.arrayBuffer()],{type:'image/svg+xml'}))); await new Promise(r=>setTimeout(r,800)); return 'ok '+im.width+'x'+im.height+' take='+window.__ictake+' art='+!!(window.__icst&&window.__icst.art) }catch(e){ return 'ERR '+e } })()`).then(r=>fs.writeFileSync(path.join(out,'load.txt'),String(r))); await sl(1500);
    if(process.env.IVANCODE_ICONBG) await ex(`(()=>{const c=document.querySelector('#icbg'); c.value=${JSON.stringify(process.env.IVANCODE_ICONBG)}; c.dispatchEvent(new Event('input'))})()`); await sl(500); await shot('icon-02-image') }
   await ex(`[...document.querySelectorAll('button')].find(b=>b.textContent==='Сохранить').click()`); await sl(2500); await shot('icon-03-saved') }catch(e){ fs.writeFileSync(path.join(out,'err.txt'),String(e.stack||e)) } app.quit() }) }
if(process.env.IVANCODE_AGENT){ app.whenReady().then(async()=>{ const sc=JSON.parse(fs.readFileSync(process.env.IVANCODE_AGENT,'utf8')); const sl=ms=>new Promise(r=>setTimeout(r,ms)); const ex=j=>win.webContents.executeJavaScript(j);
  win.setBounds({x:0,y:0,width:1500,height:920}); await sl(3000); for(let i=0;i<40&&!(await ex('!!window.__ready'));i++) await sl(500); await sl(1500);
  console.log("UA:",await ex(`(document.querySelector("webview")||{}).useragent||"-"`));
  await ex(`window.__noFirstRun=true; window.__dumpPrompt=true; if(!document.querySelector('#modal').classList.contains('hidden')) document.querySelector('#mclose').click(); window.__test.S.cfg.cmdMode='auto'; window.__test.S.cfg.appName='ИванКод'; document.querySelector('#prov').value=${JSON.stringify(sc.provider)}; document.querySelector('#bfix').checked=true`);
  const shot=async n=>fs.writeFileSync(path.join(sc.out,n+'.png'),(await win.capturePage()).toPNG()); fs.mkdirSync(sc.out,{recursive:true});
  let tk=0; const tick=setInterval(()=>{ tk++; ex('window.__dump()').then(d=>fs.writeFileSync(path.join(sc.out,'live-dump.json'),d)).catch(e=>fs.writeFileSync(path.join(sc.out,'live-dump.json'),'ERR '+e.message)); (tk%2?shot('live'):(webV?webV.webContents.capturePage().then(i=>i.toDataURL()):Promise.resolve('')).then(d=>d&&fs.writeFileSync(path.join(sc.out,'live-web.png'),Buffer.from(d.split(',')[1],'base64')))).catch(()=>{}) },10000);
  for(const [i,st] of sc.steps.entries()){ await ex(`window.__test.openRoot(${JSON.stringify(sc.root)})`); await sl(1500);
   const t0=Date.now(); let ok;
   if(st.simple){ await ex(`window.__simple.smShow(true); document.querySelector('.s-kind button[data-k=${st.simple.kind||'pc'}]').click(); document.getElementById('s-desc').value=${JSON.stringify(st.simple.desc)}; document.getElementById('s-name').value=${JSON.stringify(st.simple.name||'')}`); await sl(800); await shot('simple-01-start'); await ex(`document.getElementById('s-go').click()`); let n=0; await sl(4000);
    while(await ex('window.__simple.SM.busy')){ await sl(15000); n++; if(n%8===1) await shot('simple-02-progress-'+String(n).padStart(3,'0')) }
    await sl(1500); await shot('simple-03-final'); ok=await ex(`JSON.stringify({files:window.__simple.SM.files,msg:document.getElementById('s-msg').textContent})`); } else
   if(st.build) ok=await ex(`(async()=>{ document.querySelector('[data-side=build]').click(); await new Promise(r=>setTimeout(r,800)); document.querySelector('#bn').value=${st.rounds||6}; return await buildLoop(${JSON.stringify(st.build)}) })()`).catch(e=>'ERR '+e.message);
   else ok=await ex(`window[${JSON.stringify(st.plan?'__agentPlan':'__agent')}](${JSON.stringify(st.task)},{rounds:${st.rounds||6}${st.ui?',ui:'+JSON.stringify(st.ui):''}${st.verify?`,verify:async()=>{ const r=await window.api.cmdRun(${JSON.stringify(sc.root)},${JSON.stringify(st.verify)},900000); return {ok:r.code===0,out:r.out} },verifyDesc:${JSON.stringify(st.verify)}`:''}})`).catch(e=>'ERR '+e.message);
   await shot('step'+(i+1)); let D={log:'',stats:{},chat:''}; try{ D=JSON.parse(await ex('window.__dump()')) }catch(e){ D.log='dump error '+e.message }
   fs.appendFileSync(path.join(sc.out,'agent-log.txt'),`\n\n===== ШАГ ${i+1}: ${st.task||('сборка '+st.build)} =====\nрезультат: ${ok}, время ${Math.round((Date.now()-t0)/1000)} с\n${D.log}\nСТАТИСТИКА: ${JSON.stringify(D.stats)}\n`);
   fs.writeFileSync(path.join(sc.out,'chat-step'+(i+1)+'.md'),D.chat); await ex('window.__AG.log=[]; window.__AG.stats={applied:0,rejected:0,cmds:0,cmdFail:0,rounds:0,reasons:{}}; document.querySelector("#msgs").innerHTML=""').catch(()=>{}); }
  clearInterval(tick); app.quit() }) }
ipcMain.handle('tools:list',()=>{ T.rescan(); return Object.entries(T.TOOLS).map(([id,t])=>{ const f=T.found(id); return {id,name:t.name,installed:f.found,path:f.path||'',version:f.version||''} }) });
ipcMain.handle('tools:root',()=>T.TROOT());
ipcMain.handle('deps:check',(e,way,kind)=>T.deps(way,kind));
ipcMain.handle('tools:install',async(e,id)=>{ const log=(t,cr)=>wsend('tools:log',t,!!cr); try{ if(id==='webview2'){ await T.installWebview2(log); return {ok:true} } await T.install(id,log); return {ok:true} }catch(err){ log('\n✖ '+err.message+'\n'); return {ok:false,err:err.message} } });
ipcMain.handle('proj:detect',(e,root)=>{ const k=T.detect(root); return {kind:k,targets:T.targets(k)} });
ipcMain.handle('proj:tpl',(e,kind,root,name,opt)=>{ fs.mkdirSync(root,{recursive:true}); return T.tpl(kind,root,name,opt) });
ipcMain.handle('icon:save',(e,root,files,cfg)=>T.iconSave(root,files,cfg));
ipcMain.handle('icon:get',(e,root)=>{ const d=path.join(root,'.ivancode','icon'); try{ return {cfg:JSON.parse(fs.readFileSync(path.join(d,'icon.json'),'utf8')),src:fs.existsSync(path.join(d,'source.png'))?fs.readFileSync(path.join(d,'source.png')).toString('base64'):null} }catch{ return null } });
ipcMain.handle('build:run',(e,root,kind,target,o)=>new Promise(res=>{ const wineRun=wc=>{ wsend('proc:data','build','▶ (wine) '+wc+'\n'); let out=''; fs.mkdirSync(path.join(root,'ivancode-out'),{recursive:true}); fs.writeFileSync(path.join(root,'ivancode-out','_b.cmd'),'@echo off\r\n'+wc+'\r\nexit /b %errorlevel%\r\n'); const p=cp.spawn('wine',['cmd','/c','ivancode-out\\_b.cmd'],{cwd:root,env:{...ENV(),WINEDEBUG:'-all',WINEPATH:'C:\\IvanTools\\python;C:\\IvanTools\\python\\Scripts;C:\\IvanTools\\nsis-3.10',PYTHONIOENCODING:'utf-8'}}); const dd=T.mkDec(); const h=d=>{ const s=dd(d); out+=s; wsend('proc:data','build',s) }; p.stdout.on('data',h); p.stderr.on('data',h); p.on('exit',c=>{ if(c===0){ const post=T.postFor(root,kind,target,o||{}); if(post&&post.zip){ try{ T.zipDir(post.zip.src,post.zip.out) }catch(er){ c=1; out+='ZIP: '+er.message } } } res({code:c,out,errors:T.parseErrors(out,root),cmd:wc}) }) }; try{ T.applyIcon(root,kind) }catch(er){} try{ T.prepBuild(root,kind) }catch(er){} let cmd=T.cmdFor(root,kind,target,o||{}); if(!cmd) return res({code:-1,out:'нет команды для '+kind+':'+target});
  if(process.env.IVANCODE_WINEBUILD&&kind!=='android'){ const w=p=>'Z:'+p.replace(/\//g,'\\'); const wc=T.cmdFor(root,kind,target,{...(o||{}),win:true,winRoot:w(root)}).replace(/"(\/[^"]*)"/g,(m,p)=>'"'+w(p)+'"'); return wineRun(wc) }
  cmd=T.fixPy(cmd); const show=cmd.replace(/password="[^"]*"/g,'password="***"'); wsend('proc:data','build','▶ '+show+'\n'); let out='';
  const p=cp.spawn(cmd,{cwd:root,shell:true,env:ENV(),windowsHide:true}); procs.build=p; const dd=T.mkDec(); const h=d=>{ const s=dd(d); out+=s; wsend('proc:data','build',s) };
  p.stdout.on('data',h); p.stderr.on('data',h); p.on('error',er=>h(Buffer.from(String(er)))); p.on('exit',c=>{ delete procs.build; if(c===0){ const post=T.postFor(root,kind,target,o||{}); if(post&&post.zip){ try{ const z=T.zipDir(post.zip.src,post.zip.out); h(Buffer.from(`\n📦 Портативный ZIP: ${post.zip.out} (${z.files} файлов, ${(z.size/1048576).toFixed(1)} МБ)\n`)) }catch(er){ h(Buffer.from('\n✖ ZIP: '+er.message+'\n')); c=1 } } } res({code:c,out,errors:T.parseErrors(out,root),cmd:show}) }) }));
// ---- UI-проверка веб-проекта: запускаем приложение, открываем страницу в скрытом окне, собираем ошибки JS и текст ----
function uiStartCmd(root,port){ const has=f=>fs.existsSync(path.join(root,f)); const req=has('requirements.txt')?fs.readFileSync(path.join(root,'requirements.txt'),'utf8'):'';
 if(/flask/i.test(req)){ const ent=has('run.py')?'run':has('app.py')?'app':has('wsgi.py')?'wsgi':'app'; return {cmd:T.fixPy(`python -m flask --app ${ent} run --port ${port} --no-reload`),url:`http://127.0.0.1:${port}/`} }
 if(has('index.html')) return {file:path.join(root,'index.html')}; return null }
ipcMain.handle('ui:check',async(e,root,o={})=>{ const port=17000+Math.floor(Math.random()*2000); const st=uiStartCmd(root,port); if(!st) return {skip:true};
 let proc=null, out=''; const errors=[]; const tmpDb=path.join(require('os').tmpdir(),'ivancode-ui-'+port+'.db');
 try{ if(st.cmd){ proc=cp.spawn(st.cmd,{cwd:root,shell:true,detached:process.platform!=='win32',env:{...ENV(),IVANCODE_UI_CHECK:'1',FLASK_DEBUG:'0',IVANCODE_DB:tmpDb},windowsHide:true}); proc.stdout.on('data',d=>out+=d); proc.stderr.on('data',d=>out+=d);
   let up=false; for(let i=0;i<40&&!up;i++){ await new Promise(r=>setTimeout(r,500)); up=await new Promise(r=>{ const rq=require('http').get(st.url,res=>{ res.resume(); r(true) }); rq.on('error',()=>r(false)); rq.setTimeout(800,()=>{ rq.destroy(); r(false) }) }) }
   if(!up) return {ok:false,report:'Приложение не запустилось за 20 с.\nВывод:\n'+out.slice(-3000)} }
  const w=new BrowserWindow({show:false,width:o.width||1280,height:o.height||900,webPreferences:{offscreen:false,sandbox:true}});
  w.webContents.on('console-message',(ev,level,msg,line,src)=>{ if(level>=3) errors.push(`console.error: ${msg} (${(src||'').split('/').pop()}:${line})`) });
  w.webContents.on('did-fail-load',(ev,code,desc,url)=>errors.push(`не загрузилось ${url}: ${desc}`));
  const failed=[]; w.webContents.session.webRequest.onCompleted(d=>{ if(d.statusCode>=400) failed.push(`${d.statusCode} ${d.method} ${d.url.replace(/^https?:\/\/[^/]+/,'')}`) });
  const ext=[]; w.webContents.session.webRequest.onBeforeRequest((d,cb)=>{ if(/^https?:/.test(d.url)&&!/^https?:\/\/(127\.0\.0\.1|localhost)/.test(d.url)) ext.push(d.url); cb({}) });
  if(st.cmd) await w.loadURL(st.url).catch(er=>errors.push(String(er))); else await w.loadFile(st.file).catch(er=>errors.push(String(er)));
  if(o.seed&&st.cmd) for(const it of o.seed){ await w.webContents.executeJavaScript(`fetch(${JSON.stringify(it.url)},{method:${JSON.stringify(it.method||'POST')},headers:{'Content-Type':'application/json'},body:${JSON.stringify(JSON.stringify(it.body||{}))}}).then(r=>r.status)`).catch(()=>{}) }
  if(o.seed) await w.reload();
  await new Promise(r=>setTimeout(r,2500));
  const info=await w.webContents.executeJavaScript(`(()=>{ const q=s=>document.querySelectorAll(s).length; const cs=getComputedStyle(document.body);
    return {title:document.title,text:document.body.innerText.slice(0,2500),inputs:q('input,select,textarea'),buttons:q('button'),css:document.styleSheets.length,font:cs.fontFamily,bg:cs.backgroundColor,overflowX:document.documentElement.scrollWidth>innerWidth+4} })()`).catch(er=>({err:String(er)}));
  let chk=[]; if(o.checks&&o.checks.length) chk=await w.webContents.executeJavaScript(`(()=>{ const C=${JSON.stringify(o.checks)}; const txt=document.body.innerText.toLowerCase(); return C.map(c=>{ let ok=true, why=''; try{ if(c.sel){ const el=document.querySelector(c.sel); if(!el){ ok=false; why='нет элемента '+c.sel } else if(!/^(LINK|SCRIPT|META|STYLE)$/.test(el.tagName)&&!el.closest('head')&&el.offsetParent===null&&getComputedStyle(el).position!=='fixed'){ ok=false; why='элемент '+c.sel+' скрыт' } } if(ok&&c.text&&!txt.includes(String(c.text).toLowerCase())){ ok=false; why='на странице нет текста «'+c.text+'»' } }catch(e){ ok=false; why='ошибка селектора '+c.sel } return {req:c.req,ok,why} }) })()`).catch(()=>[]);
  if(o.dark){ await w.webContents.executeJavaScript(`(()=>{ const b=[...document.querySelectorAll('button,[role=switch],input[type=checkbox]')].find(x=>/тем|theme|🌙|☀|dark|ночь/i.test((x.textContent||'')+(x.id||'')+(x.className||'')+(x.title||'')+(x.getAttribute('aria-label')||''))); const before=getComputedStyle(document.body).backgroundColor; if(b) b.click(); return new Promise(r=>setTimeout(()=>r({found:!!b,before,after:getComputedStyle(document.body).backgroundColor}),400)) })()`).then(r=>{ if(!r.found) chk.push({req:'переключатель темы',ok:false,why:'не найдена кнопка переключения темы (текст/id/title с «тема»/theme)'}); else if(r.before===r.after) chk.push({req:'тёмная тема',ok:false,why:'после нажатия переключателя темы цвет фона страницы не изменился ('+r.before+')'}) }).catch(()=>{}) }
  const lint=await w.webContents.executeJavaScript(`(()=>{ const P=[]; const vis=e=>e.offsetParent!==null&&e.getBoundingClientRect().width>0; const t=document.body.innerText;
   const bad=t.match(/\\b(undefined|NaN|null|\\[object Object\\])\\b/); if(bad) P.push('на странице виден текст «'+bad[1]+'» — ошибка в выводе данных');
   const btn=[...document.querySelectorAll('button,input[type=submit],input[type=button]')].filter(vis); const raw=btn.filter(b=>{ const c=getComputedStyle(b); return /^rgb\\(2(39|40), 2(39|40), 2(39|40)\\)$/.test(c.backgroundColor)&&c.borderRadius==='0px' }); if(raw.length) P.push(raw.length+' кнопок без оформления (стандартный серый вид браузера, напр. «'+(raw[0].textContent||raw[0].value||'').trim().slice(0,20)+'»): задай кнопкам фон, скругление, отступы');
   const W=innerWidth; const wide=[...document.querySelectorAll('span,small,em,b,i,label,div,button,a')].filter(e=>{ if(!vis(e)) return false; const tx=(e.innerText||'').trim(); if(!tx||tx.length>24||e.children.length>1) return false; const c=getComputedStyle(e); const bgc=c.backgroundColor; return bgc!=='rgba(0, 0, 0, 0)'&&bgc!=='transparent'&&e.getBoundingClientRect().width>W*0.5&&!/^(BUTTON)$/.test(e.tagName)||e.tagName==='BUTTON'&&e.getBoundingClientRect().width>W*0.6&&W>700 }); if(wide.length) P.push('элементы растянуты на всю ширину («'+(wide[0].innerText||'').trim().slice(0,20)+'» и ещё '+(wide.length-1)+'): бейджи/чипы/кнопки должны быть компактными (display:inline-flex или inline-block)');
   const cards=[...document.querySelectorAll('[class*=card],[class*=task],li')].filter(vis); if(cards.length>=2){ const h=cards.slice(0,5).map(c=>c.getBoundingClientRect().height); if(Math.max(...h)>innerHeight*0.32&&W>700) P.push('карточки слишком высокие ('+Math.round(Math.max(...h))+'px): элементы карточки стоят столбиком — расположи их в строку (flex), компактнее') }
   const cb=document.body; const r=[...cb.querySelectorAll('h1,header')].filter(vis)[0]; if(r&&r.getBoundingClientRect().left<4) P.push('содержимое прижато к краю окна — добавь отступы/контейнер с max-width');
   return P })()`).catch(()=>[]);
  let shot=null; try{ const img=await w.webContents.capturePage(); fs.mkdirSync(path.join(root,'.ivancode'),{recursive:true}); shot=path.join(root,'.ivancode','ui-check.png'); fs.writeFileSync(shot,img.toPNG()) }catch{}
  w.destroy();
  const probs=[...chk.filter(c=>!c.ok).map(c=>'не выполнено «'+c.req+'»: '+c.why),...errors,...failed.map(f=>'HTTP '+f),...[...new Set(ext)].slice(0,5).map(u=>'внешний ресурс (CDN запрещён, всё должно быть локально): '+u)]; if(info.overflowX) probs.push('страница шире окна — горизонтальная прокрутка');
  if(!info.css) probs.push('на странице нет ни одной таблицы стилей (CSS)'); for(const l of (lint||[])) probs.push('ДИЗАЙН: '+l);
  const report=`UI-проверка (страница открыта в браузере студии${o.seed?', предварительно созданы тестовые данные через API':''}):\nЗаголовок: ${info.title||'—'}\nПолей ввода: ${info.inputs}, кнопок: ${info.buttons}, таблиц стилей: ${info.css}, шрифт: ${info.font}, фон: ${info.bg}\n${probs.length?'ПРОБЛЕМЫ:\n- '+probs.join('\n- '):'Ошибок JS и неудачных запросов нет.'}\nВидимый текст страницы:\n${(info.text||info.err||'').slice(0,2000)}`;
  return {ok:!probs.length,report,shot} }
 finally{ if(proc){ try{ process.platform==='win32'?cp.execSync('taskkill /pid '+proc.pid+' /T /F'):process.kill(-proc.pid) }catch{ try{ proc.kill() }catch{} } } try{ fs.unlinkSync(tmpDb) }catch{} } });
ipcMain.handle('build:errors',(e,out,root)=>T.parseErrors(out,root));
ipcMain.handle('keystore:create',async(e,o)=>{ const env=ENV(); const kt=process.platform==='win32'?'keytool.exe':'keytool';
  const dn=`CN=${o.cn||'Developer'}, O=${o.org||'-'}, C=RU`; fs.mkdirSync(path.dirname(o.file),{recursive:true});
  const r=await T.run(kt,['-genkeypair','-v','-keystore',o.file,'-storetype','PKCS12','-alias',o.alias,'-keyalg','RSA','-keysize','2048','-validity','10000','-storepass',o.storePass,'-keypass',o.storePass,'-dname',dn],{env});
  return {ok:r.code===0,out:r.out.replace(/pass\S*/gi,'')} });
ipcMain.handle('backup:make',(e,root,files)=>{ const d=path.join(root,'.ivancode','backup',new Date().toISOString().replace(/[:.]/g,'-')); fs.mkdirSync(d,{recursive:true}); for(const f of files){ if(!fs.existsSync(f)) continue; const t=path.join(d,path.relative(root,f)); fs.mkdirSync(path.dirname(t),{recursive:true}); fs.copyFileSync(f,t) } fs.writeFileSync(path.join(d,'files.json'),JSON.stringify(files)); return d });
ipcMain.handle('backup:restore',(e,root,d)=>{ const files=JSON.parse(fs.readFileSync(path.join(d,'files.json'),'utf8')); for(const f of files){ const s=path.join(d,path.relative(root,f)); if(fs.existsSync(s)) fs.copyFileSync(s,f); else try{fs.unlinkSync(f)}catch{} } return files.length });
ipcMain.handle('backup:list',(e,root)=>{ const d=path.join(root,'.ivancode','backup'); try{ return fs.readdirSync(d).sort().reverse().map(n=>path.join(d,n)) }catch{ return [] } });
ipcMain.handle('app:version',()=>app.getVersion());
ipcMain.handle('cmd:run',(e,cwd,cmd,timeoutMs)=>new Promise(res=>{ let out=''; cmd=T.fixPy(cmd); const p=cp.spawn(cmd,{cwd,shell:true,env:ENV(),windowsHide:true}); procs.agentcmd=p;
  const dd=T.mkDec(); const h=d=>{ const s=dd(d); out+=s; wsend('proc:data','build',s) }; p.stdout.on('data',h); p.stderr.on('data',h);
  const t=setTimeout(()=>{ out+='\n[таймаут '+Math.round((timeoutMs||600000)/1000)+' с — процесс остановлен]'; try{ process.platform==='win32'?cp.exec('taskkill /pid '+p.pid+' /T /F'):p.kill('SIGKILL') }catch{} },timeoutMs||600000);
  p.on('error',er=>{ out+=String(er) }); p.on('exit',c=>{ clearTimeout(t); delete procs.agentcmd; res({code:c,out}) }) }));
ipcMain.handle('fs:readmaybe',(e,f)=>{ try{ return ENC.read(f) }catch{ return null } });
ipcMain.handle('fs:unlink',(e,f)=>{ try{ fs.unlinkSync(f); return true }catch{ return false } });
// ---- встроенный браузер ИИ-сайтов: WebContentsView (как обычная вкладка Chrome) ----
const { WebContentsView } = require('electron');
let webV=null, webVis=false, webRect={x:0,y:0,width:10,height:10};
function webEnsure(){ if(webV) return webV; webV=new WebContentsView({webPreferences:{partition:'persist:ivancode-web',backgroundThrottling:false,contextIsolation:true}});
 webV.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/'+process.versions.chrome+' Safari/537.36');
 webV.webContents.setWindowOpenHandler(({url})=>{ webV.webContents.loadURL(url); return {action:'deny'} });
 win.contentView.addChildView(webV); webPlace(); return webV }
function webPlace(){ if(!webV) return; if(webVis) webV.setBounds(webRect); else { const [w,h]=win.getContentSize(); webV.setBounds({x:w-2,y:h-2,width:900,height:800}) } } // скрыт: почти целиком за краем, но продолжает рендериться
ipcMain.handle('sys:info',()=>({mem:require('os').totalmem(),cpus:require('os').cpus().length,platform:process.platform}));
ipcMain.handle('ollama:setup',async(e,model)=>{ const say=t=>wsend('ollama:progress',t); const http=require('http');
 const up=()=>new Promise(r=>{ const q=http.get('http://127.0.0.1:11434/api/tags',x=>{ x.resume(); r(x.statusCode===200) }); q.on('error',()=>r(false)); q.setTimeout(3000,()=>{ q.destroy(); r(false) }) });
 try{ if(!(await up())){ if(process.platform==='win32'){ const f=path.join(app.getPath('temp'),'OllamaSetup.exe'); say('Скачиваю Ollama (~1 ГБ)…'); await T.download('https://ollama.com/download/OllamaSetup.exe',f,(a,b)=>say(`Скачиваю Ollama: ${b?Math.round(a*100/b):Math.round(a/1048576)}${b?'%':' МБ'}`)); say('Устанавливаю Ollama…'); await new Promise((r,j)=>cp.execFile(f,['/VERYSILENT','/NORESTART','/SUPPRESSMSGBOXES'],er=>er?j(er):r())); }
   else { const b=['/usr/local/bin/ollama',path.join(require('os').homedir(),'ollama','bin','ollama')].find(x=>fs.existsSync(x)); if(!b) throw new Error('Ollama не найдена: установите с ollama.com'); cp.spawn(b,['serve'],{detached:true,stdio:'ignore'}).unref() }
   for(let i=0;i<60&&!(await up());i++) await new Promise(r=>setTimeout(r,1000)); if(!(await up())) throw new Error('Ollama не запустилась') }
  say('Скачиваю модель '+model+'…'); await new Promise((res,rej)=>{ const q=http.request({host:'127.0.0.1',port:11434,path:'/api/pull',method:'POST',headers:{'Content-Type':'application/json'}},x=>{ let buf=''; x.on('data',d=>{ buf+=d; const ls=buf.split('\n'); buf=ls.pop(); for(const l of ls){ try{ const j=JSON.parse(l); if(j.error) return rej(new Error(j.error)); say('Модель '+model+': '+(j.total?Math.round((j.completed||0)*100/j.total)+'%':j.status)) }catch{} } }); x.on('end',res) }); q.on('error',rej); q.end(JSON.stringify({name:model})) });
  return {ok:true} }catch(er){ if(!/pull|redirect|manifest|connect|network|timeout|EAI|ECONN/i.test(er.message)||e._hf) return {ok:false,err:er.message}
  // запасной путь: та же открытая модель в формате GGUF с huggingface.co → ollama create
  try{ const size=(model.match(/:(\d+(?:\.\d+)?b)/)||[])[1]||'7b'; const S=size.toUpperCase(); const url=`https://huggingface.co/Qwen/Qwen2.5-Coder-${S}-Instruct-GGUF/resolve/main/qwen2.5-coder-${size}-instruct-q4_k_m.gguf`;
   const dir=path.join(app.getPath('userData'),'models'); fs.mkdirSync(dir,{recursive:true}); const g=path.join(dir,`qwen2.5-coder-${size}.gguf`); say('Скачиваю модель с huggingface.co…'); await T.download(url,g,(a,b)=>say(`Модель ${model}: ${b?Math.round(a*100/b)+'%':Math.round(a/1048576)+' МБ'}`));
   const mf=path.join(dir,'Modelfile-'+size); fs.writeFileSync(mf,`FROM ${g}\nPARAMETER num_ctx 16384\nTEMPLATE """{{- if .System }}<|im_start|>system\n{{ .System }}<|im_end|>\n{{ end }}{{- range .Messages }}<|im_start|>{{ .Role }}\n{{ .Content }}<|im_end|>\n{{ end }}<|im_start|>assistant\n"""\nPARAMETER stop <|im_end|>\n`);
   const bin=[path.join(process.env.LOCALAPPDATA||'','Programs','Ollama','ollama.exe'),'/usr/local/bin/ollama',path.join(require('os').homedir(),'ollama','bin','ollama')].find(x=>x&&fs.existsSync(x))||'ollama'; say('Подключаю модель к Ollama…');
   await new Promise((r,j)=>cp.execFile(bin,['create',model,'-f',mf],{maxBuffer:1<<24},(x,o,eo)=>x?j(new Error(String(eo||x.message).slice(-300))):r())); return {ok:true,via:'huggingface'} }catch(e2){ return {ok:false,err:er.message+' / '+e2.message} } } });
ipcMain.handle('acct:check',async()=>{ const {session}=require('electron'); const ck=await session.fromPartition('persist:ivancode-web').cookies.get({}).catch(()=>[]); const now=Date.now()/1000; const has=(dom,re)=>ck.some(c=>c.domain.includes(dom)&&re.test(c.name)&&String(c.value).length>20&&(!c.expirationDate||c.expirationDate>now));
 return {qwen:has('qwen',/^(token|auth|session)/i),deepseek:has('deepseek',/(token|session|auth)/i),gigachat:has('giga',/(token|session|auth)/i),chatgpt:has('chatgpt',/session-token/i),claude:has('claude',/sessionKey/i),grok:has('grok',/(sso|session|auth)/i)} });
function webGo(url,maxMs){ const wc=webEnsure().webContents; return new Promise(res=>{ let done=false; const fin=()=>{ if(done) return; done=true; clearTimeout(t); wc.off('dom-ready',fin); wc.off('did-fail-load',fin); res(wc.getURL()) }; const t=setTimeout(fin,maxMs||8000); wc.once('dom-ready',fin); wc.once('did-fail-load',fin); wc.loadURL(url).catch(()=>{}) }) }
ipcMain.handle('web:open',(e,url)=>webGo(url));
ipcMain.handle('web:exec',(e,js)=>{ webEnsure(); return Promise.race([webV.webContents.executeJavaScript(js,true),new Promise((_,rej)=>setTimeout(()=>rej(new Error('web:exec таймаут')),20000))]) });
ipcMain.handle('web:place',(e,rect,vis)=>{ if(rect) webRect={x:Math.round(rect.x),y:Math.round(rect.y),width:Math.max(10,Math.round(rect.width)),height:Math.max(10,Math.round(rect.height))}; webVis=!!vis; webPlace(); return true });
ipcMain.handle('web:url',()=>webV?webV.webContents.getURL():'');
ipcMain.handle('web:shot',async()=>webV?(await webV.webContents.capturePage()).toDataURL():'');
// автотест (только при IVANCODE_EVAL=путь к сценарию): сценарий получает окно и помощники
if(process.env.IVANCODE_EVAL){ app.whenReady().then(async()=>{ win.webContents.on('console-message',(e,lvl,msg,line,src)=>{ if(lvl>=2) console.log('RENDERER',msg,src+':'+line) }); const sl=ms=>new Promise(r=>setTimeout(r,ms)); const ex=j=>win.webContents.executeJavaScript(j);
  await sl(2500); for(let i=0;i<60&&!(await ex('!!window.__ready').catch(()=>false));i++) await sl(500);
  const shot=async f=>fs.writeFileSync(f,(await win.capturePage()).toPNG());
  try{ await require(process.env.IVANCODE_EVAL)({win,ex,sl,shot,webShot:async f=>{ if(webV) fs.writeFileSync(f,(await webV.webContents.capturePage()).toPNG()) },webBounds:()=>webV?webV.getBounds():null,winSize:()=>win.getContentSize()}) }catch(e){ console.log('TEST ERROR',e&&e.stack||e) } app.quit() }) }
