// ИванКод 1.2: быстрый путь простого режима — ИИ пишет всю программу одним ответом по готовой заготовке, студия сама проверяет и упаковывает за секунды
const FAST={stats:null};
function fastWay(){ return (S.cfg.simpleWay||'fast')==='fast' }
function fastStat(k,ms){ const s=FAST.stats; if(s) s[k]=(s[k]||0)+ms }
async function fastSave(name,text){ try{ if(!S.root) return; FAST.n=(FAST.n||0)+1; await api.write(S.root+sep+'.ivancode'+sep+'runs'+sep+FAST.run+sep+String(FAST.n).padStart(2,'0')+'-'+name,String(text)) }catch{} }
async function fastAsk(user,why){ await fastSave('prompt.txt','SYSTEM:\n'+WebApp.SYS+'\n\nUSER:\n'+user); const t0=Date.now(); const a=await askAI([{role:'system',content:WebApp.SYS},{role:'user',content:user}],{round:1}); fastStat('ai',Date.now()-t0); if(FAST.stats) FAST.stats.aiCalls=(FAST.stats.aiCalls||0)+1; await fastSave('reply.txt',a==null?'(нет ответа)':a); alog('  ⚡ '+why+': ответ ИИ '+(a?a.length:0)+' симв. за '+fmtT(Date.now()-t0)); return a }
async function fastWrite(name,sec){ const f=S.root+sep+'index.html'; const before=(await api.readMaybe(f))||''; const html=WebApp.skeleton(name,sec); await writeFileQuiet(f,html);
 // правка должна лечь в файл в точности: читаю обратно и сверяю разделы
 const back=(await api.readMaybe(f))||''; const got=WebApp.sections(back); const bad=['css','html','js'].filter(k=>(got[k]||'').trim()!==(sec[k]||'').trim());
 await fastSave('applied.json',JSON.stringify({sections:{css:sec.css.length,html:sec.html.length,js:sec.js.length},bytesBefore:before.length,bytesAfter:back.length,mismatch:bad},null,1));
 if(bad.length){ PG.log('Ошибка студии: правка легла в файл неточно ('+bad.join(', ')+') — записываю заново','err'); await api.write(f,html) } return html }
async function fastCheck(html){ const t0=Date.now(); const _r=await fastCheck0(html); await fastSave('check.json',JSON.stringify({ok:_r.ok,errors:_r.errors,msgs:_r.msgs,warns:_r.warns,smoke:_r.smoke},null,1)); fastStat('check',Date.now()-t0); return _r }
async function fastCheck0(html){ const t0=Date.now(); const r=await api.webCheck(S.root+sep+'index.html',{shot:S.root+sep+'.ivancode'+sep+'check.png',width:SM.kind==='phone'?412:1100,height:SM.kind==='phone'?860:760}); 
 r.msgs=WebApp.fmtErrors(r.errors,html); return r }
// одна попытка получить разделы; ответ не по формату → один короткий повтор с напоминанием формата
async function fastGet(prompt,why,cur){ let a=await fastAsk(prompt,why); if(a==null) return null; if(!String(a).trim()){ PG.log('ИИ прислал пустой ответ — повторяю запрос','warn'); a=await fastAsk(prompt,why+' (повтор пустого)'); if(a==null) return null } let p=WebApp.parseAnswer(a);
 if(!WebApp.hasCode(WebApp.merge(cur||{},p))||(!cur&&!WebApp.hasCode(p))){ PG.log('ИИ ответил не по формату — прошу ещё раз, коротко','warn'); FAST.quick++; a=await fastAsk(prompt+'\n\nВНИМАНИЕ: предыдущий ответ был не по формату. Ответь ТОЛЬКО разделами ===CSS===, ===HTML===, ===JS===, ===КОНЕЦ===, без пояснений.','повтор формата'); if(a==null) return null; p=WebApp.parseAnswer(a) }
 if(p.fixes.length){ PG.log('Студия сама поправила ответ ИИ: '+p.fixes.join('; '),'good'); alog('  🔧 '+p.fixes.join('; ')) } p.answer=a; await fastSave('parsed.json',JSON.stringify({fixes:p.fixes,truncated:p.truncated,css:p.css,html:p.html,js:p.js},null,1)); return p }
