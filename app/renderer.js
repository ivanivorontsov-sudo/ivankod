'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const sep=api.platform==='win32'?'\\':'/';
const S={root:null,tabs:[],cur:null,cfg:{},attach:[],history:[],sites:[]};
let monaco,ed;
const LANG={js:'javascript',mjs:'javascript',cjs:'javascript',jsx:'javascript',ts:'typescript',tsx:'typescript',py:'python',cs:'csharp',json:'json',html:'html',htm:'html',css:'css',scss:'scss',md:'markdown',xml:'xml',csproj:'xml',yml:'yaml',yaml:'yaml',sh:'shell',bat:'bat',cmd:'bat',ps1:'powershell',sql:'sql',java:'java',kt:'kotlin',pon:'ponyatny',c:'c',h:'c',cpp:'cpp',hpp:'cpp',go:'go',rs:'rust',php:'php',rb:'ruby',lua:'lua',txt:'plaintext',ini:'ini',dockerfile:'dockerfile',swift:'swift',dart:'dart'};
const extOf=p=>(p.split(/[\\/]/).pop().split('.').pop()||'').toLowerCase();
const langOf=p=>LANG[extOf(p)]||'plaintext';
const rel=p=>S.root&&p.startsWith(S.root)?p.slice(S.root.length+1).replace(/\\/g,'/'):p;
const abs=r=>{ if(/^([a-zA-Z]:[\\/]|\/)/.test(r)) return r; return S.root+sep+r.replace(/^\.?[\\/]/,'').replace(/[\\/]/g,sep) };
function toast(t){ out('ℹ '+t+'\n') }
function out(t,clear){ const o=$('#p-out'); if(clear) o.textContent=''; o.textContent+=t; o.scrollTop=1e9 }
// ===== Настройки =====
const DEF_PROV=[
 {id:'ollama',name:'Ollama (локально, без ключа)',type:'openai',base:'http://localhost:11434/v1',model:'qwen2.5-coder:7b',key:''},
 {id:'deepseek',name:'DeepSeek API',type:'openai',base:'https://api.deepseek.com/v1',model:'deepseek-chat',key:''},
 {id:'qwen',name:'Qwen (DashScope)',type:'openai',base:'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',model:'qwen-plus',key:''},
 {id:'openai',name:'OpenAI',type:'openai',base:'https://api.openai.com/v1',model:'gpt-4o-mini',key:''},
 {id:'openrouter',name:'OpenRouter',type:'openai',base:'https://openrouter.ai/api/v1',model:'qwen/qwen-2.5-coder-32b-instruct',key:''},
 {id:'llm7',name:'LLM7 (бесплатно, без регистрации, длинные ответы)',type:'openai',base:'https://api.llm7.io/v1',model:'codestral-latest',key:'unused',maxTokens:16000,keyless:true},
 {id:'pollinations',name:'Pollinations (бесплатно, без ключа)',type:'openai',base:'https://text.pollinations.ai/openai',model:'openai',key:''},
 {id:'gigachat',name:'GigaChat API (ключ авторизации)',type:'gigachat',base:'',model:'GigaChat',key:'',scope:'GIGACHAT_API_PERS'}];
async function loadCfg(){ S.cfg=await api.cfgGet()||{}; if(!S.cfg.providers) S.cfg.providers=JSON.parse(JSON.stringify(DEF_PROV)); for(const d of DEF_PROV) if(!S.cfg.providers.find(x=>x.id===d.id)) S.cfg.providers.push({...d}); if(!S.cfg.theme) S.cfg.theme='dark'; if(!S.cfg.prov) S.cfg.prov='web:deepseek';
 try{ S.sites=JSON.parse(await api.sitesGet()).sites }catch{ S.sites=[] } fillProv() }
function fillProv(){ const p=$('#prov'); p.innerHTML='<optgroup label="Веб-чаты (без ключа, автоматически)">'+S.sites.map(s=>`<option value="web:${s.id}">🌐 ${esc(s.name)}</option>`).join('')+'</optgroup><optgroup label="API">'+S.cfg.providers.map(x=>`<option value="${x.id}">🔑 ${esc(x.name)}</option>`).join('')+'</optgroup><option value="manual">📋 Вручную (скопировать / вставить)</option>';
 p.value=S.cfg.prov; if(!p.value) p.selectedIndex=0;
 $('#wsite').innerHTML=S.sites.map(s=>`<option value="${s.id}">${esc(s.name)}</option>`).join('') }
const saveCfg=()=>api.cfgSet(S.cfg);
// ===== Monaco =====
require.config({paths:{vs:new URL('vendor/vs',location.href).href.replace(/\/$/,'')}, 'vs/nls':{availableLanguages:{'*':'ru'}}});
require(['vs/editor/editor.main'],async()=>{ monaco=window.monaco; await loadCfg(); defThemes(); setTheme(S.cfg.theme);
 ed=monaco.editor.create($('#editor'),{automaticLayout:true,fontSize:14.5,lineHeight:22,padding:{top:14},minimap:{enabled:true,renderCharacters:false},fontFamily:"'JetBrains Mono',Consolas,monospace",fontLigatures:true,cursorSmoothCaretAnimation:'on',cursorBlinking:'smooth',roundedSelection:true,scrollbar:{verticalScrollbarSize:10},renderWhitespace:'selection',bracketPairColorization:{enabled:true},stickyScroll:{enabled:true},smoothScrolling:true,wordWrap:'off'});
 ed.onDidChangeCursorPosition(e=>$('#st-pos').textContent=`Стр ${e.position.lineNumber}, стлб ${e.position.column}`);
 ed.addCommand(monaco.KeyMod.CtrlCmd|monaco.KeyCode.KeyS,()=>save());
 ed.addCommand(monaco.KeyMod.CtrlCmd|monaco.KeyCode.KeyK,()=>inlineEdit());
 ed.addCommand(monaco.KeyMod.CtrlCmd|monaco.KeyCode.KeyL,()=>selToChat());
 ed.addAction({id:'ai-explain',label:'ИИ: объяснить выделенное',contextMenuGroupId:'ai',run:()=>quick('explain')});
 ed.addAction({id:'ai-fix',label:'ИИ: исправить выделенное',contextMenuGroupId:'ai',run:()=>quick('fix')});
 ed.addAction({id:'ai-edit',label:'ИИ: изменить по описанию (Ctrl+K)',contextMenuGroupId:'ai',run:()=>inlineEdit()});
 ed.addAction({id:'ai-tests',label:'ИИ: написать тесты',contextMenuGroupId:'ai',run:()=>quick('tests')});
 initTerm(); if(S.cfg.lastRoot && await api.exists(S.cfg.lastRoot)) openRoot(S.cfg.lastRoot); showWelcome();
 window.__ready=true });
const THEMES={ivanchai:{name:'Иван-чай',bg:'#211a2b',bg2:'#2a2136',fg:'#f1e8f5',ac:'#e66fa8',ac2:'#7cc576',base:'vs-dark',kw:'e66fa8',str:'9fd88f',num:'f2b84b',com:'8a7a99',fn:'c9a7ff',ty:'7fd1c7'},
 night:{name:'Тёмная ночная',bg:'#14161c',bg2:'#1a1d25',fg:'#e4e7ee',ac:'#7aa2ff',ac2:'#5fd4a6',base:'vs-dark',kw:'7aa2ff',str:'a5d6a7',num:'f8c27a',com:'5f6880',fn:'c3a6ff',ty:'5fd4a6'},
 paper:{name:'Светлая бумажная',bg:'#fbf8f2',bg2:'#f3eee4',fg:'#2d2a26',ac:'#b5562f',ac2:'#4f7d3a',base:'vs',kw:'a33f1f',str:'4f7d3a',num:'9a6a00',com:'a39a8c',fn:'5b3d9e',ty:'1f6f8b'},
 sea:{name:'Морская (Владивосток)',bg:'#0f2230',bg2:'#13293a',fg:'#e2f1f8',ac:'#36c5d6',ac2:'#f2b84b',base:'vs-dark',kw:'36c5d6',str:'f2b84b',num:'ff8f70',com:'5e8296',fn:'8fe3c0',ty:'b8a6ff'},
 hc:{name:'Высококонтрастная',bg:'#000000',bg2:'#000000',fg:'#ffffff',ac:'#ffd400',ac2:'#00ff9c',base:'hc-black',kw:'ffd400',str:'00ff9c',num:'ff9cf0',com:'bbbbbb',fn:'7fdcff',ty:'ffffff'}};
const ACCENTS=['','#e66fa8','#7cc576','#7aa2ff','#36c5d6','#f2b84b','#ff7a59','#b48cff'];
function defThemes(){ for(const [id,t] of Object.entries(THEMES)) monaco.editor.defineTheme('ic-'+id,{base:t.base,inherit:true,rules:[{token:'keyword',foreground:t.kw,fontStyle:'bold'},{token:'string',foreground:t.str},{token:'number',foreground:t.num},{token:'comment',foreground:t.com,fontStyle:'italic'},{token:'type',foreground:t.ty},{token:'identifier.function',foreground:t.fn}],
  colors:{'editor.background':t.bg,'editor.foreground':t.fg,'editorLineNumber.foreground':t.com.length?'#'+t.com:t.fg,'editorCursor.foreground':t.ac,'editor.selectionBackground':t.ac+'44','editor.lineHighlightBackground':t.fg+'0a','editorIndentGuide.background1':t.fg+'14','minimap.background':t.bg,'editorGutter.background':t.bg}}) }
function setTheme(t,accent){ if(!THEMES[t]) t='ivanchai'; S.cfg.theme=t; if(accent!==undefined) S.cfg.accent=accent; document.body.classList.remove(...Object.keys(THEMES),'dark','light'); document.body.classList.add(t);
 const ac=S.cfg.accent||''; if(ac){ document.body.dataset.accent='1'; document.body.style.setProperty('--acx',ac); document.body.style.setProperty('--glow',ac+'33') } else { delete document.body.dataset.accent; document.body.style.removeProperty('--glow') }
 if(monaco) monaco.editor.setTheme('ic-'+t); const T=THEMES[t]; if(term) term.options.theme={background:T.bg2,foreground:T.fg,cursor:ac||T.ac,selectionBackground:(ac||T.ac)+'55'} }
function themePicker(){ modal('Тема оформления',`<div class="themes">${Object.entries(THEMES).map(([id,t])=>`<div class="th ${S.cfg.theme===id?'on':''}" data-th="${id}" style="background:${t.bg};color:${t.fg}"><b>${t.name}</b><div class="sw"><i style="background:${t.ac}"></i><i style="background:${t.ac2}"></i><i style="background:${t.bg2};border:1px solid ${t.fg}33"></i></div><div class="ln" style="background:#${t.kw};width:40%"></div><div class="ln" style="background:#${t.str};width:70%"></div><div class="ln" style="background:#${t.com};width:55%"></div></div>`).join('')}</div>
 <div class="acc"><span class="tip">Акцент:</span>${ACCENTS.map(c=>`<i data-ac="${c}" class="${(S.cfg.accent||'')===c?'on':''}" style="background:${c||'linear-gradient(135deg,var(--ac),var(--ac2))'}" title="${c||'как в теме'}"></i>`).join('')}</div>`,[['Готово',()=>closeModal(),'pri']]); $('.mbox').style.height='auto';
 $('#mbody').onclick=e=>{ const th=e.target.closest('[data-th]'), ac=e.target.closest('[data-ac]'); if(th){ setTheme(th.dataset.th); saveCfg(); $$('.th').forEach(x=>x.classList.toggle('on',x===th)) } if(ac){ setTheme(S.cfg.theme,ac.dataset.ac); saveCfg(); $$('.acc i').forEach(x=>x.classList.toggle('on',x===ac)) } } }
var showWelcome=function(){ $('#welcome').classList.toggle('hidden',!!S.cur) }
// ===== Файлы =====
var openRoot=async function(dir){ S.cfg.recent=[dir,...(S.cfg.recent||[]).filter(x=>x!==dir)].slice(0,8); if(S.root!==dir){ for(const t of [...S.tabs]) if(!t.path.startsWith(dir)&&t.model.getValue()===t.saved){ S.tabs=S.tabs.filter(x=>x!==t); t.model.dispose(); if(S.cur===t){ S.cur=null; ed.setModel(null) } } renderTabs(); showWelcome() } S.root=dir; S.cfg.lastRoot=dir; saveCfg(); $('#rootname').textContent=dir.split(/[\\/]/).pop(); $('#rootname').title=dir; $('#tree').innerHTML=''; await renderDir(dir,$('#tree'),0); gitRefresh(); if(term) termCd() }
function ficon(n,dir,open){ if(dir) return open?'📂':'📁'; const e=(n.split('.').pop()||'').toLowerCase(); return ({py:'🐍',js:'🟨',mjs:'🟨',ts:'🔷',tsx:'🔷',jsx:'🟨',html:'🌐',htm:'🌐',css:'🎨',scss:'🎨',kt:'🟣',kts:'🟣',java:'☕',gradle:'🐘',xml:'📰',json:'🔧',md:'📝',txt:'📄',png:'🖼',jpg:'🖼',jpeg:'🖼',svg:'🖼',ico:'🖼',bat:'⚙',cmd:'⚙',ps1:'⚙',sh:'⚙',cs:'🟩',csproj:'🟩',db:'🗄',sqlite:'🗄',apk:'📱',exe:'💾',zip:'🗜',nsi:'📦'})[e]||'📄' }
async function renderDir(dir,el,depth){ let items=[]; try{ items=await api.list(dir) }catch(e){ return }
 for(const it of items){ const d=document.createElement('div'); d.className='ti'; d.style.paddingLeft=(6+depth*12)+'px'; d.dataset.path=it.path;
  const lab=open=>{ d.innerHTML=`<span class="tchev">${it.dir?(open?'▾':'▸'):''}</span><span class="tic">${ficon(it.name,it.dir,open)}</span><span class="tnm">${esc(it.name)}</span>` }; lab(false); d.title=it.path; el.appendChild(d); let sub;
  d.onclick=async()=>{ if(it.dir){ if(sub){ sub.remove(); sub=null; lab(false) } else { sub=document.createElement('div'); d.after(sub); lab(true); await renderDir(it.path,sub,depth+1) } } else openFile(it.path) };
  d.oncontextmenu=e=>{ e.preventDefault(); treeMenu(it) } } }
async function treeMenu(it){ const a=await ask(`${it.name}\n1 — переименовать\n2 — удалить (в корзину)\n3 — новый файл здесь\n4 — добавить в контекст ИИ`,'4'); if(!a) return;
 const base=it.dir?it.path:it.path.replace(/[\\/][^\\/]+$/,'');
 if(a==='1'){ const n=await ask('Новое имя',it.name); if(n){ await api.rename(it.path,base.replace(/[\\/][^\\/]+$/,'')+sep+n); openRoot(S.root) } }
 if(a==='2'&&confirm('Удалить '+it.name+'?')){ await api.del(it.path); openRoot(S.root) }
 if(a==='3'){ const n=await ask('Имя файла'); if(n){ await api.write(base+sep+n,''); await openRoot(S.root); openFile(base+sep+n) } }
 if(a==='4'&&!it.dir){ addAttach(it.path) } }
async function openFile(p,line){ let t=S.tabs.find(x=>x.path===p);
 if(!t){ let txt; try{ txt=await api.read(p) }catch(e){ return toast('Не удалось открыть: '+e) }
  const model=monaco.editor.createModel(txt,langOf(p),monaco.Uri.file(p)); t={path:p,model,saved:txt}; model.onDidChangeContent(()=>renderTabs()); S.tabs.push(t) }
 S.cur=t; ed.setModel(t.model); renderTabs(); showWelcome(); $('#st-file').textContent=p; $('#st-lang').textContent=langOf(p);
 if(line){ ed.revealLineInCenter(line); ed.setPosition({lineNumber:line,column:1}) } ed.focus() }
function renderTabs(){ $('#tabs').innerHTML=''; for(const t of S.tabs){ const d=document.createElement('div'); d.className='tab'+(t===S.cur?' on':'')+(t.model.getValue()!==t.saved?' dirty':'');
  d.innerHTML=`<b>${esc(t.path.split(/[\\/]/).pop())}</b><i title="Закрыть">✕</i>`; d.title=t.path;
  d.onclick=e=>{ if(e.target.tagName==='I') closeTab(t); else openFile(t.path) }; $('#tabs').appendChild(d) } }
function closeTab(t){ if(t.model.getValue()!==t.saved&&!confirm('Файл не сохранён. Закрыть?')) return; S.tabs=S.tabs.filter(x=>x!==t); t.model.dispose();
 if(S.cur===t){ S.cur=null; const n=S.tabs[S.tabs.length-1]; if(n) openFile(n.path); else { ed.setModel(null); showWelcome() } } renderTabs() }
async function save(t=S.cur){ if(!t) return; await api.write(t.path,t.model.getValue()); track('saves'); t.saved=t.model.getValue(); renderTabs(); gitRefresh() }
async function newFile(){ if(!S.root) return toast('Сначала откройте папку'); const n=await ask('Путь нового файла (относительно проекта)','main.py'); if(!n) return; const p=abs(n); if(!await api.exists(p)) await api.write(p,''); await openRoot(S.root); openFile(p) }
// ===== Палитра файлов =====
async function palette(){ if(!S.root) return; const files=await api.allFiles(S.root);
 modal('Быстрый переход к файлу','<div id="pal" style="padding:10px"><input id="palq" placeholder="Начните вводить имя файла"><div id="pall"></div></div>');
 const draw=()=>{ const q=$('#palq').value.toLowerCase(); $('#pall').innerHTML=files.filter(f=>rel(f).toLowerCase().includes(q)).slice(0,60).map(f=>`<div class="ti" data-p="${esc(f)}">${esc(rel(f))}</div>`).join('') };
 $('#palq').oninput=draw; $('#palq').onkeydown=e=>{ if(e.key==='Enter'){ const f=$('#pall .ti'); if(f){ closeModal(); openFile(f.dataset.p) } } };
 $('#pall').onclick=e=>{ if(e.target.dataset.p){ closeModal(); openFile(e.target.dataset.p) } }; draw(); $('#palq').focus() }
