// Петля «ошибка → исправление → ошибка» из 1.2: воспроизводим и доказываем, что в 1.3 её нет
const test=require('node:test'), assert=require('node:assert'), fs=require('fs'), path=require('path'), vm=require('vm');
const APP=path.join(__dirname,'..','app');
// модель старого поведения (до 1.2): любой вывод сборки уходил ИИ, пока не закончатся раунды
async function oldLoop(build,ask,max=8){ let calls=0; for(let i=0;i<max;i++){ const r=await build(); if(r.ok) return {ok:true,calls}; calls++; await ask(r.out) } return {ok:false,calls} }
test('воспроизведение: старая схема гоняет ИИ по кругу на ошибке компьютера (заглушка «Python»)',async()=>{ const r=await oldLoop(async()=>({ok:false,out:'Python'}),async()=>'исправил'); assert.equal(r.ok,false); assert.equal(r.calls,8) });
function sandbox(o){ const el=()=>({classList:{add(){},remove(){},toggle(){},contains:()=>false},textContent:'',innerHTML:'',value:'',appendChild(){},querySelector:()=>el(),addEventListener(){},onclick:null});
 const els={}; const logs=[]; const calls={ai:0,build:0,ponBuild:0};
 const ctx={console,setTimeout:(f)=>0,Date,JSON,String,Math,Object,Promise,Array,
  window:{}, navigator:{userAgent:'Windows'}, document:{querySelectorAll:()=>[],createElement:el},
  S:{cfg:{simpleWay:o.way},root:null}, SM:{kind:'pc'}, sep:'/', AIW:{reset(){},stop:false}, PG:{reset(){},log:(t,k)=>logs.push(t),setProv(){},halted(){},fail:t=>logs.push('FAIL '+t),done(){},live(){}},
  sm$:id=>els[id]||(els[id]=el()), smStage(){}, smMsg:t=>logs.push('MSG '+t), alog(){}, fmtT:ms=>ms+'мс', saveCfg(){}, acctRefresh:async()=>{}, $:()=>({value:'pollinations',options:[]}), ACCT:{logged:{}}, site:()=>null, provName:x=>x, depsGate:async()=>true, notify(){}, openRoot:async()=>{}, ICON:{files:()=>({})},
  smRun(){}, smFinish(){}, smRecent:async()=>{},
  askAI:async()=>{ calls.ai++; return o.answer() },
  api:{ docsDir:async()=>'/tmp/ivk', translit:async n=>'p', exists:async()=>false, mkdir:async()=>{}, write:async()=>{}, iconSave:async()=>{}, readMaybe:async()=>'', ktPrewarm:async()=>({ok:true}), ktBody:async()=>'',
   ktBuild:async()=>{ calls.build++; return o.kt() }, csBuild:async()=>{ calls.build++; return o.kt() }, csPrewarm:async()=>({ok:true}), csBody:async()=>'', ponCheck:async()=>o.pc(), ponSmoke:async()=>({ok:true,errors:[]}), ponBuild:async()=>{ calls.ponBuild++; return {ok:true,exe:'/tmp/x.exe',size:1,ms:1,out:''} }, list:async()=>[], openPath(){} } };
 ctx.globalThis=ctx; vm.createContext(ctx);
 for(const f of ['kotlinapp.js','csapp.js','ponsyntax.js','ponref.js','ponapp.js','native.js']) vm.runInContext(fs.readFileSync(path.join(APP,f),'utf8').replace(/typeof module!=='undefined'/g,'false').replace("typeof window!=='undefined'?window:globalThis","globalThis"),ctx,{filename:f});
 ctx.sm$('s-name').value='Тест'; return {ctx,calls,logs} }
const KT_OK='===KOTLIN===\n    fun start(): View = label("x")\n===КОНЕЦ===';
test('Kotlin: ошибка в коде, которую ИИ не может исправить → до 5 исправлений, APK нет, ошибка с номером строки',async()=>{ const {ctx,calls,logs}=sandbox({way:'kotlin',answer:()=>KT_OK,kt:()=>({ok:false,errors:[{line:3,col:1,msg:"Unresolved reference 'x'",ru:'неизвестное имя «x»',inAI:true}],env:null,out:'',ms:5})});
 await ctx.window.__native.nativeRun('сделай список дел',false); assert.equal(calls.ai,6,'1 запрос + 5 исправлений'); assert.ok(calls.build>=6&&calls.build<=7,'сборок '+calls.build); assert.equal(ctx.window.__nativeStats.fixes,5); assert.equal(ctx.window.__nativeStats.ok,false); assert.ok(logs.some(l=>/строка 3/.test(l))) });
test('Kotlin: проблема компьютера (нет SDK) → ИИ не зовётся, студия сама чинит инструменты (2 попытки) и только потом сообщает',async()=>{ const {ctx,calls,logs}=sandbox({way:'kotlin',answer:()=>KT_OK,kt:()=>({ok:false,errors:[],env:'не найден Android SDK',out:'SDK location not found',ms:5})});
 await ctx.window.__native.nativeRun('сделай',false); assert.equal(calls.ai,1); assert.equal(calls.build,3); assert.ok(logs.some(l=>/компьютера/.test(l))) });
test('Kotlin: хорошая программа → с первого раза, без исправлений',async()=>{ const {ctx,calls}=sandbox({way:'kotlin',answer:()=>KT_OK,kt:()=>({ok:true,errors:[],env:null,file:'/tmp/a.apk',ms:5})});
 await ctx.window.__native.nativeRun('сделай',false); assert.equal(calls.ai,1); assert.equal(calls.build,1); assert.equal(ctx.window.__nativeStats.ok,true) });