async function fastRun(desc,isChange,mode){ if(SM.busy) return; SM.busy=true; AIW.reset(); PG.reset(); SM.last={desc,isChange,mode}; SM.stage=''; SM.fast=true; FAST.quick=0; FAST.n=0; FAST.run=new Date().toISOString().replace(/[:.]/g,'-'); FAST.stats={t0:Date.now(),ai:0,check:0,build:0,aiCalls:0};
 const resume=mode==='resume'&&SM.root&&!isChange; if(!isChange&&!resume) SM.root=null; sm$('s-start').classList.add('hidden'); sm$('s-work').classList.remove('hidden'); sm$('s-final').classList.add('hidden'); smMsg(''); if(sm$('s-shot')) sm$('s-shot').classList.add('hidden'); sm$('s-title').textContent=mode==='improve'?'Улучшаю программу…':isChange?'Вношу изменения…':'Делаю программу…';
 let result=null;
 try{ if(resume){ await openRoot(SM.root); PG.log('Продолжаю: проект «'+SM.name+'» уже создан') } else if(!isChange){ smStage('plan','Создаю проект…'); const nm=(sm$('s-name').value.trim()||desc.replace(/^(сделай|создай|напиши|нужна|нужен|программ[ау]|приложение)\s+/i,'').split(/[.,:;!\n]/)[0].split(/\s+/).slice(0,3).join(' ')||'Моя программа'); SM.name=nm[0].toUpperCase()+nm.slice(1);
   const dir=(await api.docsDir())+sep+(await api.translit(SM.name)); let d=dir, k=2; while(await api.exists(d)) d=dir+'-'+(k++);
   await api.mkdir(d); await api.write(d+sep+'index.html',WebApp.skeleton(SM.name,{})); try{ await api.iconSave(d,ICON.files({bg:['#4f6bed','#2e9d6a','#e0675d','#d48a1f','#8a56d6'][SM.name.length%5],scale:1,letter:SM.name[0].toUpperCase(),art:null}),{bg:'#4f6bed',scale:1}) }catch{}
   await openRoot(d); SM.root=d; await api.write(d+sep+'.ivancode'+sep+'about.json',JSON.stringify({name:SM.name,kind:SM.kind,desc,way:'fast'},null,1)) }
  await acctRefresh(); if(!window.__keepProv){ const sel=S.cfg.simpleAi||'auto'; if(sel!=='auto'&&[...$('#prov').options].some(o=>o.value===sel)) $('#prov').value=sel; else { const lg=(S.cfg.acct||'auto')!=='no'&&Object.keys(ACCT.logged).find(k=>ACCT.logged[k]&&site(k)); $('#prov').value=lg?'web:'+lg:'pollinations' } }
  if(!(await depsGate('fast'))){ PG.log('Отменено'); return }
  PG.setProv(provName($('#prov').value)); alog('» ⚡ Быстрый путь: вся программа одним ответом ИИ ('+provName($('#prov').value)+')');
  const curHtml=isChange?(await api.readMaybe(S.root+sep+'index.html'))||'':''; let cur=isChange?WebApp.sections(curHtml):null;
  smStage('write',isChange?'ИИ вносит изменения…':'ИИ пишет программу целиком…'); PG.log(isChange?'Отправил ИИ текущую программу и вашу просьбу':'Отправил ИИ описание и готовую заготовку программы');
  const prompt=isChange?WebApp.changePrompt(SM.name,cur,desc,SM.lastIssues&&mode==='improve'?SM.lastIssues:null):WebApp.firstPrompt(SM.name,desc,SM.kind);
  let p=await fastGet(prompt,isChange?'изменение':'программа целиком',cur); if(!p){ PG.halted(); return }
  let sec=WebApp.merge(cur||{},p); let html=await fastWrite(SM.name,sec); PG.log('Программа написана: '+html.length+' символов'+(p.truncated?' (ответ ИИ оборвался — студия дописала концовку)':''),'good');
  // встроенная проверка: открываю программу, нажимаю кнопки, ловлю ошибки JS; до 2 быстрых исправлений
  smStage('check','Открываю программу и нажимаю кнопки…'); let chk=await fastCheck(html); let best={sec,html,chk};
  for(let fix=1;fix<=1&&!chk.ok&&FAST.quick<1;fix++){ FAST.quick++; PG.log('Проверка нашла: '+chk.msgs.slice(0,3).join('; '),'warn'); smStage('check',`Нашлась ошибка — ИИ быстро исправляет (одна попытка)…`);
   const q=await fastGet(WebApp.changePrompt(SM.name,sec,'',chk.msgs),'исправление '+fix,sec); if(!q) break; const sec2=WebApp.merge(sec,q); const html2=await fastWrite(SM.name,sec2); const c2=await fastCheck(html2);
   if(c2.errors.length<=best.chk.errors.length){ sec=sec2; html=html2; chk=c2; best={sec,html,chk} } else { PG.log('Исправление сделало хуже — оставляю прошлый вариант','warn'); await fastWrite(SM.name,best.sec); sec=best.sec; html=best.html; chk=best.chk } }
  if(chk.ok) PG.log('Проверка пройдена: ошибок нет, нажато кнопок — '+((chk.smoke||{}).clicked||[]).length,'good');
  // Контролёр — не больше одной проверки
  if(ctrlOn()&&chk.ok&&FAST.quick<1&&!AIW.stop&&mode!=='improve'){ smStage('check','Контролёр сверяет программу с описанием…'); const t0=Date.now(); const rv=await CTRL.review('Программа по описанию пользователя: '+desc,WebApp.CTRL_NOTE+'\n\nОписание: '+desc,'(вся программа одним файлом)',[['index.html (CSS)',sec.css],['index.html (HTML)',sec.html],['index.html (JS)',sec.js]]); fastStat('ctrl',Date.now()-t0);
   if(rv&&!rv.ok&&rv.notes&&rv.notes.length&&!AIW.stop){ FAST.quick++; smStage('write','Доделываю по замечаниям Контролёра…'); const q=await fastGet(WebApp.changePrompt(SM.name,sec,'Доделай по замечаниям проверяющего: '+rv.notes.join('; '),null),'по замечаниям Контролёра',sec);
    if(q){ const sec2=WebApp.merge(sec,q); const html2=await fastWrite(SM.name,sec2); const c2=await fastCheck(html2); if(c2.errors.length<=chk.errors.length){ sec=sec2; html=html2; chk=c2 } else { PG.log('После доделки появились ошибки — оставляю проверенный вариант','warn'); await fastWrite(SM.name,sec) } } } }
  SM.lastIssues=[...chk.msgs,...(chk.warns||[])]; if(AIW.stop){ PG.halted(); return }
  // упаковка: без инструментов на ПК, секунды
  // сломанную программу НЕ собираем и цикл заново НЕ запускаем: честный итог с ошибкой и строкой
  if(!chk.ok){ if(isChange&&curHtml&&WebApp.hasCode(cur)){ await api.write(S.root+sep+'index.html',curHtml); PG.log('Изменение не прошло проверку — вернул прошлую рабочую версию','warn') }
   result={ok:false,chk,noBuild:true}; await fastBroken(chk,isChange&&!!curHtml); return }
  if(!(await fastPack())) return; result={ok:true,chk}; await fastFinish(result) }
 catch(e){ smMsg('Что-то пошло не так: '+e.message); PG.fail('Что-то пошло не так: '+e.message) } finally{ SM.busy=false; PG.done(); if(FAST.stats){ FAST.stats.total=Date.now()-FAST.stats.t0; FAST.stats.ok=!!(result&&result.ok); FAST.stats.issues=SM.lastIssues; alog('  ⏱ итог: всего '+fmtT(FAST.stats.total)+', ИИ '+fmtT(FAST.stats.ai)+' ('+FAST.stats.aiCalls+' запр.), проверка '+fmtT(FAST.stats.check)+', упаковка '+fmtT(FAST.stats.build)); window.__fastStats=FAST.stats } } }
