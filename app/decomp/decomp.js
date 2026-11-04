// ИванКод 1.4: декомпиляция программ готовыми инструментами и перевод в «Понятный».
// Безопасность: декомпилируемая программа НИКОГДА не запускается — её только читают декомпиляторы.
// Файл копируется во временную папку; инструменты запускаются с ограничением времени, пониженным приоритетом и лимитом памяти Java.
// На Linux (тесты) можно запускать инструменты от отдельного пользователя: IVANCODE_SANDBOX_USER=ivtest (+ nice, prlimit, timeout).
const fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
const TP=require('./topon.js');
const W=process.platform==='win32';
const PY_MAGIC={3394:'3.7',3413:'3.8',3425:'3.9',3439:'3.10',3495:'3.11',3531:'3.12',3571:'3.13',3608:'3.14'};
// ---------- что за файл ----------
function pyVer(buf){ if(buf.length<4||buf[2]!==0x0d||buf[3]!==0x0a) return null; const m=buf.readUInt16LE(0); return PY_MAGIC[m]||(m>=3350&&m<4000?'3.x':null) }
function peInfo(b){ try{ const o=b.readUInt32LE(0x3c); if(b.toString('latin1',o,o+4)!=='PE\0\0') return null; const opt=o+24; const magic=b.readUInt16LE(opt); const dd=opt+(magic===0x20b?112:96); const clr=b.readUInt32LE(dd+14*8); return {dotnet:clr!==0,x64:magic===0x20b} }catch{ return null } }
const PYI=Buffer.from('MEI\x0c\x0b\x0a\x0b\x0e','latin1');
function detect(file){ const st=fs.statSync(file); const fd=fs.openSync(file,'r'); const head=Buffer.alloc(Math.min(st.size,1<<20)); fs.readSync(fd,head,0,head.length,0);
 const tailLen=Math.min(st.size,4<<20); const tail=Buffer.alloc(tailLen); fs.readSync(fd,tail,0,tailLen,st.size-tailLen); fs.closeSync(fd);
 const ext=path.extname(file).toLowerCase(); const s4=head.toString('latin1',0,4);
 if(s4==='dex\n') return {kind:'dex',lang:'java',title:'Android DEX'};
 if(head.readUInt32BE&&head.length>=4&&head.readUInt32BE(0)===0xCAFEBABE) return {kind:'class',lang:'java',title:'Java .class'};
 if(s4==='PK\x03\x04'){ const all=Buffer.concat([head,tail]).toString('latin1'); if(/classes\d*\.dex/.test(all)||ext==='.apk'||ext==='.aab') return {kind:'apk',lang:'java',title:'Android APK'}; if(/\.class/.test(all)||ext==='.jar') return {kind:'jar',lang:'java',title:'Java JAR'}; return {kind:'unknown',title:'ZIP-архив без Java/Android-кода'} }
 if(ext==='.pyc'||pyVer(head)) { const v=pyVer(head); if(v) return {kind:'pyc',lang:'python',py:v,title:'Python '+v+' .pyc'} }
 if(head.toString('latin1',0,2)==='MZ'){ if(tail.indexOf(PYI)>=0) return {kind:'pyinstaller',lang:'python',title:'Python-программа, собранная PyInstaller'}; const pe=peInfo(head); if(pe&&pe.dotnet) return {kind:'dotnet',lang:'csharp',title:'.NET программа/библиотека'}; return {kind:'native',lang:'c',title:'Обычная программа Windows (C/C++ и т. п.)'} }
 if(s4==='\x7fELF'){ if(tail.indexOf(PYI)>=0) return {kind:'pyinstaller',lang:'python',title:'Python-программа (PyInstaller, Linux)'}; return {kind:'native',lang:'c',title:'Программа Linux (ELF)'} }
 if([0xfeedface,0xfeedfacf,0xcefaedfe,0xcffaedfe].includes(head.readUInt32BE(0))) return {kind:'native',lang:'c',title:'Программа macOS'};
 return {kind:'unknown',title:'Неизвестный формат'} }
