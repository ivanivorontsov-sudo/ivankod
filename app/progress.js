'use strict';
// ИванКод 1.1.3: сторож запросов к ИИ (таймаут → повтор → другой ИИ), живой прогресс, подтверждения в простом режиме, окно «Чат ИИ»
const el=id=>document.getElementById(id);
const num=n=>Number(n).toLocaleString('ru-RU');
const fmtT=ms=>{ const s=Math.max(0,Math.round(ms/1000)); const h=Math.floor(s/3600),m=Math.floor(s%3600/60),x=s%60; return (h?h+':'+String(m).padStart(2,'0'):m)+':'+String(x).padStart(2,'0') };
function errCount(out){ out=String(out||''); const f=out.match(/(\d+) failed/), e=out.match(/(\d+) errors?\b/); const n=((f?+f[1]:0)+(e?+e[1]:0))||(out.match(/\berror\b[:\s]/gi)||[]).length; return n?` (ошибок: ${n})`:'' }
function HALT(){ return stopLoop||AIW.stop||AIW.dead }
function aiTimeouts(prov){ const c=S.cfg.aiTimeout||{}; const id=String(prov.id||''); if(id==='ollama') return {first:c.ollamaFirst||300,idle:c.ollamaIdle||150}; if(id.startsWith('web:')) return {first:c.webFirst||180,idle:c.webIdle||90}; return {first:c.first||90,idle:c.idle||75} }
function provName(pv){ pv=String(pv||''); if(!pv) return '—'; if(pv.startsWith('web:')){ const s=site(pv.slice(4)); return s?s.name:pv.slice(4) } const p=(S.cfg.providers||[]).find(x=>x.id===pv); return p?p.name.replace(/\s*\(.*$/,''):pv }
function aiChain(pv){ const P=S.cfg.providers||[]; const has=id=>P.some(p=>p.id===id);
 const keyed=P.filter(p=>p.key&&!p.keyless&&!['ollama','llm7','pollinations'].includes(p.id)).map(p=>p.id);
 const web=Object.keys((typeof ACCT!=='undefined'&&ACCT.logged)||{}).filter(k=>ACCT.logged[k]&&site(k)).map(k=>'web:'+k);
 const free=['llm7','pollinations'].filter(has); if(S.cfg.ollamaReady&&has('ollama')) free.push('ollama');
 return [pv,...keyed,...web,...free].filter((x,i,a)=>x&&x!=='manual'&&a.indexOf(x)===i) }
const AIW={stop:false,dead:false,fails:0,override:null,cur:{},lastWebErr:'',
 reset(){ this.stop=false; this.dead=false; this.fails=0; this.override=null; this.ctrlOverride=null; this.bad=new Set(); stopLoop=false },
 stopAll(){ this.stop=true; stopLoop=true; for(const k in this.cur) try{ this.cur[k].abort() }catch{} if(PG.pend) PG.pend(false); try{ api.procKill('agentcmd'); api.procKill('build') }catch{} PG.log('Останавливаю работу…','warn') },
 why(err,limit){ err=String(err||''); if(limit||/лимит|WEB_LIMIT/i.test(err)) return 'сообщил о лимите (гостевой режим или частота запросов)'; if(/WEB_ERR/.test(err)) return 'ответил ошибкой сервера: «'+err.replace(/^WEB_ERR:\s*/,'').slice(0,80)+'»'; if(/TIMEOUT/.test(err)){ const m=err.match(/(\d+) с/); return 'не отвечает'+(m?' '+m[1]+' с':'')+' — похоже, завис' } if(/ABORT/.test(err)) return 'остановлено';
  if(/quota|limit|HTTP 429/i.test(err)) return 'исчерпан бесплатный лимит'; if(/NOINPUT/.test(err)) return 'нужно войти в аккаунт на сайте'; if(/HTTP 40[13]/.test(err)) return 'отказал в доступе (нужен ключ или вход)'; if(/HTTP 5\d\d/.test(err)) return 'сервер ИИ дал сбой';
  if(/ECONN|ENOTFOUND|EAI_AGAIN|network|socket|ETIMEDOUT/i.test(err)) return 'нет связи с сервером ИИ'; if(!err) return 'не прислал ответ'; return 'ошибка: '+err.slice(0,90) },
 async once(pv,messages,opt){ if(pv.startsWith('web:')){ this.lastWebErr=''; const t=await askWeb(pv.slice(4),messages,opt); return t!=null&&(String(t).trim()||!this.lastWebErr)?{ok:true,text:t}:{ok:false,err:this.lastWebErr||'нет ответа'} }
  const prov=(S.cfg.providers||[]).find(x=>x.id===pv); if(!prov) return {ok:false,err:'ИИ не настроен'}; if(prov.type==='gigachat'&&!prov.key) return {ok:false,err:'HTTP 401 нет ключа'}; return askApiOnce(prov,messages,opt) },
 async ask(messages,opt={}){ if(this.stop||this.dead) return null; const ctrl=opt.role==='ctrl'; const start=ctrl?(this.ctrlOverride||opt.prov):(this.override||$('#prov').value); const chain=aiChain(start).filter(x=>!ctrl||x===start||!String(x).startsWith('web:')); const errs=[]; const who=ctrl?'Контролёр':'ИИ-программист';
  for(let ci=0;ci<chain.length;ci++){ const pv=chain[ci], name=provName(pv);
   for(let att=1;att<=2;att++){ if(this.stop||this.dead) return null; if(!ctrl) PG.setProv(name); else PG.setCtrl(name); AV.busy(true);
    PG.log(att>1?`${who}: повторяю запрос (${name})…`:ctrl?`${who} (${name}) думает…`:`Отправил запрос ИИ-программисту (${name})${opt.silent?' — продолжение ответа':''}…`); const t0=Date.now(); let r;
    try{ r=await this.once(pv,messages,opt) }catch(e){ r={ok:false,err:String(e.message||e),limit:!!e.limit} } AV.busy(false); PG.live('');
    if(r.ok){ this.fails=0; if(pv!==start){ if(ctrl) this.ctrlOverride=pv; else { this.override=pv; alog(`» Дальше работаю с ИИ «${name}»`) } } if(!ctrl) PG.log(`Получил ответ ИИ-программиста за ${fmtT(Date.now()-t0)} (${num(String(r.text||'').length)} символов)`,'good'); return r.text }
    if(this.stop) return null; this.fails++; const why=this.why(r.err,r.limit); alog(`  ⚠ ИИ ${name}: ${r.err||'нет ответа'}`);
    if(r.limit||/NOINPUT|HTTP 40[13]|HTTP 429|quota|лимит|ИИ не настроен/i.test(r.err||'')){ PG.log(`ИИ «${name}» ${why}`,'warn'); errs.push(`${name}: ${why}`); break }
    if(att===1) PG.log(`ИИ «${name}» ${why}. Пробую ещё раз…`,'warn'); else errs.push(`${name}: ${why}`) }
   (this.bad=this.bad||new Set()).add(pv); if(ci<chain.length-1) PG.log(`${who}: переключаюсь на другой ИИ: «${provName(chain[ci+1])}»`,'warn') }
  if(ctrl){ PG.log('Контролёр сейчас недоступен — продолжаю без него','warn'); alog('  ⚠ контролёр недоступен: '+errs.join('; ')); return null }
  this.dead=true; stopLoop=true; const msg='Ни один ИИ сейчас не отвечает:\n'+errs.map(x=>'• '+x).join('\n')+'\n\nПроверьте интернет и нажмите «Повторить». Ещё можно войти в аккаунт ИИ («Войти в аккаунт…») или поставить офлайн-ИИ.'; PG.fail(msg); alog('⛔ '+msg.replace(/\n+/g,' ')); if(!SM.busy) toast(msg.replace(/\n+/g,' ')); return null } };
// ---- живой прогресс в простом режиме ----
const PG={t0:0,ts:0,steps:[],cur:-1,busy:false,pend:null,lastNote:'',
 reset(){ this.t0=this.ts=Date.now(); this.steps=[]; this.cur=-1; this.busy=true; this.lastNote=''; el('s-live').classList.remove('hidden'); ['s-error','s-confirm','s-planbox'].forEach(i=>el(i).classList.add('hidden')); el('s-log').innerHTML=''; document.querySelectorAll('.s-steps li').forEach(li=>{ li.className=''; const sm=li.querySelector('small'); if(sm) sm.textContent='' }); el('s-stop').classList.remove('hidden'); this.live(''); this.setProv(provName(AIW.override||$('#prov').value)); this.tick() },
 log(t,cls){ if(!t) return; const L=el('s-log'); if(!L) return; const near=L.scrollTop+L.clientHeight>=L.scrollHeight-30; const d=document.createElement('div'); if(cls) d.className=cls; d.innerHTML=`<span class="t">${this.t0?fmtT(Date.now()-this.t0):''}</span>${esc(t)}`; L.appendChild(d); while(L.children.length>300) L.firstChild.remove(); if(near) L.scrollTop=1e9 },
 live(t){ const l=el('s-livel'); if(l) l.textContent=t||''; const p=el('aipill-s'); if(p) p.textContent=t?'· '+t:'' },
 setProv(n){ this.provN=n; this.headProv() }, setCtrl(n){ this.ctrlN=n; this.headProv() },
 headProv(){ el('s-prov').textContent='🧑‍💻 ИИ-программист: '+(this.provN||'—')+(ctrlOn()?' · 🛡 Контролёр: '+(this.ctrlN||provName(ctrlProv()||'')||'—'):''); el('av-prov').textContent='— '+(this.provN||'') },
 plan(steps){ this.steps=steps; this.cur=-1; el('s-planbox').classList.remove('hidden'); this.renderPlan() },
 planMark(i){ this.cur=i; this.ts=Date.now(); this.renderPlan() },
 renderPlan(){ el('s-plan').innerHTML=this.steps.map((s,i)=>`<li class="${i<this.cur?'ok':i===this.cur?'now':''}">${i+1}. ${esc(s.length>140?s.slice(0,140)+'…':s)}</li>`).join(''); const n=el('s-plan').children[this.cur]; if(n) n.scrollIntoView({block:'nearest'}) },
 stage(note){ if(!note||note===this.lastNote) return; this.lastNote=note; this.ts=Date.now(); this.log(note) },
 tick(){ clearInterval(this._t); const f=()=>{ const n=Date.now(); el('s-time').textContent=`⏱ этот шаг: ${fmtT(n-this.ts)} · всего: ${fmtT(n-this.t0)}` }; f(); this._t=setInterval(()=>{ if(this.busy) f() },1000) },
 fail(msg){ el('s-error-t').textContent=msg; el('s-error').classList.remove('hidden'); this.live(''); this.log(msg.split('\n')[0],'err'); el('s-error').scrollIntoView({block:'center'}) },
 halted(){ if(AIW.dead){ smStage(this.stageName||'write','ИИ не отвечает — работа приостановлена',true); return true } if(AIW.stop){ if(el('s-error').classList.contains('hidden')) this.fail('Остановлено по вашей просьбе.\nНажмите «Повторить», чтобы продолжить с того же места.'); smStage(this.stageName||'write','Остановлено',true); return true } return false },
 done(){ this.busy=false; el('s-stop').classList.add('hidden'); this.live(''); if(!AIW.dead&&!AIW.stop) this.log('Работа закончена','good') },
 confirm(cmds,danger){ AV.minimize(); const box=el('s-confirm'); this.log('⏸ Жду вашего разрешения: ИИ хочет выполнить команду','warn'); this.live('Жду вашего разрешения…');
  box.innerHTML=`<div><b>⏸ Нужно ваше разрешение</b></div><div>ИИ хочет выполнить на этом компьютере ${cmds.length>1?'команды':'команду'}:</div><pre>${esc(cmds.join('\n'))}</pre>${danger.length?'<div class="w">⚠ Такая команда может удалить файлы или изменить настройки компьютера. Если не уверены — нажмите «Отклонить», программа всё равно будет доделана.</div>':''}<button class="y">✔ Разрешить</button><button class="n">✖ Отклонить</button>`;
  box.classList.remove('hidden'); box.scrollIntoView({block:'center'}); const tt=document.title; let k=0; const fl=setInterval(()=>{ document.title=(k++%2)?tt:'⏸ Нужно ваше разрешение'; },900);
  return new Promise(res=>{ const done=v=>{ clearInterval(fl); document.title=tt; box.classList.add('hidden'); this.pend=null; this.live(''); this.log(v?'Вы разрешили — выполняю команду':'Команда отклонена — сообщаю ИИ',v?'good':'warn'); res(v) }; this.pend=done; box.querySelector('.y').onclick=()=>done(true); box.querySelector('.n').onclick=()=>done(false) }) } };
// перевод журнала агента на понятный язык
function friendly(t){ let m; const T=t.trim();
 if((m=T.match(/^✔ (раздел|дописано|удалён|перенос|файл) (\S+)/))) return [{раздел:'Изменил файл ',дописано:'Дописал в файл ',удалён:'Удалил файл ',перенос:'Перенёс файл ',файл:'Записал файл '}[m[1]]+m[2],''];
 if((m=T.match(/^✖ (\S*): (.*)/))) return [`Правка в ${m[1]||'файле'} не подошла — попрошу ИИ переделать`,'warn'];
 if((m=T.match(/^\$ (.*)/))) return ['Выполняю команду: '+m[1].slice(0,160),''];
 if((m=T.match(/^код (-?\d+)$/))) return [`Команда завершилась с ошибкой (код ${m[1]}) — покажу ИИ`,'warn'];
 if(/^🔎 проверка/.test(T)) return ['Проверяю программу (автотесты/сборка)…',''];
 if(/^✅ проверка пройдена/.test(T)) return ['Проверка пройдена ✅','good'];
 if((m=T.match(/^❌ проверка не пройдена(.*)/))) return [`Проверка: есть ошибки${m[1]} — ИИ исправляет`,'warn'];
 if((m=T.match(/^ответ: (\d+) симв\., правок (\d+), команд (\d+)/))) return [`Применяю ответ: правок в файлах ${m[2]}, команд ${m[3]}`,''];
 if(/^✂ ответ оборван/.test(T)) return ['Ответ ИИ оборвался на полуслове — прошу продолжение',''];
 if(/^⚠ пустой ответ/.test(T)) return ['ИИ прислал пустой ответ — повторяю','warn'];
 if(/^↻ ИИ снова не ответил/.test(T)) return ['ИИ снова не ответил — начинаю с ним новый разговор','warn'];
 if(/^⚠ ИИ не дал ни одной правки/.test(T)) return ['ИИ не прислал изменений — прошу ещё раз, по частям','warn'];
 if((m=T.match(/^⚠ шаг (\d+) не засчитан/))) return [`Шаг ${m[1]} не получился — повторяю`,'warn'];
 if((m=T.match(/^🔁 сверка \d+: не выполнено (\d+)/))) return [+m[1]?`Сверка с вашим описанием: не сделано пунктов — ${m[1]}. Доделываю`:'Сверка: в окне программы есть проблемы — доделываю','warn'];
 if(/^✅ Сверка/.test(T)) return ['Всё из описания сделано ✅','good'];
 if(/^⚠ Сверка: остались/.test(T)) return ['Сверка: часть пунктов описания осталась несделанной','warn'];
 if(/^🖥 UI-проверка/.test(T)) return ['Открываю программу и проверяю окно…',''];
 if(/^❌ UI-проверка/.test(T)) return ['В окне программы нашлись проблемы — исправляю','warn'];
 if(/^✅ UI-проверка/.test(T)) return ['Окно программы без ошибок ✅','good'];
 if(/^⏭ команды пропущены/.test(T)) return ['Команда не выполнена (отклонена)','warn'];
 if(/^⛔ Лимит раундов/.test(T)) return ['ИИ не успел за отведённые попытки — иду дальше','warn'];
 if(/^✅ Агент завершил/.test(T)) return ['Шаг выполнен ✅','good'];
 if(/^⏱/.test(T)) return [T,'warn'];
 return null }
{ const _a=alog; alog=function(t){ t=String(t); if(t.startsWith('» ')){ _a('  '+t.slice(2)); PG.log(t.slice(2)); return } _a(t); if(!SM.busy) return; const f=friendly(t); if(f) PG.log(f[0],f[1]) } }
{ const _s=smStage; smStage=function(st,note,bad){ PG.stageName=st; if(SM.busy&&note) bad?PG.log(note,'err'):PG.stage(note); return _s(st,note,bad) } }
// ---- окно «Чат ИИ»: страница веб-чата или журнал запросов/ответов ----
const TR={list:[],
 start(id,who,messages){ const u=messages.filter(m=>m.role==='user').pop(); this.list.push({id,who,prompt:u?String(u.content):'',plen:messages.reduce((a,m)=>a+String(m.content||'').length,0),text:'',t:Date.now(),done:false,err:''}); if(this.list.length>40) this.list.shift(); AV.dirty=true; if(String(who).includes('🌐')) AV.sawWeb=true },
 get(id){ return this.list.find(e=>e.id===id) }, chunk(id,t){ const e=this.get(id); if(e){ e.text+=t; AV.dirty=true } }, set(id,t){ const e=this.get(id); if(e){ e.text=t; AV.dirty=true } }, end(id,err){ const e=this.get(id); if(e){ e.done=true; e.err=err||''; AV.dirty=true } } };
const AV={open:false,mini:false,tab:'tr',dirty:false,sawWeb:false,nodes:new Map(),
 curWeb(){ return String(AIW.override||$('#prov').value||'').startsWith('web:') },
 webShown(){ return this.open&&!this.mini&&this.tab==='web' },
 show(){ this.open=true; this.mini=false; this.tab=this.curWeb()?'web':'tr'; this.render() }, minimize(){ if(this.open){ this.mini=true; this.render() } }, close(){ this.open=false; this.mini=false; this.render() },
 busy(on){ el('aipill').classList.toggle('busy',!!on) },
 render(){ el('aiview').classList.toggle('hidden',!this.open||this.mini); el('aipill').classList.toggle('hidden',!(this.open&&this.mini));
  const w=this.curWeb()||this.sawWeb; el('av-tab-web').classList.toggle('hidden',!w); if(!w&&this.tab==='web') this.tab='tr';
  el('av-tab-web').classList.toggle('on',this.tab==='web'); el('av-tab-tr').classList.toggle('on',this.tab==='tr'); el('av-web').classList.toggle('hidden',this.tab!=='web'); el('av-tr').classList.toggle('hidden',this.tab!=='tr'); this.dirty=true; this.paint(); setTimeout(placeWeb,0); setTimeout(placeWeb,250) },
 paint(){ if(!this.open||this.mini||this.tab!=='tr'||!this.dirty) return; this.dirty=false; const box=el('av-tr'); const near=box.scrollTop+box.clientHeight>=box.scrollHeight-40; if(TR.list.length&&box.querySelector('.av-ph')) box.innerHTML='';
  const ids=new Set(TR.list.map(e=>e.id)); for(const [id,n] of this.nodes) if(!ids.has(id)){ n.remove(); this.nodes.delete(id) }
  for(const e of TR.list){ let n=this.nodes.get(e.id); if(!n){ n=document.createElement('div'); n.className='av-e'; n.innerHTML=`<div class="h"><span>${esc(e.who)}</span><span class="st"></span></div><details><summary>➡ Что студия отправила ИИ (${num(e.plen)} символов) — показать</summary><pre class="pr"></pre></details><div class="rep"><b>⬅ Ответ ИИ:</b><pre class="rp"></pre></div><div class="er"></div>`;
    n.querySelector('details').ontoggle=ev=>{ const p=n.querySelector('.pr'); if(ev.target.open&&!p.textContent) p.textContent=e.prompt.length>20000?'…(начало сокращено)\n'+e.prompt.slice(-20000):e.prompt }; box.appendChild(n); this.nodes.set(e.id,n) }
   const rp=n.querySelector('.rp'); if(rp.textContent.length!==e.text.length) rp.textContent=e.text||(e.done?'(пусто)':'…жду ответ…');
   n.querySelector('.st').textContent=e.done?(e.err?'✖':'✔ '+num(e.text.length)+' симв.'):'⏳ печатает… '+num(e.text.length)+' симв.'; n.querySelector('.er').textContent=e.err?'Ошибка: '+AIW.why(e.err):'' }
  if(near) box.scrollTop=1e9 } };
setInterval(()=>AV.paint(),700);
el('av-min').onclick=()=>AV.minimize(); el('av-close').onclick=()=>AV.close(); el('aipill').onclick=()=>AV.show();
el('av-tab-web').onclick=()=>{ AV.tab='web'; AV.render() }; el('av-tab-tr').onclick=()=>{ AV.tab='tr'; AV.render() };
el('b-aiview').onclick=()=>AV.show(); el('s-chat').onclick=()=>AV.open&&!AV.mini?AV.minimize():AV.show();
el('s-stop').onclick=()=>AIW.stopAll();
el('s-retry').onclick=()=>{ el('s-error').classList.add('hidden'); if(SM.last) smRun(SM.last.desc,SM.last.isChange,true) };
window.__w={AIW,PG,AV,TR,aiChain,friendly};
// ---- выбор ИИ в простом режиме ----
function webErrReply(t){ t=String(t||'').trim(); return t.length<400&&/server is (temporarily )?(unavailable|busy|overloaded)|server busy|服务器繁忙|系统繁忙|try again later|too many requests|rate limit|something went wrong|network error|an error occurred|сервер (временно )?(недоступен|перегружен|занят)|произошла ошибка|попробуйте (ещё раз |еще раз )?позже/i.test(t) }
function smAiFill(){ const sel=el('s-ai'); if(!sel) return; const L=(typeof ACCT!=='undefined'&&ACCT.logged)||{}; const P=S.cfg.providers||[];
 const opts=[['auto','Автоматически (с входом — сайт ИИ, без входа — бесплатный)']]
  .concat((S.sites||[]).filter(s=>s.id!=='mockweb'||L[s.id]).map(s=>['web:'+s.id,`🌐 ${s.name} (сайт) — ${L[s.id]?'вход есть ✅':'нужен вход'}`]))
  .concat(P.filter(p=>p.key&&!p.keyless&&p.id!=='pollinations').map(p=>[p.id,'🔑 '+p.name]))
  .concat([['pollinations','🆓 Pollinations — без входа (короткие ответы)'],['llm7','🆓 LLM7 — без входа']]).concat(S.cfg.ollamaReady?[['ollama','🖥 Офлайн-ИИ на этом ПК']]:[]);
 const sig=JSON.stringify(opts); if(sel._sig!==sig){ sel._sig=sig; sel.innerHTML=opts.map(([v,t])=>`<option value="${esc(v)}">${esc(t)}</option>`).join('') } const cur=S.cfg.simpleAi||'auto'; if(document.activeElement!==sel) sel.value=opts.some(o=>o[0]===cur)?cur:'auto' }
if(el('s-ai')) el('s-ai').onchange=()=>{ S.cfg.simpleAi=el('s-ai').value; saveCfg(); smAcct() };
// любые предупреждения и ошибки из журнала — тоже в простой режим
{ const _a=alog; alog=function(t){ _a(t); if(!SM.busy) return; const T=String(t).trim(); if(T.startsWith('»')||friendly(t)||/^⚠ ИИ |^web: |^…|^— раунд|^━━━/.test(T)) return; if(/^(⚠|❌|⛔|✖)|ошибк|таймаут|не удалось|не найден|лимит/i.test(T)) PG.log(T.replace(/^[⚠❌⛔✖]\s*/,'⚠ '),'warn') } }
api.version().then(v=>{ S.ver=v });
// ---- Контролёр: второй ИИ. Отвечает на вопросы ИИ-программиста и проверяет каждый шаг. Сам код НЕ пишет. ----
function ctrlOn(){ return (S.cfg.ctrl||'auto')!=='off' }
function ctrlProv(){ const P=S.cfg.providers||[]; const coder=String(AIW.override||$('#prov').value||''); const c=S.cfg.ctrlProv; if(c&&c!=='auto') return c;
 const bad=AIW.bad||new Set(); const free=['llm7','pollinations'].filter(id=>P.some(p=>p.id===id)&&!bad.has(id)); return free.find(x=>x!==coder)||free[0]||coder }
function noCode(t){ return String(t||'').replace(/```[\s\S]*?(```|$)/g,'(код убран — Контролёр код не пишет)').replace(/^\s*(ФАЙЛ|ДОПИСАТЬ|КОМАНДА)\s*:.*$/gmi,'').trim() }
function isQuestion(ans){ const t=String(ans||'').replace(/```[\s\S]*?```/g,''); if(/^\s*\**ГОТОВО/m.test(t)) return false; const q=(t.match(/\?/g)||[]).length;
 return (q>=1&&/(уточн|какой|какая|какие|каким|какую|нужно ли|надо ли|хотите ли|подскажите|выберите|предпочита|как лучше|should i|do you want|which|prefer|clarify|please specify|could you)/i.test(t))||q>=3 }
