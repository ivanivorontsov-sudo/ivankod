// ИванКод 1.2: быстрый путь — программа как одно веб-приложение (index.html) по готовой заготовке. Чистые функции (работают и в окне студии, и в Node для тестов).
(function(root){
const MARK={css:['/*<AI-CSS>*/','/*</AI-CSS>*/'],html:['<!--<AI-HTML>-->','<!--</AI-HTML>-->'],js:['/*<AI-JS>*/','/*</AI-JS>*/']};
const HELPERS=['$','$$','store','uid','money','dateStr','toast','esc','confirmBox'];
const BASE_CSS=`:root{--bg:#f4f6fb;--card:#fff;--text:#1d2433;--muted:#6b7385;--line:#e3e7ef;--accent:#4f6bed;--accent2:#3d56c9;--danger:#d9534f;--ok:#2e9d6a;--radius:14px;--shadow:0 2px 10px rgba(20,30,60,.08)}
[data-theme=dark]{--bg:#14171f;--card:#1e222c;--text:#e8ebf2;--muted:#9aa3b5;--line:#2c3240;--accent:#7088ff;--accent2:#8a9cff;--shadow:0 2px 10px rgba(0,0,0,.35)}
*{box-sizing:border-box}html,body{margin:0}body{font:15px/1.5 "Segoe UI",Roboto,system-ui,sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
header.app-head{display:flex;align-items:center;gap:12px;padding:14px 20px;background:var(--card);box-shadow:var(--shadow);position:sticky;top:0;z-index:5}
header.app-head h1{font-size:20px;margin:0;flex:1}#app{max-width:980px;margin:0 auto;padding:20px;display:flex;flex-direction:column;gap:16px}
.card{background:var(--card);border-radius:var(--radius);box-shadow:var(--shadow);padding:16px 18px}.card h2{margin:0 0 10px;font-size:17px}
.row{display:flex;gap:10px;flex-wrap:wrap;align-items:center}.grid{display:grid;gap:12px;grid-template-columns:repeat(auto-fit,minmax(180px,1fr))}
.btn{border:1px solid var(--line);background:var(--card);color:var(--text);padding:9px 16px;border-radius:10px;font:inherit;cursor:pointer;transition:.15s}.btn:hover{border-color:var(--accent)}
.btn.primary{background:var(--accent);border-color:var(--accent);color:#fff}.btn.primary:hover{background:var(--accent2)}.btn.danger{color:var(--danger)}.btn.small{padding:4px 10px;font-size:13px}
.input,input,select,textarea{font:inherit;color:var(--text);background:var(--bg);border:1px solid var(--line);border-radius:10px;padding:9px 12px;min-width:0}input:focus,select:focus,textarea:focus{outline:2px solid var(--accent);outline-offset:-1px}
.list{display:flex;flex-direction:column;gap:8px;margin:0;padding:0;list-style:none}.item{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid var(--line);border-radius:10px;background:var(--card)}.item .grow{flex:1;min-width:0}
.muted{color:var(--muted)}.badge{display:inline-block;padding:2px 9px;border-radius:99px;background:var(--line);font-size:12px}.empty{color:var(--muted);text-align:center;padding:18px}
.stat{font-size:26px;font-weight:700}.done{text-decoration:line-through;opacity:.6}
#toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#222a;color:#fff;padding:10px 18px;border-radius:10px;opacity:0;transition:.25s;pointer-events:none;backdrop-filter:blur(4px)}#toast.on{opacity:1}`;
const BASE_JS=`var $=function(s,r){if(typeof s==='string'&&s.trim().charAt(0)==='<'){var t=document.createElement('template');t.innerHTML=s.trim();return t.content.firstElementChild}return (r||document).querySelector(s)}, $$=function(s,r){return Array.from((r||document).querySelectorAll(s))};
var store={get:function(k,d){try{var v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set:function(k,v){localStorage.setItem(k,JSON.stringify(v))}};
var uid=function(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)};
var money=function(n){return (Number(n)||0).toLocaleString('ru-RU',{minimumFractionDigits:0,maximumFractionDigits:2})+' ₽'};
var dateStr=function(d){d=d?new Date(d):new Date();return isNaN(d)?'':d.toLocaleDateString('ru-RU')};
var esc=function(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})};
var toast=function(t){var e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(function(){e.classList.remove('on')},2200)};
var confirmBox=function(t){return window.confirm(t)};
(function(){var th=store.get('__theme',matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');document.documentElement.dataset.theme=th;
 $('#themeToggle').onclick=function(){th=th==='dark'?'light':'dark';document.documentElement.dataset.theme=th;store.set('__theme',th)}})();`;
function skeleton(name,s){ s=s||{}; const nm=esc(name||'Моя программа');
 return `<!doctype html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="generator" content="ivancode-web 1">
<title>${nm}</title>
<style>
${BASE_CSS}
</style>
<style>
${MARK.css[0]}
${s.css||''}
${MARK.css[1]}
</style>
</head>
<body>
<header class="app-head"><h1>${nm}</h1><button class="btn small" id="themeToggle" title="Светлая/тёмная тема">🌓</button></header>
<main id="app">
${MARK.html[0]}
${s.html||''}
${MARK.html[1]}
</main>
<div id="toast"></div>
<script>
${BASE_JS}
</script>
<script>
${MARK.js[0]}
${s.js||''}
${MARK.js[1]}
</script>
</body></html>
`; }
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])) }
function isWebApp(html){ return /<meta name="generator" content="ivancode-web/.test(String(html||'')) }
function sections(html){ html=String(html||''); const o={}; for(const k in MARK){ const a=html.indexOf(MARK[k][0]), b=html.indexOf(MARK[k][1]); o[k]=a>=0&&b>a?html.slice(a+MARK[k][0].length,b).replace(/^\n/,'').replace(/\n$/,''):'' } return o }
function jsStartLine(html){ const i=String(html).indexOf(MARK.js[0]); return i<0?1:String(html).slice(0,i).split('\n').length+1 }
const EXAMPLE=`===CSS===
.big{font-size:48px;text-align:center;margin:10px 0}
===HTML===
<section class="card">
  <h2>Счётчик</h2>
  <div class="big" id="num">0</div>
  <div class="row"><button class="btn primary" id="plus">+1</button><button class="btn danger" id="reset">Сбросить</button></div>
</section>
===JS===
let n = store.get('n', 0);
function render(){ $('#num').textContent = n; }
$('#plus').addEventListener('click', () => { n++; store.set('n', n); render(); });
$('#reset').addEventListener('click', () => { if (confirmBox('Сбросить счётчик?')) { n = 0; store.set('n', n); render(); toast('Сброшено'); } });
render();
===КОНЕЦ===`;
const SYS=`Ты — ИИ-программист в студии ИванКод. Ты пишешь программу для новичка как ОДНО веб-приложение. Студия уже дала готовую заготовку страницы: шапку с названием и кнопкой темы, базовые красивые стили (светлая и тёмная тема) и помощники JS. Ты пишешь только ТРИ раздела — CSS, HTML, JS — в строгом формате ответа (без пояснений до и после):
===CSS===
(дополнительные стили, можно пусто)
===HTML===
(содержимое <main>: только разметка, без <html>, <head>, <body>, <style>, <script>)
===JS===
(обычный JavaScript для браузера)
===КОНЕЦ===

ГОТОВЫЕ КЛАССЫ CSS: .card (карточка), .row (в строку), .grid (сетка карточек), .btn, .btn.primary, .btn.danger, .btn.small, .input, .list и .item (список; внутри .item блок .grow растягивается), .muted, .badge, .empty (пустой список), .stat (крупное число), .done (зачёркнуто).
ГОТОВЫЕ ПОМОЩНИКИ JS (уже объявлены, НЕ объявляй их заново): $(селектор) — это НЕ jQuery, только находит элемент (новые элементы — через innerHTML или document.createElement), $$(селектор) → массив, store.get(ключ, поУмолчанию) и store.set(ключ, значение) — сохранение в localStorage, uid() — уникальный id, money(число) → «1 234 ₽», dateStr(дата) → «21.10.2026», esc(текст) — экранирование для innerHTML, toast(текст) — всплывающее сообщение, confirmBox(текст) → true/false.
ПРАВИЛА:
1. Программа ПОЛНОСТЬЮ рабочая с первого раза: все кнопки работают, данные сохраняются (store) и показываются после перезапуска. Никаких TODO, заглушек и «реализуйте сами».
2. Все надписи по-русски. Без внешних библиотек, CDN, шрифтов из интернета и запросов в сеть. Без alert() — используй toast().
3. JS: без import/export, без фреймворков; обработчики через addEventListener; пользовательский текст в innerHTML — только через esc().
4. Пиши КОМПАКТНО: весь ответ до ~4500 символов (длинный ответ обрежется), JS до ~120 строк. Сначала вся логика, без длинных комментариев.
5. Пустые состояния («Пока нет записей»), проверка ввода (пустое поле, не число) с toast().

ПРИМЕР ПРАВИЛЬНОГО ОТВЕТА (программа «Счётчик»):
${EXAMPLE}`;
function firstPrompt(name,desc,kind){ return `Сделай программу «${name}». Описание от пользователя (он не программист):\n${desc}\n\n${kind==='phone'?'Программа будет открываться на телефоне Android: крупные кнопки, удобно пальцем, одна колонка.':'Программа для компьютера (окно ~1100×760), можно в 2 колонки.'}\n\nОтветь строго в формате ===CSS=== / ===HTML=== / ===JS=== / ===КОНЕЦ===.` }
function changePrompt(name,cur,request,errors){ return `Программа «${name}». Текущие разделы:\n===CSS===\n${cur.css}\n===HTML===\n${cur.html}\n===JS===\n${cur.js}\n===КОНЕЦ===\n\n${errors&&errors.length?'Встроенная проверка нашла ОШИБКИ (исправь их):\n'+errors.map(e=>'- '+e).join('\n')+'\n\n':''}${request?'Что нужно сделать: '+request+'\n\n':''}Пришли исправленную программу в том же формате. Можно прислать только изменённые разделы — остальные останутся как есть. Раздел присылай ЦЕЛИКОМ.` }
// ---- разбор ответа ИИ: терпимо к ```-блокам, лишнему тексту, целому HTML-документу ----
function unfence(t){ t=String(t||''); const m=t.match(/^\s*```[\w-]*\s*\n([\s\S]*?)\n?```\s*$/); if(m) return m[1]; return t.replace(/^\s*```[\w-]*\s*$/gm,'').trim() }
function fromDoc(doc,fix){ const o={}; const st=[...doc.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map(m=>m[1]); if(st.length) o.css=st.join('\n');
 const sc=[...doc.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)(<\/script>|$)/gi)].map(m=>m[1]); if(sc.length) o.js=sc.join('\n');
 let b=(doc.match(/<body[^>]*>([\s\S]*?)(<\/body>|$)/i)||[])[1]; if(b==null) b=doc.replace(/<!doctype[^>]*>|<\/?html[^>]*>|<head[^>]*>[\s\S]*?<\/head>/gi,'');
 b=b.replace(/<script[\s\S]*?(<\/script>|$)/gi,'').replace(/<style[\s\S]*?<\/style>/gi,'').trim(); const mm=b.match(/<main[^>]*>([\s\S]*)<\/main>/i); if(mm) b=mm[1]; if(b) o.html=b; fix.push('ИИ прислал целую страницу — разобрал её на разделы'); return o }
function parseAnswer(text){ const fix=[]; let t=String(text||'').replace(/\n*\[ответ оборван[^\]\n]*\]\s*/g,()=>{ fix.push('ответ ИИ оборван лимитом длины'); return '\n' }).replace(/<think>[\s\S]*?<\/think>/gi,'').replace(/\r\n/g,'\n'); const o={};
 const re=/^[ \t>*#]*={2,}\s*(CSS|HTML|JS|JAVASCRIPT|КОНЕЦ|END)\s*={2,}[ \t*]*$/gmi; const marks=[...t.matchAll(re)];
 if(marks.length){ for(let i=0;i<marks.length;i++){ const k=marks[i][1].toUpperCase(); if(/КОНЕЦ|END/.test(k)) continue; const key=k==='JAVASCRIPT'?'js':k.toLowerCase(); const end=i+1<marks.length?marks[i+1].index:t.length; o[key]=unfence(t.slice(marks[i].index+marks[i][0].length,end).replace(/^\n/,'')) }
  if(!marks.some(m=>/КОНЕЦ|END/i.test(m[1]))) o._noEnd=true }
 else { const bl=[...t.matchAll(/```([\w-]*)[^\n]*\n([\s\S]*?)(```|$)/g)];
  for(const b of bl){ const lang=b[1].toLowerCase(), code=b[2]; if(/^(html?|xml)$/.test(lang)&&/<html|<!doctype|<body/i.test(code)) Object.assign(o,fromDoc(code,fix)); else if(lang==='css') o.css=code; else if(/^(js|javascript)$/.test(lang)) o.js=code; else if(/^(html?)$/.test(lang)) o.html=code; else if(/<html|<!doctype/i.test(code)) Object.assign(o,fromDoc(code,fix)) }
  if(bl.length&&(o.css!=null||o.html!=null||o.js!=null)) fix.push('ИИ прислал ```-блоки вместо разделов — взял код из них');
  if(o.css==null&&o.html==null&&o.js==null&&/<html|<!doctype|<body/i.test(t)) Object.assign(o,fromDoc(t,fix)) }
 return repair(o,fix) }
function balance(js){ const st=[]; let q=null, esc_=false, line=false, block=false, tpl=0; for(let i=0;i<js.length;i++){ const c=js[i], n=js[i+1];
  if(line){ if(c==='\n') line=false; continue } if(block){ if(c==='*'&&n==='/'){ block=false; i++ } continue }
  if(q){ if(esc_){ esc_=false; continue } if(c==='\\'){ esc_=true; continue } if(c===q) q=null; continue }
  if(c==='/'&&n==='/'){ line=true; continue } if(c==='/'&&n==='*'){ block=true; continue } if(c==='"'||c==="'"||c==='`'){ q=c; continue }
  if('({['.includes(c)) st.push(c); else if(')}]'.includes(c)) st.pop() } return {open:st,inStr:!!q} }
function repair(o,fix){ const out={css:o.css,html:o.html,js:o.js};
 if(out.css!=null&&/<\/?style/i.test(out.css)){ out.css=out.css.replace(/<\/?style[^>]*>/gi,''); fix.push('убрал теги <style> из CSS') }
 if(out.js!=null&&/<\/?script/i.test(out.js)){ out.js=out.js.replace(/<\/?script[^>]*>/gi,''); fix.push('убрал теги <script> из JS') }
 if(out.html!=null){ const sc=[...out.html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)]; if(sc.length){ out.js=(out.js||'')+'\n'+sc.map(m=>m[1]).join('\n'); out.html=out.html.replace(/<script[\s\S]*?<\/script>/gi,''); fix.push('перенёс <script> из HTML в JS') }
  const ss=[...out.html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)]; if(ss.length){ out.css=(out.css||'')+'\n'+ss.map(m=>m[1]).join('\n'); out.html=out.html.replace(/<style[\s\S]*?<\/style>/gi,''); fix.push('перенёс <style> из HTML в CSS') }
  if(/<(!doctype|html|head|body)\b/i.test(out.html)){ Object.assign(out,fromDoc(out.html,fix)) }
  out.html=out.html.replace(/<script[^>]+src=["']https?:[^>]*>\s*<\/script>/gi,'').replace(/<link[^>]+href=["']https?:[^>]*>/gi,'') }
 if(out.js!=null){ let js=out.js; const re=new RegExp('^(\\s*)(const|let)\\s+('+HELPERS.map(h=>h.replace(/\$/g,'\\$')).join('|')+')\\s*=','gm'); if(re.test(js)){ js=js.replace(re,'$1var $3 ='); fix.push('ИИ заново объявил помощники студии — исправил const/let на var') }
  js=js.replace(/^\s*(import|export)\s.*$/gm,m=>{ fix.push('убрал import/export'); return '' }).replace(/\balert\(/g,'toast(');
  if(o._noEnd||balance(js).inStr){ let L=js.split('\n'), cut=0; while(L.length>1&&(balance(L.join('\n')).inStr||/[^;{}\s]\s*$/.test(L[L.length-1])&&!/^\s*\/\//.test(L[L.length-1]))&&cut<8){ L.pop(); cut++ } if(cut){ js=L.join('\n'); fix.push('убрал оборванные строки в конце JS: '+cut) } }
  const b=balance(js); if(b.open.length&&!b.inStr&&b.open.length<=8){ const cl=b.open.reverse().map(c=>({'(':')','{':'}','[':']'}[c])).join(''); js=js.replace(/[,\s]*$/,'')+'\n'+cl.split('').join('\n')+'\n'; fix.push('ответ ИИ оборвался — закрыл '+cl.length+' скоб(ки)') }
  out.js=js }
 out.fixes=fix; out.truncated=!!o._noEnd; return out }
function merge(cur,nw){ return {css:nw.css!=null?nw.css:cur.css||'',html:nw.html!=null?nw.html:cur.html||'',js:nw.js!=null?nw.js:cur.js||''} }
function hasCode(p){ return !!(p&&((p.html&&p.html.trim().length>10)||(p.js&&p.js.trim().length>10))) }
// ошибки проверки → понятные строки для ИИ (номер строки — внутри раздела JS)
function fmtErrors(errs,html){ const L0=jsStartLine(html); return (errs||[]).map(e=>{ let s=e.msg; if(e.line&&e.src!=='smoke'){ const jl=e.line-L0+1; if(jl>0) s+=` (JS, строка ${jl})`; } if(e.action) s+=` — при действии: ${e.action}`; return s }).filter((v,i,a)=>a.indexOf(v)===i).slice(0,8) }
// ошибки окружения (нет инструмента, заглушка Store, PATH) — их чинит студия и показывает пользователю; ИИ их НЕ получает
const ENV_RE=[[/Python was not found|Python не найден|run without arguments to install from the Microsoft Store|WindowsApps\\python/i,'Python не установлен (Windows открывает заглушку Microsoft Store вместо Python)'],[/is not recognized as an internal or external command|не является внутренней или внешней\s+командой|: command not found|: not found\s*$|exit code 9009|\b9009\b/im,'не найдена программа-инструмент (её нет в PATH)'],
 [/JAVA_HOME is not set|no 'java' command could be found|ERROR: JAVA_HOME|Unable to locate a Java Runtime/i,'не найдена Java (JDK)'],[/SDK location not found|ANDROID_HOME|sdk\.dir/i,'не найден Android SDK'],[/spawn \S+ ENOENT|ENOENT.*spawn|Не удаётся найти указанный файл.*(python|java|gradle|makensis)/i,'не найдена программа-инструмент'],
 [/No module named (pytest|PyInstaller|pip)\b/i,'в Python не хватает модуля для сборки/проверки'],[/makensis.*(not found|не найден)|NSIS.*не установлен/i,'не найден NSIS'],[/Could not resolve host|Could not GET 'https|Connection timed out|Read timed out|UnknownHostException/i,'нет интернета для загрузки зависимостей']];
function envProblem(out){ const t=String(out||'').trim(); if(!t) return 'пустой вывод — инструмент ничего не сообщил'; const words=t.split(/\s+/).filter(Boolean);
 if(words.length<3&&!/\w+\.\w+:\d+|error|ошибк/i.test(t)) return 'вывод из '+words.length+' слов («'+t.slice(0,40)+'») — это не ошибка программы, а сбой запуска инструмента';
 for(const [re,why] of ENV_RE) if(re.test(t)) return why; return null }
const CTRL_NOTE='ВАЖНО для проверки: программа — веб-страница на готовой заготовке студии. Заготовка УЖЕ содержит (не считай это ошибкой): шапку с названием и кнопкой темы #themeToggle, стили классов .card .row .grid .btn .btn.primary .btn.danger .btn.small .input .list .item .grow .muted .badge .empty .stat .done и функции $, $$, store.get/store.set (localStorage), uid, money, dateStr, esc, toast, confirmBox. Встроенная проверка уже открыла программу и понажимала кнопки — ошибок JavaScript нет. Ищи только НЕ СДЕЛАННЫЕ функции из описания пользователя (до 3 самых важных).';
const api={CTRL_NOTE,envProblem,MARK,SYS,EXAMPLE,skeleton,sections,isWebApp,jsStartLine,firstPrompt,changePrompt,parseAnswer,repair,merge,hasCode,fmtErrors,balance};
if(typeof module!=='undefined') module.exports=api; else root.WebApp=api;
})(typeof window!=='undefined'?window:globalThis);