test('Понятный: сломанная программа не собирается в EXE; не больше 5 исправлений',async()=>{ const {ctx,calls}=sandbox({way:'pon',answer:()=>'===ПОНЯТНЫЙ===\nнапиши 1\n===КОНЕЦ===',pc:()=>({ok:false,errors:[{kind:'error',line:1,col:1,msg:'плохо'}],warns:[]})});
 await ctx.window.__native.nativeRun('сделай',false); assert.equal(calls.ai,6); assert.equal(calls.ponBuild,0) });
test('Понятный: хорошая программа → проверка и настоящая сборка, 1 запрос ИИ',async()=>{ const {ctx,calls}=sandbox({way:'pon',answer:()=>'===ПОНЯТНЫЙ===\nнапиши 1\n===КОНЕЦ===',pc:()=>({ok:true,errors:[],warns:[]})});
 await ctx.window.__native.nativeRun('сделай',false); assert.equal(calls.ai,1); assert.equal(calls.ponBuild,1); assert.equal(ctx.window.__nativeStats.ok,true) });
test('ответ не по формату → одно напоминание формата, а не бесконечные повторы',async()=>{ const {ctx,calls}=sandbox({way:'pon',answer:()=>'Извините, не могу',pc:()=>({ok:true,errors:[],warns:[]})});
 await ctx.window.__native.nativeRun('сделай',false); assert.ok(calls.ai<=4,'запросов '+calls.ai); assert.equal(calls.ponBuild,0) });
test('быстрый путь 1.2 (fast.js): не больше одного автоисправления в коде',()=>{ const t=fs.readFileSync(path.join(APP,'fast.js'),'utf8'); assert.match(t,/for\(let fix=1;fix<=1&&/); assert.match(t,/сломанную программу НЕ собираем/) });
test('C#: ошибка, которую ИИ не исправил → до 5 исправлений, EXE нет',async()=>{ const {ctx,calls,logs}=sandbox({way:'cs',answer:()=>'===CSHARP===\n    public void Start() { }\n===КОНЕЦ===',kt:()=>({ok:false,errors:[{line:2,col:1,msg:'CS0103',ru:'неизвестное имя «x»',inAI:true}],env:null,out:'',ms:5})});
 await ctx.window.__native.nativeRun('сделай',false); assert.equal(calls.ai,6); assert.ok(calls.build>=6&&calls.build<=7); assert.equal(ctx.window.__nativeStats.ok,false); assert.ok(logs.some(l=>/строка 2/.test(l))) });
test('C#: нет .NET SDK → ИИ не зовётся для исправления',async()=>{ const {ctx,calls}=sandbox({way:'cs',answer:()=>'===CSHARP===\n    public void Start() { }\n===КОНЕЦ===',kt:()=>({ok:false,errors:[],env:'нужен .NET SDK 8',out:'NETSDK1045',ms:5})});
 await ctx.window.__native.nativeRun('сделай',false); assert.equal(calls.ai,1); assert.equal(calls.build,3) });
test('Понятный: ИИ исправил на 3-й попытке → программа собрана (раньше сдавались после 1)',async()=>{ let n=0; const {ctx,calls,logs}=sandbox({way:'pon',answer:()=>'===ПОНЯТНЫЙ===\nнапиши 1\n===КОНЕЦ===',pc:()=>(++n<=3?{ok:false,errors:[{kind:'error',line:1,col:1,msg:'плохо '+n}],warns:[]}:{ok:true,errors:[],warns:[]})});
 await ctx.window.__native.nativeRun('сделай',false); assert.equal(calls.ai,4); assert.equal(calls.ponBuild,1); assert.equal(ctx.window.__nativeStats.ok,true); assert.equal(ctx.window.__nativeStats.fixes,3) });
test('проблема компьютера чинится сама: после установки инструмента сборка проходит без ИИ',async()=>{ let n=0, inst=[]; const {ctx,calls}=sandbox({way:'kotlin',answer:()=>KT_OK,kt:()=>(++n===1?{ok:false,errors:[],env:'не найден Android SDK',out:'SDK location not found',ms:5}:{ok:true,errors:[],env:null,file:'/tmp/a.apk',ms:5})});
 ctx.api.depsCheck=async()=>[{id:'android',name:'Android SDK',found:false}]; ctx.api.toolsInstall=async id=>{ inst.push(id); return {ok:true} };
 await ctx.window.__native.nativeRun('сделай',false); assert.deepEqual(inst,['android']); assert.equal(calls.ai,1); assert.equal(ctx.window.__nativeStats.ok,true) });
test('студия сама чинит частые ошибки по сообщению компилятора, не тратя попытку ИИ',async()=>{ let n=0; const {ctx,calls,logs}=sandbox({way:'pon',answer:()=>'===ПОНЯТНЫЙ===\nx = 5\nнапиши x\n===КОНЕЦ===',pc:()=>(++n===1?{ok:false,errors:[{kind:'error',line:1,col:1,msg:'переменная «x» не объявлена. Объяви её так: пусть x = …'}],warns:[]}:{ok:true,errors:[],warns:[]})});
 await ctx.window.__native.nativeRun('сделай',false); assert.equal(calls.ai,1); assert.equal(ctx.window.__nativeStats.ok,true); assert.ok(logs.some(l=>/добавлено «пусть»/.test(l))) });