// ===== Поиск =====
async function doSearch(){ if(!S.root) return; const q=$('#sq').value; if(!q) return; $('#sres').textContent='Ищу…';
 const r=await api.search(S.root,q,{regex:$('#sre').checked,case:$('#scase').checked}); if(r.error) return $('#sres').textContent=r.error;
 let h='',last=''; for(const x of r.results){ if(x.file!==last){ h+=`<div class="sf">${esc(rel(x.file))}</div>`; last=x.file } h+=`<div class="sr" data-f="${esc(x.file)}" data-l="${x.line}">${x.line}: ${esc(x.text.trim())}</div>` }
 $('#sres').innerHTML=`<div class="hint">Найдено: ${r.results.length}</div>`+h }
$('#sq').onkeydown=e=>{ if(e.key==='Enter') doSearch() };
$('#sres').onclick=e=>{ const d=e.target.closest('.sr'); if(d) openFile(d.dataset.f,+d.dataset.l) };
$('#srepall').onclick=async()=>{ const q=$('#sq').value, w=$('#srep').value; if(!q||!S.root) return; const r=await api.search(S.root,q,{regex:$('#sre').checked,case:$('#scase').checked});
 const files=[...new Set(r.results.map(x=>x.file))]; if(!confirm(`Заменить в ${files.length} файлах?`)) return;
 const re=$('#sre').checked?new RegExp(q,$('#scase').checked?'g':'gi'):new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),$('#scase').checked?'g':'gi');
 for(const f of files){ const t=S.tabs.find(x=>x.path===f); if(t){ t.model.setValue(t.model.getValue().replace(re,w)); await save(t) } else await api.write(f,(await api.read(f)).replace(re,w)) } doSearch() };
// ===== Git =====
async function gitRefresh(){ if(!S.root) return; const r=await api.git(S.root,['status','--porcelain','-b']);
 if(!r.ok){ $('#gstat').innerHTML='<div class="hint">Не git-репозиторий или git не установлен. Нажмите «init» (нужен Git for Windows).</div>'; $('#st-git').textContent=''; return }
 const lines=r.out.split('\n').filter(Boolean); $('#st-git').textContent='⑂ '+lines[0].replace('## ','').split('...')[0];
 $('#gstat').innerHTML=lines.slice(1).map(l=>`<div class="ti" data-f="${esc(l.slice(3))}">${esc(l.slice(0,2))} ${esc(l.slice(3))}</div>`).join('')||'<div class="hint">Нет изменений</div>';
 const lg=await api.git(S.root,['log','--oneline','-15']); $('#glog').textContent=lg.out||'' }
$('#gstat').onclick=async e=>{ const f=e.target.dataset.f; if(!f) return; const p=abs(f.replace(/"/g,'')); const old=(await api.git(S.root,['show','HEAD:'+f.replace(/"/g,'')])).out||''; let cur=''; try{cur=await api.read(p)}catch{} showDiff('Изменения: '+f,old,cur,p,null) };
$('#gref').onclick=gitRefresh;
$('#ginit').onclick=async()=>{ const r=await api.git(S.root,['init']); toast(r.out||r.err); gitRefresh() };
$('#gpull').onclick=async()=>{ const r=await api.git(S.root,['pull']); out((r.out||'')+(r.err||'')+'\n'); gitRefresh() };
$('#gpush').onclick=async()=>{ const r=await api.git(S.root,['push']); out((r.out||'')+(r.err||'')+'\n') };
$('#gcommit').onclick=async()=>{ const m=$('#gmsg').value.trim(); if(!m) return toast('Введите сообщение коммита'); await api.git(S.root,['add','-A']); const r=await api.git(S.root,['commit','-m',m]); out((r.out||'')+(r.err||'')+'\n'); $('#gmsg').value=''; gitRefresh() };
$('#gaimsg').onclick=async()=>{ const d=await api.git(S.root,['diff','HEAD']); const t=await askAI([{role:'user',content:'Напиши короткое сообщение git-коммита на русском (одна строка, до 70 символов, без кавычек) для этих изменений:\n'+(d.out||'').slice(0,12000)}],{silent:true}); if(t) $('#gmsg').value=t.trim().split('\n')[0] };
// ===== Терминал и запуск =====
let term,fit,termLine='';
function initTerm(){ term=new Terminal({fontSize:13,fontFamily:"'JetBrains Mono',Consolas,monospace",convertEol:true,cursorBlink:true}); fit=new FitAddon.FitAddon(); term.loadAddon(fit); term.open($('#p-term')); setTheme(S.cfg.theme);
 new ResizeObserver(()=>{ try{fit.fit()}catch{} }).observe($('#p-term')); startShell();
 term.onData(d=>{ if(d==='\r'){ term.write('\r\n'); api.procWrite('sh',termLine+(api.platform==='win32'?'\r\n':'\n')); termLine='' }
  else if(d==='\x7f'){ if(termLine){ termLine=termLine.slice(0,-1); term.write('\b \b') } }
  else if(d==='\x03'){ api.procKill('sh'); termLine=''; term.write('^C\r\n'); setTimeout(startShell,300) }
  else if(d==='\x16'){ } else { termLine+=d; term.write(d) } });
 term.attachCustomKeyEventHandler(e=>{ if(e.ctrlKey&&e.key==='v'&&e.type==='keydown'){ api.clipRead().then(t=>{ termLine+=t; term.write(t) }); return false } return true }) }
function startShell(){ api.procStart('sh',null,S.root||undefined) }
function termCd(){ api.procWrite('sh',(api.platform==='win32'?`Set-Location -LiteralPath '${S.root.replace(/'/g,"''")}'`:`cd '${S.root}'`)+(api.platform==='win32'?'\r\n':'\n')) }
api.on('proc:data',(id,d)=>{ if(id==='sh') term.write(d); else out(d) });
api.on('proc:exit',(id,c)=>{ if(id==='run'){ out(`\n— процесс завершён, код ${c} —\n`); S.lastRunCode=c } });
const RUN={py:f=>`python -X utf8 "${f}"`,js:f=>`node "${f}"`,mjs:f=>`node "${f}"`,ts:f=>`npx --yes tsx "${f}"`,cs:()=>'dotnet run',go:f=>`go run "${f}"`,java:f=>`java "${f}"`,
 rb:f=>`ruby "${f}"`,php:f=>`php "${f}"`,bat:f=>`"${f}"`,cmd:f=>`"${f}"`,ps1:f=>`powershell -ExecutionPolicy Bypass -File "${f}"`,sh:f=>`bash "${f}"`,lua:f=>`lua "${f}"`,
 c:f=>`gcc "${f}" -o "${f}.exe" && "${f}.exe"`,cpp:f=>`g++ "${f}" -o "${f}.exe" && "${f}.exe"`,rs:f=>`rustc "${f}" -o "${f}.exe" && "${f}.exe"`};
async function run(){ const t=S.cur; if(!t) return toast('Откройте файл для запуска'); await save(t); const x=extOf(t.path);
 if(x==='html'||x==='htm') return api.openExt('file:///'+t.path.replace(/\\/g,'/'));
 const custom=(S.cfg.runCmds||{})[x]; const mk=custom?(f=>custom.replace(/\{file\}/g,f)):RUN[x]; if(!mk) return toast('Не знаю, как запускать .'+x+' — задайте команду в Настройках');
 const cwd=t.path.replace(/[\\/][^\\/]+$/,''); const cmd=mk(t.path); panelTab('out'); out('▶ '+cmd+'\n',true); S.lastRunCode=null; S.lastRunFile=t.path; api.procStart('run',cmd,cwd) }
// ===== Контекст и промпты =====
const SYS='Ты — опытный программист-ассистент в IDE «ИванКод». Отвечай по-русски. Когда даёшь код для файла, ВСЕГДА оформляй его так: строка "ФАЙЛ: относительный/путь" и сразу блок ```язык относительный/путь с ПОЛНЫМ содержимым файла (без сокращений и «...»). Если меняешь только выделенный фрагмент — дай блок ```язык ВЫДЕЛЕНИЕ с новым текстом фрагмента.';
const MODES={chat:'',explain:'Объясни подробно, что делает этот код, найди возможные проблемы.',fix:'Найди и исправь ошибки в этом коде. Кратко перечисли, что исправлено, и дай исправленный код.',gen:'Сгенерируй код по описанию.',tests:'Напиши модульные тесты для этого кода (подходящий фреймворк для языка).',refactor:'Сделай рефакторинг: улучшить читаемость и структуру, не меняя поведения.'};
function selInfo(){ if(!S.cur||!ed.getModel()) return null; const s=ed.getSelection(); const txt=s&&!s.isEmpty()?ed.getModel().getValueInRange(s):''; return {path:S.cur.path,sel:txt,range:s,all:S.cur.model.getValue()} }
function addAttach(p){ if(!S.attach.includes(p)) S.attach.push(p); drawAttach() }
function drawAttach(){ $('#attach').innerHTML=S.attach.length?'Контекст: '+S.attach.map((p,i)=>`<span data-i="${i}" title="убрать">${esc(rel(p))} ✕</span>`).join(''):'' }
$('#attach').onclick=e=>{ if(e.target.dataset.i){ S.attach.splice(+e.target.dataset.i,1); drawAttach() } };
$('#addfiles').onclick=async()=>{ if(!S.root) return; const files=await api.allFiles(S.root); modal('Добавить файлы в контекст','<div style="padding:10px">'+files.slice(0,800).map(f=>`<label class="ti" style="display:block"><input type="checkbox" value="${esc(f)}" ${S.attach.includes(f)?'checked':''}> ${esc(rel(f))}</label>`).join('')+'</div>',[['Готово',()=>{ S.attach=$$('#mbody input:checked').map(i=>i.value); drawAttach(); closeModal() }]]) };
async function buildPrompt(text,mode){ let p=(MODES[mode]?MODES[mode]+'\n\n':'')+(text||'');
 if($('#ctx').checked){ const si=selInfo(); if(si){ const l=langOf(si.path), r=rel(si.path);
   if(si.sel) p+=`\n\nВыделенный фрагмент из ${r} (строки ${si.range.startLineNumber}-${si.range.endLineNumber}):\n\`\`\`${l}\n${si.sel}\n\`\`\``;
   else p+=`\n\nТекущий файл ${r}:\n\`\`\`${l} ${r}\n${si.all.slice(0,60000)}\n\`\`\`` } }
 for(const f of S.attach){ if(S.cur&&f===S.cur.path&&$('#ctx').checked) continue; let t=''; try{ t=await api.read(f) }catch{} p+=`\n\nФайл ${rel(f)}:\n\`\`\`${langOf(f)} ${rel(f)}\n${t.slice(0,40000)}\n\`\`\`` }
 if(S.root){ const fl=(await api.allFiles(S.root)).slice(0,150).map(rel); p+='\n\nСтруктура проекта: '+fl.join(', ') }
 return p }
// ===== Чат =====
function addMsg(who,md){ const d=document.createElement('div'); d.className='msg '+(who==='user'?'user':'bot'); d.innerHTML=`<div class="who">${who==='user'?'Вы':esc(who)}</div><div class="body"></div>`; $('#msgs').appendChild(d); setMsg(d,md); return d }
function setMsg(d,md){ d.querySelector('.body').innerHTML=marked.parse(md||'…'); d._md=md;
 const blocks=parseBlocks(md); d.querySelectorAll('.cbar').forEach(x=>x.remove());
 d.querySelectorAll('pre').forEach((pre,i)=>{ const b=blocks[i]; if(!b) return; const bar=document.createElement('div'); bar.className='cbar';
  bar.innerHTML=`<button data-a="apply">⇄ Применить${b.path?' → '+esc(b.path):''}</button><button data-a="copy">Копировать</button><button data-a="ins">Вставить в курсор</button>`;
  bar.onclick=e=>{ const a=e.target.dataset.a; if(a==='apply') applyBlock(b); if(a==='copy') api.clipWrite(b.code); if(a==='ins'&&S.cur) ed.executeEdits('ai',[{range:ed.getSelection(),text:b.code}]) }; pre.after(bar) });
 $('#msgs').scrollTop=1e9 }
async function send(){ AIW.reset(); const text=$('#inp').value.trim(), mode=$('#mode').value; if(mode==='agent'){ $('#inp').value=''; const vc=(S.cfg.verifyCmd||'').trim(); return (text.length>500||/\n.*\n/.test(text)?agentPlan:agent)(text,vc?{verify:async()=>{ const r=await api.cmdRun(S.root,vc,600000); return {ok:r.code===0,out:r.out} },verifyDesc:vc}:{}) } if(!text&&mode==='chat') return; $('#inp').value='';
 const prompt=await buildPrompt(text,mode); addMsg('user',(MODES[mode]?'**'+$('#mode').selectedOptions[0].text+'** ':'')+text+(prompt.length>text.length+50?`\n\n_(+ контекст ${prompt.length} симв.)_`:''));
 S.history.push({role:'user',content:prompt}); const ans=await askAI([{role:'system',content:SYS},...S.history.slice(-8)]); if(ans!=null){ S.history.push({role:'assistant',content:ans}); autoOffer(ans) } }
function autoOffer(ans){ const {ops}=Edits.parse(ans); const ed=ops.filter(o=>o.type==='edit'||o.type==='delete'); if(ed.length&&S.cfg.autoApply!==false){ runOps(ed).then(()=>toast('Применены разделы/удаления: '+ed.length+' (откат — 🛠 «Откатить»)')) } const b=parseBlocks(ans).filter(x=>x.path&&!/<{5,}\s*SEARCH/.test(x.code)); if(b.length&&S.cfg.autoApply!==false) reviewBlocks(b); const cm=ops.filter(o=>o.type==='cmd').flatMap(o=>o.cmds); if(cm.length&&S.root) runCmds(cm).then(r=>{ panelTab('build') }) }
async function askAI(messages,opt={}){ const pv0=$('#prov').value; if(!opt.silent) track('ai');
 if(pv0==='manual'){ const flat=messages.filter(m=>m.role!=='system').map(m=>m.content).pop(); await api.clipWrite(SYS+'\n\n'+flat); aiTab('paste'); toast('Запрос скопирован. Вставьте его в веб-чат, затем ответ — во вкладку «Вставка ответа».'); return null }
 return AIW.ask(messages,opt) }
// один запрос к API-провайдеру со сторожем: нет новых токенов → обрыв (в main) + страховка здесь
function askApiOnce(prov,messages,opt={}){ const T=aiTimeouts(prov); prov={...prov,idleTimeout:T.idle,firstTimeout:T.first};
 const id=Math.random().toString(36).slice(2); const d=opt.silent?null:addMsg((opt.role==='ctrl'?'🛡 Контролёр · ':'')+prov.name,''); let acc='', last=Date.now(), think=0; const t0=Date.now();
 TR.start(id,(opt.role==='ctrl'?'🛡 Контролёр · ':'🧑‍💻 ИИ-программист · ')+provName(prov.id),messages);
 return new Promise(res=>{ let fin=false, tk=null; const end=(ok,text,err)=>{ if(fin) return; fin=true; clearInterval(tk); S.aiHandlers.delete(h); delete AIW.cur[id]; TR.end(id,err); res({ok,text,err}) };
  const h=(rid,t,done,err)=>{ if(rid!==id) return; if(t){ acc+=t; last=Date.now(); TR.chunk(id,t) } if(d) setMsg(d,acc+(done?'':' ▌'));
   if(done){ if(err&&d) setMsg(d,acc+'\n\n**Ошибка:** '+err+(prov.id==='ollama'?'\n\nУстановлена ли Ollama (ollama.com) и скачана ли модель (`ollama pull '+prov.model+'`)?':'')); if(err&&acc.trim().length<200) end(false,acc,err); else end(true,acc,err) } };
  S.aiHandlers.add(h); AIW.cur[id]={abort:()=>api.aiAbort(id),act:()=>{ last=Date.now(); think++ }};
  tk=setInterval(()=>{ const el=Date.now()-t0; PG.live(acc?`ИИ печатает: ${num(acc.length)} символов (${fmtT(el)})`:think?`ИИ думает… (${fmtT(el)})`:`Жду ответ ИИ… (${fmtT(el)})`);
   if(AIW.stop){ api.aiAbort(id); end(false,acc,'ABORT') } else if(Date.now()-last>((acc||think)?T.idle:T.first)*1000+15000){ api.aiAbort(id); end(false,acc,'TIMEOUT: нет ответа '+Math.round((Date.now()-last)/1000)+' с') } },1000);
  api.aiChat(id,prov,messages) }) }
