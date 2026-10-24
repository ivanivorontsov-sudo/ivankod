const SITES={
 deepseek:{input:'<textarea id="chat-input" placeholder="Message DeepSeek"></textarea>',send:'<div role="button" class="ds-icon-button send" aria-disabled="false"></div>',answer:'ds-markdown',stop:'<div role="button" class="ds-icon-button stop-generating" style="display:none"></div>',path:'/a/chat/s/'},
 qwen:{input:'<textarea id="chat-input"></textarea>',send:'<button id="send-message-button" class="send-button"></button>',answer:'qwen-markdown',stop:'',path:'/c/'},
 chatgpt:{input:'<div id="prompt-textarea" contenteditable="true" class="ProseMirror"><p></p></div>',send:'<button data-testid="send-button" aria-label="Send prompt"></button>',answer:'markdown',role:'assistant',stop:'<button data-testid="stop-button" aria-label="Stop streaming" style="display:none"></button>',path:'/c/'},
 gemini:{input:'<rich-textarea><div class="ql-editor" contenteditable="true" role="textbox"></div></rich-textarea>',send:'<button class="send-button" aria-label="Отправить сообщение"></button>',answer:'markdown',stop:'',path:'/app/'},
 grok:{input:'<textarea aria-label="Ask Grok anything"></textarea>',send:'<button type="submit" aria-label="Submit"></button>',answer:'message-bubble',stop:'',path:'/chat/'},
 gigachat:{input:'<div contenteditable="true" role="textbox"></div>',send:'<button aria-label="Отправить"></button>',answer:'Markdown_root',stop:'',path:'/chat/'},
 alice:{input:'<textarea placeholder="Спросите Алису"></textarea>',send:'<button aria-label="Отправить"></button>',answer:'markdown',stop:'',path:'/chat/'},
};
function page(id,hang){ const s=SITES[id]; return `<!doctype html><html><head><meta charset="utf-8"><title>${id}</title></head><body>
<div id="msgs"></div><form id="f" onsubmit="return false">${s.input}${s.send}${s.stop}</form>${hang?'<img src="/hang.png" width="1" height="1">':''}
<script>
const S=${JSON.stringify(s)}; let n=+(sessionStorage.n||0);
function ed(){ return document.querySelector('#f textarea,#f [contenteditable=true]') }
function val(){ const e=ed(); return e.tagName==='TEXTAREA'?e.value:e.innerText }
function clr(){ const e=ed(); if(e.tagName==='TEXTAREA') e.value=''; else e.innerHTML='<p></p>' }
function go(){ const q=val().trim(); if(!q) return; clr(); n++; sessionStorage.n=n; if(!/${s.path.replace(/\//g,'\\/')}/.test(location.pathname)) history.pushState({},'',S.path+'id'+Date.now());
 const u=document.createElement('div'); u.className='user-msg'; u.textContent=q; msgs.appendChild(u);
 const a=document.createElement('div'); if(S.role) a.setAttribute('data-message-author-role','assistant'); const m=document.createElement('div'); m.className=S.answer; (S.role?a:msgs).appendChild(m); if(S.role) msgs.appendChild(a); else msgs.appendChild(a), a.appendChild(m);
 const st=document.querySelector('[data-testid=stop-button],.stop-generating'); if(st) st.style.display='';
 const full='Ответ номер '+n+'. ===ПОНЯТНЫЙ===\\nнапиши "привет"\\n===КОНЕЦ==='; let i=0; setTimeout(function tick(){ i+=8; m.textContent=full.slice(0,i); if(i<full.length) setTimeout(tick,80); else if(st) st.style.display='none' },400) }
document.querySelector('#f button,#f [role=button]').addEventListener('click',go);
ed().addEventListener('keydown',e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); go() } });
</script></body></html>` }
module.exports={SITES,page};
