// Окно самоучителя «Понятный»: уроки слева, объяснение, пример (▶ одним нажатием), задание с проверкой настоящим компилятором; прогресс сохраняется
(function(){
const TU=window.PonTutorial; if(!TU) return;
const css=`#tut{position:fixed;inset:24px;z-index:9999;background:var(--bg,#1e1e1e);color:var(--fg,#ddd);border:1px solid #555;border-radius:14px;display:flex;box-shadow:0 10px 40px #0008;font-size:14.5px}
#tut.hidden{display:none}#tut nav{width:260px;border-right:1px solid #444;overflow:auto;padding:10px}#tut nav div{padding:8px 10px;border-radius:8px;cursor:pointer}#tut nav div.on{background:#4f6bed55}#tut nav div.ok::after{content:' ✔';color:#2e9d6a}
#tut main{flex:1;overflow:auto;padding:16px 22px;display:flex;flex-direction:column;gap:10px}#tut textarea{width:100%;min-height:150px;font:14px 'JetBrains Mono',Consolas,monospace;background:#111;color:#e8e8e8;border:1px solid #444;border-radius:8px;padding:10px;tab-size:4}
#tut pre{background:#111;color:#cfe;border-radius:8px;padding:10px;min-height:40px;white-space:pre-wrap;margin:0}#tut button{padding:7px 14px;border-radius:8px;border:1px solid #666;background:#2a2d3a;color:#fff;cursor:pointer}#tut button.p{background:#4f6bed}
#tut .x{position:absolute;right:14px;top:10px}#tut code{background:#0003;padding:1px 4px;border-radius:4px}#tut .res.ok{color:#2e9d6a}#tut .res.bad{color:#e0675d}#tut .bar{height:6px;background:#333;border-radius:3px}#tut .bar i{display:block;height:100%;background:#2e9d6a;border-radius:3px}`;
const st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);
const box=document.createElement('div'); box.id='tut'; box.className='hidden'; document.body.appendChild(box);
const P=()=>{ S.cfg.ponTut=S.cfg.ponTut||{done:[],code:{},cur:0}; return S.cfg.ponTut };
const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;');
function render(){ const p=P(); const i=Math.min(p.cur||0,TU.LESSONS.length-1); const l=TU.LESSONS[i]; const pct=Math.round(p.done.length*100/TU.LESSONS.length);
 box.innerHTML=`<button class="x" data-a="close">✕</button><nav><b>📘 Самоучитель «Понятный»</b><div class="bar" title="пройдено ${pct}%"><i style="width:${pct}%"></i></div><small>пройдено ${p.done.length} из ${TU.LESSONS.length}</small>${TU.LESSONS.map((x,k)=>`<div data-l="${k}" class="${k===i?'on':''} ${p.done.includes(x.id)?'ok':''}">${esc(x.title)}</div>`).join('')}</nav>
 <main><h2>${esc(l.title)}</h2><div>${TU.md(l.text)}</div>${l.files?'<small>Файлы урока: '+Object.keys(l.files).map(esc).join(', ')+'</small>':''}
 <label><small>Что ввести программе, если она спрашивает (ответы через ;):</small> <input id="tut-in" value="${esc((l.check.input||'Иван').trim().split('\n').join('; '))}" style="width:260px"></label><b>Пример</b><textarea id="tut-ex" spellcheck="false">${esc(l.example)}</textarea><div><button class="p" data-a="runex">▶ Запустить пример</button> <small>можно менять и запускать снова</small></div><pre id="tut-exo"></pre>
 <b>✍ Задание</b>${p.done.includes(l.id)?'<div class="res ok">✅ Задание этого урока выполнено</div>':''}<div>${esc(l.task)}</div>${l.check.input?'<small>Проверка сама введёт: '+esc(l.check.input.trim().split('\n').join(', '))+'</small>':''}
 <textarea id="tut-me" spellcheck="false" placeholder="Напиши решение здесь">${esc(p.code[l.id]||'')}</textarea>
 <div><button class="p" data-a="check">✔ Проверить</button> <button data-a="run">▶ Запустить</button> <button data-a="hint">💡 Показать решение</button> ${i<TU.LESSONS.length-1?'<button data-a="next">Следующий урок →</button>':''}</div><div class="res" id="tut-res"></div><pre id="tut-mo"></pre></main>`;
 const me=box.querySelector('#tut-me'); me.oninput=()=>{ p.code[l.id]=me.value; clearTimeout(render.t); render.t=setTimeout(saveCfg,600) };
 for(const ta of box.querySelectorAll('textarea')) ta.onkeydown=e=>{ if(e.key==='Tab'){ e.preventDefault(); const s=ta.selectionStart; ta.setRangeText('    ',s,ta.selectionEnd,'end') } };
 box.onclick=async e=>{ const a=e.target.dataset.a, k=e.target.dataset.l; if(k!=null){ p.cur=+k; saveCfg(); return render() } if(!a) return;
  if(a==='close') return box.classList.add('hidden');
  if(a==='next'){ p.cur=i+1; saveCfg(); return render() }
  if(a==='hint'){ me.value=l.solution; p.code[l.id]=l.solution; saveCfg(); return }
  if(a==='runex'||a==='run'){ const o=box.querySelector(a==='runex'?'#tut-exo':'#tut-mo'); const code=box.querySelector(a==='runex'?'#tut-ex':'#tut-me').value; o.textContent='Запускаю…'; const inp=box.querySelector('#tut-in').value.split(';').map(s=>s.trim()).join('\n')+'\n';
   const r=await api.ponTry(code,{files:l.files,input:inp}); o.textContent=r.compiled?(r.warns.length?'ℹ '+r.warns.join('\n')+'\n':'')+(r.out||'(программа ничего не вывела)'):'✖ '+r.error; return }
  if(a==='check'){ const res=box.querySelector('#tut-res'); res.className='res'; res.textContent='Проверяю настоящим компилятором…'; const r=await api.ponTry(me.value,{files:l.files,input:l.check.input||''}); const j=TU.judge(l,me.value,r);
   box.querySelector('#tut-mo').textContent=r.compiled?r.out:r.error; res.className='res '+(j.ok?'ok':'bad'); res.textContent=j.ok?j.why:'Пока не так: '+j.why;
   if(j.ok&&!p.done.includes(l.id)){ p.done.push(l.id); saveCfg(); setTimeout(render,900) } } } }
window.openPonTutorial=()=>{ render(); box.classList.remove('hidden') };
// кнопка на стартовом экране простого режима и в меню команд
setTimeout(()=>{ const host=document.getElementById('s-start'); if(host&&!document.getElementById('s-tut')){ const b=document.createElement('button'); b.id='s-tut'; b.textContent='📘 Самоучитель «Понятный»'; b.title='Пошаговые уроки языка с проверкой заданий'; b.style.margin='8px 0'; b.onclick=window.openPonTutorial; host.appendChild(b) } },1200);
})();
