// ИванКод: разбор ответов ИИ и применение правок (файлы целиком, SEARCH/REPLACE-разделы, удаление, команды)
(function(root,f){ if(typeof module==='object'&&module.exports) module.exports=f(); else root.Edits=f() })(this,function(){
'use strict';
const LANGS=['python','py','javascript','js','typescript','ts','tsx','jsx','kotlin','kt','java','csharp','cs','c#','cpp','c++','c','go','rust','rs','php','ruby','rb','html','css','scss','json','xml','yaml','yml','toml','ini','sql','markdown','md','bash','sh','shell','zsh','powershell','ps1','pwsh','cmd','bat','batch','dos','console','terminal','text','txt','plaintext','gradle','groovy','kts','dockerfile','makefile','lua','swift','dart','vue','svelte','jinja','jinja2','htmldjango','properties','csv','diff','patch'];
const CMD_LANGS=new Set(['cmd','bat','batch','dos','shell','sh','bash','zsh','powershell','ps1','pwsh','console','terminal']);
const PLACEHOLDER=/^\s*(?:\/\/|#|--|<!--|\/\*|\*|;|REM\b)?\s*(?:\.\.\.|…)\s*(?:\(?\s*)?(?:остальн|прежн|без изменен|existing|rest of|remaining|unchanged|previous|other|same as|как было|код выше|код ниже|и т\.?\s*д)|^\s*(?:\/\/|#|--|<!--|\/\*)\s*(?:\.\.\.|…)\s*(?:-->|\*\/)?\s*$|^\s*(?:\.\.\.|…)\s*$|^\s*(?:\/\/|#|<!--|\/\*)\s*(?:остальн\S*|прежн\S*)\s+(?:код|часть|методы|функции)\S*\s+(?:без изменени|не измен)/i;
const clean=s=>String(s).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').replace(/[\u200B-\u200D\u2060\uFEFF]/g,'').replace(/\u00A0/g,' ');
function normPath(p){ if(!p) return ''; p=String(p).trim().replace(/^[`'"*_\[(<]+|[`'"*_\])>:,;.]+$/g,'').trim();
 p=p.replace(/^(?:файл|file|path|путь|filename|имя файла)\s*[:=]\s*/i,'').replace(/^[`'"*]+|[`'"*]+$/g,'');
 p=p.replace(/\\/g,'/').replace(/^\.\//,'').replace(/\/{2,}/g,'/'); if(!/^[\w\u0400-\u04FF.\-+@~ /:]+$/.test(p)) return ''; if(!/\.[\w]+$|^(Makefile|Dockerfile|Procfile|LICENSE|README|\.gitignore|gradlew)$/i.test(p.split('/').pop())) return ''; return p }
const LEXT={python:['py'],kotlin:['kt','kts'],javascript:['js','mjs','cjs','jsx'],typescript:['ts','tsx'],java:['java'],csharp:['cs'],html:['html','htm'],json:['json'],yaml:['yml','yaml'],bash:['sh'],shell:['sh'],powershell:['ps1'],markdown:['md'],xml:['xml'],gradle:['gradle'],groovy:['gradle','groovy'],ruby:['rb'],rust:['rs'],swift:['swift'],dart:['dart'],sql:['sql'],toml:['toml'],css:['css'],scss:['scss'],php:['php'],cpp:['cpp','h','hpp'],text:['txt'],properties:['properties']};
function splitInfo(info){ info=info.trim().replace(/^\{\.?([\w+#-]+)\}$/,'$1'); if(!info) return {lang:'',path:''};
 let m=info.match(/(?:^|\s)(?:title|file|filename|path)\s*=\s*"?([^"]+)"?$/i); if(m) return {lang:(info.split(/\s+/)[0]||'').toLowerCase().replace(/=.*/,''),path:normPath(m[1])};
 m=info.match(/^([\w+#.-]+)\s*[: ]\s*(.+)$/); if(m&&LANGS.includes(m[1].toLowerCase())) return {lang:m[1].toLowerCase(),path:normPath(m[2])};
 if(/^[\w+#-]+$/.test(info)&&LANGS.includes(info.toLowerCase())) return {lang:info.toLowerCase(),path:''};
 if(/\s/.test(info)){ const parts=info.split(/\s+/); const p=normPath(parts[parts.length-1]); return {lang:LANGS.includes(parts[0].toLowerCase())?parts[0].toLowerCase():'',path:p} }
 const low=info.toLowerCase(), ext=(low.match(/\.(\w+)$/)||[])[1];
 for(const L of Object.keys(LEXT).sort((a,b)=>b.length-a.length)) if(low.startsWith(L)&&info.length>L.length&&LEXT[L].includes(ext)){ const rest=normPath(info.slice(L.length)); if(rest&&!rest.startsWith('.')) return {lang:L,path:rest} }
 const p=normPath(info); return p?{lang:'',path:p}:{lang:low,path:''} }
const PATHLINE=/^\s*(?:[#>*\-\d.)\s]*)?(?:\*\*|__|`)?\s*(?:ФАЙЛ|Файл|файл|File|FILE|Path|Путь|Filename|Имя файла)\s*(?:\*\*|__)?\s*[:：]?\s*(?:\*\*|`)?\s*([^\s`*]+)\s*(?:`|\*\*)?.*$/;
const BAREPATH=/^\s*(?:#{1,6}\s*)?(?:\*\*|__|`)?\s*([\w\u0400-\u04FF.\-\/\\]+\.[A-Za-z]\w{0,9})\s*(?:\*\*|__|`)?\s*:?\s*$/;
function pathFromLine(l){ if(!l) return ''; let m=l.match(PATHLINE); if(m) return normPath(m[1]); m=l.match(BAREPATH); if(m) return normPath(m[1]); return '' }
const SR_S=/^\s*<{5,9}\s*(?:SEARCH|ПОИСК|НАЙТИ)\s*$/i, SR_M=/^\s*={5,9}\s*$/, SR_R=/^\s*>{5,9}\s*(?:REPLACE|ЗАМЕНА|ЗАМЕНИТЬ)\s*$/i;
function parseSR(lines){ const out=[]; let i=0; while(i<lines.length){ if(SR_S.test(lines[i])){ const s=[],r=[]; i++; while(i<lines.length&&!SR_M.test(lines[i])) s.push(lines[i++]); i++; while(i<lines.length&&!SR_R.test(lines[i])) r.push(lines[i++]);
  out.push({search:s.join('\n'),replace:r.join('\n'),complete:i<lines.length}); i++ } else i++ } return out }
function parse(text){ text=clean(text); const lines=text.split('\n'); const ops=[], warnings=[]; let i=0, lastPath='', prevLines=[];
 const pushCmd=(body,src)=>{ const cmds=[]; let cur=''; for(let l of body.split('\n')){ l=l.replace(/^\s*(?:\$|PS [^>]*>|>|C:\\[^>]*>)\s+/,''); if(!l.trim()||/^\s*#(?!!)/.test(l)&&!cur) continue; if(/[\\^`]\s*$/.test(l)&&!/\\\\$/.test(l)){ cur+=l.replace(/[\\^`]\s*$/,' '); continue } cur+=l; cmds.push(cur.trim()); cur='' } if(cur.trim()) cmds.push(cur.trim()); if(cmds.length) ops.push({type:'cmd',cmds,src}) };
 while(i<lines.length){ const L=lines[i]; const fm=L.match(/^(\s{0,3})(`{3,}|~{3,})\s*([^`]*?)\s*$/);
  if(fm){ const fence=fm[2], indent=fm[1].length; const info=splitInfo(fm[3]); const body=[]; let j=i+1, depth=0, closed=false;
   for(;j<lines.length;j++){ const t=lines[j]; const cm=t.match(/^\s*(`{3,}|~{3,})\s*(.*?)\s*$/);
    if(cm&&cm[1][0]===fence[0]&&cm[1].length>=fence.length){ if(cm[2]&&cm[1].length===fence.length&&(info.lang==='markdown'||info.lang==='md'||/\.md$/i.test(info.path||lastPath))){ depth++; body.push(t); continue }
     if(!cm[2]){ if(depth>0){ depth--; body.push(t); continue } closed=true; break } }
    body.push(indent?t.replace(new RegExp('^\\s{0,'+indent+'}'),''):t) }
   let path=info.path; const before=prevLines.slice(-3).reverse(); if(!path) for(const b of before){ const p=pathFromLine(b); if(p){ path=p; break } }
   let code=body.join('\n'); const fl=body[0]&&body[0].match(/^\s*(?:\/\/|#|--|<!--|;|REM|\/\*)\s*(?:файл|file|path|путь|filename)\s*[:=]\s*([^\s>*]+)\s*(?:-->|\*\/)?\s*$/i);
   if(fl){ const p=normPath(fl[1]); if(p){ if(!path) path=p; if(p===path){ body.shift(); code=body.join('\n') } } }
   if(path&&/^(ВЫДЕЛЕНИЕ|SELECTION)$/i.test(path)) path='';
   let app=null; for(const b of before){ const am=b.match(/^\s*(?:[-*]\s*)?(?:\*\*)?(?:ДОПИСАТЬ|ДОБАВИТЬ В КОНЕЦ|APPEND)\s*(?:\*\*)?\s*[:：]\s*(?:\*\*)?\s*`?([^`\s]+)`?/i); if(am&&normPath(am[1])){ app=normPath(am[1]); break } }
   if(app&&(!path||path===app)&&!parseSR(body).length){ if(!closed){ warnings.push(`Блок ДОПИСАТЬ ${app} оборван (ответ усечён) — не применяю`); ops.push({type:'skip',path:app,reason:'усечён'}); i=j; prevLines=[]; continue } ops.push({type:'append',path:app,code:code.replace(/\n?$/,'\n')}); lastPath=app; i=j+1; prevLines=[]; continue }
   const sr=parseSR(body);
   if(!closed&&!sr.length){ warnings.push(`Блок ${path||info.lang||''} оборван (ответ усечён) — не применяю`); ops.push({type:'skip',path,reason:'усечён'}); i=j; prevLines=[]; continue }
   if(sr.length){ const p=path||lastPath; for(const e of sr){ if(!e.complete){ warnings.push('Неполный блок SEARCH/REPLACE для '+p); continue } ops.push({type:'edit',path:p,search:e.search,replace:e.replace}) } if(p) lastPath=p }
   else if(CMD_LANGS.has(info.lang)&&!path) pushCmd(code,'fence');
   else if(path){ const lazy=code.split('\n').find(x=>PLACEHOLDER.test(x)); if(lazy){ warnings.push(`Файл ${path}: в ответе заглушка «${lazy.trim().slice(0,60)}» — файл НЕ перезаписан`); ops.push({type:'skip',path,reason:'заглушка: '+lazy.trim().slice(0,60)}) } else ops.push({type:'write',path,code:code.replace(/\n?$/,'\n'),lang:info.lang}); lastPath=path }
   else ops.push({type:'snippet',lang:info.lang,code});
   i=j+1; prevLines=[]; continue }
  // вне блоков: SEARCH/REPLACE без фенсов, УДАЛИТЬ, КОМАНДА
  if(SR_S.test(L)){ const p=pathFromLine(prevLines[prevLines.length-1])||lastPath; let j=i; const seg=[]; while(j<lines.length){ seg.push(lines[j]); if(SR_R.test(lines[j])) break; j++ }
   for(const e of parseSR(seg)) if(e.complete&&p) ops.push({type:'edit',path:p,search:e.search,replace:e.replace}); i=j+1; continue }
  let rn=L.match(/^\s*(?:[-*]\s*)?(?:\*\*)?(?:ПЕРЕИМЕНОВАТЬ|ПЕРЕМЕСТИТЬ|RENAME|MOVE)\s*(?:\*\*)?\s*[:：]\s*(?:\*\*)?\s*`?([^`\s]+)`?\s*(?:->|→|=>|в|to)\s*`?([^`\s]+)`?\s*$/i); if(rn&&normPath(rn[1])&&normPath(rn[2])){ ops.push({type:'rename',path:normPath(rn[1]),to:normPath(rn[2])}); i++; continue }
  let m=L.match(/^\s*(?:[-*]\s*)?(?:\*\*)?(?:УДАЛИТЬ|УДАЛИ ФАЙЛ|DELETE|УДАЛЕНИЕ)\s*(?:\*\*)?\s*[:：]\s*(?:\*\*)?\s*`?([^`\s]+)`?/i); if(m&&normPath(m[1])){ ops.push({type:'delete',path:normPath(m[1])}); i++; continue }
  m=L.match(/^\s*(?:[-*]\s*)?(?:\*\*)?(?:КОМАНДА|COMMAND|CMD|ВЫПОЛНИТЬ|RUN)\s*(?:\*\*)?\s*[:：]\s*(?:\*\*)?\s*`?(.+?)`?\s*$/i); if(m){ ops.push({type:'cmd',cmds:[m[1].trim()],src:'tag'}); i++; continue }
  if(L.trim()) prevLines.push(L); i++ }
 return {ops,warnings} }
// ---- нечёткое сопоставление ----
function lev(a,b){ if(a===b) return 0; const m=a.length,n=b.length; if(!m) return n; if(!n) return m; let p=Array(n+1).fill(0).map((_,i)=>i); for(let i=1;i<=m;i++){ const c=[i]; for(let j=1;j<=n;j++) c[j]=Math.min(p[j]+1,c[j-1]+1,p[j-1]+(a[i-1]===b[j-1]?0:1)); p=c } return p[n] }
const sim=(a,b)=>{ const L=Math.max(a.length,b.length); return L?1-lev(a,b)/L:1 };
function findBlock(src,search){ const S=src.split('\n'), Q=search.split('\n'); while(Q.length&&!Q[0].trim()) Q.shift(); while(Q.length&&!Q[Q.length-1].trim()) Q.pop(); if(!Q.length) return null; const n=Q.length;
 const tries=[[x=>x,'точно'],[x=>x.replace(/\s+$/,''),'без хвостовых пробелов'],[x=>x.trim(),'без учёта отступов'],[x=>x.replace(/\s+/g,''),'без учёта пробелов']];
 for(const [f,how] of tries){ const q=Q.map(f); const hits=[]; for(let i=0;i+n<=S.length;i++){ let ok=true; for(let k=0;k<n;k++) if(f(S[i+k])!==q[k]){ ok=false; break } if(ok) hits.push(i) } if(hits.length===1) return {start:hits[0],end:hits[0]+n,how}; if(hits.length>1) return {ambiguous:hits.length,how,lines:hits.map(h=>h+1)} }
 // похожесть окна (допускаем пропуск/лишнюю строку)
 if(n<3||Q.join('').trim().length<40) return null; let best=null; const qs=Q.map(x=>x.trim()).join('\n'); if(S.length>20000) return null;
 for(let len=Math.max(1,n-2);len<=n+2;len++) for(let i=0;i+len<=S.length;i++){ if(Q[0].trim()&&sim(S[i].trim(),Q[0].trim())<0.5&&sim(S[i+len-1].trim(),Q[n-1].trim())<0.5) continue; const s=sim(S.slice(i,i+len).map(x=>x.trim()).join('\n'),qs); if(!best||s>best.s) best={s,start:i,end:i+len} }
 if(best&&best.s>=0.82) return {start:best.start,end:best.end,how:'похоже на '+Math.round(best.s*100)+'%'}; return null }
const indentOf=s=>(s.match(/^[ \t]*/)||[''])[0];
function applyEdit(src,search,replace){ const eol=/\r\n/.test(src)?'\r\n':'\n'; const bom=src.startsWith('\uFEFF')?'\uFEFF':''; let s=clean(src);
 if(!search.trim()){ return {ok:true,text:bom+(s+(s.endsWith('\n')||!s?'':'\n')+replace.replace(/\n?$/,'\n')).replace(/\n/g,eol),how:'добавлено в конец'} }
 const f=findBlock(s,clean(search)); if(!f){ const rq=clean(replace).trim(); if(rq&&findBlock(s,rq)&&!findBlock(s,rq).ambiguous) return {ok:true,text:src,how:'уже применено ранее',noop:true}; return {ok:false,reason:'фрагмент SEARCH не найден в файле'} } if(f.ambiguous) return {ok:false,reason:`фрагмент SEARCH встречается ${f.ambiguous} раз — неоднозначно (строки ${f.lines.join(', ')}); добавь в SEARCH соседние уникальные строки (например, строку def/имя функции)`};
 const S=s.split('\n'); let R=clean(replace).split('\n'); if(R.length===1&&R[0]==='') R=[];
 if(f.how!=='точно'&&f.how!=='без хвостовых пробелов'){ const Q=clean(search).split('\n').filter(x=>x.trim()); const qi=indentOf(Q[0]||''), si=indentOf(S[f.start]||''); if(qi!==si){ R=R.map(l=>l.startsWith(qi)?si+l.slice(qi.length):(l.trim()?si+l.trimStart():l)) } }
 if(/\t/.test(S.slice(f.start,f.end).map(indentOf).join(''))&&!/\t/.test(R.map(indentOf).join(''))){ const w=4; R=R.map(l=>{ const m=indentOf(l); return m.includes('\t')?l:'\t'.repeat(Math.floor(m.length/w))+' '.repeat(m.length%w)+l.slice(m.length) }) }
 S.splice(f.start,f.end-f.start,...R); return {ok:true,text:bom+S.join('\n').replace(/\n/g,eol),how:f.how} }
function toFileText(newText,oldText){ let t=clean(newText); if(oldText!=null){ if(/\r\n/.test(oldText)) t=t.replace(/\n/g,'\r\n'); if(oldText.startsWith('\uFEFF')) t='\uFEFF'+t } return t }
const unsafePath=p=>/^([a-zA-Z]:|[\\/]|~)/.test(p)||String(p).split(/[\\/]/).includes('..');
const DANGER=/(\brm\s+-[a-z]*r|\brmdir\b|\brd\s+\/s|\bdel\s+\/[sq]|\bformat\s+[a-z]:|Remove-Item.*-Recurse|\bshutdown\b|\breg\s+(delete|add)|\bdiskpart\b|\bmkfs|\bdd\s+if=|curl[^|]*\|\s*(ba)?sh|iwr[^|]*\|\s*iex|Invoke-Expression|Set-ExecutionPolicy|git\s+push\s+.*(-f|--force)|git\s+reset\s+--hard|git\s+clean\s+-[a-z]*f|\bsudo\b|\bnet\s+user\b|\btakeown\b|\bicacls\b|\bcipher\s+\/w|bcdedit|vssadmin|:\(\)\s*\{)/i;
const isDangerous=c=>DANGER.test(c);
// применение к «файловой системе» (адаптер: read(p)->string|null, write(p,t), del(p))
async function applyOps(ops,fsa,opt={}){ const stats={applied:0,rejected:0,items:[]}; const cache={}; const rd=async p=>p in cache?cache[p]:(cache[p]=await fsa.read(p));
 for(const op of ops){ const bad=[op.path,op.to].find(p=>p&&unsafePath(p)); if(bad&&op.type!=='cmd'&&op.type!=='snippet'){ stats.rejected++; stats.items.push({op,ok:false,reason:'путь вне папки проекта запрещён: '+bad}); continue }
  if(op.type==='rename'){ const old=await rd(op.path); if(old==null){ stats.rejected++; stats.items.push({op,ok:false,reason:'нет файла для переименования'}); continue } if(await rd(op.to)!=null){ stats.rejected++; stats.items.push({op,ok:false,reason:'файл назначения уже существует: '+op.to}); continue }
   await fsa.write(op.to,old); cache[op.to]=old; await fsa.del(op.path); cache[op.path]=null; stats.applied++; stats.items.push({op,ok:true,how:'переименован в '+op.to}); continue }
  if(op.type==='write'){ const old=await rd(op.path); if(old!=null&&opt.noRewrite&&clean(old).split('\n').length>80){ stats.rejected++; stats.items.push({op,ok:false,reason:`файл ${op.path} большой (${clean(old).split('\n').length} стр.) — не переписывай его целиком (так теряются готовые части); меняй через SEARCH/REPLACE или добавляй раздел через «ДОПИСАТЬ: ${op.path}»`}); continue } if(old!=null&&opt.guardShrink!==false){ const ol=clean(old).split('\n').length, nl=op.code.split('\n').length; if(ol>40&&nl<ol*0.35){ stats.rejected++; stats.items.push({op,ok:false,reason:`новый текст (${nl} стр.) намного короче файла (${ol} стр.) — похоже на фрагмент; нужен SEARCH/REPLACE`}); continue } }
   const t=toFileText(op.code,old); await fsa.write(op.path,t); cache[op.path]=t; stats.applied++; stats.items.push({op,ok:true,how:old==null?'создан':'перезаписан'}) }
  else if(op.type==='edit'){ const old=await rd(op.path); if(old==null){ if(!op.search.trim()){ const t=toFileText(op.replace.replace(/\n?$/,'\n'),null); await fsa.write(op.path,t); cache[op.path]=t; stats.applied++; stats.items.push({op,ok:true,how:'создан'}); continue } stats.rejected++; stats.items.push({op,ok:false,reason:'файл не существует'}); continue }
   const r=applyEdit(old,op.search,op.replace); if(!r.ok){ stats.rejected++; stats.items.push({op,ok:false,reason:r.reason}); continue } await fsa.write(op.path,r.text); cache[op.path]=r.text; stats.applied++; stats.items.push({op,ok:true,how:r.how}) }
  else if(op.type==='append'){ const old=await rd(op.path); const base=old==null?'':clean(old); const add=clean(op.code); if(base&&add.trim().length>30&&base.includes(add.trim())){ stats.items.push({op,ok:true,how:'уже дописано ранее',noop:true}); continue } const t=toFileText(base+(base&&!base.endsWith('\n')?'\n':'')+add,old); await fsa.write(op.path,t); cache[op.path]=t; stats.applied++; stats.items.push({op,ok:true,how:old==null?'создан (дописыванием)':'дописано в конец'}) }
  else if(op.type==='delete'){ const old=await rd(op.path); if(old==null){ stats.items.push({op,ok:false,reason:'нет файла'}); stats.rejected++; continue } await fsa.del(op.path); cache[op.path]=null; stats.applied++; stats.items.push({op,ok:true,how:'удалён'}) }
  else if(op.type==='skip'){ stats.rejected++; stats.items.push({op,ok:false,reason:op.reason}) } }
 return stats }
const FORMAT=`ФОРМАТ ОТВЕТА (строго):
1) Новый файл или полная замена небольшого файла: строка "ФАЙЛ: путь/к/файлу" и блок \`\`\`язык путь/к/файлу с ПОЛНЫМ содержимым (без «...» и «остальной код без изменений»).
2) Точечная правка существующего файла (функции/раздела): строка "ФАЙЛ: путь" и блок:
\`\`\`язык путь
<<<<<<< SEARCH
точная копия текущих строк файла (несколько строк, достаточно для однозначного поиска)
=======
новые строки
>>>>>>> REPLACE
\`\`\`
   В одном блоке можно несколько пар SEARCH/REPLACE. Для больших файлов используй ТОЛЬКО этот формат.
2б) Большой новый файл пиши ПО ЧАСТЯМ: первый ответ — "ФАЙЛ: путь" с началом файла (до ~80 строк), следующие — строка "ДОПИСАТЬ: путь" и блок \`\`\`язык с продолжением (до ~80 строк), оно добавится в конец файла. Каждая часть должна быть законченной (целые функции/правила).
3) Удаление файла: строка "УДАЛИТЬ: путь". Переименование/перенос: строка "ПЕРЕИМЕНОВАТЬ: старый/путь -> новый/путь".
4) Команда терминала (установка пакетов, сборка, тесты): блок \`\`\`cmd с одной командой на строку. Команды выполняются в папке проекта на Windows, их вывод вернётся тебе.
5) Когда задача полностью выполнена и проверена — напиши отдельной строкой: ГОТОВО`;
const CUT_MARK=/\n*\[ответ оборван лимитом длины\]\s*$/;
function isTruncated(t){ const r=parse(String(t).replace(CUT_MARK,'')); return r.warnings.some(w=>/оборван|Неполный блок/.test(w)) }
function joinCont(a,c){ a=clean(a).replace(CUT_MARK,''); c=clean(c).replace(CUT_MARK,'');
 // модель могла заново открыть блок кода — если мы внутри открытого блока, убираем повторную строку-фенс
 const open=(a.match(/^\s{0,3}(`{3,}|~{3,})/gm)||[]).length%2===1; if(open){ const m=c.match(/^\s*(?:ФАЙЛ[^\n]*\n\s*)?(`{3,}|~{3,})[^\n]*\n/); if(m) c=c.slice(m[0].length) }
 for(let L=Math.min(400,a.length,c.length);L>=12;L--) if(a.endsWith(c.slice(0,L))) { c=c.slice(L); return a+c }
 const ll=a.slice(a.lastIndexOf('\n')+1); if(ll.trim()&&c.startsWith(ll)) return a.slice(0,a.length-ll.length)+c;
 const lt=ll.trim(); if(lt.length>=8){ const fl=c.split('\n')[0].trim(); if(fl.startsWith(lt)) return a.slice(0,a.length-ll.length)+c.replace(/^\s*/,ll.match(/^\s*/)[0]) }
 return a+c }
return {isTruncated,joinCont,CUT_MARK,unsafePath,parse,applyOps,applyEdit,findBlock,normPath,splitInfo,isDangerous,clean,FORMAT,PLACEHOLDER} });
