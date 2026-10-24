// ИванКод: автоматизация веб-чатов ИИ (на основе модуля ПрокурорПлюс). Селекторы можно переопределить в sites.json.
(()=>{if(window.__pp&&window.__pp.v===7)return;
const host=window.__ppForce||location.host;
const SITE=/deepseek/.test(host)?'deepseek':/giga/.test(host)?'gigachat':/qwen/.test(host)?'qwen':/claude/.test(host)?'claude':/grok/.test(host)?'grok':/chatgpt|openai/.test(host)?'chatgpt':/alice|yandex/.test(host)?'alice':/mistral/.test(host)?'mistral':'other';
// Известные селекторы ответов ассистента (могут меняться — есть эвристика-резерв)
const SEL={deepseek:'.ds-markdown',claude:'.font-claude-response,.font-claude-message,[data-is-streaming] .standard-markdown',
 grok:'[class*=items-start] .message-bubble,.message-bubble',qwen:'.response-message-content,.qwen-markdown,#response-content-container,.chat-response-message',
 gigachat:'[class*=Markdown],[class*=markdown],[class*=assistant],[class*=bot-message],[class*=BotMessage],[data-author=assistant],[data-role=assistant]',
 chatgpt:'[data-message-author-role=assistant] .markdown,[data-message-author-role=assistant]',alice:'[class*=markdown],[class*=message_assistant],[class*=AssistantMessage]',mistral:'[class*=prose],[class*=markdown]',
 other:'.markdown,[class*=markdown],[data-message-author-role=assistant]'};
const OV=window.__ppSel||{};
const GEN='.ds-markdown,.markdown,[class*=markdown],[class*=message-content],[class*=font-claude-response],.message-bubble,[data-message-author-role=assistant]';
const JUNK=/^(Войдите,? чтобы чат сохранился|Войти|Копировать|Скопировать|Copy|Copied|Скопировано|json|javascript|js|Ответ сгенерирован.*|ГигаЧат может ошибаться.*|.*может ошибаться.*проверяйте.*|Regenerate|Thinking completed|Размышление завершено|Думаю…|Повторить|Поделиться|Share)$/i;
const STATUS=/^(running code interpreter|code interpreter|thinking|analyz|searching|reading|думаю|размышля|анализ|поиск|выполняю код)[^\n]{0,120}?(\s*skip|\s*пропустить)?\s*▌?$/i;
const LIMIT=/reached the guest chat limit|guest (chat )?limit|log ?in to continue|войдите,? чтобы продолжить|лимит (гостев|сообщений)|daily limit|rate limit|too many requests/i;
const norm=s=>String(s||'').replace(/\s+/g,' ').trim();
const vis=e=>{if(!e||!e.getClientRects().length)return false;const s=getComputedStyle(e);return s.visibility!=='hidden'&&s.display!=='none'};
function ext(n){let o='';const w=x=>{if(x.nodeType===3){o+=x.nodeValue;return}if(x.nodeType!==1)return;const t=x.tagName;
 if(/^(BUTTON|SVG|svg|STYLE|SCRIPT|TEXTAREA|INPUT|NOSCRIPT|IMG|NAV|FOOTER)$/.test(t)||x.getAttribute('contenteditable')==='true'||x.getAttribute('role')==='button'&&!x.querySelector('pre,code'))return;
 if(t==='PRE'||(x.classList&&x.classList.contains('qwen-markdown-code'))){const cb=codeOf(x);if(cb){o+='\n```'+cb.lang+'\n'+cb.text.replace(/\n$/,'')+'\n```\n';return}}
 if(t==='PRE'){const lc=x.querySelector('code[class*=language-]');const lg=lc?(lc.className.match(/language-([\w+#-]+)/)||[])[1]||'':'';o+='\n```'+lg+'\n'+x.textContent.replace(/\n$/,'')+'\n```\n';return}
 if(t==='BR'){o+='\n';return}
 const b=/^(DIV|P|LI|H[1-6]|TR|UL|OL|TABLE|BLOCKQUOTE|SECTION|ARTICLE|HEADER|DL|DT|DD|HR)$/.test(t);if(b)o+='\n';if(t==='LI')o+='• ';
 for(const c of x.childNodes)w(c);if(t==='TD'||t==='TH')o+='\t';if(b)o+='\n'};w(n);
 return o.replace(/[\u200B-\u200D\u2060\uFEFF]/g,'').replace(/\u00A0/g,' ').split('\n').map(l=>l.replace(/[ \t\u00a0]+$/,'')).filter(l=>!JUNK.test(l.trim())).join('\n').replace(/\n{3,}/g,'\n\n').trim()}
function codeOf(x){ // редакторы кода внутри ответа (Monaco у Qwen, CodeMirror и др.)
 const me=x.querySelector('.monaco-editor'); let lang=''; const hd=x.querySelector('[class*=code-header] > div:first-child,[class*=code-header] > span:first-child,[class*=code-lang],[class*=language-label]'); if(hd) lang=(hd.innerText||'').trim().split(/\s/)[0]||'';
 if(!lang){ const md=x.querySelector('[data-mode-id]'); if(md) lang=md.getAttribute('data-mode-id')||'' } if(!lang){ const b=x.querySelector('[class*=code-body]'); if(b) lang=(String(b.className).split(/\s+/).find(c=>!/code/.test(c))||'') } if(/^(plaintext|text)$/i.test(lang)) lang='';
 if(me){ try{ const uri=me.getAttribute('data-uri'); const M=window.monaco&&window.monaco.editor; if(M&&uri){ const m=M.getModels().find(z=>String(z.uri)===uri); if(m) return {lang,text:m.getValue()} } }catch(e){}
  const ls=[...me.querySelectorAll('.view-lines .view-line')].map(l=>({top:parseFloat(l.style.top)||0,t:l.textContent.replace(/\u00a0/g,' ')})).sort((a,b)=>a.top-b.top); return {lang,text:ls.map(l=>l.t).join('\n')} }
 const cm=x.querySelectorAll('.cm-line'); if(cm.length) return {lang,text:[...cm].map(l=>l.textContent).join('\n')};
 return null }
function editor(){if(OV.input){const e=[...document.querySelectorAll(OV.input)].filter(vis);if(e.length)return e[e.length-1]}const c=[...document.querySelectorAll('textarea,[contenteditable=true],div[role=textbox]')].filter(vis);return c[c.length-1]||null}
function composer(ed){let e=ed;for(let i=0;i<7&&e&&e.parentElement;i++){e=e.parentElement;if(e.tagName==='FORM'||e.querySelectorAll('button').length>=2)return e}return ed&&ed.parentElement}
function busy(){if(OV.busy&&document.querySelector(OV.busy))return true;if(SITE==='claude'&&document.querySelector('[data-is-streaming=true]'))return true;
 return [...document.querySelectorAll('button,[role=button]')].some(b=>vis(b)&&/(^|\W)(stop|остановить|прервать|стоп)/i.test((b.getAttribute('aria-label')||'')+' '+(b.title||'')+' '+(b.getAttribute('data-testid')||'')+' '+String(b.className||'')+' '+(b.innerText||'').slice(0,30)))||[...document.querySelectorAll('button,[role=button],span,div')].some(b=>b.childElementCount===0&&vis(b)&&/^(skip|пропустить)$/i.test((b.innerText||'').trim()))||[...document.querySelectorAll('[class*=stop-button],[class*=StopButton],[class*=thinking-loading],[class*=typing-cursor],[class*=is-streaming],[class*=generating]')].some(vis)}
const st={head:'',before:0,snap:'',t0:0};
const GATE=/^(continue|продолжить|accept|accept all|принять|принять все|ok|ок|got it|понятно|stay logged out|остаться без входа|не входить|maybe later|позже|skip|пропустить|agree|согласен|i agree)$/i;
function gates(){ let n=0; for(const d of document.querySelectorAll('[role=dialog],[role=alertdialog],[class*=cookie],[id*=cookie],[class*=consent]')){ if(!vis(d)) continue;
  const b=[...d.querySelectorAll('button,[role=button],a')].filter(x=>vis(x)&&GATE.test((x.innerText||x.getAttribute('aria-label')||'').trim())); if(b.length){ b[b.length-1].click(); n++ } } return n }
function siteList(){try{if(OV.answer){const a=[...document.querySelectorAll(OV.answer)].filter(e=>!e.parentElement.closest(OV.answer));if(a.length)return a}return [...document.querySelectorAll(SEL[SITE])].filter(e=>!e.parentElement.closest(SEL[SITE]))}catch(e){return[]}}
function bySelector(){const a=siteList();if(a.length<=st.before)return '';const t=ext(a[a.length-1]);return isPrompt(t)?'':t}
function isPrompt(t){const n=norm(t);return !n||st.head&&(n.startsWith(st.head)||st.head.startsWith(n.slice(0,60)))}
function heuristic(){const ed=editor(),cp=ed&&composer(ed);let best=null,bl=0;
 for(const e of document.body.querySelectorAll('*')){if(e.hasAttribute('data-pp-old')||e.closest('[role=dialog]')||!vis(e)||/^(SCRIPT|STYLE|BUTTON|svg|SVG|PRE|CODE|SPAN)$/.test(e.tagName))continue;
  if(cp&&(e.contains(cp)||cp.contains(e)))continue;const it=norm(e.innerText);if(it.length<15)continue;
  if(st.head&&it.includes(st.head.slice(0,50)))continue;if(st.snap.includes(it.slice(0,80)))continue;
  if(it.length>bl){bl=it.length;best=e}}
 return best?ext(best):''}
function lastAny(){const a=siteList();if(a.length)return {text:ext(a[a.length-1]),method:'selector:'+SITE};const g=[...document.querySelectorAll(GEN)].filter(vis);if(g.length)return {text:ext(g[g.length-1]),method:'generic'};return {text:'',method:'none'}}
window.__pp={v:7,gates,site:SITE,ext,
 mark(p){st.head=norm(p).slice(0,80);st.before=siteList().length;st.snap=norm(document.body.innerText);st.t0=Date.now();
  document.body.querySelectorAll('*').forEach(e=>e.setAttribute('data-pp-old',''));return JSON.stringify({site:SITE,before:st.before,editor:!!editor()})},
 async send(p){if(gates())await new Promise(r=>setTimeout(r,300));const ed=editor();if(!ed)return 'noinput';ed.focus();
  if(ed.tagName==='TEXTAREA'){const set=Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set;set.call(ed,p);ed.dispatchEvent(new Event('input',{bubbles:true}));ed.dispatchEvent(new Event('change',{bubbles:true}))}
  else{document.execCommand('selectAll',false);document.execCommand('insertText',false,p);if(norm(ed.innerText).length<5){ed.textContent=p;ed.dispatchEvent(new InputEvent('input',{bubbles:true,data:p,inputType:'insertText'}))}}
  for(let k=0;k<8;k++){ const v0=ed.tagName==='TEXTAREA'?ed.value:ed.innerText; if(norm(v0).length>3) break; await new Promise(r=>setTimeout(r,50)) } await new Promise(r=>setTimeout(r,150));
  const cp=composer(ed)||document;const bs=[...cp.querySelectorAll('button,[role=button]')].filter(b=>vis(b)&&!b.disabled&&b.getAttribute('aria-disabled')!=='true');
  let btn=OV.send?[...document.querySelectorAll(OV.send)].filter(vis).pop():null;if(!btn)btn=bs.find(b=>/send|отправ|submit/i.test((b.getAttribute('aria-label')||'')+' '+(b.title||'')+' '+(b.getAttribute('data-testid')||'')+' '+String(b.className||'')+' '+(b.id||'')+' '+(b.getAttribute('type')==='submit'?'submit':'')));
  if(!btn)btn=[...document.querySelectorAll('button[aria-label],button[type=submit]')].reverse().find(b=>vis(b)&&!b.disabled&&/send|отправ|submit/i.test((b.getAttribute('aria-label')||'')+(b.getAttribute('type')||'')));
  if(btn){btn.click();for(let k=0;k<12;k++){await new Promise(r=>setTimeout(r,100));const vv=ed.tagName==='TEXTAREA'?ed.value:ed.innerText;if(norm(vv).length<=3)return 'ok:button'}const v2=ed.tagName==='TEXTAREA'?ed.value:ed.innerText;if(norm(v2).length>3){const b2=OV.send?[...document.querySelectorAll(OV.send)].filter(vis).pop():btn;if(b2&&!b2.disabled)b2.click();else for(const ty of ['keydown','keyup'])ed.dispatchEvent(new KeyboardEvent(ty,{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true,cancelable:true}));return 'ok:button2'}return 'ok:button'}
  for(const ty of ['keydown','keypress','keyup'])ed.dispatchEvent(new KeyboardEvent(ty,{key:'Enter',code:'Enter',keyCode:13,which:13,bubbles:true,cancelable:true}));return 'ok:enter'},
 pending(){const ed=editor();if(!ed)return false;const v=ed.tagName==='TEXTAREA'?ed.value:ed.innerText;return norm(v).length>3&&st.head.startsWith(norm(v).slice(0,40))},
 clickLast(){const ed=editor();const cp=composer(ed)||document;const bs=[...cp.querySelectorAll('button,[role=button]')].filter(b=>vis(b)&&!b.disabled);const b=bs[bs.length-1];if(b){b.click();return 'clicked:'+(b.getAttribute('aria-label')||b.className||'?').toString().slice(0,40)}return 'nobutton'},
 sent(){const ed=editor();const v=ed?norm(ed.tagName==='TEXTAREA'?ed.value:ed.innerText):'';return !!st.head&&!v.startsWith(st.head.slice(0,40))&&norm(document.body.innerText).includes(st.head.slice(0,40))},
 poll(){gates();let t=bySelector(),m='selector:'+SITE;if(!t){t=heuristic();m='heuristic'}let b=busy();const n=norm(t);if(n&&STATUS.test(n)){t='';b=true}const fresh=norm(document.body.innerText).replace(st.snap,'');const limit=LIMIT.test(n.slice(-300))||(!t&&LIMIT.test(fresh.slice(-600)));if(limit)t='';return JSON.stringify({text:t,busy:b,method:m,n:siteList().length,limit})},
 grab(){const s=String(getSelection()||'').trim();if(s.length>10)return JSON.stringify({text:s,method:'selection'});
  const a=lastAny();if(a.text&&!isPrompt(a.text))return JSON.stringify(a);const h=heuristic();return JSON.stringify({text:h||a.text,method:h?'heuristic':a.method})}};
})();
