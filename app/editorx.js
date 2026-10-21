// ИванКод 1.2: редактор — сворачиваемые панели, редактор на весь экран, спокойная подсветка с постоянной высотой строк, выбор схемы подсветки с предпросмотром
const SYN={
 soft:{name:'Спокойная (по умолчанию)',d:{kw:'9db4ff',str:'a8d5a2',num:'e6c07b',com:'6f7a8c',fn:'c7b3ff',ty:'7fcfc4',tag:'8fb8e8',attr:'c7b3ff'},l:{kw:'3654a8',str:'3d7a3a',num:'8a6200',com:'8f949c',fn:'6a4bb0',ty:'1d6d78',tag:'2f5f9e',attr:'6a4bb0'}},
 theme:{name:'Как в теме оформления',fromTheme:true},
 classic:{name:'Классика (как VS Code)',d:{kw:'569cd6',str:'ce9178',num:'b5cea8',com:'6a9955',fn:'dcdcaa',ty:'4ec9b0',tag:'569cd6',attr:'9cdcfe'},l:{kw:'0000ff',str:'a31515',num:'098658',com:'008000',fn:'795e26',ty:'267f99',tag:'800000',attr:'e50000'}},
 vivid:{name:'Яркая',d:{kw:'ff79c6',str:'f1fa8c',num:'bd93f9',com:'7282b4',fn:'50fa7b',ty:'8be9fd',tag:'ff79c6',attr:'50fa7b'},l:{kw:'c0267f',str:'7a7a00',num:'6b3fc9',com:'7a86a8',fn:'1a8f3c',ty:'0f7f9a',tag:'c0267f',attr:'1a8f3c'}},
 warm:{name:'Тёплая',d:{kw:'e6a26b',str:'b8c97a',num:'e3c46b',com:'857a6c',fn:'e8b88a',ty:'9cc3a8',tag:'e6a26b',attr:'e8b88a'},l:{kw:'a65a1f',str:'5d7a1f',num:'94700a',com:'9a8f80',fn:'8a5a2a',ty:'3f7a5e',tag:'a65a1f',attr:'8a5a2a'}},
 mono:{name:'Монохром (почти без цвета)',d:{kw:'e8e8e8',str:'b5b5b5',num:'cfcfcf',com:'767676',fn:'f5f5f5',ty:'d5d5d5',tag:'e8e8e8',attr:'c5c5c5'},l:{kw:'111111',str:'555555',num:'333333',com:'9a9a9a',fn:'000000',ty:'2a2a2a',tag:'111111',attr:'444444'}}};
function synPal(id,uiT){ const t=THEMES[uiT]||THEMES.ivanchai; const s=SYN[id]||SYN.soft; if(s.fromTheme) return {kw:t.kw,str:t.str,num:t.num,com:t.com,fn:t.fn,ty:t.ty,tag:t.kw,attr:t.fn}; return t.base==='vs'?s.l:s.d }
function defThemes2(){ const bold=!!S.cfg.synBold; for(const [id,t] of Object.entries(THEMES)){ const p=synPal(S.cfg.syntax||'soft',id); const fs=bold?'bold':'';
  monaco.editor.defineTheme('ic-'+id,{base:t.base,inherit:true,rules:[{token:'keyword',foreground:p.kw,fontStyle:fs},{token:'string',foreground:p.str},{token:'string.escape',foreground:p.num},{token:'number',foreground:p.num},{token:'regexp',foreground:p.str},{token:'comment',foreground:p.com},{token:'type',foreground:p.ty},{token:'type.identifier',foreground:p.ty},{token:'identifier.function',foreground:p.fn},{token:'tag',foreground:p.tag},{token:'metatag',foreground:p.tag},{token:'attribute.name',foreground:p.attr},{token:'attribute.value',foreground:p.str},{token:'delimiter',foreground:t.fg.slice(1)},{token:'invalid',foreground:p.num}],
   colors:{'editor.background':t.bg,'editor.foreground':t.fg,'editorLineNumber.foreground':'#'+t.com,'editorCursor.foreground':t.ac,'editor.selectionBackground':t.ac+'44','editor.lineHighlightBackground':t.fg+'0a','editorIndentGuide.background1':t.fg+'14','minimap.background':t.bg,'editorGutter.background':t.bg,
    // спокойные пометки ошибок вместо ярко-красных
    'editorError.foreground':t.base==='vs'?'#c0505099':'#e8878799','editorWarning.foreground':t.base==='vs'?'#b0802a88':'#d9b36a88','editorInfo.foreground':'#7a9cc677','editorUnicodeHighlight.border':'#00000000','editorUnicodeHighlight.background':'#00000000','editorBracketHighlight.unexpectedBracket.foreground':t.fg+'99','editorOverviewRuler.errorForeground':'#e8878766'}}) } }