S.aiHandlers=new Set(); api.on('ai:chunk',(...a)=>S.aiHandlers.forEach(h=>h(...a))); api.on('ai:act',(rid,kind)=>{ const c=AIW.cur&&AIW.cur[rid]; if(c&&kind==='think') c.act() });
$('#send').onclick=send; $('#inp').onkeydown=e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send() } };
$('#clr').onclick=()=>{ S.history=[]; $('#msgs').innerHTML='' };
$('#prov').onchange=e=>{ S.cfg.prov=e.target.value; AIW.override=null; saveCfg() };
$('#copyprompt').onclick=async()=>{ const p=await buildPrompt($('#inp').value.trim(),$('#mode').value); await api.clipWrite(SYS+'\n\n'+p); toast('Запрос с контекстом скопирован ('+p.length+' симв.) — вставьте в любой веб-чат ИИ'); aiTab('paste') };
function quick(mode){ $('#mode').value=mode; $('#ctx').checked=true; aiTab('chat'); $('#inp').value=''; send2(mode) }
async function send2(mode){ const prompt=await buildPrompt('',mode); addMsg('user','**'+$('#mode').selectedOptions[0].text+'** выделенного/файла'); S.history.push({role:'user',content:prompt}); const a=await askAI([{role:'system',content:SYS},...S.history.slice(-8)]); if(a!=null) S.history.push({role:'assistant',content:a}) }
function selToChat(){ const si=selInfo(); if(!si) return; aiTab('chat'); $('#inp').focus() }
async function inlineEdit(){ const si=selInfo(); if(!si) return; const what=await ask('ИИ-правка: что сделать с '+(si.sel?'выделенным фрагментом':'файлом')+'?'); if(!what) return;
 const code=si.sel||si.all; const msg=`${what}\n\nВерни ТОЛЬКО новый вариант кода одним блоком \`\`\`${langOf(si.path)} без пояснений.\n\nКод (${rel(si.path)}):\n\`\`\`${langOf(si.path)}\n${code}\n\`\`\``;
 aiTab('chat'); addMsg('user','✏ '+what); const a=await askAI([{role:'system',content:'Ты редактируешь код. Отвечай только блоком кода.'},{role:'user',content:msg}]); if(!a) return;
 const b=parseBlocks(a)[0]; const nc=b?b.code:a; const model=S.cur.model; const full=model.getValue();
 const next=si.sel?model.getValue().slice(0,model.getOffsetAt(si.range.getStartPosition()))+nc+full.slice(model.getOffsetAt(si.range.getEndPosition())):nc;
 showDiff('ИИ-правка: '+rel(si.path),full,next,si.path,()=>{ model.pushEditOperations([],[{range:model.getFullModelRange(),text:next}],()=>null) }) }
// ===== Разбор блоков кода =====
function parseBlocks(md){ const res=[]; const re=/(?:^|\n)([^\n]*)\n?```([^\n`]*)\n([\s\S]*?)\n```/g; let m;
 while((m=re.exec(md))){ const before=m[1]||''; const info=m[2].trim().split(/\s+/); let lang=info[0]||'', p=info.slice(1).join(' ').replace(/^(path|file|файл)[:=]/i,'');
  if(/[\\/.]/.test(lang)&&!p&&/\.\w+$/.test(lang)){ p=lang; lang='' }
  let code=m[3]; const fm=before.match(/(?:ФАЙЛ|Файл|File|Path|Путь)\s*:?\s*[`*]*([^\s`*]+\.[\w]+)[`*]*/)||before.match(/^\s*[#*`]*\s*([\w.\-\/\\]+\.[A-Za-z]\w*)[`*:]*\s*$/);
  if(!p&&fm) p=fm[1];
  const fl=code.match(/^\s*(?:\/\/|#|--|<!--|;|REM)\s*(?:файл|file|path|путь)\s*:\s*([^\s>]+)/i); if(!p&&fl){ p=fl[1] }
  if(p&&/^(ВЫДЕЛЕНИЕ|SELECTION)$/i.test(p)) p='';
  res.push({lang,path:p,code}) } return res }
async function applyBlock(b){ if(!b.path){ const si=selInfo(); if(!si) return toast('Откройте файл или укажите путь');
   if(si.sel){ const model=S.cur.model, full=model.getValue(), s=model.getOffsetAt(si.range.getStartPosition()), e=model.getOffsetAt(si.range.getEndPosition());
    const next=full.slice(0,s)+b.code+full.slice(e); return showDiff('Замена выделения: '+rel(si.path),full,next,si.path,()=>model.setValue(next)) }
   b={...b,path:rel(si.path)} }
 if(!S.root) return toast('Откройте папку проекта'); const p=abs(b.path); let old=''; const t=S.tabs.find(x=>x.path===p); if(t) old=t.model.getValue(); else { try{ old=await api.read(p) }catch{} }
 return showDiff((old?'Изменение: ':'Новый файл: ')+b.path,old,b.code,p,null) }
async function writeFile(p,text){ const t=S.tabs.find(x=>x.path===p); if(t){ t.model.pushEditOperations([],[{range:t.model.getFullModelRange(),text}],()=>null); await save(t) } else { await api.write(p,text); await openRoot(S.root) } }
let diffEd; function showDiff(title,a,b,p,applyFn){ return new Promise(res=>{ const st=Diff.diffLines(a,b); const add=st.filter(x=>x.added).reduce((s,x)=>s+x.count,0), del=st.filter(x=>x.removed).reduce((s,x)=>s+x.count,0);
 modal(`${title}  (+${add} / −${del})`,'<div id="diffbox" style="height:100%"></div>',[['✔ Применить',async()=>{ if(applyFn) applyFn(); else await writeFile(p,diffEd.getModifiedEditor().getValue()); closeModal(); toast('Применено: '+rel(p)); res(true) },'pri'],['Отмена',()=>{ closeModal(); res(false) }]]);
 diffEd=monaco.editor.createDiffEditor($('#diffbox'),{automaticLayout:true,renderSideBySide:true,originalEditable:false,readOnly:false});
 diffEd.setModel({original:monaco.editor.createModel(a,langOf(p)),modified:monaco.editor.createModel(b,langOf(p))}) }) }
async function reviewBlocks(blocks){ for(const b of blocks){ const ok=await applyBlock(b); if(ok===undefined) break } }
function drawBlocks(md){ const bl=parseBlocks(md); $('#blocks').innerHTML=bl.length?'':'<div class="hint">Блоки кода не найдены (нужны ``` … ```).</div>';
 bl.forEach((b,i)=>{ const d=document.createElement('div'); d.className='blk'; d.innerHTML=`<input value="${esc(b.path)}" placeholder="путь (пусто — текущий файл/выделение)"><pre>${esc(b.code.slice(0,3000))}</pre><button class="pri">⇄ Показать разницу и применить</button> <button>Копировать</button> <small>${esc(b.lang)} · ${b.code.split('\n').length} стр.</small>`;
  d.querySelector('.pri').onclick=()=>applyBlock({...b,path:d.querySelector('input').value.trim()}); d.querySelectorAll('button')[1].onclick=()=>api.clipWrite(b.code); $('#blocks').appendChild(d) }) }
$('#pparse').onclick=()=>drawBlocks($('#pasted').value); $('#pasted').onpaste=()=>setTimeout(()=>drawBlocks($('#pasted').value),50);
$('#pfromclip').onclick=async()=>{ $('#pasted').value=await api.clipRead(); drawBlocks($('#pasted').value) };
// ===== Веб-чаты: автоматизация =====
let wv=null, wvSite=null, autoJs=null; const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function site(id){ return S.sites.find(s=>s.id===id) }
async function ensureWV(id){ const s=site(id); if(!s) throw new Error('нет сайта '+id); wv=true; if(wvSite!==id){ wvSite=id; $('#wsite').value=id; await WF.prepare(s,WF.W.key||webKey()) } return s }
async function waitReady(){ return WF.waitReady(15000) }
function placeWeb(){ const avw=typeof AV!=='undefined'&&AV.webShown(); const simple=!document.getElementById('simple').classList.contains('hidden'); const box=avw?$('#av-web'):$('#wvbox'); const vis=$('#modal').classList.contains('hidden')&&(avw||(!simple&&!$('#a-web').classList.contains('hidden'))); const r=box.getBoundingClientRect(); api.webPlace({x:r.x,y:r.y,width:r.width,height:r.height},vis&&r.width>20&&r.height>20) }
new ResizeObserver(()=>placeWeb()).observe(document.body); setInterval(placeWeb,1500);
async function wjs(expr){ autoJs=autoJs||await api.webautoJs(); const s=site(wvSite)||{};
 return api.webExec('window.__ppSel='+JSON.stringify({input:s.input||'',send:s.send||'',answer:s.answer||'',busy:s.busy||''})+';\n'+autoJs+';\n'+expr) }
function webKey(opt){ return String((opt&&opt.chat)||S.root||'default')+(opt&&opt.role==='ctrl'?'#ctrl':'') }
const WF=WebFlow.create({open:u=>api.webOpen(u),exec:e=>wjs(e),sleep,url:()=>api.webUrl(),log:t=>alog('  🌐 '+t)});
async function newWebChat(s){ s=s||site($('#wsite').value); if(!s) return; wvSite=s.id; wv=true; await WF.newChat(s,webKey()); toast('Новый чат: '+s.name) }
async function askWeb(id,messages,opt={}){ const s=site(id); if(!s){ toast('нет сайта '+id); return null } wv=true; wvSite=id; $('#wsite').value=id;
 const sys=messages.find(m=>m.role==='system'); const last=messages.filter(m=>m.role==='user').pop();
 const d=opt.silent?null:addMsg('🌐 '+s.name,'_Отправляю запрос во встроенный браузер…_'); const log=t=>{ if(d) setMsg(d,'_'+t+'_') };
 const WT=aiTimeouts({id:'web:'+id}); const tid='w'+Math.random().toString(36).slice(2); TR.start(tid,(opt.role==='ctrl'?'🛡 Контролёр · 🌐 ':'🧑‍💻 ИИ-программист · 🌐 ')+s.name,messages); const t0w=Date.now(); const fin=(v,err)=>{ TR.end(tid,err); return v };
 const tk=setInterval(()=>PG.live(`Жду ответ ИИ на сайте ${s.name}… (${fmtT(Date.now()-t0w)})`),1000);
 let r; try{ r=await WF.ask(s,{key:webKey(opt),sys:sys&&sys.content,user:last.content,timeouts:WT,stop:()=>AIW.stop,onText:(t,busy)=>{ TR.set(tid,t); if(d) setMsg(d,t+(busy?' ▌':'')) }}) }
 catch(e){ if(e&&e.limit){ TR.end(tid,'лимит сайта'); alog('  ⛔ сайт сообщил о лимите (гостевой режим/частота запросов)'); log('Сайт сообщил о лимите. Войдите в аккаунт на вкладке «Веб-чаты» или подождите.') } throw e }
 finally{ clearInterval(tk) }
 if(window.__dumpPrompt) api.write('/tmp/lastprompt.txt',(sys?sys.content+'\n\n':'')+last.content);
 alog(`  🌐 ${s.name}: готов ${r.tm.ready} мс, отправлен ${r.tm.sent} мс, первые символы ${r.tm.first==null?'—':r.tm.first+' мс'}, ответ ${r.tm.done==null?'—':fmtT(r.tm.done)}${r.sysSent?'':' (тот же чат, инструкция уже в нём)'}`);
 if(r.err){ AIW.lastWebErr=r.err; if(/^NOINPUT/.test(r.err)){ if(!SM.busy) aiTab('web'); log('Не найдено поле ввода. Войдите в аккаунт на вкладке «Веб-чаты» и повторите (сессия сохранится).') } else if(r.err==='ABORT'){} else log('Таймаут. Нажмите «⬇ Забрать код» на вкладке «Веб-чаты».'); return fin(r.text||null,r.err) }
 if(webErrReply(r.text)){ alog(`  ⚠ сайт ${s.name} ответил ошибкой: «${r.text.trim().slice(0,120)}»`); AIW.lastWebErr='WEB_ERR: '+r.text.trim().slice(0,150); return fin(null,AIW.lastWebErr) }
 return fin(r.text) }
$('#wsite').onchange=e=>ensureWV(e.target.value);
if($('#wnew')) $('#wnew').onclick=()=>newWebChat(site($('#wsite').value));
$('#prov').addEventListener('change',e=>{ const v=e.target.value; if(v.startsWith('web:')&&site(v.slice(4))) ensureWV(v.slice(4)).catch(()=>{}) });
$('#wgrab').onclick=async()=>{ if(!wv) return; const j=JSON.parse(await wjs('window.__pp.grab()')); $('#pasted').value=j.text; aiTab('paste'); drawBlocks(j.text) };
$('#wsend').onclick=async()=>{ if(!wv) await ensureWV($('#wsite').value); const p=SYS+'\n\n'+await buildPrompt($('#inp').value.trim(),$('#mode').value); await wjs('window.__pp.mark('+JSON.stringify(p)+')'); await wjs('window.__pp.send('+JSON.stringify(p)+')') };
$('#wext').onclick=()=>{ const s=site($('#wsite').value); if(s) api.openExt(s.url) };
// ===== Настройки =====
function settings(){ const P=S.cfg.providers; const runs=S.cfg.runCmds||{};
 modal('Настройки ИИ и запуска',`<div class="hint" style="padding:10px 14px">Ключи хранятся на этом ПК в зашифрованном виде (Windows DPAPI). Для веб-чатов ключ не нужен — достаточно войти в аккаунт на вкладке «🌐 Веб-чаты».</div>`+
 P.map((p,i)=>`<div class="pv" data-i="${i}"><b style="grid-column:1/5">${esc(p.name)}</b><span>Адрес API</span><input data-k="base" value="${esc(p.base)}" ${p.type==='gigachat'?'disabled placeholder="встроенный"':''}><span>Модель</span><input data-k="model" value="${esc(p.model)}"><span>${p.type==='gigachat'?'Ключ авторизации':'Ключ API'}</span><input data-k="key" type="password" value="${esc(p.key||'')}" placeholder="${p.id==='ollama'?'не нужен':''}"><button data-test="${i}">Проверить</button><span class="tres"></span></div>`).join('')+
 `<div class="form"><h3>Название студии</h3><span>Название</span><input id="sName" value="${esc(S.cfg.appName||'ИванКод')}"><h3>Агент и команды</h3><span>Команды от ИИ</span><select id="sCmd"><option value="ask" ${S.cfg.cmdMode!=='auto'?'selected':''}>спрашивать каждый раз</option><option value="auto" ${S.cfg.cmdMode==='auto'?'selected':''}>авторежим (опасные — всё равно спрашивать)</option></select><span>Проверка агента</span><input id="sVerify" value="${esc(S.cfg.verifyCmd||'')}" placeholder="напр. python -m pytest -q  (пусто — без проверки)"><span>Таймаут команды, с</span><input id="sTo" type="number" value="${S.cfg.cmdTimeout||600}"><h3>Поведение</h3><span>Авто-предлагать применение</span><label><input type="checkbox" id="sAuto" ${S.cfg.autoApply!==false?'checked':''}> после ответа ИИ сразу показывать diff для блоков с путём</label>
  <h3>Команды запуска (необязательно, {file} — путь)</h3>${['py','js','cs','ts','java','cpp','pon'].map(x=>`<span>.${x}</span><input data-run="${x}" value="${esc(runs[x]||'')}" placeholder="${esc(RUN[x]?RUN[x]('{file}'):'')}">`).join('')}
  <h3>Сайты веб-чатов (JSON, селекторы)</h3><textarea id="sSites" style="grid-column:1/3;height:220px;font:12px Consolas,monospace"></textarea><button id="sReset">Сбросить сайты</button><span></span>
  <h3>О программе</h3><span></span><div>${esc(S.cfg.appName||'ИванКод')} ${esc(S.ver||'')} — © Воронцов Иван Игоревич, 2026. Все права защищены.<br>Сторонние компоненты: Monaco Editor, xterm.js, Electron, jsdiff, marked (лицензии — в THIRD-PARTY.txt).</div></div>`,
 [['Сохранить',async()=>{ $$('.pv').forEach(d=>{ const p=P[+d.dataset.i]; d.querySelectorAll('input[data-k]').forEach(i=>{ if(!i.disabled) p[i.dataset.k]=i.value.trim() }) });
   S.cfg.autoApply=$('#sAuto').checked; S.cfg.cmdMode=$('#sCmd').value; S.cfg.verifyCmd=$('#sVerify').value.trim(); S.cfg.cmdTimeout=+$('#sTo').value||600; S.cfg.appName=nameFrom($('#sName').value); applyName(); S.cfg.runCmds={}; $$('[data-run]').forEach(i=>{ if(i.value.trim()) S.cfg.runCmds[i.dataset.run]=i.value.trim() });
   try{ await api.sitesSet($('#sSites').value) }catch(e){ return alert('Ошибка JSON сайтов: '+e.message) } await saveCfg(); await loadCfg(); closeModal() },'pri'],['Отмена',closeModal]]);
 api.sitesGet().then(t=>$('#sSites').value=t); $('#sReset').onclick=async()=>{ await api.sitesReset(); $('#sSites').value=await api.sitesGet() };
 $$('[data-test]').forEach(b=>b.onclick=async()=>{ const d=b.closest('.pv'), p={...P[+b.dataset.test]}; d.querySelectorAll('input[data-k]').forEach(i=>{ if(!i.disabled) p[i.dataset.k]=i.value.trim() });
  const r=d.querySelector('.tres'); r.textContent='…'; const id='t'+Math.random(); let acc='';
  const h=(rid,t,done,err)=>{ if(rid!==id) return; acc+=t; if(done){ r.textContent=err?'❌ '+err.slice(0,120):'✅ '+acc.slice(0,60); S.aiHandlers.delete(h) } }; S.aiHandlers.add(h);
  api.aiChat(id,p,[{role:'user',content:'Ответь одним словом: работает'}]) }) }
// ===== Модалка, вкладки, горячие клавиши =====
function modal(title,html,btns=[]){ setTimeout(placeWeb,0); $('#mtitle').textContent=title; $('#mbody').innerHTML=html; $('#mbtns').innerHTML=''; for(const [t,f,c] of btns){ const b=document.createElement('button'); b.textContent=t; if(c) b.className=c; b.onclick=f; $('#mbtns').appendChild(b) } $('#modal').classList.remove('hidden') }
var closeModal=function(){ $('#modal').classList.add('hidden'); if(diffEd){ diffEd.dispose(); diffEd=null } }
$('#mclose').onclick=()=>closeModal();
function aiTab(a){ $$('[data-a]').forEach(b=>b.classList.toggle('on',b.dataset.a===a)); $$('.ap').forEach(p=>p.classList.toggle('hidden',p.id!=='a-'+a)); if(a==='web'&&!wv) ensureWV($('#wsite').value); setTimeout(placeWeb,50) }
$$('[data-a]').forEach(b=>b.onclick=()=>aiTab(b.dataset.a));
function panelTab(p){ $('#panel').classList.remove('min'); $$('[data-p]').forEach(b=>b.classList.toggle('on',b.dataset.p===p)); $$('.pp').forEach(x=>x.classList.toggle('hidden',x.id!=='p-'+p)) }
$$('[data-p]').forEach(b=>b.onclick=()=>panelTab(b.dataset.p)); $('#pclose').onclick=()=>$('#panel').classList.toggle('min'); $('#tnew').onclick=()=>{ term.clear(); startShell() };
$$('[data-side]').forEach(b=>b.onclick=()=>{ $$('[data-side]').forEach(x=>x.classList.toggle('on',x===b)); $$('#side .pane').forEach(p=>p.classList.toggle('hidden',p.id!=='side-'+b.dataset.side)); if(b.dataset.side==='git') gitRefresh() });
const ACT={open:async()=>{ const d=await api.pickFolder(); if(d) openRoot(d) },newfile:newFile,save:()=>save(),run,stop:()=>api.procKill('run'),palette,settings};
$$('[data-act]').forEach(b=>b.onclick=()=>ACT[b.dataset.act]());
window.addEventListener('keydown',e=>{ if(e.key==='F5'){ e.preventDefault(); run() } if(e.ctrlKey&&e.key.toLowerCase()==='p'&&!e.shiftKey){ e.preventDefault(); palette() }
 if(e.ctrlKey&&e.shiftKey&&e.key.toLowerCase()==='f'){ e.preventDefault(); $('[data-side=search]').click(); $('#sq').focus() } if(e.ctrlKey&&e.key==='`'){ e.preventDefault(); panelTab('term'); term.focus() }
 if(e.key==='Escape'&&!$('#modal').classList.contains('hidden')) closeModal() });
window.__test={parseBlocks,openRoot,openFile,applyBlock,showDiff,S,settings,aiTab,drawBlocks,addMsg,setMsg};

function ask(q,def=''){ return new Promise(res=>{ modal('ИванКод',`<div style="padding:16px"><div style="white-space:pre-wrap;margin-bottom:8px">${esc(q)}</div><textarea id="askv" style="width:100%;height:70px">${esc(def)}</textarea></div>`,[['OK',()=>{ const v=$('#askv').value; closeModal(); res(v) },'pri'],['Отмена',()=>{ closeModal(); res(null) }]]);
 $('.mbox').style.height='auto'; const t=$('#askv'); t.focus(); t.select(); t.onkeydown=e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); const v=t.value; closeModal(); res(v) } } }) }
