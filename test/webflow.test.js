const test=require('node:test'), assert=require('node:assert');
const WF=require('../app/webflow.js');
function fakeSite(o={}){ let t=0; const st={opens:[],prompts:[],url:'',chats:0,input:true,busyStuck:!!o.busyStuck,answerAfter:o.answerAfter??1500,cur:null,limit:false};
 const drv={now:()=>t,sleep:async ms=>{ t+=ms },log:()=>{},url:async()=>st.url,
  open:async u=>{ t+=o.loadMs??800; st.opens.push(u); if(!/\/c\//.test(u)){ st.chats++; st.url=u } else st.url=u; st.cur=null },
  exec:async e=>{ if(e.includes('querySelectorAll(')) return st.input&&t>0; if(e.startsWith('window.__pp.mark')) return '{}';
   if(e.startsWith('window.__pp.send(')){ if(!st.input) return 'noinput'; const p=JSON.parse(e.slice('window.__pp.send('.length,-1)); st.prompts.push(p); st.cur={t0:t}; if(!/\/c\//.test(st.url)) st.url=st.url.replace(/\/$/,'')+'/c/'+st.chats; return 'ok:button' }
   if(e==='window.__pp.sent()') return !!st.cur; if(e==='window.__pp.pending()') return false;
   if(e==='window.__pp.poll()'){ if(!st.cur) return JSON.stringify({text:'',busy:false}); const dt=t-st.cur.t0; if(st.limit) return JSON.stringify({text:'',limit:true}); if(dt<st.answerAfter) return JSON.stringify({text:'',busy:true}); const full='ответ '+st.prompts.length; const done=dt>st.answerAfter+1000; return JSON.stringify({text:done?full:full.slice(0,3),busy:st.busyStuck||!done}) }
   return null } };
 return {drv,st,time:()=>t} }
const S={id:'deepseek',name:'DeepSeek',url:'https://chat.deepseek.com/'};
test('все запросы проекта идут в ОДИН чат: страница открывается один раз, инструкция отправляется один раз',async()=>{ const f=fakeSite(); const w=WF.create(f.drv);
 for(let i=0;i<3;i++){ const r=await w.ask(S,{key:'proj',sys:'СИСТЕМА',user:'запрос '+i}); assert.equal(r.err,''); assert.equal(r.text,'ответ '+(i+1)) }
 assert.equal(f.st.opens.length,1); assert.equal(f.st.chats,1); assert.ok(f.st.prompts[0].startsWith('СИСТЕМА')); assert.ok(!f.st.prompts[1].includes('СИСТЕМА')); assert.ok(!f.st.prompts[2].includes('СИСТЕМА')) });
test('другая инструкция (другой режим) в том же чате отправляется заново',async()=>{ const f=fakeSite(); const w=WF.create(f.drv); await w.ask(S,{key:'p',sys:'A',user:'1'}); await w.ask(S,{key:'p',sys:'B',user:'2'}); assert.ok(f.st.prompts[1].startsWith('B')); assert.equal(f.st.chats,1) });
test('кнопка «Новый чат» — единственный способ начать новый разговор в том же проекте',async()=>{ const f=fakeSite(); const w=WF.create(f.drv); await w.ask(S,{key:'p',sys:'A',user:'1'}); await w.newChat(S,'p'); await w.ask(S,{key:'p',sys:'A',user:'2'}); assert.equal(f.st.chats,2); assert.ok(f.st.prompts[1].startsWith('A')) });
test('другой проект — свой чат; возврат к проекту открывает его прежний разговор',async()=>{ const f=fakeSite(); const w=WF.create(f.drv); await w.ask(S,{key:'p1',user:'1'}); const u1=f.st.url; await w.ask(S,{key:'p2',user:'2'}); assert.equal(f.st.chats,2); await w.ask(S,{key:'p1',user:'3'}); assert.equal(f.st.opens[f.st.opens.length-1],u1); assert.equal(f.st.chats,2) });
test('сайт закрыл чат (нет поля ввода) — открывается новый и запрос уходит',async()=>{ const f=fakeSite(); const w=WF.create(f.drv); await w.ask(S,{key:'p',user:'1'}); f.st.input=false; const o=f.drv.open; f.drv.open=async u=>{ await o(u); f.st.input=true }; const r=await w.ask(S,{key:'p',user:'2'}); assert.equal(r.err,''); assert.equal(f.st.chats,2) });
test('скорость: запрос уходит за секунды после загрузки страницы, а не за минуты',async()=>{ for(const id of ['deepseek','qwen','chatgpt','gemini','grok','gigachat','alice']){ const f=fakeSite({loadMs:2500}); const w=WF.create(f.drv); const r=await w.ask({...S,id,url:'https://'+id+'/'},{key:'p',sys:'X',user:'y'});
  assert.ok(r.tm.sent-r.tm.ready<=1000,id+': отправка '+(r.tm.sent-r.tm.ready)+' мс'); assert.ok(r.tm.ready<=3500,id+': готовность '+r.tm.ready); assert.ok(r.tm.done-r.tm.first<=4000,id+': завершение '+(r.tm.done-r.tm.first)); const r2=await w.ask({...S,id,url:'https://'+id+'/'},{key:'p',user:'z'}); assert.equal(r2.tm.ready,0,id+': второй запрос без перезагрузки') } });
test('завис индикатор «печатает» (как бывало у DeepSeek): ответ берётся через 15 с, а не через 90+',async()=>{ const f=fakeSite({busyStuck:true}); const w=WF.create(f.drv); const r=await w.ask(S,{key:'p',user:'1'}); assert.equal(r.err,''); assert.ok(r.tm.done<25000,'ушло '+r.tm.done) });
test('лимит сайта — понятная ошибка',async()=>{ const f=fakeSite(); f.st.limit=true; const w=WF.create(f.drv); await assert.rejects(()=>w.ask(S,{key:'p',user:'1'}),e=>e.limit) });