function applyEditorFix(){ if(!window.monaco||!ed) return; defThemes2(); setTheme(S.cfg.theme);
 // постоянная высота строк: без курсива/жирного шрифта-заменителя, без рамок у кириллицы, без «плавающих» вставок
 ed.updateOptions({lineHeight:22,fontLigatures:false,unicodeHighlight:{ambiguousCharacters:false,invisibleCharacters:false,nonBasicASCII:false},inlayHints:{enabled:'off'},codeLens:false,renderValidationDecorations:S.cfg.squiggles===false?'off':'on',bracketPairColorization:{enabled:!S.cfg.noBrackets}});
 document.fonts&&document.fonts.ready.then(()=>{ try{ monaco.editor.remeasureFonts() }catch{} }) }
(function w(){ if(!window.__ready||!window.monaco||!ed) return setTimeout(w,300); const _st=setTheme; applyEditorFix(); layoutApply();
 ed.addCommand(monaco.KeyMod.CtrlCmd|monaco.KeyCode.KeyB,()=>toggleL('side')); ed.addCommand(monaco.KeyMod.CtrlCmd|monaco.KeyCode.KeyJ,()=>toggleL('panel')); ed.addCommand(monaco.KeyMod.CtrlCmd|monaco.KeyMod.Alt|monaco.KeyCode.KeyB,()=>toggleL('ai')); ed.addCommand(monaco.KeyCode.F11,()=>toggleL('full')) })();
// ---- сворачиваемые панели ----
function layoutApply(){ const L=S.cfg.layout||{}; for(const k of ['side','panel','ai','full']) document.body.classList.toggle('hide-'+k,!!L[k]); document.querySelectorAll('#lbar [data-l]').forEach(b=>b.classList.toggle('on',!L[b.dataset.l]===(b.dataset.l!=='full'))); setTimeout(()=>{ try{ ed&&ed.layout(); typeof fitTerm==='function'&&fitTerm() }catch{} },260) }
function toggleL(k){ S.cfg.layout=S.cfg.layout||{}; S.cfg.layout[k]=!S.cfg.layout[k]; saveCfg(); layoutApply(); if(k==='full') toast(S.cfg.layout.full?'Редактор на весь экран. Выход — F11 или Esc':'Обычный вид') }
{ const bar=document.createElement('div'); bar.id='lbar'; bar.innerHTML='<button data-l="side" title="Боковая панель (Ctrl+B)">◧</button><button data-l="panel" title="Нижняя панель: терминал, сборка (Ctrl+J)">⬓</button><button data-l="ai" title="Панель ИИ (Ctrl+Alt+B)">◨</button><button data-l="full" title="Редактор на весь экран (F11)">⛶</button><button data-l="syn" title="Подсветка кода: схемы и предпросмотр">🖍</button>';
 const tabs=document.getElementById('tabs'); if(tabs) tabs.parentNode.insertBefore(bar,tabs.nextSibling);
 bar.onclick=e=>{ const b=e.target.closest('[data-l]'); if(!b) return; if(b.dataset.l==='syn') synPicker(); else toggleL(b.dataset.l) } }
document.addEventListener('keydown',e=>{ if(document.getElementById('simple')&&!document.getElementById('simple').classList.contains('hidden')) return;
 const c=e.ctrlKey||e.metaKey; if(c&&!e.altKey&&!e.shiftKey&&e.code==='KeyB'){ e.preventDefault(); toggleL('side') } else if(c&&e.altKey&&e.code==='KeyB'){ e.preventDefault(); toggleL('ai') } else if(c&&!e.shiftKey&&e.code==='KeyJ'){ e.preventDefault(); toggleL('panel') } else if(e.key==='F11'){ e.preventDefault(); toggleL('full') } else if(e.key==='Escape'&&(S.cfg.layout||{}).full&&document.getElementById('modal').classList.contains('hidden')){ toggleL('full') } },true);