const _cm=closeModal; closeModal=function(){ $('.mbox').style.height=''; _cm(); setTimeout(placeWeb,0) };
// ===== Название программы =====
function applyName(){ const n=S.cfg.appName||'ИванКод'; document.title=n; $('#appname').textContent='🌿 '+n; $('#wname').textContent=n }
async function firstRun(){ if(S.cfg.appName) return applyName(); const v=await ask('Добро пожаловать! Как назвать студию?\nОставьте «ИванКод» или введите своё имя — получится «<Имя>Код» (или любое название целиком, если в нём есть пробел или «Код»).','ИванКод');
 S.cfg.appName=nameFrom(v); await saveCfg(); applyName() }
function nameFrom(v){ v=(v||'').trim(); if(!v) return 'ИванКод'; if(/код|code|\s/i.test(v)) return v; return v[0].toUpperCase()+v.slice(1)+'Код' }
ACT.about=async()=>{ modal('О программе',`<div style="padding:30px;text-align:center"><img src="icon.png" width="120"><h2>${esc(S.cfg.appName||'ИванКод')} ${esc(await api.version())}</h2>
 <p>Студия разработки с ИИ. Основана на ИванКод.</p><p><b>© 2026 Воронцов Иван Игоревич. Все права защищены.</b></p><p class="hint">Компоненты: Electron, Monaco Editor, xterm.js, jsdiff, marked — см. THIRD-PARTY.txt</p></div>`) };
// ===== Сборка, автоисправление =====
function bout(t,clear){ const o=$('#p-build'); if(clear) o.textContent=''; o.textContent+=t; if(o.textContent.length>400000) o.textContent=o.textContent.slice(-300000); o.scrollTop=1e9 }
api.on('proc:data',(id,d)=>{ if(id==='build') bout(d) });
let PK={kind:'unknown',targets:[]};
async function refreshBuild(){ if(!S.root) return; PK=await api.detect(S.root); const names={web:'Веб-программа ИванКод (HTML/JS)',android:'Android (Gradle)',dotnet:'.NET / C#',electron:'Electron',node:'Node.js',python:'Python',nsis:'NSIS',unknown:'не распознан'};
 $('#bkind').textContent='Тип проекта: '+names[PK.kind]; $('#bks').classList.toggle('hidden',PK.kind!=='android');
 const k=(S.cfg.ks||{})[S.root]||{}; $('#ksfile').value=k.file||''; $('#ksalias').value=k.alias||'key0';
 $('#btargets').innerHTML=PK.targets.map(([t,n])=>`<button data-t="${t}">▶ ${esc(n)}</button>`).join('')||'<div class="hint">Для этого проекта нет целей сборки. Создайте проект из шаблона.</div>' }
$('#btargets').onclick=e=>{ const t=e.target.dataset.t; if(t) buildLoop(t) };
let stopLoop=false;
var buildLoop=async function(target){ stopLoop=false; panelTab('build'); bout('',true); for(const t of S.tabs) if(t.model.getValue()!==t.saved) await save(t);
 const o={}; if(PK.kind==='android'&&target!=='debug'){ o.keystore=$('#ksfile').value.trim(); o.alias=$('#ksalias').value.trim(); o.storePass=$('#kspass').value;
  if(!o.keystore||!o.storePass){ bout('Для release-сборки укажите keystore и пароль (или создайте мастером).\n'); return } S.cfg.ks=S.cfg.ks||{}; S.cfg.ks[S.root]={file:o.keystore,alias:o.alias}; saveCfg() }
 if(PK.kind==='python'&&S.cur&&S.cur.path.endsWith('.py')) o.main=S.cur.path;
 const N=$('#bfix').checked?Math.max(1,+$('#bn').value||5):1;
 for(let att=1;att<=N;att++){ if(stopLoop) return bout('\n— остановлено —\n');
  bout(`\n━━━ Сборка, попытка ${att}/${N} ━━━\n`); const r=await api.build(S.root,PK.kind,target,o);
  if(r.code===0){ bout(`\n✅ Успешно (${att===1?'с первой попытки':'после '+(att-1)+' автоисправлений'}). Результаты: ${S.root}${sep}ivancode-out (или build/outputs, dist, bin)\n`); return true }
  let errs=r.errors||[]; bout(`\n❌ Ошибка сборки (код ${r.code}). Найдено ошибок с файлами: ${errs.length}\n`);
  if(!$('#bfix').checked||att===N){ if(errs[0]) openFile(errs[0].file,errs[0].line); return false }
  if(stopLoop) return;
  const files=[...new Set(errs.map(e=>e.file))].slice(0,6);
  let pr=`Сборка проекта завершилась с ошибками. Исправь их. Команда: ${r.cmd}\n\nОшибки:\n`+(errs.length?errs.slice(0,30).map(e=>`${rel(e.file)}:${e.line}:${e.col} ${e.msg}`).join('\n'):'(не удалось разобрать)')+`\n\nКонец вывода сборки:\n\`\`\`\n${r.out.slice(-6000)}\n\`\`\``;
  for(const f of files){ let t=''; try{ t=await api.read(f) }catch{} pr+=`\n\nФайл ${rel(f)}:\n\`\`\`${langOf(f)} ${rel(f)}\n${t.slice(0,40000)}\n\`\`\`` }
  pr+='\n\nВерни ПОЛНОЕ исправленное содержимое каждого изменённого файла блоками ```язык путь. Не сокращай код.';
  bout(`\n🤖 Отправляю ошибки ИИ (${$('#prov').selectedOptions[0].text})…\n`); aiTab('chat'); addMsg('user','🔁 Автоисправление, попытка '+att+': '+errs.length+' ошибок');
  const ans=await askAI([{role:'system',content:SYS},{role:'user',content:pr}]); if(!ans){ bout('ИИ не ответил — цикл остановлен.\n'); return false }
  const blocks=parseBlocks(ans).filter(b=>b.path); if(!blocks.length){ bout('В ответе ИИ нет блоков кода с путями — цикл остановлен.\n'); return false }
  const targetsF=blocks.map(b=>abs(b.path)); const bk=await api.backupMake(S.root,targetsF); bout(`💾 Резервная копия: ${bk}\n`);
  for(const b of blocks){ const p=abs(b.path); await writeFile(p,b.code); bout(`✏ Применено: ${b.path}\n`) } }
}
$('#bstop').onclick=()=>{ stopLoop=true; AIW.stopAll(); api.procKill('build') };
$('#bundo').onclick=async()=>{ const l=await api.backupList(S.root); if(!l.length) return bout('Нет резервных копий.\n'); const n=await api.backupRestore(S.root,l[0]); for(const t of S.tabs){ try{ const x=await api.read(t.path); t.model.setValue(x); t.saved=x }catch{} } renderTabs(); bout(`↶ Восстановлено файлов: ${n} из ${l[0]}\n`) };
$('#ksnew').onclick=async()=>{ if(!S.root) return; modal('Мастер создания keystore (подпись APK)',`<div class="form"><span>Файл</span><input id="kf" value="${esc(S.root+sep+'release.jks')}"><span>Alias</span><input id="ka" value="key0"><span>Пароль (6+ символов)</span><input id="kp" type="password"><span>Повтор</span><input id="kp2" type="password"><span>Имя (CN)</span><input id="kc" value="Воронцов Иван Игоревич"><span>Организация</span><input id="ko" value=""><span></span><div class="hint">Нужен JDK (Менеджер инструментов). Храните keystore и пароль в надёжном месте: без них нельзя обновить приложение в Google Play.</div></div>`,
 [['Создать',async()=>{ if($('#kp').value.length<6||$('#kp').value!==$('#kp2').value) return alert('Пароли не совпадают или короче 6 символов');
   const r=await api.keystore({file:$('#kf').value,alias:$('#ka').value,storePass:$('#kp').value,cn:$('#kc').value,org:$('#ko').value}); if(!r.ok) return alert('Ошибка keytool:\n'+r.out);
   $('#ksfile').value=$('#kf').value; $('#ksalias').value=$('#ka').value; $('#kspass').value=$('#kp').value; closeModal(); bout('🔑 Keystore создан: '+$('#ksfile').value+'\n') },'pri'],['Отмена',()=>closeModal()]]) };
// ===== Менеджер инструментов =====
// 1.2: менеджер инструментов — что найдено и где, честный итог установки, «Проверка инструментов» с отчётом
$('#btools').onclick=()=>toolsPanel();
async function toolsPanel(msg){ const root=await api.toolsRoot(); const R=await api.toolsReport();
 const row=t=>`<div class="tl tchk ${t.found?'ok':'no'}"><b>${t.found?'✅':'❌'} ${esc(t.name)}</b><span>${t.found?esc(t.version)+'<br><small>'+esc(t.path)+' · '+esc(t.source)+'</small>':'не найден'+(t.lastError?'<br><small class="err">Последняя установка не удалась: '+esc(t.lastError)+'</small>':'')+(t.tried&&t.tried.length?'<br><small>'+t.tried.slice(0,3).map(x=>esc(x.path)+' — '+esc(x.why)).join('<br>')+'</small>':'')}</span>${t.id==='vs'?'':`<button data-i="${t.id}">${t.found?'Переустановить':'Установить'}</button>`}</div>`;
 modal('🧰 Проверка инструментов',`<div class="hint" style="padding:10px 14px">Для обычной сборки (быстрый путь: программа для ПК и APK) инструменты НЕ нужны. Они нужны только в режиме для опытных (Python, Gradle…). Студия ищет уже установленные программы: своя папка (${esc(root)}), PATH (в том числе изменённый после запуска студии), py -3, стандартные папки, Visual Studio, Android Studio.</div>`+
  (msg?`<div class="tmsg ${msg.ok?'ok':'err'}">${esc(msg.text)}</div>`:'')+R.map(row).join('')+'<div class="tl"><b>Всё для Android</b><button data-i="ALL_ANDROID">Установить JDK + SDK + Gradle</button></div><div class="tl"><button data-i="RESCAN">🔄 Проверить заново</button><button data-i="COPY">📋 Скопировать отчёт</button></div><pre id="tlog"></pre>');
 $('#mbody').onclick=async e=>{ const id=e.target.dataset.i; if(!id) return;
  if(id==='RESCAN') return toolsPanel(); if(id==='COPY'){ await api.clipWrite(toolsReportText(await api.toolsReport())); return toast('Отчёт скопирован — вставьте его в сообщение') }
  e.target.disabled=true; const ids=id==='ALL_ANDROID'?['jdk','android','gradle']:[id]; const res=[];
  for(const x of ids){ const r=await api.toolsInstall(x); res.push({id:x,...r}); if(!r.ok) break }
  const log=($('#tlog')||{}).textContent||''; const bad=res.find(r=>!r.ok); const L=await api.toolsList(); const nm=x=>(L.find(t=>t.id===x)||{}).name||x;
  const m=bad?{ok:false,text:'✖ Не установлено: '+nm(bad.id)+'. Причина: '+(bad.err||'неизвестно')}:{ok:true,text:'✔ Установлено и проверено запуском: '+res.map(r=>nm(r.id)).join(', ')};
  notify(m.text,!m.ok); await toolsPanel(m); if($('#tlog')) $('#tlog').textContent=log } }
function toolsReportText(R){ return 'ИванКод — проверка инструментов ('+new Date().toLocaleString('ru-RU')+', '+navigator.userAgent.match(/Windows NT [\d.]+|Linux|Mac OS X [\d_]+/)+')\n'+R.map(t=>`${t.found?'[OK]':'[--]'} ${t.name}: ${t.found?t.version+' — '+t.path+' ('+t.source+')':'не найден'}${t.lastError?'\n     ошибка установки: '+t.lastError:''}${(!t.found&&t.tried||[]).map(x=>'\n     '+x.path+' — '+x.why).join('')}`).join('\n') }
function notify(text,bad){ toast(text); try{ new Notification('ИванКод',{body:text}) }catch{} if(typeof PG!=='undefined'&&SM&&SM.busy) PG.log(text,bad?'err':'good') }
api.on('tools:log',(t,cr)=>{ const l=$('#tlog'); if(!l) return; if(cr){ l.textContent=l.textContent.replace(/\r[^\n]*$/,'')+t } else l.textContent+=t; l.scrollTop=1e9 });
// ===== Новый проект =====
// ---- Значок проекта: одна картинка → Android mipmap/adaptive, Windows .ico, фавикон (только canvas, без нативных модулей) ----
const ICON={ async load(src){ const im=new Image(); im.src=src; await im.decode(); let w=im.naturalWidth||1, h=im.naturalHeight||1; const k=1024/Math.max(w,h); if(k>1||!im.naturalWidth){ w=Math.round(w*k)||1024; h=Math.round(h*k)||1024 } const c=document.createElement('canvas'); c.width=w; c.height=h; c.getContext('2d').drawImage(im,0,0,w,h); return c },
 b64(c){ return c.toDataURL('image/png').split(',')[1] },
 txt(t){ return btoa(unescape(encodeURIComponent(t))) },
 squircle(x,s){ const r=s*0.22; x.beginPath(); x.moveTo(r,0); x.lineTo(s-r,0); x.quadraticCurveTo(s,0,s,r); x.lineTo(s,s-r); x.quadraticCurveTo(s,s,s-r,s); x.lineTo(r,s); x.quadraticCurveTo(0,s,0,s-r); x.lineTo(0,r); x.quadraticCurveTo(0,0,r,0); x.closePath() },
 // art: Image или null (тогда буква); shape: 'none'|'circle'|'squircle'; k — доля размера под рисунок
 draw(sz,o,shape,k){ const c=document.createElement('canvas'); c.width=c.height=sz; const x=c.getContext('2d'); x.imageSmoothingQuality='high';
  if(shape!=='none'){ x.fillStyle=o.bg; if(shape==='circle'){ x.beginPath(); x.arc(sz/2,sz/2,sz/2,0,Math.PI*2) } else ICON.squircle(x,sz); x.fill(); x.save(); x.clip() }
  const box=sz*k*(o.scale||1);
  if(o.art){ const r=Math.min(box/o.art.width,box/o.art.height), w=o.art.width*r, h=o.art.height*r; x.drawImage(o.art,(sz-w)/2,(sz-h)/2,w,h) }
  else { x.fillStyle=o.fg||'#fff'; x.font=`700 ${Math.round(box*0.78)}px Inter, "Segoe UI", sans-serif`; x.textAlign='center'; x.textBaseline='middle'; x.fillText(o.letter||'A',sz/2,sz/2+box*0.05) }
  if(shape!=='none') x.restore(); return c },
 ico(cs){ const pngs=cs.map(c=>Uint8Array.from(atob(ICON.b64(c)),ch=>ch.charCodeAt(0))); const n=pngs.length; let off=6+16*n; const tot=off+pngs.reduce((a,p)=>a+p.length,0);
  const b=new Uint8Array(tot), v=new DataView(b.buffer); v.setUint16(2,1,true); v.setUint16(4,n,true);
  pngs.forEach((p,i)=>{ const s=cs[i].width, e=6+16*i; b[e]=s>=256?0:s; b[e+1]=s>=256?0:s; v.setUint16(e+4,1,true); v.setUint16(e+6,32,true); v.setUint32(e+8,p.length,true); v.setUint32(e+12,off,true); b.set(p,off); off+=p.length });
  let bin=''; for(let i=0;i<b.length;i+=8192) bin+=String.fromCharCode.apply(null,b.subarray(i,i+8192)); return btoa(bin) },
 files(o){ const F={}; F['source.png']=ICON.b64(ICON.draw(1024,o,'none',1));
  const D={mdpi:48,hdpi:72,xhdpi:96,xxhdpi:144,xxxhdpi:192};
  for(const [d,s] of Object.entries(D)){ F[`android/mipmap-${d}/ic_launcher.png`]=ICON.b64(ICON.draw(s,o,'squircle',0.62)); F[`android/mipmap-${d}/ic_launcher_round.png`]=ICON.b64(ICON.draw(s,o,'circle',0.62)); F[`android/mipmap-${d}/ic_launcher_foreground.png`]=ICON.b64(ICON.draw(s*2.25,o,'none',0.5)) }
  const ad=`<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n  <background android:drawable="@color/ic_launcher_background"/>\n  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n`;
  F['android/mipmap-anydpi-v26/ic_launcher.xml']=ICON.txt(ad); F['android/mipmap-anydpi-v26/ic_launcher_round.xml']=ICON.txt(ad);
  F['app.ico']=ICON.ico([16,24,32,48,64,128,256].map(s=>ICON.draw(s,o,'squircle',0.7)));
  F['web/favicon.ico']=ICON.ico([16,32,48].map(s=>ICON.draw(s,o,'squircle',0.7))); F['web/favicon-192.png']=ICON.b64(ICON.draw(192,o,'squircle',0.7));
  return F } };
