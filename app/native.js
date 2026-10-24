// ИванКод 1.3: простой режим «📱 Kotlin» (настоящее Android-приложение) и «🇷🇺 Понятный» (EXE настоящим компилятором).
// Правила: код пишет только ИИ; одна попытка исправления; сломанную программу не собираем; проблемы компьютера ИИ не отдаём.
const NATIVE={stats:null};
function nativeWay(){ const w=S.cfg.simpleWay||'fast'; return w==='kotlin'||w==='pon'||w==='cs'?w:null }
async function nAsk(sys,user,why){ const t0=Date.now(); const a=await askAI([{role:'system',content:sys},{role:'user',content:user}],{round:1,chat:SM.root||'native'}); NATIVE.stats.ai+=Date.now()-t0; NATIVE.stats.aiCalls++; alog('  ⚡ '+why+': ответ ИИ '+(a?a.length:0)+' симв. за '+fmtT(Date.now()-t0)); try{ await api.write(S.root+sep+'.ivancode'+sep+'runs'+sep+NATIVE.run+sep+String(NATIVE.stats.aiCalls).padStart(2,'0')+'-reply.txt',String(a)) }catch{} return a }
// один ответ: не по формату → одно напоминание формата (это не исправление кода)
async function nGet(L,sys,prompt,why){ let a=await nAsk(sys,prompt,why); if(a==null) return null; let p=L.parseAnswer(a);
 if(!p.ok){ PG.log('ИИ ответил не по формату — прошу ещё раз, коротко','warn'); a=await nAsk(sys,prompt+'\n\nВНИМАНИЕ: предыдущий ответ был не по формату. Ответь ТОЛЬКО в указанном формате, без пояснений.','повтор формата'); if(a==null) return null; p=L.parseAnswer(a) }
 if(!p.ok){ PG.log('ИИ дважды ответил не по формату — программу не пишу','err'); return {failed:true} }
 if(p.fixes.length) PG.log('Студия сама поправила ответ ИИ: '+p.fixes.join('; '),'good'); return p }