// ---- выбор схемы подсветки с предпросмотром ----
const SYN_SAMPLE=`// Учёт расходов
function total(items) {
  let sum = 0; // «Итого»
  for (const it of items) sum += Number(it.price) * 1.2;
  return \`Итого: \${sum} ₽\`;
}
const list = [{ name: "Хлеб", price: 45 }];
<div class="card">Привет</div>`;
function synPreview(id){ const p=synPal(id,S.cfg.theme), t=THEMES[S.cfg.theme]||THEMES.ivanchai; const col=ty=>/comment/.test(ty)?p.com:/keyword/.test(ty)?p.kw:/string/.test(ty)?p.str:/number/.test(ty)?p.num:/type/.test(ty)?p.ty:/tag|metatag/.test(ty)?p.tag:/attribute\.name/.test(ty)?p.attr:t.fg.slice(1);
 let toks=[]; try{ toks=monaco.editor.tokenize(SYN_SAMPLE,'javascript') }catch{} const lines=SYN_SAMPLE.split('\n');
 return lines.map((ln,i)=>{ const T=toks[i]||[{offset:0,type:''}]; let h=''; T.forEach((tk,j)=>{ const end=j+1<T.length?T[j+1].offset:ln.length; h+=`<span style="color:#${col(tk.type)}">${esc(ln.slice(tk.offset,end))}</span>` }); return h||' ' }).join('\n') }
async function synPicker(){ if(!synPicker.ld){ synPicker.ld=true; try{ const m=monaco.editor.createModel('let a=1','javascript'); for(let i=0;i<20;i++){ const tk=monaco.editor.tokenize('let a="x"','javascript'); if(tk[0]&&tk[0].length>2) break; await new Promise(r=>setTimeout(r,100)) } m.dispose() }catch{} } const t=THEMES[S.cfg.theme]||THEMES.ivanchai; const cur=S.cfg.syntax||'soft';
 modal('🖍 Подсветка кода',`<div class="hint" style="padding:10px 16px">Выберите схему — она сразу применится в редакторе. Ошибки помечаются спокойной волнистой линией, высота строк всегда одинаковая.</div><div class="syns">${Object.entries(SYN).map(([id,s])=>`<div class="syn ${cur===id?'on':''}" data-syn="${id}"><b>${s.name}</b><pre style="background:${t.bg};color:${t.fg}">${synPreview(id)}</pre></div>`).join('')}</div>
 <div class="form" style="grid-template-columns:auto 1fr"><label><input type="checkbox" id="synBold" ${S.cfg.synBold?'checked':''}> жирные ключевые слова</label><span></span><label><input type="checkbox" id="synSq" ${S.cfg.squiggles===false?'':'checked'}> подчёркивать ошибки (спокойно)</label><span></span></div>`,[['Готово',()=>closeModal(),'pri']]); try{ $('.mbox').style.height='auto' }catch{}
 $('#mbody').onclick=e=>{ const d=e.target.closest('[data-syn]'); if(d){ S.cfg.syntax=d.dataset.syn; saveCfg(); applyEditorFix(); $$('.syn').forEach(x=>x.classList.toggle('on',x===d)) } };
 $('#synBold').onchange=e=>{ S.cfg.synBold=e.target.checked; saveCfg(); applyEditorFix() }; $('#synSq').onchange=e=>{ S.cfg.squiggles=e.target.checked; saveCfg(); applyEditorFix() } }
// смена темы оформления → схема подсветки пересобирается под неё
{ const _set=setTheme; setTheme=function(t,a){ if(window.monaco&&!setTheme._in){ setTheme._in=true; try{ S.cfg.theme=THEMES[t]?t:'ivanchai'; defThemes2() }finally{ setTheme._in=false } } return _set(t,a) } }
window.__edx={toggleL,layoutApply,synPicker,applyEditorFix,SYN};