const CTRL_SYS='Ты — «Контролёр» в студии ИванКод. Рядом работает «ИИ-программист», который пишет код программы. Пользователь — новичок и сейчас недоступен, ты отвечаешь вместо него и следишь за качеством. ТЫ НИКОГДА НЕ ПИШЕШЬ КОД программы и не присылаешь файлы — только короткие текстовые решения и замечания по-русски.';
const CTRL={
 async answer(question,ctx){ PG.log('🧑‍💻 ИИ-программист спросил: «'+noCode(question).replace(/\s+/g,' ').slice(0,220)+'»','warn');
  const a=await askAI([{role:'system',content:CTRL_SYS},{role:'user',content:`ИИ-программист вместо работы задал вопрос. Ответь на него за пользователя, опираясь на описание и план. Где описание молчит — выбери простой разумный вариант по умолчанию (без внешних сервисов и регистраций, интерфейс по-русски, данные хранятся локально). Отвечай по пунктам, коротко (до 800 символов), без кода. В конце добавь: «Не задавай больше вопросов — делай шаг».\n\nОПИСАНИЕ И ПЛАН:\n${String(ctx||'').slice(0,6000)}\n\nВОПРОС ИИ-ПРОГРАММИСТА:\n${noCode(question).slice(0,3000)}`}],{role:'ctrl',prov:ctrlProv(),silent:true,round:1});
  if(!a) return null; const t=noCode(a).slice(0,1500); PG.log('🛡 Контролёр ответил: «'+t.replace(/\s+/g,' ').slice(0,260)+'»','good'); alog('  🛡 контролёр ответил на вопрос'); return t },
 suspicions(files){ const out=[]; for(const [p,t] of files){ if(/\b(TODO|FIXME)\b|здесь будет|реализуй(те)? (позже|сам)|заглушк|not implemented|NotImplementedError|^\s*pass\s*(#.*)?$|\/\/\s*\.\.\.|^\s*\.\.\.\s*$/mi.test(t)) out.push(p+': похоже на заглушку (TODO/pass/…)'); if(t.trim().length<40) out.push(p+': файл почти пустой') } return out },
 async review(step,ctx,ans,files){ const sus=this.suspicions(files); PG.log('🛡 Контролёр проверяет работу ИИ-программиста…');
  const body=files.map(([p,t])=>`ФАЙЛ ${p}:\n${t.length>9000?t.slice(0,9000)+'\n…(обрезано)':t}`).join('\n\n').slice(0,30000);
  const a=await askAI([{role:'system',content:CTRL_SYS},{role:'user',content:`Проверь, выполнил ли ИИ-программист ШАГ полностью и правильно. Ищи: шаг не сделан или сделан не тот; заглушки (TODO, pass, «здесь будет», пустые функции); оборванные файлы; явные ошибки, из-за которых программа не запустится. Мелочи и стиль не важны.\n\nШАГ:\n${String(step).slice(0,2500)}\n\nОБЩАЯ ЗАДАЧА И ПЛАН:\n${String(ctx||'').slice(0,4000)}\n\n${sus.length?'ПОДОЗРЕНИЯ СТУДИИ:\n- '+sus.join('\n- ')+'\n\n':''}ОТВЕТ ИИ-ПРОГРАММИСТА (сокращённо):\n${noCode(ans).slice(0,1500)}\n\nТЕКУЩИЕ ФАЙЛЫ ШАГА:\n${body||'(файлы не менялись)'}\n\nОтвет — ТОЛЬКО JSON без пояснений: {"ok":true} если шаг выполнен; иначе {"ok":false,"замечания":["что конкретно исправить (без кода)", "..."]} — до 5 пунктов.`}],{role:'ctrl',prov:ctrlProv(),silent:true,round:1});
  if(!a){ return {ok:true,skipped:true} } const j=jsonFrom(a); if(!j||typeof j.ok!=='boolean'){ PG.log('🛡 Контролёр ответил не по формату — считаю шаг принятым','warn'); return {ok:true,skipped:true} }
  const notes=(Array.isArray(j['замечания'])?j['замечания']:[]).map(x=>noCode(String(x)).slice(0,300)).filter(Boolean).slice(0,5);
  if(j.ok||!notes.length){ PG.log('🛡 Контролёр: шаг принят ✅','good'); alog('  🛡 контролёр: шаг принят'); return {ok:true} }
  PG.log('🛡 Контролёр нашёл проблемы: '+notes.join('; ').slice(0,400),'warn'); alog('  🛡 контролёр возражает: '+notes.join(' | ')); return {ok:false,notes} } };
function ctrlFill(){ const s=el('s-ctrl'); if(!s) return; if(document.activeElement!==s) s.value=ctrlOn()?'auto':'off' }
if(el('s-ctrl')) el('s-ctrl').onchange=()=>{ S.cfg.ctrl=el('s-ctrl').value; saveCfg(); PG.headProv() };
setInterval(ctrlFill,3000); setTimeout(ctrlFill,1500);
window.__w.CTRL=CTRL; window.__w.isQuestion=isQuestion;