// ---------- инструменты (скачиваются по требованию, все — открытые) ----------
const TOOLS={
 cfr:{name:'CFR 0.152 (декомпилятор Java, MIT)',url:'https://github.com/leibnitz27/cfr/releases/download/0.152/cfr-0.152.jar',file:'cfr.jar',needs:'java'},
 jadx:{name:'JADX 1.5.1 (декомпилятор Android, Apache-2.0)',url:'https://github.com/skylot/jadx/releases/download/v1.5.1/jadx-1.5.1.zip',dir:'jadx',check:'lib/jadx-1.5.1-all.jar',needs:'java',mb:15},
 ilspy:{name:'ILSpy ilspycmd 9.0 (декомпилятор .NET, MIT)',url:'https://www.nuget.org/api/v2/package/ilspycmd/9.0.0.7889',dir:'ilspycmd',zipName:'ilspycmd.zip',check:'tools/net8.0/any/ilspycmd.dll',needs:'dotnet',mb:5},
 pyinst:{name:'pyinstxtractor (распаковка PyInstaller, GPL-3.0)',url:'https://raw.githubusercontent.com/extremecoders-re/pyinstxtractor/2025.02/pyinstxtractor.py',fallbackUrl:'https://raw.githubusercontent.com/extremecoders-re/pyinstxtractor/master/pyinstxtractor.py',file:'pyinstxtractor.py',needs:'python'},
 pylib:{name:'decompyle3 + uncompyle6 + xdis (декомпиляция Python ≤3.8 и дизассемблер, GPL-3.0)',pip:['decompyle3','uncompyle6','xdis'],dir:'pylib',check:'xdis',needs:'python'},
 ghidra:{name:'Ghidra 10.4 (декомпилятор машинного кода, Apache-2.0) — около 400 МБ, по желанию',url:'https://github.com/NationalSecurityAgency/ghidra/releases/download/Ghidra_10.4_build/ghidra_10.4_PUBLIC_20230928.zip',dir:'ghidra',check:'ghidra_10.4_PUBLIC/support/'+(W?'analyzeHeadless.bat':'analyzeHeadless'),needs:'java',mb:400,optional:true}};
function makeEnv(d){ // d: {root, java, dotnet, python, download(url,file), extract(zip,dir), log}
 const root=d.root; fs.mkdirSync(root,{recursive:true});
 const tpath=id=>{ const t=TOOLS[id]; return t.file?path.join(root,t.file):path.join(root,t.dir) };
 const has=id=>{ const t=TOOLS[id]; const p=tpath(id); return t.file?fs.existsSync(p):fs.existsSync(path.join(p,t.check)) };
 async function ensure(id,allowOptional){ if(has(id)) return tpath(id); const t=TOOLS[id]; if(t.optional&&!allowOptional) throw Object.assign(new Error('нужен '+t.name),{need:id});
  d.log('Скачиваю '+t.name+'…\n');
  if(t.pip){ const py=d.python(); if(!py) throw new Error('нужен Python 3 (установите его в «Инструментах»)'); const r=await run(py,['-m','pip','install','--disable-pip-version-check','--no-input','--target',tpath(id)].concat(t.pip),{timeout:600}); if(r.code!==0) throw new Error('pip не смог установить '+t.pip.join(', ')+': '+r.out.slice(-400)); return tpath(id) }
  if(t.file){ try{ await d.download(t.url,tpath(id)+'.part') }catch(e){ if(!t.fallbackUrl) throw e; await d.download(t.fallbackUrl,tpath(id)+'.part') } fs.renameSync(tpath(id)+'.part',tpath(id)); return tpath(id) }
  const z=path.join(root,t.zipName||(t.dir+'.zip')); await d.download(t.url,z); try{ await d.extract(z,tpath(id)) }finally{ try{ fs.unlinkSync(z) }catch{} }
  if(!has(id)) throw new Error(t.name+': после распаковки не нашёлся '+t.check); return tpath(id) }
 return {ensure,has,tpath} }
