// ИванКод 1.3: язык «Понятный» — подсказка ИИ, разбор ответа и ошибок компилятора. Чистые функции (окно студии и Node).
(function(root){
const REFM=typeof module!=='undefined'?require('./ponref.js'):root.PonRef;
const SYN=REFM.REF;
const KW='пусть константа навсегда напиши если то иначе пока повторить раз для каждого из от до шаг функция верни конец и или не в истина ложь ничего стоп дальше попробуй ошибка как наконец брось выбор вариант когда класс наследует структура это себя родитель новый подключи затем'.split(' ');
const SYS=`Ты пишешь программу на языке «Понятный» (русский язык программирования, файл .pon) для студии ИванКод. Пользователь — новичок: пиши просто, с короткими комментариями # на русском, понятными именами переменных НА КИРИЛЛИЦЕ.
Программа консольная: вывод через «напиши», ввод через «спроси(...)». Интернет не используй. Можно (но не обязательно) подключать готовую стандартную библиотеку — только модули «стд/…» из раздела 13а, например подключи "стд/консоль" (спроси_число, меню, таблица, рамка, деньги), "стд/математика", "стд/строки", "стд/списки", "стд/случай", "стд/время", "стд/файлы". Других файлов не подключай. Не объявляй свои функции с теми же именами, что в подключённом модуле.
Пиши ТОЛЬКО на «Понятном» по описанию синтаксиса ниже (не Python и не JavaScript!). Каждый блок закрывай словом «конец». Переменную объявляй через «пусть» до первого присваивания. Не смешивай русские и латинские буквы в одном имени. Не пиши «a < b < c». НИКОГДА не называй переменные и функции служебными словами (выбор, вариант, когда, это, себя, новый, родитель, структура, класс, ошибка, затем …): для пункта меню пиши «пункт», для ответа — «ответ».
Если программа спрашивает данные, проверяй их и не падай на неверном вводе (используй попробуй … если ошибка как е … конец). Меню делай циклом «пока истина … конец» с пунктом «0 — выход»; выходи из цикла словом стоп (стоп — ТОЛЬКО внутри цикла). Если спроси вернул ничего или пустую строку (конец ввода) — тоже стоп.

Формат ответа СТРОГО такой, без пояснений до и после:
===ПОНЯТНЫЙ===
(вся программа)
===КОНЕЦ===

${SYN}`;
function firstPrompt(name,desc){ return `Программа «${name}».\nЧто должна уметь программа (описание пользователя):\n${desc}\n\nНапиши всю программу на «Понятном».` }
function numbered(t){ return String(t).split('\n').map((l,i)=>String(i+1).padStart(3)+'| '+l).join('\n') }
function around(cur,line,r){ const L=String(cur).split('\n'); if(!line||line>L.length) return ''; const a=Math.max(1,line-r), b=Math.min(L.length,line+r); const o=[]; for(let k=a;k<=b;k++) o.push((k===line?'>>':'  ')+String(k).padStart(3)+'| '+L[k-1]); return o.join('\n') }
function fixPrompt(name,cur,errs,o={}){ const lines=errs.map(e=>{ const m=String(e).match(/строка (\d+)/); return m?+m[1]:0 });
 const ctx=[...new Set(lines.filter(Boolean))].slice(0,5).map(l=>around(cur,l,2)).filter(Boolean).join('\n   …\n');
 const hints=REFM.hintsFor(errs); let t=`Программа «${name}» на «Понятном». Настоящий компилятор ponyatny нашёл ошибки${o.attempt?' (попытка исправления '+o.attempt+' из '+(o.max||5)+')':''}:\n${errs.map(e=>'- '+e).join('\n')}`;
 if(ctx) t+=`\n\nМеста ошибок (>> — строка с ошибкой):\n${ctx}`;
 if(hints.length) t+=`\n\nКак исправить (из справочника):\n${hints.map(h=>'- '+h).join('\n')}`;
 if(o.repeated) t+=`\n\nЭТА ЖЕ ОШИБКА БЫЛА И В ПРОШЛОЙ ПОПЫТКЕ. Не повторяй прошлый вариант: перепиши этот кусок проще, другими конструкциями из справочника.`;
 if(o.prevDiff) t+=`\n\nВ прошлой попытке ты изменил вот это, и ошибки остались:\n${o.prevDiff}`;
 if(o.withRef) t+=`\n\n${SYN}`;
 t+=`\n\nТекущий код (с номерами строк):\n${numbered(cur)}\n\nИсправь ТОЛЬКО ошибки, остальное не трогай, и пришли программу ЦЕЛИКОМ в формате ===ПОНЯТНЫЙ=== … ===КОНЕЦ===.`; return t }
function lineDiff(a,b){ const A=String(a).split('\n'), B=String(b).split('\n'); const o=[]; const n=Math.max(A.length,B.length); for(let i=0;i<n&&o.length<16;i++){ if(A[i]!==B[i]){ if(A[i]!=null) o.push('- '+(i+1)+'| '+A[i]); if(B[i]!=null) o.push('+ '+(i+1)+'| '+B[i]) } } return o.join('\n') }
function maskStr(l){ return l.split(/("(?:\\.|[^"\\])*"|«[^»]*»)/) }
function codeOnly(l,f){ const p=maskStr(l); const h=p[0].search(/#|\/\//); for(let k=0;k<p.length;k+=2) p[k]=f(p[k]); return p.join('') }
function errorFix(code,errs){ const fixes=[]; const L=String(code).split('\n');
 for(const e of errs||[]){ if(e.kind!=='error'||!e.line||e.line>L.length) continue; const i=e.line-1; const l=L[i]; let m;
  if((m=e.msg.match(/^переменная «(.+?)» не объявлена/))&&new RegExp('^\\s*'+m[1].replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*=(?!=)').test(l)){ L[i]=l.replace(/^(\s*)/,'$1пусть '); fixes.push('строка '+e.line+': добавлено «пусть» перед «'+m[1]+'»'); continue }
  if((m=e.msg.match(/^имя «(.+?)» уже объявлено/))&&/^\s*пусть\s/.test(l)&&new RegExp('^\\s*пусть\\s+'+m[1].replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\s*=').test(l)){ L[i]=l.replace(/^(\s*)пусть\s+/,'$1'); fixes.push('строка '+e.line+': повторное «пусть '+m[1]+'» заменено присваиванием'); continue }
  if(/встретилось «:»/.test(e.msg)&&/:\s*$/.test(l)){ L[i]=l.replace(/\s*:\s*$/,/^\s*(если|иначе\s+если)\s/.test(l)&&!/\sто\s*:\s*$/.test(l)?' то':''); fixes.push('строка '+e.line+': убрано «:» в конце строки'); continue }
 }
 return {code:L.join('\n'),fixes} }
function changePrompt(name,cur,desc){ return `Программа «${name}» на «Понятном»:\n===ПОНЯТНЫЙ===\n${cur}\n===КОНЕЦ===\n\nИзмени по просьбе пользователя: ${desc}\nПришли программу ЦЕЛИКОМ в том же формате.` }
function parseAnswer(a){ const t=String(a||'').replace(/\r/g,''); const fixes=[]; let truncated=!/===\s*(КОНЕЦ|END)\s*===/i.test(t);
 let m=t.match(/===\s*ПОНЯТНЫЙ\s*===\s*\n([\s\S]*?)(?:\n\s*===\s*(?:КОНЕЦ|END)\s*===|$)/i);
 if(!m){ const f=t.match(/```(?:pon|ponyatny|понятный)?\s*\n([\s\S]*?)(?:```|$)/i); if(f){ m=[0,f[1]]; fixes.push('код был в блоке ``` вместо раздела ===ПОНЯТНЫЙ===') } }
 if(!m) return {code:'',fixes,truncated,ok:false};
 let c=m[1].replace(/^\s*```\w*\s*$/gm,'').replace(/\s+$/,'');
 if(/\[ответ оборван лимитом длины\]/.test(c)){ c=c.replace(/\n*\[ответ оборван лимитом длины\][\s\S]*$/,''); truncated=true }
 if(truncated){ const b=balance(c); if(b.cut){ c=b.code; fixes.push('ответ ИИ оборвался — отрезал недописанный кусок') } }
 return {code:c,fixes,truncated,ok:c.trim().length>0} }
// баланс блоков: при обрыве отрезаю всё после последней строки, где все блоки закрыты
const OPEN=/^\s*(если|пока|повторить|для|функция|класс|попробуй|выбор)(?![\p{L}\p{N}_])/iu, OPEN2=/\bфункция\s*\([^)]*\)\s*$/; 
function balance(code){ let d=0,last=-1; const L=String(code).split('\n');
 L.forEach((l,i)=>{ const s=l.replace(/#.*$|\/\/.*$/,'').replace(/"(?:\\.|[^"])*"|«[^»]*»/g,'""'); if(OPEN.test(s)||(OPEN2.test(s)&&!OPEN.test(s))) d++; if(/^\s*конец(?![\p{L}\p{N}_])/iu.test(s)) d--; if(d===0) last=i });
 if(d<=0) return {cut:false,code,depth:d}; return {cut:last>=0,code:last>=0?L.slice(0,last+1).join('\n'):code,depth:d} }
// «Ошибка. Файл «x.pon», строка 3, столбец 1: текст»
function parseErrors(out){ const res=[]; const re=/^(Ошибка|Предупреждение)\.\s*(?:Файл «(.+?)»,\s*)?[Сс]трока (\d+)(?:,\s*столбец (\d+))?:\s*(.+)$/gm; let m;
 while((m=re.exec(String(out)))) res.push({kind:m[1]==='Ошибка'?'error':'warn',file:m[2]||'',line:+m[3],col:m[4]?+m[4]:0,msg:m[5].trim()});
 // ошибка выполнения без номера строки
 if(!res.some(r=>r.kind==='error')){ const r2=String(out).match(/^Ошибка[.:]\s*(.+)$/m); if(r2) res.push({kind:'error',file:'',line:0,col:0,msg:r2[1].trim()}) }
 return res }
function fmtErrors(errs){ return errs.filter(e=>e.kind==='error').map(e=>(e.line?'строка '+e.line+(e.col?', столбец '+e.col:'')+': ':'')+e.msg) }
// подсветка Monaco (monarch)
const MONARCH={ ignoreCase:true, keywords:KW, typeKw:['число','строка','логическое','список','словарь','любое'],
 tokenizer:{ root:[[/#.*$/,'comment'],[/\/\/.*$/,'comment'],[/"/,'string','@str'],[/«/,'string','@guil'],[/\d[\d_]*(\.\d+)?/,'number'],
  [/[\p{L}_][\p{L}\p{N}_]*/u,{cases:{'@keywords':'keyword','@typeKw':'type','@default':'identifier'}}],[/[=<>!≠≤≥+\-*\/%^×÷|]+/,'operator'],[/[()[\]{}]/,'@brackets']],
  str:[[/\\./,'string.escape'],[/\{[^}]*\}/,'variable'],[/"/,'string','@pop'],[/[^"\\{]+/,'string']], guil:[[/»/,'string','@pop'],[/[^»]+/,'string']] } };
// безопасные исправления студии до компиляции (как прощение опечаток в языке): только там, где смысл однозначен
function autofix(code){ const fixes=[]; const out=String(code).split('\n').map((l,i)=>{ let s=l; const m=s.match(/^(\s*)(если|пока|иначе\s+если)(\s.*)$/u);
  if(m){ // в условии одиночное «=» вне строк → «==»
   const parts=m[3].split(/("(?:\\.|[^"\\])*"|«[^»]*»)/); let ch=false; for(let k=0;k<parts.length;k+=2){ const n=parts[k].replace(/(^|[^=!<>≠≤≥+\-*\/%])=(?!=|>)/g,(x,a)=>{ ch=true; return a+'==' }); parts[k]=n }
   if(ch){ s=m[1]+m[2]+parts.join(''); fixes.push('строка '+(i+1)+': в условии «=» заменено на «==»') } }
  { const n=codeOnly(s,x=>x.replace(/(^|[^\p{L}\p{N}_.])(True|False|None|null)(?![\p{L}\p{N}_])/gu,(z,a,w)=>a+({True:'истина',False:'ложь',None:'ничего',null:'ничего'})[w]).replace(/(^|[^\p{L}\p{N}_.])len\(/gu,'$1длина(').replace(/\.(append|push)\(/g,'.добавь(')); if(n!==s){ fixes.push('строка '+(i+1)+': слова Python/JS заменены на «Понятный»'); s=n } }
  if(/^\s*(elif|иначеесли)\s/u.test(s)){ s=s.replace(/elif|иначеесли/u,'иначе если'); fixes.push('строка '+(i+1)+': → «иначе если»') }
  if(/^\s*(если|иначе\s+если|пока)\s.*[^:]:\s*$/u.test(s)&&!/["«]\s*:\s*$/.test(s)){ s=s.replace(/\s*:\s*$/,/^\s*пока/u.test(s)?'':(/\sто\s*:\s*$/u.test(s)?'':' то')); fixes.push('строка '+(i+1)+': убрано «:» в конце условия') }
  if(/^\s*иначе\s*:\s*$/u.test(s)){ s=s.replace(/\s*:\s*$/,''); fixes.push('строка '+(i+1)+': «иначе:» → «иначе»') }
  { const pm=s.match(/^(\s*)print\((.*)\)\s*$/); if(pm){ s=pm[1]+'напиши '+pm[2]; fixes.push('строка '+(i+1)+': print → напиши') } }
  { const fm=s.match(/^(\s*)для\s+([\p{L}_][\p{L}\p{N}_]*)\s+в\s+(.+)$/u); if(fm){ s=fm[1]+'для каждого '+fm[2]+' из '+fm[3]; fixes.push('строка '+(i+1)+': «для x в» → «для каждого x из»') } }
  if(/^\s*для\s+каждый\s/u.test(s)){ s=s.replace(/для\s+каждый/u,'для каждого'); fixes.push('строка '+(i+1)+': «для каждый» → «для каждого»') }
  if(/^\s*(продолжить|прервать|выйти)\s*$/u.test(s)){ const w=/продолжить/u.test(s)?'дальше':'стоп'; fixes.push('строка '+(i+1)+': «'+s.trim()+'» → «'+w+'»'); s=s.replace(/\S+/,w) }
  return s });
 // «стоп»/«дальше» внутри функции, но вне цикла → «верни» (выход из функции; иначе это ошибка компиляции)
 const st=[]; for(let i=0;i<out.length;i++){ const s=out[i].replace(/#.*$|\/\/.*$/,'').replace(/"(?:\\.|[^"\\])*"|«[^»]*»/g,'""'); const m=s.match(OPEN); if(m) st.push(m[1].toLowerCase()); else if(OPEN2.test(s)) st.push('функция');
  if(/^\s*(стоп|дальше)\s*$/u.test(s)){ let fn=false, loop=false; for(let k=st.length-1;k>=0;k--){ if(['пока','для','повторить'].includes(st[k])){ loop=true; break } if(st[k]==='функция'){ fn=true; break } } if(fn&&!loop){ fixes.push('строка '+(i+1)+': «'+s.trim()+'» вне цикла внутри функции → «верни»'); out[i]=out[i].replace(/стоп|дальше/u,'верни') } }
  if(/^\s*конец(?![\p{L}\p{N}_])/iu.test(s)) st.pop() }
 return {code:out.join('\n'),fixes} }
const api={autofix,errorFix,lineDiff,around,REFM,KW,SYS,firstPrompt,fixPrompt,changePrompt,parseAnswer,balance,parseErrors,fmtErrors,MONARCH,numbered};
if(typeof module!=='undefined') module.exports=api; else root.PonApp=api;
})(typeof window!=='undefined'?window:globalThis);