async function fastPack(){ SM.stage='build'; const T=SM.kind==='phone'?[['apk','Собираю приложение для телефона (APK)…']]:[['exe','Собираю программу (EXE)…'],['installer','Собираю установщик…']]; SM.files=[];
 for(const [t,label] of T){ smStage('build',label); const t0=Date.now(); const r=await api.webPack(S.root,t,{name:SM.name}); fastStat('build',Date.now()-t0); PG.log(r.out,r.code?'err':'good');
  if(r.code){ smStage('build','Не получилось собрать',true); sm$('s-title').textContent='Не получилось собрать ⚠'; smMsg(r.out+'\n\nЭто ошибка студии, а не программы. Нажмите «🔄 Повторить».'); PG.fail(r.out); return false } SM.files.push(r.file) }
 SM.out=S.root+sep+'Готовая программа'; return true }
async function fastBroken(chk,reverted){ smStage('check','Проверка не пройдена',true); sm$('s-title').textContent='Программа не прошла проверку ⚠';
 smMsg('ИИ написал программу, но в ней осталась ошибка, поэтому собирать её я не стал'+(reverted?' (ваша прошлая рабочая версия сохранена и не тронута)':'')+'.\n\nЧто нашла проверка:\n• '+chk.msgs.slice(0,4).join('\n• ')+'\n\nНажмите «✨ Улучшить» — ИИ получит эту ошибку с номером строки и исправит её. Или опишите, что поменять.');
 PG.log('Сборка не запускалась: программа с ошибкой не собирается','warn'); const sh=sm$('s-shot'); if(sh&&chk.shot){ sh.src='file://'+chk.shot.replace(/\\/g,'/')+'?'+Date.now(); sh.classList.remove('hidden') }
 sm$('s-run').textContent='👁 Открыть как есть'; SM.files=[]; sm$('s-final').classList.remove('hidden');
 const R=S.cfg.simpleRecent||[]; S.cfg.simpleRecent=[{root:S.root,name:SM.name,kind:SM.kind,way:'fast',t:Date.now()},...R.filter(x=>x.root!==S.root)].slice(0,8); saveCfg() }