// ---------- запуск инструмента в «песочнице» ----------
let RUNOPT={user:process.env.IVANCODE_SANDBOX_USER||'',memMB:1024};
function run(cmd,args,o={}){ return new Promise(res=>{ const timeout=(o.timeout||300); let c=cmd,a=args;
 if(!W&&RUNOPT.user){ a=['-n','-u',RUNOPT.user,'--','env'].concat(Object.entries(o.sbEnv||{}).map(([k,v])=>k+'='+v)).concat(['nice','-n','15','prlimit','--nproc=512','--fsize=2147483648','--cpu='+(timeout+30),'timeout','-k','5',String(timeout),cmd]).concat(args); c='sudo' }
 let out=''; let p; try{ p=cp.spawn(c,a,{cwd:o.cwd,env:o.env||process.env,windowsHide:true,shell:W&&/\.(bat|cmd)$/i.test(cmd)}) }catch(e){ return res({code:-1,out:String(e.message)}) }
 try{ os.setPriority(p.pid,os.constants.priority.PRIORITY_BELOW_NORMAL) }catch{}
 const add=x=>{ out+=x; if(out.length>200000) out=out.slice(-100000); if(o.log) o.log(String(x)) };
 let so=''; p.stdout.on('data',x=>{ if(so.length<4000000) so+=x; add(x) }); p.stderr.on('data',add);
 const t=setTimeout(()=>{ add('\n⏱ инструмент работал дольше '+timeout+' с — остановлен\n'); try{ if(W) cp.spawnSync('taskkill',['/pid',String(p.pid),'/T','/F'],{windowsHide:true}); else p.kill('SIGKILL') }catch{} },timeout*1000+(RUNOPT.user?10000:0));
 p.on('error',e=>add('\n'+e.message)); p.on('close',code=>{ clearTimeout(t); res({code,out,stdout:so}) }) }) }