async function nativeRun(desc,isChange,mode){ if(SM.busy) return; const way=isChange?(SM.way||nativeWay()):nativeWay(); SM.busy=true; SM.way=way; SM.fast=false; SM.native=true; AIW.reset(); PG.reset(); SM.last={desc,isChange,mode};
 SM.kind=way==='kotlin'?'phone':'pc'; NATIVE.run=new Date().toISOString().replace(/[:.]/g,'-'); NATIVE.stats={t0:Date.now(),ai:0,check:0,build:0,aiCalls:0,fixes:0,way};
 const L=way==='kotlin'?KtApp:way==='cs'?CsApp:PonApp; let result=null;
 sm$('s-start').classList.add('hidden'); sm$('s-work').classList.remove('hidden'); sm$('s-final').classList.add('hidden'); smMsg(''); if(sm$('s-shot')) sm$('s-shot').classList.add('hidden');
 sm$('s-title').textContent=isChange?'Вношу изменения…':way==='kotlin'?'Делаю приложение на Kotlin…':way==='cs'?'Делаю программу Windows на C#…':'Делаю программу на «Понятном»…';
 try{ if(!isChange){ smStage('plan','Создаю проект…'); const nm=(sm$('s-name').value.trim()||desc.replace(/^(сделай|создай|напиши|нужна|нужен|программ[ау]|приложение)\s+/i,'').split(/[.,:;!\n]/)[0].split(/\s+/).slice(0,3).join(' ')||'Моя программа'); SM.name=nm[0].toUpperCase()+nm.slice(1);
   const dir=(await api.docsDir())+sep+(await api.translit(SM.name)); let d=dir,k=2; while(await api.exists(d)) d=dir+'-'+(k++); await api.mkdir(d);
   try{ await api.iconSave(d,ICON.files({bg:['#4f6bed','#2e9d6a','#e0675d','#d48a1f','#8a56d6'][SM.name.length%5],scale:1,letter:SM.name[0].toUpperCase(),art:null}),{bg:'#4f6bed',scale:1}) }catch{}
   SM.root=d; await api.write(d+sep+'.ivancode'+sep+'about.json',JSON.stringify({name:SM.name,kind:SM.kind,desc,way},null,1)) }
  if(!(await depsGate(way))){ PG.log('Отменено'); return }
  if(way==='kotlin') api.ktPrewarm().then(r=>{ if(r&&r.ok) alog('  🔥 Gradle прогрет за '+fmtT(r.ms)) }); if(way==='cs') api.csPrewarm().then(r=>{ if(r&&r.ok) alog('  🔥 .NET прогрет за '+fmtT(r.ms)) }); // прогрев идёт, пока ИИ пишет
  await acctRefresh(); if(!window.__keepProv){ const sel=S.cfg.simpleAi||'auto'; if(sel!=='auto'&&[...$('#prov').options].some(o=>o.value===sel)) $('#prov').value=sel; else { const lg=(S.cfg.acct||'auto')!=='no'&&Object.keys(ACCT.logged).find(k=>ACCT.logged[k]&&site(k)); $('#prov').value=lg?'web:'+lg:'pollinations' } }
  PG.setProv(provName($('#prov').value));
  const file=way==='pon'?S.root+sep+'программа.pon':null; const cur=isChange?(way==='kotlin'?await api.ktBody(S.root):way==='cs'?await api.csBody(S.root):(await api.readMaybe(file))||''):'';
  smStage('write',isChange?'ИИ вносит изменения…':'ИИ пишет программу целиком…');
  let p=await nGet(L,L.SYS,isChange?L.changePrompt(SM.name,cur,desc):L.firstPrompt(SM.name,desc),isChange?'изменение':'программа целиком'); if(!p){ PG.halted(); return } if(p.failed){ smStage('write','ИИ не прислал программу',true); sm$('s-title').textContent='ИИ не прислал программу ⚠'; smMsg('ИИ дважды ответил не в нужном формате, поэтому я ничего не собирал. Попробуйте другой ИИ в списке или нажмите «🔄 Повторить».'); PG.fail('ответ не по формату'); return }
  let code=p.code; let chk=await nCheck(way,file,code); if(chk.code) code=chk.code;
  if(chk.env){ const h=await nHeal(way,file,code,chk); if(h.env) return nEnvFail(h.env,h.out); chk=h; if(chk.code) code=chk.code }
  if(!chk.ok&&!AIW.stop){ const r=await nFixLoop(L,way,file,code,chk); if(r.env) return nEnvFail(r.env,r.out); code=r.code; chk=r.chk }
  if(AIW.stop){ PG.halted(); return }
  if(!chk.ok){ if(isChange&&cur){ await nCheck(way,file,cur); PG.log('Изменение не прошло проверку — вернул прошлую рабочую версию','warn') } result={ok:false}; return nBroken(chk,isChange&&!!cur) }
  SM.files=[]; if(way==='kotlin'||way==='cs'){ SM.files.push(chk.file) } else { smStage('build','Собираю EXE компилятором «Понятный»…'); const t0=Date.now(); const exe=S.root+sep+'Готовая программа'+sep+SM.name.replace(/[\\/:*?"<>|]+/g,'_')+'.exe'; const b=await api.ponBuild(file,exe); NATIVE.stats.build+=Date.now()-t0;
   if(!b.ok){ smStage('build','Не получилось собрать',true); sm$('s-title').textContent='Не получилось собрать ⚠'; smMsg('Компилятор «Понятный» не собрал программу, хотя проверка прошла:\n'+b.out.slice(-800)+'\n\nЭто ошибка студии или компилятора, а не ваша. Нажмите «🔄 Повторить».'); PG.fail(b.out); return } PG.log('EXE собран за '+fmtT(b.ms)+' ('+Math.round(b.size/1048576)+' МБ)','good'); SM.files.push(b.exe) }
  SM.out=S.root+sep+'Готовая программа'; result={ok:true}; await nFinish() }
 catch(e){ smMsg('Что-то пошло не так: '+e.message); PG.fail('Что-то пошло не так: '+e.message) }
 finally{ SM.busy=false; PG.done(); const s=NATIVE.stats; s.total=Date.now()-s.t0; s.ok=!!(result&&result.ok); alog('  ⏱ итог: всего '+fmtT(s.total)+', ИИ '+fmtT(s.ai)+' ('+s.aiCalls+' запр.), проверка '+fmtT(s.check)+', сборка '+fmtT(s.build)+', исправлений: '+s.fixes); window.__nativeStats=s } }
// проверка: Kotlin — настоящая компиляция Gradle (она же сборка APK); Понятный — ponyatny проверить + пробный запуск
async function nCheck(way,file,code){ const t0=Date.now(); let r;
 if(way==='kotlin'){ smStage('check','Компилирую Kotlin и собираю APK…'); const b=await api.ktBuild(S.root,SM.name,code); NATIVE.stats.check+=Date.now()-t0; NATIVE.stats.build+=Date.now()-t0; if(b.heal&&b.heal.length) PG.log('Студия сама поправила окружение: '+b.heal.join('; '),'good');
  if(b.env) return {ok:false,env:b.env,out:b.out,msgs:[]}; const msgs=KtApp.fmtErrors(b.errors.length?b.errors:[]); if(!b.ok&&!msgs.length) msgs.push('сборка не удалась: '+b.out.split('\n').filter(l=>/error|ошибк|FAILED/i.test(l)).slice(0,3).join(' | '));
  if(b.ok) PG.log('Kotlin скомпилирован, APK собран за '+fmtT(b.ms),'good'); return {ok:b.ok,msgs,file:b.file,errors:b.errors} }
 if(way==='cs'){ smStage('check','Компилирую C# и собираю EXE…'); const b=await api.csBuild(S.root,SM.name,code); NATIVE.stats.check+=Date.now()-t0; NATIVE.stats.build+=Date.now()-t0;
  if(b.env) return {ok:false,env:b.env,out:b.out,msgs:[]}; const msgs=CsApp.fmtErrors(b.errors||[]); if(b.runtime) msgs.push('при запуске: '+b.runtime); if(!b.ok&&!msgs.length) msgs.push('сборка не удалась: '+String(b.out).split('\n').filter(l=>/error/i.test(l)).slice(0,3).join(' | '));
  if(b.ok) PG.log('C# скомпилирован, EXE собран за '+fmtT(b.ms)+(b.smoke&&b.smoke.ok?', окно открывается':''),'good'); return {ok:b.ok,msgs,file:b.file} }
 { const af=PonApp.autofix(code); if(af.fixes.length){ code=af.code; PG.log('Студия поправила: '+af.fixes.slice(0,4).join('; '),'good') } }
 await api.write(file,code); smStage('check','Проверяю программу компилятором «Понятный»…'); const c=await api.ponCheck(file); let msgs=PonApp.fmtErrors(c.errors);
 if(c.warns.length) PG.log('Компилятор сам поправил: '+c.warns.map(w=>'строка '+w.line+': '+w.msg).slice(0,3).join('; '),'good');
 if(c.ok){ const s=await api.ponSmoke(file); if(!s.ok&&!s.hung){ msgs=PonApp.fmtErrors(s.errors.length?s.errors:[{kind:'error',line:0,msg:'программа упала при пробном запуске: '+s.out.slice(-200)}]).map(m=>'при запуске: '+m) } r={ok:c.ok&&(s.ok||s.hung),msgs,code,errs:s.ok?[]:(s.errors||[])} } else r={ok:false,msgs,code,errs:c.errors||[]};
 NATIVE.stats.check+=Date.now()-t0; if(r.ok) PG.log('Проверка пройдена: ошибок нет','good'); return r }
function nEnvFail(why,out){ smStage('check','Проблема компьютера',true); sm$('s-title').textContent='Нужно доустановить инструменты ⚠'; smMsg('Сборка остановилась не из-за программы, а из-за компьютера: '+why+'.\nИИ эту ошибку не отправлял — он её не исправит.\n\nОткройте «🧰 Проверка инструментов» и установите недостающее, затем нажмите «🔄 Повторить».\n\nПодробности:\n'+String(out||'').slice(-600)); PG.fail(why) }
function nBroken(chk,reverted){ smStage('check','Проверка не пройдена',true); sm$('s-title').textContent='Программа не прошла проверку ⚠'; SM.files=[];
 smMsg('ИИ написал программу, но компилятор нашёл ошибку, поэтому собирать её я не стал'+(reverted?' (прошлая рабочая версия сохранена)':'')+'.\n\nОшибки:\n• '+chk.msgs.slice(0,5).join('\n• ')+'\n\nНажмите «✨ Улучшить» — ИИ получит эти ошибки с номерами строк. Или опишите, что поменять.');
 sm$('s-run').textContent='📂 Открыть папку'; sm$('s-final').classList.remove('hidden'); nRecent(); nTranslateUi() }
function nFinish(){ smStage('done','Программа готова!'); sm$('s-title').textContent='Готово! 🎉'; const nm=f=>String(f).split(/[\\/]/).pop(); const f=SM.files[0]||'';
 smMsg(SM.way==='cs'?`Программа для Windows: ${nm(f)} — настоящая программа на C# (.NET 8), один файл, запускается без установки.\nКод программы: AppForm.cs\nВсё лежит в папке «Готовая программа».`:SM.way==='kotlin'?`Приложение для Android на Kotlin: ${nm(f)}\nСкопируйте этот файл на телефон и откройте его, чтобы установить.\nКод приложения: app/src/main/java/ru/ivancode/app/App.kt`:`Программа: ${nm(f)} — собрана настоящим компилятором «Понятный», запускается без установки.\nКод программы: программа.pon\nВсё лежит в папке «Готовая программа».`);
 sm$('s-run').textContent=SM.way==='kotlin'?'📱 Где APK?':'▶ Запустить'; sm$('s-final').classList.remove('hidden'); nRecent(); nTranslateUi() }
function nRecent(){ const R=S.cfg.simpleRecent||[]; S.cfg.simpleRecent=[{root:SM.root,name:SM.name,kind:SM.kind,way:SM.way,t:Date.now()},...R.filter(x=>x.root!==SM.root)].slice(0,8); saveCfg() }
// перевод — ТОЛЬКО по желанию, отдельной кнопкой; к сборке не подключается
function nTranslateUi(){ let b=sm$('s-tr'); if(SM.way!=='pon'){ if(b) b.classList.add('hidden'); return }
 if(!b){ b=document.createElement('span'); b.id='s-tr'; b.innerHTML='<select id="s-tr-l"><option value="">Перевести в…</option><option value="python">Python</option><option value="javascript">JavaScript</option><option value="csharp">C#</option></select>'; sm$('s-final').appendChild(b);
  b.querySelector('select').onchange=async e=>{ const l=e.target.value; e.target.value=''; if(!l) return; const r=await api.ponTranslate(SM.root+sep+'программа.pon',l); notify(r.ok?'Перевод готов (только для чтения, сборка его не использует): '+r.file.split(/[\\/]/).pop():'Перевод не удался: '+r.out,!r.ok); if(r.ok) api.openPath(r.file) } }
 b.classList.remove('hidden') }
// перехват запуска простого режима
{ const _run=smRun; smRun=function(desc,isChange,resume){ if((isChange&&SM.native)||(!isChange&&nativeWay())) return nativeRun(desc,isChange,resume==='improve'?'improve':null); SM.native=false; return _run(desc,isChange,resume) } }
{ const _fin=smFinish; smFinish=async function(){ if(SM.native){ const d=S.root+sep+'Готовая программа'; SM.out=d; SM.files=((await api.list(d).catch(()=>[]))||[]).map(x=>x.path).filter(f=>/\.(apk|exe)$/i.test(f)); return nFinish() } return _fin() } }
{ const _rec=smRecent; smRecent=async function(){ await _rec(); const R=(S.cfg.simpleRecent||[]); const el=sm$('s-recent'); const old=el.onclick; el.onclick=async e=>{ const r=R[+e.target.dataset.i]; if(r&&(r.way==='kotlin'||r.way==='pon'||r.way==='cs')){ SM.kind=r.kind; SM.name=r.name; SM.way=r.way; SM.native=true; SM.fast=false; await openRoot(r.root); SM.root=r.root; sm$('s-start').classList.add('hidden'); sm$('s-work').classList.remove('hidden'); return smFinish() } SM.native=false; return old&&old(e) } } }
{ const _r=sm$('s-run').onclick; sm$('s-run').onclick=async()=>{ if(!SM.native) return _r(); const f=(SM.files||[])[0]; if((SM.way==='pon'||SM.way==='cs')&&f&&/Windows/.test(navigator.userAgent)) api.openPath(f); else api.openPath(SM.out||S.root) } }
// выбор способа: Kotlin → телефон, Понятный → компьютер; прогрев Gradle сразу при выборе Kotlin
{ const sel=sm$('s-way'); if(sel){ const apply=()=>{ const w=sel.value; const k=w==='kotlin'?'phone':(w==='pon'||w==='cs')?'pc':null; if(k){ SM.kind=k; document.querySelectorAll('.s-kind button').forEach(x=>x.classList.toggle('on',x.dataset.k===k)) } if(w==='kotlin') api.ktPrewarm(); if(w==='cs') api.csPrewarm() };
  sel.addEventListener('change',apply); setTimeout(()=>{ if(nativeWay()) apply() },1700) } }
// Monaco: язык «Понятный» (.pon) с подсветкой
(function reg(){ if(!window.monaco){ return setTimeout(reg,500) } try{ monaco.languages.register({id:'ponyatny',extensions:['.pon'],aliases:['Понятный']}); monaco.languages.setMonarchTokensProvider('ponyatny',PonApp.MONARCH); monaco.languages.setLanguageConfiguration('ponyatny',{comments:{lineComment:'#'},brackets:[['(',')'],['[',']'],['{','}']],autoClosingPairs:[{open:'(',close:')'},{open:'[',close:']'},{open:'"',close:'"'},{open:'«',close:'»'}]}) }catch(e){ console.error(e) } })();
window.__native={nativeRun,nCheck,NATIVE};
const FIX_MAX=5;
function nSig(msgs){ return (msgs||[]).map(m=>String(m).replace(/строка \d+(, столбец \d+)?: /,'')).sort().join('|') }
async function nHeal(way,file,code,chk){ for(let k=1;k<=2&&chk.env&&!AIW.stop;k++){ PG.log('Проблема компьютера: '+chk.env+' — чиню сам (ИИ не трачу), шаг '+k,'warn'); smStage('check','Чиню инструменты сборки…');
  try{ const L=await api.depsCheck(way,SM.kind); for(const d of L.filter(x=>!x.found&&!x.optional)){ PG.log('Устанавливаю '+d.name+'…'); const r=await api.toolsInstall(d.id); PG.log(r&&r.ok?'Установлено: '+d.name:'Не удалось установить '+d.name+': '+((r&&r.err)||''),r&&r.ok?'good':'warn') } }catch(e){ PG.log('Проверка инструментов: '+e.message,'warn') }
  try{ if(api.diagRun&&api.diagFix){ const d=await api.diagRun({offline:true}); for(const it of ((d&&d.items)||[]).filter(x=>x.fix&&(x.level==='bad'||x.level==='warn')&&(!x.ways||x.ways.includes(way)))){ PG.log('Исправляю: '+it.title); await api.diagFix(it.fix.id,{offline:true}) } } }catch{}
  chk=await nCheck(way,file,code) }
 return chk }
async function nFixLoop(L,way,file,code,chk){ let best={code,chk,n:chk.msgs.length}; let prev=null, prevSig='', seen={};
 for(let att=1;att<=FIX_MAX&&!chk.ok&&!AIW.stop;att++){
  if(way==='pon'){ const ef=PonApp.errorFix(code,(chk.errs||[])); if(ef.fixes.length){ PG.log('Студия сама исправила: '+ef.fixes.slice(0,3).join('; '),'good'); const c0=await nCheck(way,file,ef.code); if(c0.env){ chk=await nHeal(way,file,ef.code,c0); if(chk.env) return {env:chk.env,out:chk.out} } else chk=c0; code=chk.code||ef.code; if(chk.msgs.length<best.n||chk.ok) best={code,chk,n:chk.msgs.length}; if(chk.ok) break } }
  NATIVE.stats.fixes++; const sig=nSig(chk.msgs); const repeated=!!seen[sig]; seen[sig]=(seen[sig]||0)+1;
  PG.log('Компилятор нашёл: '+chk.msgs.slice(0,3).join('; '),'warn'); smStage('check','Нашлась ошибка — ИИ исправляет (попытка '+att+' из '+FIX_MAX+')…');
  const pr=L===PonApp?L.fixPrompt(SM.name,code,chk.msgs.slice(0,8),{attempt:att,max:FIX_MAX,repeated,prevDiff:prev&&repeated?prev:'',withRef:att>=3&&repeated}):L.fixPrompt(SM.name,code,chk.msgs.slice(0,8))+(repeated?'\n\nЭТА ЖЕ ОШИБКА БЫЛА И В ПРОШЛОЙ ПОПЫТКЕ — перепиши этот кусок иначе.':'');
  const q=await nGet(L,L.SYS,pr,'исправление '+att); if(!q) break; if(q.failed) continue;
  const c2=await nCheck(way,file,q.code); let r2=c2; if(c2.env){ r2=await nHeal(way,file,q.code,c2); if(r2.env) return {env:r2.env,out:r2.out} }
  const newCode=r2.code||q.code; prev=PonApp.lineDiff(code,newCode); prevSig=sig;
  if(r2.ok||r2.msgs.length<=best.n){ best={code:newCode,chk:r2,n:r2.msgs.length} }
  code=r2.ok||r2.msgs.length<=chk.msgs.length+1?newCode:best.code; chk=r2.ok||code===newCode?r2:best.chk }
 if(!chk.ok&&best.chk!==chk){ code=best.code; chk=await nCheck(way,file,code) }
 return {code,chk} }