async function iconDialog(){ if(!S.root) return toast('Откройте папку проекта');
 const nm=S.root.split(/[\\/]/).pop(); const prev=await api.iconGet(S.root); const st={bg:prev?.cfg?.bg||'#3f6fb5',scale:prev?.cfg?.scale||1,letter:(nm.trim()[0]||'A').toUpperCase(),art:null};
 if(prev?.src&&prev.cfg?.custom) st.art=await ICON.load('data:image/png;base64,'+prev.src);
 modal('Значок проекта',`<div class="icdlg"><div id="icdrop" class="icdrop">Перетащите сюда PNG, JPG или SVG<br>или <button id="icpick">Выбрать файл…</button><input id="icfile" type="file" accept=".png,.jpg,.jpeg,.svg,image/png,image/jpeg,image/svg+xml" hidden></div>
  <div class="form"><span>Цвет фона</span><input id="icbg" type="color" value="${st.bg}"><span>Размер рисунка</span><input id="icsc" type="range" min="0.5" max="1.5" step="0.05" value="${st.scale}"><span>Без картинки</span><div class="row"><button id="icletter">Буква «${esc(st.letter)}» из названия</button></div></div>
  <div class="icprev"><figure><canvas id="pv1"></canvas><figcaption>Android (круг)</figcaption></figure><figure><canvas id="pv2"></canvas><figcaption>Android (сквиркл)</figcaption></figure><figure><canvas id="pv3"></canvas><figcaption>Windows 32</figcaption></figure><figure><canvas id="pv4"></canvas><figcaption>16 / фавикон</figcaption></figure></div>
  <div class="hint">Будут созданы: Android mipmap (mdpi…xxxhdpi) + adaptive-иконка, Windows .ico (16–256) для EXE и установщика NSIS, фавикон для веба. Применяется автоматически при каждой сборке.</div></div>`,
 [['Сохранить',async()=>{ const o={...st}; const files=ICON.files(o); const done=await api.iconSave(S.root,files,{bg:st.bg,scale:st.scale,custom:!!st.art}); closeModal(); toast('Значок сохранён'+(done&&done.length?': обновлено файлов — '+done.length:'')); refreshBuild&&refreshBuild() },'pri'],['Отмена',()=>closeModal()]]);
 const paint=()=>{ [['pv1','circle',96,0.62],['pv2','squircle',96,0.62],['pv3','squircle',32,0.7],['pv4','squircle',16,0.7]].forEach(([id,sh,s,k])=>{ const c=ICON.draw(s,st,sh,k), d=$('#'+id); d.width=d.height=s; d.getContext('2d').drawImage(c,0,0) }) };
 window.__icst=st; const take=async f=>{ window.__ictake=(window.__ictake||0)+1; if(!f||!/\.(png|jpe?g|svg)$/i.test(f.name)) return toast('Нужен PNG, JPG или SVG'); const typ=/\.svg$/i.test(f.name)?'image/svg+xml':/\.png$/i.test(f.name)?'image/png':'image/jpeg'; try{ st.art=await ICON.load(URL.createObjectURL(new Blob([await f.arrayBuffer()],{type:typ}))); paint() }catch(e){ toast('Не удалось открыть картинку: '+e.message) } };
 $('#icpick').onclick=()=>$('#icfile').click(); $('#icfile').onchange=e=>take(e.target.files[0]);
 const dz=$('#icdrop'); dz.ondragover=e=>{ e.preventDefault(); dz.classList.add('over') }; dz.ondragleave=()=>dz.classList.remove('over'); dz.ondrop=e=>{ e.preventDefault(); dz.classList.remove('over'); take(e.dataTransfer.files[0]) };
 $('#icbg').oninput=e=>{ st.bg=e.target.value; paint() }; $('#icsc').oninput=e=>{ st.scale=+e.target.value; paint() }; $('#icletter').onclick=()=>{ st.art=null; paint() }; paint() }
ACT.icon=iconDialog; $("#bicon").onclick=iconDialog;
// иконка Android: первая буква названия или картинка пользователя → PNG (foreground 432px, legacy 192px)
async function makeIcon(name,color,file){ let img=null; if(file){ img=new Image(); img.src=URL.createObjectURL(file); await img.decode() }
 const draw=(sz,fg)=>{ const c=document.createElement('canvas'); c.width=c.height=sz; const x=c.getContext('2d');
  if(!fg){ x.fillStyle=color; x.beginPath(); x.arc(sz/2,sz/2,sz/2,0,7); x.fill() }
  const box=fg?sz*0.5:sz*0.7, o=(sz-box)/2;
  if(img){ const r=Math.min(box/img.width,box/img.height), w=img.width*r, h=img.height*r; x.drawImage(img,(sz-w)/2,(sz-h)/2,w,h) }
  else { x.fillStyle='#fff'; x.font=`600 ${Math.round(box*0.8)}px Inter, sans-serif`; x.textAlign='center'; x.textBaseline='middle'; x.fillText((name.trim()[0]||'A').toUpperCase(),sz/2,sz/2+box*0.04) }
  return c.toDataURL('image/png').split(',')[1] };
 return {fg:draw(432,true),legacy:draw(192,false)} }