async function fastFinish(res){ smStage('done','Программа готова!'); const ok=!res||res.ok; sm$('s-title').textContent=ok?'Готово! 🎉':'Готово — но проверка заметила проблему ⚠';
 const nm=f=>String(f).split(/[\\/]/).pop(); const exe=SM.files.find(f=>/\.exe$/i.test(f)&&!/установщик/i.test(f)), inst=SM.files.find(f=>/установщик/i.test(f)), apk=SM.files.find(f=>/\.apk$/i.test(f));
 let m=SM.kind==='phone'?`Приложение для Android: ${apk?nm(apk):'—'}\nСкопируйте этот файл на телефон и откройте его, чтобы установить.`:`Программа: ${exe?nm(exe):'—'} (запускается сразу, без установки)\nУстановщик для других компьютеров: ${inst?nm(inst):'—'}\nВсё лежит в папке «Готовая программа».`;
 if(!ok&&res&&res.chk) m+='\n\n⚠ Что заметила проверка:\n• '+res.chk.msgs.slice(0,4).join('\n• ')+'\n\nНажмите «✨ Улучшить» — ИИ исправит это.'; else if(res&&res.chk&&res.chk.warns&&res.chk.warns.length) m+='\n\nℹ Замечания проверки: '+res.chk.warns.slice(0,2).join('; ');
 smMsg(m); const sh=sm$('s-shot'); if(sh&&res&&res.chk&&res.chk.shot){ sh.src='file://'+res.chk.shot.replace(/\\/g,'/')+'?'+Date.now(); sh.classList.remove('hidden') }
 sm$('s-run').textContent=SM.kind==='phone'?'📱 Где APK?':'▶ Запустить'; sm$('s-final').classList.remove('hidden');
 const R=S.cfg.simpleRecent||[]; S.cfg.simpleRecent=[{root:S.root,name:SM.name,kind:SM.kind,way:'fast',t:Date.now()},...R.filter(x=>x.root!==S.root)].slice(0,8); saveCfg() }