// ---------- сбор результата ----------
const SRC_EXT={java:/\.java$/i,csharp:/\.cs$/i,c:/\.(c|cpp|h)$/i,python:/\.py$/i};
function listFiles(dir,re,acc=[]){ let es=[]; try{ es=fs.readdirSync(dir,{withFileTypes:true}) }catch{ return acc } for(const e of es){ const p=path.join(dir,e.name); if(e.isDirectory()) listFiles(p,re,acc); else if(re.test(e.name)) acc.push(p) } return acc }
// библиотечный код (androidx, kotlin, com.google…) неинтересен — сначала код самого приложения
const LIBRE=/[\\/](android|androidx|kotlin|kotlinx|com[\\/]google|org[\\/]jetbrains|okhttp3|okio|retrofit2|j\$|org[\\/]intellij|_COROUTINE|Microsoft|System)[\\/]/;
function pickSources(files,base){ const app=files.filter(f=>!LIBRE.test(path.relative(base,f)?'/'+path.relative(base,f):f)); const lib=files.filter(f=>!app.includes(f)); return app.concat(lib) }
// ---------- главная функция ----------
/** file → {ok, info, outDir, srcDir, ponFile, files:[], translated, skipped, log} . o: {env:makeEnv(...), java, dotnet, python, allowGhidra, maxFiles, maxBytes} */
async function decompile(file,o){ const log=o.log||(()=>{}); const info=detect(file); if(o.kind) info.kind=o.kind; const E=o.env;
 const base=path.basename(file).replace(/\.[^.]+$/,'')||'program';
 const outDir=o.outDir; fs.mkdirSync(outDir,{recursive:true}); const srcDir=path.join(outDir,'исходник'); fs.mkdirSync(srcDir,{recursive:true});
 const work=fs.mkdtempSync(path.join(o.tmp||os.tmpdir(),'ivk-dec-')); try{ fs.chmodSync(work,0o777) }catch{}
 const inp=path.join(work,'in'+(path.extname(file).toLowerCase()||'.bin')); fs.copyFileSync(file,inp); try{ fs.chmodSync(inp,0o644) }catch{}
 const tout=path.join(work,'out'); fs.mkdirSync(tout); try{ fs.chmodSync(tout,0o777) }catch{}
 log('Формат: '+info.title+'\n'); const res={ok:false,info,outDir,srcDir,files:[],log:''};
 const jvm=()=>{ const j=o.java&&o.java(); if(!j) throw Object.assign(new Error('для этого формата нужна Java 17+ (кнопка «Установить JDK» в «Инструментах»)'),{need:'jdk'}); return j };
 try{
  let lang=info.lang, srcRoot=tout;
  switch(info.kind){
   case 'apk': case 'dex': { const j=await E.ensure('jadx'); const r=await run(jvm(),['-Xmx'+RUNOPT.memMB+'m','-cp',path.join(j,'lib','jadx-1.5.1-all.jar'),'jadx.cli.JadxCLI','-r','--no-debug-info','-j','2','-d',tout,inp],{timeout:o.timeout||600,log}); if(!listFiles(tout,/\.java$/).length) throw new Error('JADX не выдал код (код '+r.code+'): '+r.out.slice(-500)); break }
   case 'jar': case 'class': { const c=await E.ensure('cfr'); const r=await run(jvm(),['-Xmx'+RUNOPT.memMB+'m','-jar',c,inp,'--outputdir',tout,'--silent','true'],{timeout:o.timeout||600,log}); if(!listFiles(tout,/\.java$/).length) throw new Error('CFR не выдал код (код '+r.code+'): '+r.out.slice(-500)); break }
   case 'dotnet': { const dn=o.dotnet&&o.dotnet(); if(!dn) throw Object.assign(new Error('для .NET нужен .NET 8 (кнопка «Установить .NET SDK 8» в «Инструментах»)'),{need:'dotnet'}); const il=await E.ensure('ilspy');
    const r=await run(dn,[path.join(il,'tools','net8.0','any','ilspycmd.dll'),inp,'-o',tout],{timeout:o.timeout||600,log,env:{...process.env,DOTNET_CLI_TELEMETRY_OPTOUT:'1',DOTNET_NOLOGO:'1'},sbEnv:{DOTNET_EnableWriteXorExecute:'0',DOTNET_CLI_TELEMETRY_OPTOUT:'1'}}); if(!listFiles(tout,/\.cs$/).length) throw new Error('ILSpy не выдал код (код '+r.code+'): '+r.out.slice(-500)); break }
   case 'pyinstaller': case 'pyc': { const py=o.python&&o.python(); if(!py) throw Object.assign(new Error('для Python-программ нужен Python 3'),{need:'python'});
    let pycs=[]; if(info.kind==='pyinstaller'){ const x=await E.ensure('pyinst'); const r=await run(py,[x,inp],{cwd:tout,timeout:o.timeout||300,log}); const ex=listFiles(tout,/\.pyc$/);
     // главный модуль лежит в корне *_extracted, библиотеки — в PYZ/
     pycs=ex.filter(f=>!/PYZ[^\\/]*_extracted|[\\/]pyimod|pyiboot|pyi_rth_|[\\/]struct\.pyc$/i.test(f)); if(!pycs.length) throw new Error('pyinstxtractor не нашёл главный модуль (код '+r.code+'): '+r.out.slice(-500)); log('Главные модули: '+pycs.map(f=>path.basename(f)).join(', ')+'\n') }
    else pycs=[inp];
    const lib=await E.ensure('pylib'); for(const pc of pycs){ const name=path.basename(pc).replace(/\.pyc$/,'').replace(/^in$/,base); const dst=path.join(tout,'py',name+'.py'); fs.mkdirSync(path.dirname(dst),{recursive:true});
     const ver=pyVer(fs.readFileSync(pc).subarray(0,4)); let code=null;
     if(ver&&/^3\.[78]$/.test(ver)){ for(const mod of ['decompyle3','uncompyle6']){ const r=await run(py,['-c','import sys,importlib;lib,f,mod=sys.argv[1:4];sys.path.insert(0,lib);sys.argv=["d",f];m=importlib.import_module(mod+".bin."+("decompile" if mod=="decompyle3" else "uncompile"));m.main_bin()',lib,pc,mod].map(String),{timeout:120,log:null}); if(r.code===0&&/def |import |=/.test(r.stdout)&&!/Parse error|Traceback/.test(r.out)){ code=r.stdout.split('\n').filter(l=>!/::=|^Reduce |invalid by check|^# (okay decompiling|uncompyle6 version|decompyle3 version|Python bytecode|Decompiled from|Embedded file name|Source timestamp|Size of source|Compiled at|\[)/.test(l)).join('\n').replace(/\n{3,}/g,'\n\n').trim()+'\n'; break } } }
     if(!code&&o.pycdc&&o.pycdc()){ const r=await run(o.pycdc(),[pc],{timeout:120}); if(r.code===0&&r.out.trim()) code=r.out }
     if(!code){ const r=await run(py,['-c','import sys;sys.path.insert(0,sys.argv[1]);from xdis.bin.pydisasm import main;sys.argv=["pydisasm",sys.argv[2]];main()',lib,pc],{timeout:120}); code=TP.commentAll(r.out,(ver&&/^3\.[78]$/.test(ver)?'Python '+ver+': декомпилятор не справился с этим файлом, поэтому показан дизассемблер xdis':'Python '+(ver||'?')+': готовые декомпиляторы (decompyle3/uncompyle6) понимают только Python 3.7–3.8, поэтому показан дизассемблер xdis (байткод, а не исходник)'))+'\n'; info.disasmOnly=true }
     fs.writeFileSync(dst,code) }
    srcRoot=path.join(tout,'py'); break }
   case 'native': { const ok=E.has('ghidra')||o.allowGhidra; if(!ok) throw Object.assign(new Error('для обычных программ (C/C++) нужен Ghidra — около 400 МБ, скачивается по желанию'),{need:'ghidra'});
    const g=await E.ensure('ghidra',true); const ah=path.join(g,TOOLS.ghidra.check); try{ fs.chmodSync(ah,0o755) }catch{} const proj=path.join(work,'proj'); fs.mkdirSync(proj); try{ fs.chmodSync(proj,0o777) }catch{}
    const outC=path.join(tout,base+'.c'); const jh=path.dirname(path.dirname(jvm()));
    const r=await run(ah,[proj,'p','-import',inp,'-scriptPath',path.join(__dirname,'ghidra').replace('app.asar'+path.sep,'app.asar.unpacked'+path.sep),'-postScript','DecompileAll.java',outC,String(o.maxFunctions||300),'-deleteProject','-max-cpu','2'],{timeout:o.timeout||1200,log,env:{...process.env,JAVA_HOME:jh,MAXMEM:RUNOPT.memMB+'M'}});
    if(!fs.existsSync(outC)) throw new Error('Ghidra не выдал код (код '+r.code+'): '+r.out.slice(-600)); break }
   default: throw new Error('этот формат декомпилировать не умею: '+info.title) }
  // перенос исходников и перевод
  const all=pickSources(listFiles(srcRoot,SRC_EXT[lang]),srcRoot); const maxFiles=o.maxFiles||40, maxBytes=o.maxBytes||400000; let used=0; const pon=[]; let translated=0, skipped=0;
  for(const f of all){ const rel=path.relative(srcRoot,f); const dst=path.join(srcDir,rel); fs.mkdirSync(path.dirname(dst),{recursive:true}); fs.copyFileSync(f,dst); res.files.push(dst) }
  for(const f of all){ const src=fs.readFileSync(f,'utf8'); if(translated>=maxFiles||used+src.length>maxBytes){ skipped++; continue } used+=src.length;
   const r=await TP.translate(src,lang); translated++; pon.push('# ===== '+path.relative(srcRoot,f).replace(/\\/g,'/')+' ====='+(r.check?'\n# ВНИМАНИЕ: перевод требует ручной правки — '+r.check.replace(/\n/g,' '):'')+'\n'+r.code) }
  const head='# Декомпилировано ИванКодом из «'+path.basename(file)+'» ('+info.title+').\n# Программа НЕ запускалась. Код восстановлен готовыми декомпиляторами и переведён автоматически:\n# имена и логика могут отличаться от оригинала, что не перевелось — оставлено комментарием.\n'+(skipped?'# Переведено файлов: '+translated+' из '+all.length+' (остальные — в папке «исходник»).\n':'')+'\n';
  res.ponFile=path.join(outDir,base+'.pon'); fs.writeFileSync(res.ponFile,head+pon.join('\n')); res.translated=translated; res.skipped=skipped; res.total=all.length; res.ok=true; log('Готово: файлов кода '+all.length+', переведено в «Понятный» '+translated+'\n')
 }catch(e){ res.error=e.message; res.need=e.need||null; log('✖ '+e.message+'\n') }
 finally{ try{ fs.rmSync(work,{recursive:true,force:true}) }catch(e){ if(RUNOPT.user){ try{ cp.spawnSync('sudo',['-n','-u',RUNOPT.user,'rm','-rf',work]) ; fs.rmSync(work,{recursive:true,force:true}) }catch{} } } }
 return res }
module.exports={detect,decompile,makeEnv,TOOLS,run,pyVer,peInfo,RUNOPT};