$('#bnew').onclick=ACT.newproj=async()=>{ modal('Новый проект из шаблона',`<div class="form"><span>Шаблон</span><select id="nk"><option value="android-kotlin">Android (Kotlin)</option><option value="android-java">Android (Java)</option><option value="wpf">Windows WPF (C#)</option><option value="winforms">Windows Forms (C#)</option><option value="electron">Electron (HTML/JS → EXE)</option><option value="html">Веб-страница HTML/CSS/JS</option><option value="python">Python</option></select>
 <span>Название</span><input id="nn" value="МоёПриложение"><span>Иконка Android</span><div class="row"><input id="ncol" type="color" value="#3f6fb5" title="Цвет фона иконки"><input id="nimg" type="file" accept="image/*" title="Своя картинка (иначе — первая буква названия)"></div><span>Папка (родительская)</span><div class="row"><input id="nd" style="flex:1" value="${esc(S.root?S.root.replace(/[\\/][^\\/]+$/,''):'')}"><button id="ndb">…</button></div></div>`,
 [['Создать',async()=>{ const nm=$('#nn').value.trim(), par=$('#nd').value.trim(); if(!nm||!par) return alert('Укажите название и папку'); const dir=par+sep+nm.replace(/[<>:"/\\|?*]/g,'_');
   if(await api.exists(dir)) return alert('Папка уже существует'); const k=$('#nk').value; let io={color:$('#ncol').value}; if(k.startsWith('android')) try{ Object.assign(io,await makeIcon(nm,$('#ncol').value,$('#nimg').files[0])) }catch(e){} await api.tpl(k,dir,nm,io); try{ const f=$('#nimg').files[0]; const o={bg:$('#ncol').value,scale:1,letter:(nm.trim()[0]||'A').toUpperCase(),art:f?await ICON.load(URL.createObjectURL(f)):null}; await api.iconSave(dir,ICON.files(o),{bg:o.bg,scale:1,custom:!!f}) }catch(e){ console.warn('icon',e) } closeModal(); await openRoot(dir); toast('Проект создан: '+dir) },'pri'],['Отмена',()=>closeModal()]]);
 $('#ndb').onclick=async()=>{ const d=await api.pickFolder(); if(d) $('#nd').value=d } };
const _openRoot=openRoot; openRoot=async function(d){ await _openRoot(d); refreshBuild() };
$('[data-side=build]').addEventListener('click',refreshBuild);
setTimeout(async function w(){ if(!window.__ready) return setTimeout(w,300); if(!window.__noFirstRun&&S.cfg.expert) firstRun(); else applyName() },300);
window.__test.openRoot=(...a)=>openRoot(...a);

// ===== Темы/фокус/стартовый экран/учёба =====
ACT.theme=themePicker; ACT.focus=()=>{ document.body.classList.toggle('focus') };
window.addEventListener('keydown',e=>{ if(e.ctrlKey&&e.shiftKey&&e.key==='Enter'){ e.preventDefault(); ACT.focus() } });
function today(){ const d=new Date(); return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate() }
function track(k){ const p=S.cfg.progress=S.cfg.progress||{saves:0,ai:0,streak:0,last:''}; p[k]=(p[k]||0)+1; const t=today();
 if(p.last!==t){ const y=new Date(Date.now()-864e5); const ys=y.getFullYear()+'-'+(y.getMonth()+1)+'-'+y.getDate(); p.streak=p.last===ys?(p.streak||0)+1:1; p.last=t } saveCfg(); drawWelcome() }
const TIPS=['Выделите код и нажмите Ctrl+K — опишите словами, что поменять, ИИ покажет разницу до применения.','Без ключа API: выберите в чате «🌐 DeepSeek» или «🌐 Qwen» — студия сама отправит вопрос во встроенный браузер и заберёт ответ.','Кнопка 🛠 → «Автоисправление»: студия соберёт проект, отправит ошибки ИИ и применит исправления. Всё откатывается одной кнопкой.','Правый клик по коду → «ИИ: объяснить выделенное» — лучший способ разобраться в чужом коде.','Ctrl+Shift+Enter — режим фокуса: только вы и код.','Ответ из любого чата можно вставить во вкладку «📋 Вставка ответа» — блоки ```язык путь применятся к нужным файлам.','Попросите ИИ: «напиши тесты к этому файлу» — режим «Тесты» в чате.','Git: вкладка ⑂, кнопка ✨ — ИИ сам напишет сообщение коммита.'];
let tipI=Math.floor(Math.random()*TIPS.length);
const LESSONS=[['🐍 Python: первая программа','urok1.py','# Урок 1. Нажмите F5, чтобы запустить.\n# Попробуйте изменить имя и запустить снова.\n\nname = "Иван"\nfor i in range(3):\n    print(f"Привет, {name}! Раз номер {i + 1}")\n\n# Задание: выделите код и нажмите Ctrl+K → «посчитай сумму чисел от 1 до 100»\n'],
 ['🟨 JavaScript: функции','urok2.js','// Урок 2. F5 — запуск (нужен Node.js — 🧰 Инструменты)\nfunction kvadrat(x) {\n  return x * x;\n}\n\nfor (let i = 1; i <= 5; i++) console.log(i, "→", kvadrat(i));\n\n// Задание: правый клик → «ИИ: объяснить выделенное»\n'],
 ['🐞 Найди ошибку с ИИ','urok3.py','# Урок 3. В этом коде есть ошибка. Запустите (F5),\n# затем выделите всё и выберите «ИИ: исправить выделенное».\n\ndef srednee(chisla):\n    return sum(chisla) / len(chisla\n\nprint(srednee([4, 8, 15, 16, 23, 42]))\n'],
 ['🌐 HTML: своя страница','urok4.html','<!doctype html>\n<html lang="ru">\n<head><meta charset="utf-8"><title>Моя страница</title></head>\n<body style="font-family:sans-serif;padding:40px">\n  <h1>Привет!</h1>\n  <p>F5 — открыть в браузере. Попросите ИИ: «сделай красивую карточку-визитку».</p>\n</body>\n</html>\n']];
async function openLesson(i){ const [t,f,code]=LESSONS[i]; let dir=S.root; if(!dir){ const base=(S.cfg.lessonsDir)||null; if(!base){ const d=await api.pickFolder(); if(!d) return; S.cfg.lessonsDir=d; saveCfg() } dir=S.cfg.lessonsDir }
 const p=dir+sep+f; if(!await api.exists(p)) await api.write(p,code); if(!S.root) await openRoot(dir); await openFile(p); showLessonTip(t) }
function showLessonTip(t){ const old=$('#lesson'); if(old) old.remove(); const d=document.createElement('div'); d.id='lesson'; d.innerHTML=`<b>${esc(t)}</b><div class="tip">Читайте комментарии в коде. Застряли? Нажмите «Объяснить» — ИИ разберёт по шагам.</div><div class="row" style="padding:8px 0 0"><button class="pri" id="lx">Объяснить код</button><button id="lc">Понятно</button></div>`;
 $('#center').appendChild(d); $('#lx').onclick=()=>{ d.remove(); quick('explain') }; $('#lc').onclick=()=>d.remove() }
function drawWelcome(){ if(!$('#recent')) return; const r=(S.cfg.recent||[]); $('#recent').innerHTML=r.length?r.map(p=>`<div class="ti" data-r="${esc(p)}" title="${esc(p)}">📁 ${esc(p.split(/[\\/]/).pop())} <span class="tip">${esc(p.length>34?'…'+p.slice(-30):p)}</span></div>`).join(''):'<div class="tip">Пока пусто — откройте папку проекта.</div>';
 const p=S.cfg.progress||{}; $('#pg-streak').textContent=p.streak||0; $('#pg-saves').textContent=p.saves||0; $('#pg-ai').textContent=p.ai||0;
 $('#pg-note').textContent=(p.streak||0)>=3?'Отличная серия — так держать! 🌿':'Заходите каждый день — серия растёт 🌱';
 $('#lessons').innerHTML=LESSONS.map((l,i)=>`<div class="ti" data-l="${i}">${esc(l[0])}</div>`).join(''); $('#tipday').textContent=TIPS[tipI%TIPS.length] }
$('#welcome').onclick=e=>{ const r=e.target.closest('[data-r]'), l=e.target.closest('[data-l]'), w=e.target.closest('[data-w]');
 if(r) openRoot(r.dataset.r); if(l) openLesson(+l.dataset.l); if(w){ if(w.dataset.w==='open') ACT.open(); if(w.dataset.w==='newproj') ACT.newproj(); if(w.dataset.w==='tools') $('#btools').click() } };
$('#nexttip').onclick=e=>{ e.stopPropagation(); tipI++; drawWelcome() };
const _sw=showWelcome; showWelcome=function(){ _sw(); drawWelcome() };
// ===== Агент: правки разделов, команды, автоцикл =====
const AG={log:[],stats:{applied:0,rejected:0,cmds:0,cmdFail:0,rounds:0,reasons:{}}};
function alog(t){ AG.log.push(new Date().toLocaleTimeString()+' '+t); bout(t+'\n') }
const SYS_AGENT=()=>`Ты — ИИ-агент в IDE «${S.cfg.appName||'ИванКод'}» на Windows. Отвечай по-русски, кратко. Ты сам меняешь файлы проекта и запускаешь команды через ответ в строгом формате. Не используй встроенные инструменты сайта (интерпретатор кода, поиск, холст) — студия сама выполнит команды на компьютере пользователя и вернёт тебе вывод.\n\n${Edits.FORMAT}\n\nДИЗАЙН: делай интерфейс аккуратным и современным. Для Android — Material 3 (карточки, отступы 16dp, иконки у кнопок, пустые состояния, поддержка тёмной темы через атрибуты темы, корректные WindowInsets — ничего не должно залезать под статус-бар/ActionBar). Если в проекте есть IVANCODE.md — следуй ему.\n\n${bigMode()?'ДЛИНА: у тебя длинные ответы — присылай файлы целиком, можно 3–5 файлов за ответ. ':''}ДЛИНА: у некоторых ИИ ответ обрезается примерно после 3000–6000 символов. Поэтому: не больше 2–3 файлов за ответ, файлы до ~150 строк; большой JS/CSS разбивай на несколько файлов (например static/js/api.js, static/js/ui.js, static/css/base.css, static/css/cards.css). Не пиши ГОТОВО, пока ВСЕ пункты задачи не сделаны — студия сверит результат с требованиями.\n\nВЕБ-ПРИЛОЖЕНИЯ: студия сама открывает страницу в браузере и присылает ошибки JS, неудачные запросы и видимый текст. Всё (CSS, JS, шрифты, иконки) — локально, без CDN. Если задана переменная окружения IVANCODE_DB — используй её как путь к базе данных (так студия проверяет UI на тестовой базе).`;
async function projectSnapshot(maxChars=50000,focus=null){ if(!S.root) return ''; const files=(await api.allFiles(S.root)).filter(f=>!/\.(png|jpg|jpeg|gif|ico|jar|apk|aab|zip|exe|dll|so|db|sqlite|pyc|keystore|jks|webp|ttf|woff2?)$/i.test(f)&&!/[\\/](build|\.gradle|__pycache__|\.pytest_cache|ivancode-out|node_modules|\.venv)[\\/]/.test(f));
 let s='Структура проекта:\n'+files.slice(0,300).map(rel).join('\n')+'\n'; let used=s.length;
 for(const f of files){ let t=await api.readMaybe(f); if(t==null) continue; if(focus&&focus.length&&t.length>1200&&!focus.some(x=>rel(f).replace(/\\/g,'/').endsWith(String(x).replace(/^\.?\//,'')))){ s+=`\n(файл ${rel(f)} — ${t.split('\n').length} стр., не показан: к этому шагу не относится)\n`; continue } if(used+t.length>maxChars){ s+=`\n(файл ${rel(f)} не показан — ${t.split('\n').length} стр.; для правок используй SEARCH/REPLACE по строкам, которые знаешь, или попроси показать)\n`; continue }
  s+=`\nФАЙЛ ${rel(f)}:\n\`\`\`${langOf(f)}\n${t}\n\`\`\`\n`; used+=t.length } return s }
async function confirmCmds(cmds){ const auto=S.cfg.cmdMode==='auto'||!!(S.cfg.allowProj||{})[S.root]; const danger=cmds.filter(Edits.isDangerous); const simple=!document.getElementById('simple').classList.contains('hidden');
 if(simple&&!danger.length){ alog('» Команда безопасная — студия разрешила её сама'); return true } if(auto&&!danger.length) return true; if(simple) return PG.confirm(cmds,danger);
 alog('  ⏸ жду вашего разрешения на команду'); return new Promise(res=>{ modal('ИИ хочет выполнить команды',`<div style="padding:16px"><pre class="mono" style="white-space:pre-wrap;background:var(--bg);padding:12px;border-radius:10px">${esc(cmds.join('\n'))}</pre>${danger.length?'<div class="hint" style="color:#ff6b6b">⚠ Есть потенциально опасные команды — подтверждение обязательно.</div>':''}<div class="hint">Папка: ${esc(S.root)}</div></div>`,
  [['▶ Выполнить',()=>{ closeModal(); res(true) },'pri'],...(danger.length?[]:[['Разрешать всегда для этого проекта',()=>{ S.cfg.allowProj={...(S.cfg.allowProj||{}),[S.root]:true}; saveCfg(); closeModal(); res(true) }],['Всегда выполнять (авторежим)',()=>{ S.cfg.cmdMode='auto'; saveCfg(); closeModal(); res(true) }]]),['Пропустить',()=>{ closeModal(); res(false) }]]); $('.mbox').style.height='auto' }) }
async function runOps(ops){ const fsa={read:p=>api.readMaybe(abs(p)),write:async(p,t)=>{ await writeFileQuiet(abs(p),t) },del:async p=>{ await api.unlink(abs(p)); const t=S.tabs.find(x=>x.path===abs(p)); if(t) closeTab(t) }};
 const touched=ops.filter(o=>o.path&&['write','edit','delete','rename','append'].includes(o.type)).flatMap(o=>[o.path,o.to].filter(Boolean)).filter(p=>!Edits.unsafePath(p)).map(abs); let bk=null; if(touched.length) bk=await api.backupMake(S.root,[...new Set(touched)]);
 const st=await Edits.applyOps(ops,fsa,{noRewrite:!bigMode()}); for(const it of st.items){ const o=it.op; if(it.ok) alog(`  ✔ ${o.type==='edit'?'раздел':o.type==='append'?'дописано':o.type==='delete'?'удалён':o.type==='rename'?'перенос':'файл'} ${o.path} (${it.how})`); else { alog(`  ✖ ${o.path||''}: ${it.reason}`); AG.stats.reasons[it.reason.split(' —')[0].slice(0,40)]=(AG.stats.reasons[it.reason.split(' —')[0].slice(0,40)]||0)+1 } }
 AG.stats.applied+=st.applied; AG.stats.rejected+=st.rejected; if(touched.length) await openRoot(S.root); return {st,bk} }
async function writeFileQuiet(p,text){ const t=S.tabs.find(x=>x.path===p); await api.write(p,text); if(t){ t.model.setValue(text.replace(/^\uFEFF/,'')); t.saved=t.model.getValue(); renderTabs() } }
async function runCmds(cmds){ let out=''; if(!(await confirmCmds(cmds))){ alog('  ⏭ команды пропущены пользователем'); return {ok:false,out:'Пользователь отказался выполнять команды: '+cmds.join(' ; ')} } let ok=true;
 for(const c of cmds){ alog('  $ '+c); AG.stats.cmds++; const r=await api.cmdRun(S.root,c,(S.cfg.cmdTimeout||600)*1000); const tail=r.out.length>6000?'…'+r.out.slice(-6000):r.out; out+=`$ ${c}\n(код выхода ${r.code})\n${tail}\n`; if(r.code!==0){ ok=false; AG.stats.cmdFail++; alog('    код '+r.code); break } } return {ok,out} }
async function agent(task,opt={}){ if(!S.root) return toast('Откройте папку проекта'); stopLoop=false; panelTab('build'); let N=opt.rounds||+($('#bn')&&$('#bn').value)||6; AG.stats.rounds=0; const base0=AG.stats.applied+AG.stats.cmds;
 alog(`━━━ 🤖 Агент: ${task.slice(0,120)} ━━━`); aiTab('chat'); addMsg('user','🤖 '+task);
 let msgs=[{role:'system',content:SYS_AGENT()},{role:'user',content:task+'\n\n'+(opt.noSnapshot?'':await projectSnapshot(50000,opt.focus))+(opt.verifyDesc?`\n\nПосле твоих правок студия выполнит проверку: ${opt.verifyDesc}`:'')}];
 for(let r=1;r<=N;r++){ if(HALT()) return alog('— остановлено —'); AG.stats.rounds=r; alog(`— раунд ${r}/${N}: запрос к ИИ (${$('#prov').selectedOptions[0].text})`);
  alog('  …жду ответ ИИ'); const slim=m=>{ const last=m.map(x=>x.role).lastIndexOf('assistant'); return m.map((x,i)=>x.role==='assistant'&&i<last&&x.content.length>1500?{...x,content:x.content.slice(0,1500)+'\n…(старый ответ сокращён, правки из него уже применены)'}:x.role==='user'&&i>1&&i<m.length-1&&x.content.length>3000?{...x,content:x.content.slice(0,3000)+'\n…(сокращено)'}:x) };
  let ans; try{ ans=await askAI(slim(msgs),{round:r}) }catch(e){ if(!e.limit) throw e; if(opt._limitRetry){ alog('⛔ Лимит сайта ИИ и в новом чате. Войдите в аккаунт во встроенном браузере (вкладка «Веб-чаты») или выберите другой ИИ/API и запустите снова.'); return false }
   alog('  ↻ лимит в этом чате — открываю новый чат и передаю актуальное состояние проекта'); opt._limitRetry=true; const lastFb=msgs.filter(m=>m.role==='user').pop(); msgs=[msgs[0],{role:'user',content:task+'\n\n'+(opt.noSnapshot?'':await projectSnapshot())+(r>1&&lastFb?'\n\nИтог прошлого раунда:\n'+lastFb.content.slice(0,9000):'')+(opt.verifyDesc?`\n\nПосле твоих правок студия выполнит проверку: ${opt.verifyDesc}`:'')}];
   try{ ans=await askAI(msgs,{round:1}) }catch(e2){ if(!e2.limit) throw e2; alog('⛔ Лимит сайта ИИ и в новом чате. Войдите в аккаунт во встроенном браузере (вкладка «Веб-чаты») или выберите другой ИИ/API и запустите снова.'); return false } } if(ans!=null&&!String(ans).replace(Edits.CUT_MARK,'').trim()){ alog('  ⚠ пустой ответ — повторяю запрос'); const m2=slim(msgs); m2[m2.length-1]={...m2[m2.length-1],content:m2[m2.length-1].content+'\n\n(Отвечай сразу правками, без долгих рассуждений.)'}; ans=await askAI(m2,{round:r+1}).catch(()=>null) }
  if(HALT()) return false; if(!ans||!String(ans).replace(Edits.CUT_MARK,'').trim()){ alog('  ↻ ИИ снова не ответил — начинаю новый диалог с актуальным состоянием проекта'); const lastFb=msgs.filter(m=>m.role==='user').pop(); msgs=[msgs[0],{role:'user',content:task+'\n\n'+(opt.noSnapshot?'':await projectSnapshot())+(r>1&&lastFb?'\n\nИтог прошлого раунда:\n'+lastFb.content.slice(0,6000):'')+(opt.verifyDesc?`\n\nПосле твоих правок студия выполнит проверку: ${opt.verifyDesc}`:'')}]; ans=await askAI(msgs,{round:1}).catch(()=>null) }
  for(let k=0;k<4&&ans&&Edits.isTruncated(ans);k++){ alog(`  ✂ ответ оборван — прошу продолжение (${k+1})`); const cont=await askAI([...msgs,{role:'assistant',content:ans},{role:'user',content:'Твой ответ оборвался на полуслове. Продолжи РОВНО с места обрыва (с того же символа), без повторов уже написанного, без пояснений и вступлений.'}],{round:r+1,silent:true}).catch(()=>null); if(!cont||!cont.replace(Edits.CUT_MARK,'').trim()) break; ans=Edits.joinCont(ans,cont) }
  if(ans) ans=String(ans).replace(Edits.CUT_MARK,''); alog('  …ответ получен'); if(!ans){ alog('ИИ не ответил — стоп'); return false } msgs.push({role:'assistant',content:ans});
  const {ops,warnings}=Edits.parse(ans); warnings.forEach(w=>alog('  ⚠ '+w)); const edits=ops.filter(o=>['write','edit','delete','rename','skip','append'].includes(o.type)), cmds=ops.filter(o=>o.type==='cmd').flatMap(o=>o.cmds);
  alog(`  ответ: ${ans.length} симв., правок ${edits.length}, команд ${cmds.length}${/^\s*ГОТОВО\s*$/m.test(ans)?', ГОТОВО':''}`);
  if(ctrlOn()&&!edits.length&&!cmds.length&&isQuestion(ans)&&(opt._ctrlQ||0)<3&&!HALT()){ opt._ctrlQ=(opt._ctrlQ||0)+1; alog('  ❓ ИИ-программист задал вопрос — отвечает Контролёр'); const ca=await CTRL.answer(ans,opt.ctrlCtx||task); if(ca){ msgs.push({role:'user',content:'Ответ Контролёра (вместо пользователя) на твой вопрос:\n'+ca+'\n\nТеперь выполни задачу: пришли правки строго по ФОРМАТУ ОТВЕТА. Вопросов больше не задавай.'}); if(r>=N) N++; continue } }
  let fb=''; if(edits.length){ const {st}=await runOps(edits); opt._touched=opt._touched||new Set(); for(const it of st.items) if(it.ok&&it.op.path&&it.op.type!=='delete') opt._touched.add(it.op.path); const rej=st.items.filter(i=>!i.ok); if(rej.length){ fb+='Не применено:\n'+rej.map(i=>`- ${i.op.path}: ${i.reason}`).join('\n')+'\n'; opt._rej=opt._rej||{}; for(const p of [...new Set(rej.filter(i=>i.op.type==='edit').map(i=>i.op.path))]){ opt._rej[p]=(opt._rej[p]||0)+1; if(opt._rej[p]>=2) fb+=`\nSEARCH/REPLACE для ${p} не срабатывает уже ${opt._rej[p]} раза. Пришли файл ${p} ЦЕЛИКОМ (строка «ФАЙЛ: ${p}» и полный блок кода), без SEARCH/REPLACE.\n` }
   for(const p of [...new Set(rej.map(i=>i.op.path).filter(Boolean))]){ const t=await api.readMaybe(abs(p)); if(t!=null) fb+=`\nТекущее содержимое ${p}:\n\`\`\`${langOf(p)}\n${t.slice(0,30000)}\n\`\`\`\n` } } }
  if(ops.some(o=>o.type==='skip'&&o.reason==='усечён')||warnings.some(w=>/Неполный блок/.test(w))) fb+='\nТвой ответ оборвался (лимит длины). Незаконченные блоки НЕ применены. Пришли оборванный файл заново КОРОЧЕ: только первую часть (до ~60 строк) через «ФАЙЛ: путь», а продолжение — в следующих ответах через строку «ДОПИСАТЬ: путь» и блок кода. Один файл за ответ.\n';
  if(cmds.length){ const c=await runCmds(cmds); fb+='\nРезультат команд:\n```\n'+c.out.slice(-8000)+'\n```\n' }
  let vok=true; if(opt.verify){ alog('  🔎 проверка…'); const v=await opt.verify(); vok=v.ok; alog(vok?'  ✅ проверка пройдена':'  ❌ проверка не пройдена'+errCount(v.out)); if(vok&&opt.ui!==false&&(edits.length||cmds.length)){ const u=await uiCheck(opt.ui); if(u&&!u.skip){ fb+='\n'+u.report+'\n'; if(!u.ok){ vok=false; alog('  ❌ UI-проверка: есть проблемы') } else alog('  ✅ UI-проверка без ошибок') } } if(!vok&&!fb.includes('UI-проверка')&&WebApp.envProblem(v.out)){ const why=WebApp.envProblem(v.out); alog('  ⛔ проверка не запустилась: '+why+' — ИИ это не отправляю'); envNotice(why,v.out); return false } if(!vok&&!fb.includes('UI-проверка')) fb+=`\nПроверка (${opt.verifyDesc||''}) НЕ пройдена:\n\`\`\`\n${v.out.slice(-8000)}\n\`\`\`\n` }
  const done=/^\s*\**ГОТОВО\**\s*\.?\s*$/m.test(ans);
  if(vok&&!fb.includes('Не применено')&&(done&&(edits.length||cmds.length||(AG.stats.applied+AG.stats.cmds)>base0||r>=2&&/```/.test(ans))||opt.verify&&!cmds.length&&!edits.length&&(AG.stats.applied+AG.stats.cmds)>base0||opt.verify&&vok&&edits.length)){ if(ctrlOn()&&opt.review&&(opt._ctrlR||0)<3&&!HALT()){ opt._ctrlR=(opt._ctrlR||0)+1; const files=[]; for(const p of [...(opt._touched||[])].slice(0,8)){ const t=await api.readMaybe(abs(p)); if(t!=null) files.push([p,t]) } const rv=await CTRL.review(task,opt.ctrlCtx||'',ans,files); if(!rv.ok&&!HALT()){ msgs.push({role:'user',content:'Контролёр проверил твою работу и нашёл проблемы:\n'+rv.notes.map(x=>'- '+x).join('\n')+'\n\nИсправь это сейчас (правки по ФОРМАТУ ОТВЕТА, файлы целиком или SEARCH/REPLACE). Когда исправишь — напиши ГОТОВО.'}); if(r>=N) N++; continue } } else if(ctrlOn()&&opt.review&&(opt._ctrlR||0)>=3) alog('» 🛡 Контролёр: лимит — 3 проверки на шаг, принимаю шаг как есть'); alog(`✅ Агент завершил за ${r} раунд(ов). Применено правок: ${AG.stats.applied}, отклонено: ${AG.stats.rejected}, команд: ${AG.stats.cmds}`); return true }
  if(!edits.length&&!cmds.length&&(AG.stats.applied+AG.stats.cmds)<=base0){ alog('  ⚠ ИИ не дал ни одной правки — прошу сделать задачу по частям'); fb+='\nТы не прислал ни одной правки, а задача ещё не выполнена. Не отказывайся: делай по частям. Сейчас пришли 2–3 файла (полностью, по ФОРМАТУ ОТВЕТА), с которых логично начать; остальное — в следующих ответах. Если ты уверен, что это уже сделано в текущем коде, — процитируй в блоке ``` те строки кода, которые это выполняют, и напиши ГОТОВО.' }
  if(!edits.length&&!cmds.length&&!opt.verify&&!done){ fb+='\nВ ответе нет правок в требуемом формате. Дай правки строго по ФОРМАТУ ОТВЕТА, либо напиши ГОТОВО.' }
  msgs.push({role:'user',content:(fb||'Правки применены.')+'\n\nПродолжай: исправь проблемы, если они есть. Когда всё готово и проверено — напиши ГОТОВО.'}) }
 alog('⛔ Лимит раундов исчерпан'); return false }

// ---- UI-проверка (веб): ошибки JS, неудачные запросы, CDN, горизонтальная прокрутка, видимый текст ----
async function uiCheck(ui){ if(!S.root||!api.uiCheck) return null; try{ alog('  🖥 UI-проверка: запускаю приложение и открываю страницу…'); const d=await api.uiCheck(S.root,{seed:ui&&ui.seed,checks:(ui&&ui.checks)||AG.uiChecks||[],dark:!!(ui&&ui.dark||AG.uiDark)}); if(d.skip) return d; const m=await api.uiCheck(S.root,{seed:ui&&ui.seed,width:400,height:800}); if(m&&!m.skip&&!m.ok&&/шире окна/.test(m.report)){ d.ok=false; d.report+='\n(мобильная ширина 400px) ПРОБЛЕМА: страница шире экрана телефона — нужна адаптивная вёрстка.' } return d }catch(e){ return {ok:true,report:'UI-проверка не выполнена: '+e.message} } }
// ---- Вход в аккаунт ИИ: есть вход → длинные ответы, крупные шаги; нет → мелкие шаги и файлы по частям ----
let ACCT={logged:{},t:0};
async function acctRefresh(){ try{ ACCT.logged=await api.acctCheck()||{}; ACCT.t=Date.now() }catch{} return ACCT.logged }
function bigMode(){ const m=S.cfg.acct||'auto'; if(m==='yes') return true; if(m==='no') return false; const pv=(typeof AIW!=='undefined'&&AIW.override)||($('#prov')||{}).value||''; if(pv.startsWith('web:')) return !!ACCT.logged[pv.slice(4)]; const pr=(S.cfg.providers||[]).find(x=>x.id===pv); return !!(pr&&pr.key&&pr.id!=='pollinations') }
const OLL_MODELS=[[24,'qwen2.5-coder:14b','14B — лучше пишет, нужно 16+ ГБ ОЗУ'],[12,'qwen2.5-coder:7b','7B — хороший баланс, нужно 8+ ГБ ОЗУ'],[0,'qwen2.5-coder:3b','3B — для слабых ПК, 4+ ГБ ОЗУ, пишет проще']];
async function smOllama(){ const info=await api.sysInfo(); const gb=info.mem/1073741824; const [,model,desc]=OLL_MODELS.find(m=>gb>=m[0]); const ok=await new Promise(r=>modal('Офлайн-ИИ на этом компьютере',`<div style="padding:16px;line-height:1.5">Студия скачает <b>Ollama</b> (открытая программа) и открытую модель <b>${model}</b> (${desc}).<br>После этого ИИ работает <b>без интернета и без аккаунта</b>.<br><br>Ваш ПК: ${gb.toFixed(0)} ГБ памяти, ${info.cpus} ядер. Нужно ~${model.includes('14b')?'9':model.includes('7b')?'5':'2'} ГБ на диске. Без видеокарты ответы медленнее (минуты на файл).</div>`,[['Скачать и поставить',()=>{ closeModal(); r(true) },'pri'],['Отмена',()=>{ closeModal(); r(false) }]])); if(!ok) return;
 smMsg('Ставлю Ollama…'); const st=await api.ollamaSetup(model); if(!st.ok){ smMsg('Не получилось поставить офлайн-ИИ: '+st.err); return } const pr=S.cfg.providers.find(x=>x.id==='ollama'); S.cfg.ollamaReady=true; pr.model=model; pr.maxTokens=8000; S.cfg.prov='ollama'; $('#prov').value='ollama'; S.cfg.acct='no'; saveCfg(); smMsg('Офлайн-ИИ готов: '+model+'. Теперь программы пишутся на этом компьютере без интернета.'); smAcct() }
function acctLabel(){ const m=S.cfg.acct||'auto', b=bigMode(); const lg=Object.keys(ACCT.logged||{}).filter(k=>ACCT.logged[k]&&site(k)).map(k=>site(k).name); return (lg.length?'Вход найден: '+lg.join(', ')+'. ':'Входа в аккаунт ИИ не найдено. ')+(m==='auto'?'Автоопределение: ':'')+(b?'есть вход — пишу программу крупными частями':'нет входа — пишу маленькими шагами (медленнее, но надёжно)') }
window.__bigMode=bigMode;
function uiProbs(u){ if(!u||u.skip) return 0; const m=String(u.report||'').split('ПРОБЛЕМЫ:')[1]; return m?(m.split('Видимый текст')[0].match(/^- /gm)||[]).length:0 }
// ---- План: большая задача → требования + шаги; каждый шаг — отдельный цикл агента; в конце сверка с требованиями ----
function jsonFrom(t){ const m=String(t||'').match(/```(?:json)?\s*([\s\S]*?)```/)||String(t||'').match(/(\{[\s\S]*\})/); try{ return JSON.parse(m?m[1]:t) }catch{ return null } }
async function agentPlan(task,opt={}){ if(!S.root) return toast('Откройте папку проекта'); stopLoop=false; panelTab('build');
 AG.uiChecks=[]; AG.uiDark=false; alog(`━━━ 🗺 План: ${task.slice(0,120)} ━━━`); const snap=await projectSnapshot(20000);
 const BIG=bigMode(); alog(BIG?'  режим: есть вход в аккаунт ИИ — крупные шаги, файлы целиком':'  режим: нет входа — мелкие шаги, большие файлы по частям'); const ask=`Ты планировщик в IDE. Задача пользователя:\n${task}\n\nПроект:\n${snap}\n\n${BIG?'Разбей работу на 2–5 КРУПНЫХ шагов: у ИИ длинные ответы, каждый шаг может создать или переписать 2–5 файлов целиком (до ~400 строк каждый). Тесты можно в том же шаге.':`Разбей работу на 6–16 МЕЛКИХ шагов. Ответ ИИ ограничен ~3000 символов, поэтому каждый шаг — ОДИН файл и не больше ~60 строк кода. Большой файл (JS/CSS/шаблон) раздели на несколько шагов по разделам: первый шаг создаёт файл с первым разделом, следующие — «дописать в файл раздел …» (например: app.js — раздел API-запросов; app.js — раздел отрисовки карточек; app.js — раздел фильтров; app.css — переменные и тёмная тема; app.css — карточки). Тесты — отдельным шагом.`} Шаги — конкретные действия «создать/добавить/переписать …», НЕ «проверить/при необходимости поправить». Каждый пункт задачи должен попасть в какой-то шаг. Выпиши ВСЕ проверяемые требования. Для веб-интерфейса добавь автоматические проверки страницы: CSS-селектор элемента, который должен быть видим (id/класс, которые ты сам задашь в шагах), и/или текст, который должен быть на странице. Ответ — ТОЛЬКО JSON без пояснений:\n{"требования":["..."],"шаги":[{"что":"... (укажи id/классы элементов)","файлы":["..."]}],"проверки_страницы":[{"req":"панель статистики","sel":"#stats","text":"Выполнено"}],"тёмная_тема":true}`;
 let plan=null; for(let k=0;k<3&&!plan&&!HALT();k++){ const a=await askAI([{role:'user',content:ask+(k?'\n\nВерни строго валидный JSON.':'')}],{round:1}).catch(()=>null); const j=jsonFrom(a); if(j&&Array.isArray(j['шаги'])&&j['шаги'].length){ const bad=j['шаги'].filter(x=>/^\s*(провер|убед|просмотр|посмотр|протестир)/i.test(String(x['что']||''))); if(bad.length&&k<2){ alog('  ⚠ в плане шаги-«проверки» без действий — прошу переделать план'); continue } j['шаги']=j['шаги'].filter(x=>!bad.includes(x)); plan=j } }
 if(HALT()) return false; if(!plan){ alog('  ⚠ план не получен — выполняю задачу целиком'); return agent(task,opt) }
 const reqs=(plan['требования']||[]).map(String).filter(Boolean); AG.uiChecks=(plan['проверки_страницы']||[]).filter(c=>c&&(c.sel||c.text)).slice(0,20); AG.uiDark=!!plan['тёмная_тема']; if(AG.uiChecks.length) alog('  проверок страницы: '+AG.uiChecks.length+' ('+AG.uiChecks.map(c=>c.sel||c.text).join(', ')+')'); alog('  требований: '+reqs.length+', шагов: '+plan['шаги'].length); plan['шаги'].forEach((st,i)=>alog(`   ${i+1}. ${st['что']} [${(st['файлы']||[]).join(', ')}]`)); PG.plan(plan['шаги'].map(x=>String(x['что']||'')));
 const ctx=`ОБЩАЯ ЗАДАЧА (для контекста, не делай всё сразу):\n${task}\n\nПЛАН:\n${plan['шаги'].map((st,i)=>`${i+1}. ${st['что']}`).join('\n')}${AG.uiChecks.length?`\n\nСтудия в конце автоматически проверит страницу: ${AG.uiChecks.map(c=>`«${c.req}» — ${c.sel?'видим элемент '+c.sel:''}${c.text?' текст «'+c.text+'»':''}`).join('; ')}${AG.uiDark?'; кнопка переключения темы (с текстом/title «Тема») меняет цвет фона':''}.`:''}`;
 for(const [i,st] of plan['шаги'].entries()){ if(HALT()) return false; PG.planMark(i); const a0=AG.stats.applied; const hint=!BIG&&/дописа|раздел/i.test(st['что'])?'\nЕсли файл уже существует и этот раздел в нём ещё не написан — добавь его через строку «ДОПИСАТЬ: путь» и блок кода (не переписывай файл целиком). Если нужно встроить раздел внутрь файла — SEARCH/REPLACE.':''; await agent(`ШАГ ${i+1} из ${plan['шаги'].length}: ${st['что']}\nФайлы: ${(st['файлы']||[]).join(', ')||'на твоё усмотрение'}\nСделай ТОЛЬКО этот шаг полностью и качественно, не ломая уже сделанное. Остальные шаги будут следующими запросами.${hint}\n\n${ctx}`,{...opt,focus:st['файлы'],rounds:Math.min(opt.rounds||6,5),ui:i===plan['шаги'].length-1?opt.ui:false,review:true,ctrlCtx:ctx});
  if(AG.stats.applied===a0&&!HALT()){ alog(`  ⚠ шаг ${i+1} не засчитан: ни одной реальной правки — повторяю${BIG?'':' короче'}`); await agent(`ШАГ ${i+1}: ${st['что']}\nФайлы: ${(st['файлы']||[]).join(', ')}\nПрошлая попытка не изменила ни одного файла — шаг НЕ засчитан. Пришли СЕЙЧАС ${BIG?'нужные файлы целиком':'ровно один блок кода (до 60 строк)'}: «ФАЙЛ: путь» для нового файла, «ДОПИСАТЬ: путь» для продолжения или SEARCH/REPLACE для правки. Без рассуждений.\n\n${ctx}`,{...opt,focus:st['файлы'],rounds:3,ui:false,review:true,ctrlCtx:ctx}); if(AG.stats.applied===a0) alog(`  ⚠ шаг ${i+1} так и не выполнен — продолжу, сверка вернёт его`) } }
 // сверка с требованиями свежим взглядом (новый диалог), до 3 кругов доработки
 PG.planMark(plan['шаги'].length); for(let k=0;k<4&&reqs.length&&!HALT();k++){ const ui=await uiCheck(opt.ui); let lastUi=ui; const rv=await askAI([{role:'user',content:`Ты строгий ревьюер. Проверь по коду${ui&&!ui.skip?' и по результату открытия страницы':''}, выполнено ли КАЖДОЕ требование. Не верь комментариям — смотри на реальный код.\n\nТребования:\n${reqs.map((r,i)=>`${i+1}. ${r}`).join('\n')}\n\n${ui&&!ui.skip?ui.report+'\n\n':''}Проект:\n${await projectSnapshot(k?16000:26000)}\n\nДля КАЖДОГО требования дай вердикт и доказательство — короткую цитату реального кода (имя файла и строка), которая его выполняет. Без цитаты требование считается невыполненным. Доказательство — до 80 символов. Ответ — ТОЛЬКО JSON, без пояснений: {"итог":[{"номер":N,"выполнено":true,"доказательство":"файл: код"}]}`}],{round:1}).catch(()=>null);
  const j=jsonFrom(rv); const res=(j&&Array.isArray(j['итог']))?j['итог']:null; const files=(await api.allFiles(S.root)); const blob=(await Promise.all(files.filter(f=>/\.(py|js|css|html|kt|java|xml|cs|ts)$/i.test(f)&&!/[\\/](node_modules|ivancode-out|build|\.ivancode)[\\/]/.test(f)).slice(0,80).map(f=>api.readMaybe(f)))).join('\n'); const norm=x=>String(x||'').replace(/\s+/g,' ').trim(); const seen=new Set((res||[]).map(r=>+r['номер'])); const miss=res?[...res.filter(r=>{ if(!r['выполнено']) return true; const ev=norm(String(r['доказательство']||'').replace(/^[^:]{1,80}:\s*/,'')); return ev.length<6||!norm(blob).includes(ev.slice(0,60)) }).map(r=>({номер:r['номер'],почему:r['выполнено']?'цитата-доказательство не найдена в коде':'ревьюер: не выполнено'})),...reqs.map((_,i)=>i+1).filter(n=>!seen.has(n)).map(n=>({номер:n,почему:'нет вердикта'}))]:[]; if(!res){ alog('  ⚠ ревью не дало JSON — повторю'); continue } if(!miss.length&&(!ui||ui.skip||ui.ok)){ alog('✅ Сверка: все требования выполнены'); return true }
  const list=miss.map(m=>`- ${reqs[(m['номер']||0)-1]||''}: ${m['почему']||''}`).join('\n'); alog(`  🔁 сверка ${k+1}: не выполнено ${miss.length}${ui&&!ui.ok?' + проблемы UI':''}`);
  if(ui&&!ui.skip&&!ui.ok) await agent(`Исправь проблемы, найденные при открытии страницы (короткими правками, по одному файлу за ответ):\n${ui.report}\n\n${ctx}`,{...opt,rounds:4});
  const G=BIG?6:2; for(let q=0;q<miss.length&&!HALT();q+=G){ const part=miss.slice(q,q+G).map(m=>`- ${reqs[(m['номер']||0)-1]||''}: ${m['почему']||''}`).join('\n'); const a0=AG.stats.applied; const tf=(await api.allFiles(S.root)).filter(f=>/\.(py|js|css|html|kt|xml|java)$/i.test(f)&&!/[\\/](\.ivancode|ivancode-out|build|node_modules|__pycache__)[\\/]/.test(f)); const bkd=await api.backupMake(S.root,tf); const before=uiProbs(lastUi); await agent(`Доработка (часть ${q/G+1} из ${Math.ceil(miss.length/G)}): выполни ТОЛЬКО эти требования, которые ревью не нашло в коде:\n${part}\nКороткими правками: SEARCH/REPLACE или «ДОПИСАТЬ: путь» с новым разделом (до 60 строк). Если требование действительно уже выполнено — процитируй строки кода и напиши ГОТОВО.\n\n${ctx}`,{...opt,rounds:3,ui:false}); if(AG.stats.applied===a0){ alog('  ⚠ доработка без правок'); continue } if(opt.ui!==false&&S.root){ const u2=await uiCheck(opt.ui); const vt=opt.verify?await opt.verify():{ok:true}; const after=uiProbs(u2); if(!vt.ok||after>before){ await api.backupRestore(S.root,bkd); await openRoot(S.root); alog(`  ↩ доработка ухудшила результат (проблем было ${before}, стало ${after}${vt.ok?'':', тесты упали'}) — откатываю её`) } else lastUi=u2 } } }
 alog('⚠ Сверка: остались невыполненные требования (см. выше)'); return false }
window.__agentPlan=agentPlan;

// =================== ПРОСТОЙ РЕЖИМ: описал словами → готовая программа ===================
const SM={kind:'pc',busy:false,root:null,files:[]};
const sm$=id=>document.getElementById(id);
function smShow(on){ sm$('simple').classList.toggle('hidden',!on); S.cfg.expert=!on; saveCfg(); if(on){ smRecent(); smAcct() } }
function smStage(stage,note,bad){ const order=['plan','write','check','build','done']; const i=order.indexOf(stage);
 document.querySelectorAll('.s-steps li').forEach((li,k)=>{ li.className=k<i?'ok':k===i?(bad?'bad':stage==='done'?'ok':'now'):''; if(k===i&&note!=null) li.querySelector('small').textContent=note }) }
function smMsg(t){ sm$('s-msg').textContent=t||'' }
// перевод внутреннего журнала агента в понятный прогресс
const _alog=alog; alog=function(t){ _alog(t); if(!SM.busy) return; let m;
 if(/🗺 План/.test(t)) smStage('plan','Разбираю, что нужно сделать…');
 else if((m=t.match(/шагов: (\d+)/))) smStage('plan','План готов, шагов: '+m[1]);
 else if((m=t.match(/Агент: ШАГ (\d+) из (\d+): (.{0,90})/))) smStage('write',`Шаг ${m[1]} из ${m[2]}: ${m[3].replace(/\s*\[.*$/,'')}…`);
 else if(/UI-проверка: запускаю/.test(t)) smStage(SM.stage==='build'?'build':'check','Открываю программу и смотрю, всё ли работает…');
 else if(/сверка \d+: не выполнено (\d+)/.test(t)) smStage('write','Нашлись недоделки — доделываю…');
 else if(/Доработай проект/.test(t)) smStage('write','Доделываю по замечаниям проверки…') };
async function smEnsureTools(kind){ if(!/Windows/.test(navigator.userAgent)) return true; const need=kind==='phone'?['jdk','android','gradle']:['python','nsis'];
 const L=await api.toolsList(); for(const id of need){ const t=L.find(x=>x.id===id); if(t&&!t.installed){ smStage('build','Скачиваю нужный инструмент: '+t.name+' (один раз)…'); const r=await api.toolsInstall(id); if(!r.ok){ notify('Не установлено: '+t.name+'. Причина: '+(r.err||'неизвестно'),true); smMsg('Не получилось установить '+t.name+'.\nПричина: '+(r.err||'неизвестно')+'\n\nОткройте «🧰 Проверка инструментов» (режим для опытных) и нажмите «Скопировать отчёт».'); return false } } } return true }
// надёжная сборка: несколько попыток, ошибки сборки — ИИ на исправление, понятный итог
function buildErrLines(r){ const e=(r.errors||[]).slice(0,20).map(x=>`${rel(x.file)}:${x.line} ${x.msg}`); const L=String(r.out||'').split('\n'); const hits=[]; L.forEach((l,i)=>{ if(/error|ошибк|exception|FAILED|not found|не найден|cannot|unresolved/i.test(l)) hits.push(L.slice(Math.max(0,i-1),i+3).join('\n')) }); return (e.length?e.join('\n')+'\n\n':'')+[...new Set(hits)].slice(0,25).join('\n…\n').slice(0,6000) }
async function smBuild(){ SM.stage='build'; smStage('build','Готовлю инструменты…'); if(!(await smEnsureTools(SM.kind))) return false; await refreshBuild();
 const targets=SM.kind==='phone'?[['debug','Собираю приложение для телефона (APK)…']]:[['exe','Собираю программу (EXE)…'],['installer','Собираю установщик…']]; const MAXA=5;
 for(const [t,label] of targets){ let ok=false, lastR=null, heal=0, seen={}; for(let a=1;a<=MAXA&&!ok&&!HALT();a++){ smStage('build',label+(a>1?` (попытка ${a} из ${MAXA})`:''));
   const r=await api.build(S.root,PK.kind,t,{}); lastR=r; if(r.code===0){ ok=true; break }
   PG.log('Ошибка сборки: '+(((r.errors||[])[0]||{}).msg||String(r.out||'').trim().split('\n').filter(l=>/error|ошибк|not found|FAIL|не найден/i.test(l)).slice(-1)[0]||String(r.out||'').trim().split('\n').slice(-1)[0]||'').slice(0,200),'warn');
   { const why=WebApp.envProblem(r.out); if(why){ if(heal<2){ heal++; a--; PG.log('Это проблема компьютера ('+why+'), а не программы — чиню инструменты сам, попытка не считается','warn'); smStage('build','Чиню инструменты сборки…'); const okT=await smEnsureTools(SM.kind); await refreshBuild(); if(okT) continue } envNotice(why,r.out); smStage('build','Не хватает инструмента',true); sm$('s-title').textContent='Не хватает инструмента ⚠'; return false } }
   const errs=buildErrLines(r); const sig=errs.replace(/:\d+/g,'').slice(0,400); const rep=!!seen[sig]; seen[sig]=1;
   smStage('build',`Сборка не удалась — ИИ исправляет ошибку (попытка ${a} из ${MAXA})…`);
   await agent(`Сборка (${r.cmd}) завершилась с ошибкой. Исправь проект так, чтобы она прошла (не меняй требования программы).${rep?'\nЭТА ЖЕ ОШИБКА УЖЕ БЫЛА В ПРОШЛОЙ ПОПЫТКЕ — прошлое исправление не помогло, сделай по-другому.':''}\n\nОшибки (только нужные строки вывода):\n\`\`\`\n${errs}\n\`\`\``,{rounds:1,ui:false,verify:async()=>{ const v=await api.build(S.root,PK.kind,t,{}); return {ok:v.code===0,out:buildErrLines(v)} },verifyDesc:'повторная сборка'});
   const v=await api.build(S.root,PK.kind,t,{}); lastR=v; ok=v.code===0 }
  if(!ok){ smStage('build','Не получилось собрать',true); sm$('s-title').textContent='Не получилось собрать ⚠'; smMsg('Сборка не прошла и после '+MAXA+' попыток автоматического исправления. Готовый файл НЕ создан (сломанную программу не собираю).\nОшибка: '+((((lastR||{}).errors||[])[0]||{}).msg||'см. журнал')+'\n\nНажмите «🔄 Повторить» или выберите способ «⚡ Быстро».'); return false } }
 return true }
async function smFinish(){ const c=await api.simpleCollect(S.root); SM.files=c.files; SM.out=c.dir; smStage('done','Программа готова!'); sm$('s-title').textContent='Готово! 🎉';
 const exe=c.files.find(f=>/Setup\.exe$/i.test(f)), apk=c.files.find(f=>/\.apk$/i.test(f));
 smMsg(SM.kind==='phone'?`Приложение для Android: ${apk||'—'}\nСкопируйте этот файл на телефон и откройте его, чтобы установить.`:`Готовая программа лежит в папке «Готовая программа».\nУстановщик для других компьютеров: ${exe?exe.split(/[\\/]/).pop():'—'}`);
 if(SM.planOk===false){ sm$('s-title').textContent='Собрано, но есть недоделки ⚠'; smMsg(sm$('s-msg').textContent+'\n\n⚠ Проверка нашла, что не всё из описания работает. Нажмите «Попросить изменить» и напишите, что поправить, или подключите ИИ с входом в аккаунт / офлайн-ИИ — он справится лучше.') }
 sm$('s-run').textContent=SM.kind==='phone'?'📱 Где APK?':'▶ Запустить'; sm$('s-final').classList.remove('hidden');
 const R=S.cfg.simpleRecent||[]; S.cfg.simpleRecent=[{root:S.root,name:SM.name,kind:SM.kind,t:Date.now()},...R.filter(x=>x.root!==S.root)].slice(0,8); saveCfg() }
const SM_GUIDE={pc:'Это настольная программа для Windows: Python + Flask, интерфейс в окне браузера (run.py уже открывает его сам), данные — в %APPDATA% (уже настроено в app/__init__.py, путь к базе — app.config["DATABASE"]). Интерфейс: app/templates/index.html, стили app/static/css/*.css, скрипты app/static/js/*.js — всё локально, без CDN. Делай красиво и современно: карточки, отступы, скругления, понятные русские подписи, светлая и тёмная тема (кнопка #themeToggle уже есть), адаптивность. Пиши тесты pytest в tests/ для логики и API.',
 phone:'Это Android-приложение (Kotlin, без лишних библиотек, только Android-фреймворк — чтобы APK был маленьким): android.app.Activity, разметка в res/layout, тема в res/values/themes.xml (светлая) и res/values-night (тёмная), цвета в colors.xml, строки по-русски в strings.xml. Делай красиво: карточки (shape-drawable со скруглением), отступы 16dp, крупные заголовки, круглая кнопка «+». Не трогай res/mipmap* (значок делает студия). Проверка — сборка gradle assembleDebug.'};
async function smRun(desc,isChange,resume){ if(SM.busy) return; SM.busy=true; AIW.reset(); PG.reset(); SM.last={desc,isChange}; SM.stage=''; if(!resume&&!isChange) SM.root=null; sm$('s-start').classList.add('hidden'); sm$('s-work').classList.remove('hidden'); sm$('s-final').classList.add('hidden'); smMsg(''); sm$('s-title').textContent=isChange?'Вношу изменения…':'Делаю программу…';
 try{ if(resume&&SM.root){ await openRoot(SM.root); PG.log('Продолжаю с того места: проект «'+SM.name+'» уже создан') } else if(!isChange){ smStage('plan','Создаю проект…'); const nm=(sm$('s-name').value.trim()||desc.replace(/^(сделай|создай|напиши|нужна|нужен|программ[ау]|приложение)\s+/i,'').split(/[.,:;!\n]/)[0].split(/\s+/).slice(0,3).join(' ')||'Моя программа'); SM.name=nm[0].toUpperCase()+nm.slice(1);
   const dir=(await api.docsDir())+sep+(await api.translit(SM.name)); let d=dir, k=2; while(await api.exists(d)) d=dir+'-'+(k++);
   await api.tpl(SM.kind==='phone'?'android-kotlin':'pyweb',d,SM.name,{}); try{ await api.iconSave(d,ICON.files({bg:['#4f6bed','#2e9d6a','#e0675d','#d48a1f','#8a56d6'][SM.name.length%5],scale:1,letter:SM.name[0].toUpperCase(),art:null}),{bg:'#4f6bed',scale:1}) }catch{}
   await openRoot(d); SM.root=d }
  const verify=SM.kind==='phone'?async()=>{ const v=await api.build(S.root,'android','debug',{}); return {ok:v.code===0,out:String(v.out).slice(-6000)} }:async()=>{ const r=await api.cmdRun(S.root,'python -m pytest -q',600000); return {ok:r.code===0||/no tests ran/.test(r.out),out:r.out} };
  const task=(isChange?`Измени программу «${SM.name}» по просьбе пользователя: ${desc}`:`Сделай программу «${SM.name}». Описание от пользователя (он не программист): ${desc}`)+'\n\n'+SM_GUIDE[SM.kind];
  await acctRefresh(); if(!window.__keepProv){ const sel=S.cfg.simpleAi||'auto'; if(sel!=='auto'&&[...$('#prov').options].some(o=>o.value===sel)) $('#prov').value=sel; else { const lg=(S.cfg.acct||'auto')!=='no'&&Object.keys(ACCT.logged).find(k=>ACCT.logged[k]&&site(k)); $('#prov').value=lg?'web:'+lg:'pollinations' } } PG.setProv(provName($('#prov').value)); alog('» Работаю с ИИ «'+provName($('#prov').value)+'»'+(bigMode()?' (есть вход — крупные шаги)':' (без входа — мелкие шаги)'));
  if(!(await depsGate('classic'))) return;
  smStage('plan','Разбираю, что нужно сделать…'); SM.planOk=await agentPlan(task,{rounds:5,verify,verifyDesc:SM.kind==='phone'?'gradle assembleDebug':'python -m pytest -q',ui:SM.kind==='phone'?false:{dark:true}}); if(PG.halted()) return;
  smStage('check','Проверяю, что всё работает…'); const v=await verify(); if(!v.ok&&WebApp.envProblem(v.out)){ envNotice(WebApp.envProblem(v.out),v.out) } else if(!v.ok){ await agent('Проверка не проходит. Исправь:\n```\n'+v.out.slice(-5000)+'\n```',{rounds:4,verify,ui:false}) } if(PG.halted()) return;
  if(await smBuild()&&!PG.halted()) await smFinish(); else PG.halted() }
 catch(e){ smMsg('Что-то пошло не так: '+e.message); PG.fail('Что-то пошло не так: '+e.message) } finally{ SM.busy=false; PG.done() } }
async function smRecent(){ const R=(S.cfg.simpleRecent||[]); sm$('s-recent').innerHTML=R.length?'<h3>Мои программы</h3>'+R.map((r,i)=>`<div class="r"><span>${r.kind==='phone'?'📱':'💻'} ${esc(r.name||'')}</span><button class="s-link" data-i="${i}">Открыть</button></div>`).join(''):'';
 sm$('s-recent').onclick=async e=>{ const r=R[+e.target.dataset.i]; if(!r) return; SM.kind=r.kind; SM.name=r.name; await openRoot(r.root); SM.root=r.root; sm$('s-start').classList.add('hidden'); sm$('s-work').classList.remove('hidden'); await smFinish() } }
document.querySelectorAll('.s-kind button').forEach(b=>b.onclick=()=>{ SM.kind=b.dataset.k; document.querySelectorAll('.s-kind button').forEach(x=>x.classList.toggle('on',x===b)) });
sm$('s-go').onclick=()=>{ const d=sm$('s-desc').value.trim(); if(d.length<10) return toast('Опишите программу чуть подробнее'); smRun(d,false) };
sm$('s-ask-go').onclick=()=>{ const d=sm$('s-ask').value.trim(); if(!d) return; sm$('s-ask').value=''; smRun(d,true) };
sm$('s-run').onclick=async()=>{ const exe=SM.files.find(f=>/\.exe$/i.test(f)&&!/Setup/i.test(f)); if(SM.kind==='pc'&&exe) api.openPath(exe); else api.openPath(SM.out) };
sm$('s-open').onclick=()=>api.openPath(SM.out||S.root);
sm$('s-icon').onclick=async()=>{ await iconDialog(); const t=setInterval(async()=>{ if(!document.querySelector('#modal').classList.contains('hidden')) return; clearInterval(t); SM.busy=true; try{ if(await smBuild()) await smFinish() } finally{ SM.busy=false } },500) };
sm$('s-new').onclick=()=>{ sm$('s-work').classList.add('hidden'); sm$('s-start').classList.remove('hidden'); sm$('s-desc').value=''; sm$('s-name').value=''; smRecent() };
sm$('s-expert').onclick=()=>smShow(false); document.getElementById('b-simple').onclick=()=>smShow(true);
setTimeout(function w(){ if(!window.__ready) return setTimeout(w,300); sm$('s-appname').textContent=S.cfg.appName||'ИванКод'; if(!S.cfg.expert&&!window.__noFirstRun) smShow(true) },350);
async function smAcct(){ if(!sm$('s-acct')) return; await acctRefresh(); if(typeof smAiFill==='function') smAiFill(); document.querySelectorAll('#s-acct [data-m]').forEach(b=>b.classList.toggle('on',b.dataset.m===(S.cfg.acct||'auto'))); sm$('s-acct-note').textContent=acctLabel() }
document.querySelectorAll('#s-acct [data-m]').forEach(b=>b.onclick=()=>{ S.cfg.acct=b.dataset.m; saveCfg(); smAcct() });
if(sm$('s-login')) sm$('s-login').onclick=async()=>{ smShow(false); const sv=String(S.cfg.simpleAi||''); const q=(sv.startsWith('web:')&&site(sv.slice(4)))||(S.sites||[]).find(x=>x.id==='deepseek')||S.sites[0]; if(q){ $('#prov').value='web:'+q.id; $('#wsite').value=q.id } aiTab('web'); toast('Войдите в свой аккаунт '+(q?q.name:'')+' в окне справа, затем нажмите «✨ Простой режим» — студия сама увидит вход'); };
setInterval(()=>{ if(!sm$('simple').classList.contains('hidden')) smAcct() },5000);
if($('#acctSel')){ setTimeout(()=>{ $('#acctSel').value=S.cfg.acct||'auto' },1500); $('#acctSel').onchange=()=>{ S.cfg.acct=$('#acctSel').value; saveCfg(); smAcct() } }
if(sm$('s-offline')) sm$('s-offline').onclick=smOllama; api.on('ollama:progress',t=>{ if(sm$('s-msg')) smMsg(t) });
window.__simple={SM,smRun,smShow,smStage,smAcct};
window.__agent=agent; window.__AG=AG;
// автоисправление сборки через агента
buildLoop=async function(target){ stopLoop=false; panelTab('build'); for(const t of S.tabs) if(t.model.getValue()!==t.saved) await save(t);
 const o={}; if(PK.kind==='android'&&target!=='debug'){ o.keystore=$('#ksfile').value.trim(); o.alias=$('#ksalias').value.trim(); o.storePass=$('#kspass').value; if(!o.keystore||!o.storePass){ bout('Для release укажите keystore и пароль.\n'); return } }
 if(PK.kind==='python'&&S.cur&&S.cur.path.endsWith('.py')) o.main=S.cur.path;
 let last; const verify=async()=>{ last=await api.build(S.root,PK.kind,target,o); return {ok:last.code===0,out:(last.errors||[]).map(e=>`${rel(e.file)}:${e.line}:${e.col} ${e.msg}`).join('\n')+'\n'+last.out.slice(-7000)} };
 const v=await verify(); if(v.ok){ bout('\n✅ Сборка успешна\n'); return true } if(!$('#bfix').checked) return false; { const why=WebApp.envProblem(last.out); if(why){ envNotice(why,last.out); bout('\n⛔ '+why+'. ИИ это не отправляю — это проблема инструментов, а не программы. Откройте «🧰 Проверка инструментов».\n'); return false } }
 return agent(`Сборка (${last.cmd}) завершилась с ошибками. Исправь их правками разделов (SEARCH/REPLACE) и при необходимости командами.\n\nОшибки:\n\`\`\`\n${v.out}\n\`\`\``,{verify,verifyDesc:'повторная сборка '+last.cmd,noSnapshot:false}) };
$('#btargets').onclick=e=>{ const t=e.target.dataset.t; if(t) buildLoop(t) };
window.__dump=()=>JSON.stringify({log:AG.log.join('\n'),stats:AG.stats,chat:[...document.querySelectorAll('#msgs .msg')].map(m=>'### '+(m.querySelector('.who')||{}).textContent+'\n'+(m._md||m.innerText)).join('\n\n')});

// ошибка окружения → пользователю понятное сообщение (ИИ не получает)
function envNotice(why,out){ const t='Не хватает инструмента на этом компьютере: '+why+'.\nЭто не ошибка программы — ИИ её не исправит. Откройте «🧰 Проверка инструментов» (режим для опытных), там видно, что найдено, а чего нет; кнопка «Скопировать отчёт» — чтобы прислать его. Или выберите способ «⚡ Быстро» — ему инструменты не нужны.';
 notify('Не хватает инструмента: '+why,true); if(SM&&SM.busy){ smMsg(t) } alog('  ⛔ окружение: '+why+' | вывод: '+String(out||'').trim().slice(0,200).replace(/\s+/g,' ')) }