// перехват: простой режим по умолчанию идёт быстрым путём; старый путь (Python/Kotlin) — «для опытных»
const _smRun=smRun; smRun=function(desc,isChange,resume){ const fastProj=isChange&&SM.fast; if(fastProj||(!isChange&&fastWay())) return fastRun(desc,isChange,resume==='improve'?'improve':resume===true&&SM.fast?'resume':null); SM.fast=false; return _smRun(desc,isChange,resume) };
const _smBuild=smBuild; smBuild=async function(){ if(SM.fast){ return fastPack() } return _smBuild() };
const _smFinish=smFinish; smFinish=async function(){ if(SM.fast){ if(!SM.files||!SM.files.length){ const d=S.root+sep+'Готовая программа'; SM.out=d; SM.files=((await api.list(d).catch(()=>[]))||[]).map(x=>x.path||d+sep+x.name) } return fastFinish(null) } return _smFinish() };
if(sm$('s-improve')) sm$('s-improve').onclick=()=>{ if(SM.busy) return; const extra=sm$('s-ask').value.trim(); sm$('s-ask').value=''; smRun('Улучши программу: '+(extra||'исправь всё, что заметила проверка, сделай удобнее и красивее, ничего не ломая и сохранив данные пользователя (те же ключи store).'),true,'improve') };
if(sm$('s-way')){ sm$('s-way').value=S.cfg.simpleWay||'fast'; sm$('s-way').onchange=()=>{ S.cfg.simpleWay=sm$('s-way').value; saveCfg() }; setTimeout(()=>{ sm$('s-way').value=S.cfg.simpleWay||'fast' },1500) }
// «Мои программы»: быстрые проекты открываются как быстрые
{ const _rec=smRecent; smRecent=async function(){ await _rec(); const R=(S.cfg.simpleRecent||[]); sm$('s-recent').onclick=async e=>{ const r=R[+e.target.dataset.i]; if(!r) return; SM.kind=r.kind; SM.name=r.name; SM.fast=r.way==='fast'; SM.files=null; await openRoot(r.root); SM.root=r.root; sm$('s-start').classList.add('hidden'); sm$('s-work').classList.remove('hidden'); await smFinish() } } }
sm$('s-run').onclick=async()=>{ const exe=(SM.files||[]).find(f=>/\.exe$/i.test(f)&&!/Setup|установщик/i.test(f)); if(SM.kind==='pc'&&exe&&/Windows/.test(navigator.userAgent)) api.openPath(exe); else if(SM.fast&&SM.kind==='pc') api.openPath(S.root+sep+'index.html'); else api.openPath(SM.out) };
window.__fast={fastRun,fastPack,FAST};

// режим для опытных: веб-проект собирается упаковкой, без инструментов
{ const _bl=buildLoop; buildLoop=async function(target){ if(PK&&PK.kind==='web'){ panelTab('build'); for(const t of S.tabs) if(t.model.getValue()!==t.saved) await save(t); const nm=(await api.readMaybe(S.root+sep+'.ivancode'+sep+'about.json').then(t=>JSON.parse(t).name).catch(()=>null))||S.root.split(/[\\/]/).pop();
  bout('▶ Упаковка ('+target+')…\n'); const r=await api.webPack(S.root,target,{name:nm}); bout(r.out+'\n'+(r.code?'':'✅ Сборка успешна\n')); return r.code===0 } return _bl(target) } }
window.__simple.smRun=(...a)=>smRun(...a);

// проверка зависимостей ДО начала работы: список, чего нет, кнопки «Установить» с проверкой после установки
async function depsGate(way){ const L=await api.depsCheck(way,SM.kind); const miss=L.filter(d=>!d.found); if(!miss.length){ PG.log('Проверил нужные инструменты: '+(L.length?L.map(d=>d.name).join(', ')+' — есть':'для этого способа ничего не нужно'),'good'); return true }
 PG.log('Не хватает: '+miss.map(d=>d.name).join(', '),'warn'); const req=miss.filter(d=>!d.optional);
 const box=sm$('s-confirm'); box.innerHTML='<div><b>🧰 Перед началом: на этом компьютере не хватает</b></div>'+miss.map(d=>`<div class="dep" data-id="${d.id}">• <b>${esc(d.name)}</b> — ${esc(d.why)}${d.lastError?'<br><small>прошлая установка: '+esc(d.lastError)+'</small>':''} <button data-i="${d.id}">Установить</button> <span class="st"></span></div>`).join('')+(req.length?'<button class="n">Отмена</button>':'<button class="y">Продолжить без него</button>');
 box.classList.remove('hidden'); return new Promise(res=>{ const fin=v=>{ box.classList.add('hidden'); res(v) };
  box.onclick=async e=>{ if(e.target.classList.contains('y')) return fin(true); if(e.target.classList.contains('n')) return fin(false); const id=e.target.dataset.i; if(!id) return; e.target.disabled=true; const st=e.target.nextElementSibling; st.textContent='ставлю…';
   const r=await api.toolsInstall(id); const again=(await api.depsCheck(way,SM.kind)).find(d=>d.id===id); if(r.ok&&again&&again.found){ st.textContent='✔ установлено и проверено: '+(again.version||again.path); notify('Установлено: '+again.name) } else { st.textContent='✖ не установлено: '+(r.err||'проверка не нашла программу'); e.target.disabled=false; notify('Не установлено: '+id+'. '+(r.err||''),true) }
   const left=(await api.depsCheck(way,SM.kind)).filter(d=>!d.found&&!d.optional); if(!left.length&&miss.every(m=>m.optional||box.querySelector(`[data-id="${m.id}"] .st`).textContent.startsWith('✔'))) fin(true) } }) }
