// ИванКод: менеджер инструментов, сборка, шаблоны
const { app, ipcMain } = require('electron');
const path=require('path'), fs=require('fs'), https=require('https'), http=require('http'), cp=require('child_process');
// 1.3.1: Gradle, Android SDK и эмулятор ломаются на путях с русскими буквами и пробелами (C:\Users\Иван Дубль\AppData\Roaming\ИванКод).
// Поэтому на Windows инструменты живут в папке только из латиницы: C:\ProgramData\IvanCode\tools (или C:\IvanCode\tools); старая папка переносится.
const asciiOk=s=>/^[A-Za-z0-9:\\\/._-]*$/.test(String(s));
function pickAsciiRoot(env=process.env,exists=fs.existsSync,mk=d=>fs.mkdirSync(d,{recursive:true})){ const sd=env.SystemDrive||'C:'; for(const b of [env.ProgramData,sd+'\\IvanCode'].filter(Boolean)){ const d=/IvanCode$/i.test(b)?b:path.win32.join(b,'IvanCode'); if(!asciiOk(d)) continue; try{ mk(d); const f=path.win32.join(d,'.w'); fs.writeFileSync(f,'1'); fs.unlinkSync(f); return d }catch{} } return null }
// запасной путь: короткое имя 8.3 (C:\Users\IVAN~1\…) — без кириллицы и пробелов, если оно включено на диске
function shortPath(p){ if(!W) return p; try{ const r=cp.spawnSync(process.env.ComSpec||'cmd.exe',['/d','/s','/c','"for %I in ("'+p+'") do @echo %~sI"'],{encoding:'utf8',windowsHide:true,timeout:8000,windowsVerbatimArguments:true}); const s=String(r.stdout||'').trim().split(/\r?\n/).pop(); return s&&asciiOk(s)?s:null }catch{ return null } }
let _troot=null;
function TROOT(){ if(_troot) return _troot; if(process.env.IVANCODE_TOOLS) return _troot=process.env.IVANCODE_TOOLS; if(!(app&&app.getPath)) return path.join(require('os').tmpdir(),'ivancode-tools');
 const old=path.join(app.getPath('userData'),'tools'); if(!W||asciiOk(old)) return _troot=old; const base=pickAsciiRoot(); if(!base){ try{ fs.mkdirSync(old,{recursive:true}) }catch{} return _troot=shortPath(old)||old } const nw=path.win32.join(base,'tools');
 try{ if(fs.existsSync(old)&&!fs.existsSync(nw)){ try{ fs.renameSync(old,nw) }catch{ fs.cpSync(old,nw,{recursive:true}); fs.rmSync(old,{recursive:true,force:true}) } } }catch(e){ console.warn('перенос инструментов:',e.message) } return _troot=nw }
const ASCIIBASE=()=>path.dirname(TROOT());
const W=process.platform==='win32';
const TOOLS={
 jdk:{name:'JDK 17 (Eclipse Temurin)',url:'https://api.adoptium.net/v3/binary/latest/17/ga/windows/x64/jdk/hotspot/normal/eclipse',dir:'jdk',bin:['bin'],env:{JAVA_HOME:''},check:'bin/java.exe'},
 android:{name:'Android SDK (cmdline-tools, platform-tools, build-tools 35, platform 35)',url:'https://dl.google.com/android/repository/commandlinetools-win-13114758_latest.zip',dir:'android-sdk',needs:['jdk'],bin:['platform-tools','cmdline-tools/latest/bin'],env:{ANDROID_HOME:'',ANDROID_SDK_ROOT:''},check:'platform-tools/adb.exe'},
 gradle:{name:'Gradle 8.10.2',url:'https://services.gradle.org/distributions/gradle-8.10.2-bin.zip',dir:'gradle',bin:['bin'],check:'bin/gradle.bat'},
 dotnet:{name:'.NET SDK 8',script:true,dir:'dotnet',bin:[''],env:{DOTNET_ROOT:''},check:'dotnet.exe'},
 node:{name:'Node.js 20 LTS',url:'https://nodejs.org/dist/v20.19.2/node-v20.19.2-win-x64.zip',dir:'node',bin:[''],check:'node.exe'},
 python:{name:'Python 3.13',url:'https://api.nuget.org/v3-flatcontainer/python/3.13.16/python.3.13.16.nupkg',dir:'python',sub:'tools',bin:['','Scripts'],check:'python.exe'},
 nsis:{name:'NSIS 3.10',url:'https://downloads.sourceforge.net/project/nsis/NSIS%203/3.10/nsis-3.10.zip',dir:'nsis',bin:[''],check:'makensis.exe'},
 git:{name:'Git (MinGit 2.47)',url:'https://github.com/git-for-windows/git/releases/download/v2.47.0.windows.1/MinGit-2.47.0-64-bit.zip',dir:'git',flat:true,bin:['cmd'],check:'cmd/git.exe'}};
const tdir=id=>path.join(TROOT(),TOOLS[id].dir);
// ---- 1.2: поиск инструментов где угодно (своя папка, PATH из реестра, py -3, стандартные папки, Visual Studio, Android Studio…) ----
const TF=require('./toolfind');
function regPath(){ if(!W) return []; const out=[]; for(const k of ['HKCU\\Environment','HKLM\\SYSTEM\\CurrentControlSet\\Control\\Session Manager\\Environment']){ try{ const r=cp.spawnSync('reg',['query',k,'/v','Path'],{encoding:'utf8',windowsHide:true,timeout:8000}); out.push(...TF.parseRegPath(r.stdout,process.env)) }catch{} } return out }
// PATH, изменённый установщиками после запуска студии (или в другом сеансе), подхватываем без перезапуска
function refreshPath(){ if(!W) return; const pk=Object.keys(process.env).find(k=>k.toUpperCase()==='PATH')||'Path'; process.env[pk]=TF.mergePath(process.env[pk],regPath(),true);
 for(const v of ['JAVA_HOME','ANDROID_HOME','ANDROID_SDK_ROOT','GRADLE_HOME']) if(!process.env[v]){ try{ const r=cp.spawnSync('reg',['query','HKCU\\Environment','/v',v],{encoding:'utf8',windowsHide:true,timeout:5000}); const m=String(r.stdout||'').match(/REG_(?:EXPAND_)?SZ\s+(.*)/); if(m) process.env[v]=TF.expand(m[1].trim(),process.env) }catch{} } }
// gradle/sdkmanager — java-программы: проверяем их с проверенной JDK 17+, а не со старой JAVA_HOME (иначе «Gradle старый», хотя виновата Java)
function runEnv(id){ if(id==='jdk') return undefined; const jh=process.env.JAVA_HOME; if(jh&&(javaMajor(jh)||0)>=17) return undefined; const j=goodJdk(); if(!j) return undefined; const env={...process.env,JAVA_HOME:j.home}; const pk=Object.keys(env).find(k=>k.toUpperCase()==='PATH')||'PATH'; env[pk]=path.join(j.home,'bin')+path.delimiter+(env[pk]||''); return env }
function realDeps(id){ const env=runEnv(id); return {W,env:process.env,exists:p=>{ try{ return fs.existsSync(p) }catch{ return false } },readdir:d=>fs.readdirSync(d),own:rel=>path.join(TROOT(),...rel.split('\\')),
 run:(exe,args)=>{ try{ const bat=/\.(bat|cmd)$/i.test(exe); const r=bat?cp.spawnSync('"'+exe+'" '+args.join(' '),{shell:true,encoding:'utf8',timeout:20000,windowsHide:true,env}):cp.spawnSync(exe,args,{encoding:'utf8',timeout:20000,windowsHide:true,env}); return {code:r.status==null?-1:r.status,out:(r.stdout||'')+(r.stderr||'')+(r.error?String(r.error.message):'')} }catch(e){ return {code:-1,out:String(e.message)} } },
 where:n=>{ try{ const r=W?cp.spawnSync('where',[n],{encoding:'utf8',windowsHide:true,timeout:8000}):cp.spawnSync('which',['-a',n],{encoding:'utf8',timeout:8000}); return r.status===0?String(r.stdout).split(/\r?\n/).map(x=>x.trim()).filter(Boolean):[] }catch{ return [] } }} }
let _found={}; function found(id){ if(!_found[id]) _found[id]=TF.find(id,realDeps(id)); return _found[id] }
function rescan(){ _found={}; _py=null; for(const k in _jm) delete _jm[k]; refreshPath() }
const installed=id=>found(id).found;
function report(){ rescan(); const L=[webview2()]; for(const id in TOOLS){ const f=found(id); L.push({id,name:TOOLS[id].name,found:f.found,path:f.path||'',version:f.version||'',source:f.source||'',tried:f.tried||[],lastError:lastErr[id]||''}) }
 if(W){ try{ const vw=path.join(process.env['ProgramFiles(x86)']||'C:\\Program Files (x86)','Microsoft Visual Studio','Installer','vswhere.exe'); if(fs.existsSync(vw)){ const r=cp.spawnSync(vw,['-latest','-property','installationPath'],{encoding:'utf8',windowsHide:true,timeout:10000}); L.push({id:'vs',name:'Visual Studio',found:!!String(r.stdout).trim(),path:String(r.stdout).trim(),version:'',source:'vswhere',tried:[]}) } else L.push({id:'vs',name:'Visual Studio',found:false,tried:[{path:vw,why:'vswhere не найден'}]}) }catch{} }
 return L }
const lastErr={};
// WebView2 / Edge — нужен на ПК, где запускается готовая программа быстрого пути (окно приложения)
function webview2(){ if(!W) return {id:'webview2',name:'Microsoft Edge WebView2 / Edge',found:true,path:'(не Windows — не требуется)',version:'',source:'',tried:[]};
 const keys=['HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\EdgeUpdate\\Clients\\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}','HKLM\\SOFTWARE\\Microsoft\\EdgeUpdate\\Clients\\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}','HKCU\\SOFTWARE\\Microsoft\\EdgeUpdate\\Clients\\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}']; const tried=[];
 for(const k of keys){ try{ const r=cp.spawnSync('reg',['query',k,'/v','pv'],{encoding:'utf8',windowsHide:true,timeout:5000}); const m=String(r.stdout||'').match(/pv\s+REG_SZ\s+([\d.]+)/); if(m&&m[1]!=='0.0.0.0') return {id:'webview2',name:'Microsoft Edge WebView2',found:true,path:k,version:m[1],source:'реестр',tried}; tried.push({path:k,why:'нет записи'}) }catch(e){ tried.push({path:k,why:e.message}) } }
 for(const d of [process.env['ProgramFiles(x86)'],process.env.ProgramFiles,process.env.LOCALAPPDATA].filter(Boolean)){ const p=path.join(d,'Microsoft','Edge','Application','msedge.exe'); if(fs.existsSync(p)) return {id:'webview2',name:'Microsoft Edge',found:true,path:p,version:'',source:'папка Edge',tried}; tried.push({path:p,why:'файла нет'}) }
 return {id:'webview2',name:'Microsoft Edge WebView2',found:false,tried} }
async function installWebview2(log){ const f=path.join(require('os').tmpdir(),'MicrosoftEdgeWebview2Setup.exe'); log('Скачиваю установщик WebView2 от Microsoft…\n'); await download('https://go.microsoft.com/fwlink/p/?LinkId=2124703',f);
 const r=await run(f,['/silent','/install'],{},log); log('Установщик завершился с кодом '+r.code+'\n'); const w=webview2(); if(!w.found) throw new Error('установщик WebView2 отработал (код '+r.code+'), но WebView2 так и не появился — возможно, нужны права администратора или нет интернета'); log('✔ WebView2 установлен и найден: '+w.version+'\n'); return true }
// что нужно ДО начала работы для выбранного способа
function ponDep(){ const NB=require('./nativebuild.js'); const b=NB.ponBin(); let v=''; if(b&&!(/\.exe$/i.test(b)&&!W)){ try{ const r=cp.spawnSync(b,['версия'],{encoding:'utf8',timeout:15000,windowsHide:true}); v=String((r.stdout||'')+(r.stderr||'')).trim().split('\n')[0] }catch{} } else if(b) v='встроен'; return {id:'ponyatny',name:'Компилятор «Понятный»',found:!!(b&&v),path:b||'',version:v,why:'встроен в студию; если его нет — переустановите ИванКод',builtIn:true} }
const WHY_KT={jdk:'Java 17 — на ней работает сборщик Android (подойдёт и встроенная в Android Studio)',android:'Android SDK — части Android для сборки APK (подойдёт SDK из Android Studio)',gradle:'Gradle 8.9+ — собирает APK (подойдёт Gradle, скачанный Android Studio)'};
function deps(way,kind){ rescan(); if(way==='pon') return [ponDep()]; if(way==='cs') return [{...found('dotnet'),id:'dotnet',name:'.NET SDK 8',why:'собирает настоящую программу Windows (подойдёт .NET из Visual Studio); ставится в папку студии, без прав администратора',lastError:lastErr.dotnet||''}]; if(way==='kotlin') return ['jdk','android','gradle'].map(id=>({...found(id),id,name:TOOLS[id].name,why:WHY_KT[id],lastError:lastErr[id]||''})); const need=way==='fast'?(kind==='phone'?[]:['webview2']):(kind==='phone'?['jdk','android','gradle']:['python','nsis']);
 return need.map(id=>id==='webview2'?{...webview2(),why:'чтобы готовая программа открывалась в своём окне (без него — откроется в браузере)',optional:true}:{...found(id),id,name:TOOLS[id].name,why:'нужен для сборки способом «для опытных»',lastError:lastErr[id]||''}) }
// 1.3.1: какая Java лежит в папке (JAVA_HOME). null — нет java или не запускается
const _jm={}; function javaMajor(home){ if(!home) return null; if(home in _jm) return _jm[home]; let v=null; try{ const j=path.join(home,'bin',W?'java.exe':'java'); if(fs.existsSync(j)){ const r=cp.spawnSync(j,['-version'],{encoding:'utf8',timeout:15000,windowsHide:true}); const m=String((r.stderr||'')+(r.stdout||'')).match(/version "?(\d+)(?:\.(\d+))?/); if(m) v=+m[1]===1?+(m[2]||0):+m[1] } }catch{} return _jm[home]=v }
// JDK 17+, проверенная запуском java -version: сначала своя/найденная студией, иначе null
function goodJdk(){ const f=found('jdk'); if(f.found&&f.home&&(javaMajor(f.home)||0)>=17) return {home:f.home,version:f.version,source:f.source}; return null }
// окружение для sdkmanager/gradle: JAVA_HOME всегда указывает на проверенную JDK 17+ (старая/битая системная JAVA_HOME ломает sdkmanager)
function javaEnv(){ const env=buildEnv(); const j=goodJdk(); if(!j) throw new Error('нужна Java 17 или новее, а подходящей не нашлось — сначала установите JDK 17 (кнопка «Установить» рядом с Java)'); env.JAVA_HOME=j.home; const pk=Object.keys(env).find(k=>k.toUpperCase()==='PATH')||'PATH'; env[pk]=path.join(j.home,'bin')+path.delimiter+(env[pk]||''); return env }
function buildEnv(base=process.env){ const env={...base}; const add=[];
 for(const id in TOOLS){ const f=found(id); if(!f.found) continue; const t=TOOLS[id];
  if(f.path.startsWith(TROOT())){ for(const b of t.bin) add.push(path.join(tdir(id),b)); for(const k in (t.env||{})) env[k]=tdir(id) }
  else { add.push(f.dir); if(id==='python') add.push(path.join(f.dir,'Scripts')); if(id==='jdk'&&f.home&&!((javaMajor(env.JAVA_HOME)||0)>=17)) env.JAVA_HOME=f.home; if(id==='android'&&f.home&&!env.ANDROID_HOME) env.ANDROID_HOME=f.home } }
 { const ok=d=>d&&fs.existsSync(d); if(!ok(env.ANDROID_HOME)&&ok(env.ANDROID_SDK_ROOT)) env.ANDROID_HOME=env.ANDROID_SDK_ROOT; if(env.ANDROID_HOME) env.ANDROID_SDK_ROOT=env.ANDROID_HOME; else if(env.ANDROID_SDK_ROOT&&!ok(env.ANDROID_SDK_ROOT)) delete env.ANDROID_SDK_ROOT } // разные пути к SDK ломают gradle
 if(env.ANDROID_HOME) add.push(path.join(env.ANDROID_HOME,'build-tools','35.0.0'));
 const pk=Object.keys(env).find(k=>k.toUpperCase()==='PATH')||'PATH'; env[pk]=add.concat([env[pk]||'']).join(path.delimiter);
 { const j=goodJdk(); if(j){ env.JAVA_HOME=j.home; add.unshift(path.join(j.home,'bin')) } }
 if(W){ const home=env.USERPROFILE||require('os').homedir(); if(!asciiOk(home)){ const b=ASCIIBASE(); if(asciiOk(b)){ if(!env.GRADLE_USER_HOME||!asciiOk(env.GRADLE_USER_HOME)) env.GRADLE_USER_HOME=path.win32.join(b,'gradle-home'); if(!env.ANDROID_USER_HOME||!asciiOk(env.ANDROID_USER_HOME)) env.ANDROID_USER_HOME=path.win32.join(b,'android-home'); env.ANDROID_AVD_HOME=path.win32.join(env.ANDROID_USER_HOME,'avd') } } }
 env.PYTHONIOENCODING='utf-8'; env.PYTHONUNBUFFERED='1'; env.DOTNET_CLI_TELEMETRY_OPTOUT='1'; return env }
// интерпретатор Python: на Linux часто есть только python3, на Windows — встроенный (IvanTools), python или py -3
// настоящий Python (не заглушка Store): полный путь в кавычках; нет Python — 'python' (студия сообщит пользователю, а не ИИ)
let _py=null; function pyCmd(){ if(_py) return _py; const f=found('python'); if(f.found) return _py=(/\s/.test(f.path)?'"'+f.path+'"':f.path); return W?'python':'python3' }
function fixPy(cmd){ const py=pyCmd(); if(!cmd) return cmd; return String(cmd).replace(/(^|[;&|(]\s*|&&\s*)(?:python3?|py -3)(?=\s|$)/g,(m,a)=>a+py).replace(/(^|[;&|(]\s*|&&\s*)pip3?(?=\s)/g,(m,a)=>a+py+' -m pip') }
function download(url,file,onp,redirects=0){ return new Promise((res,rej)=>{ const mod=url.startsWith('https')?https:http;
 const rq=mod.get(url,{headers:{'User-Agent':'IvanCode/1.0'}},r=>{ if(r.statusCode>=300&&r.statusCode<400&&r.headers.location){ r.resume(); if(redirects>10) return rej(new Error('много редиректов')); return res(download(new URL(r.headers.location,url).href,file,onp,redirects+1)) }
  if(r.statusCode!==200){ r.resume(); return rej(new Error('HTTP '+r.statusCode+' '+url)) } const tot=+r.headers['content-length']||0; let got=0; const ws=fs.createWriteStream(file);
  r.on('data',c=>{ got+=c.length; onp&&onp(got,tot) }); r.pipe(ws); ws.on('finish',()=>{ if(tot&&got!==tot){ try{ fs.unlinkSync(file) }catch{} return rej(new Error('загрузка оборвалась: получено '+(got/1048576).toFixed(1)+' из '+(tot/1048576).toFixed(1)+' МБ (связь прервалась, прокси или антивирус). Нажмите «Установить» ещё раз')) } res(file) }); r.on('aborted',()=>rej(new Error('загрузка оборвалась (связь прервалась)'))); ws.on('error',rej); r.on('error',rej) }); rq.on('error',rej) }) }
// вывод cmd.exe/.bat на русской Windows — в OEM-кодировке cp866; без перекодировки в журнале «�»
// поток: UTF-8 с учётом разрезанных на куски букв; встретились байты не UTF-8 — дальше читаем этот поток как cp866
function mkDec(){ let u=new TextDecoder('utf-8',{fatal:true}), oem=null; return b=>{ if(!oem){ try{ return u.decode(b,{stream:true}) }catch{ try{ oem=new TextDecoder('ibm866') }catch{ oem={decode:x=>Buffer.from(x).toString('latin1')} } } } return oem.decode(b,{stream:true}) } }
function dec(b){ return mkDec()(b) }
// .bat через cmd /d /s /c "…" с кавычками вокруг каждого пути (пробелы, кириллица); без windowsVerbatimArguments Node ломает кавычки
const qa=a=>/[\s&()^|<>"]/.test(a)?'"'+String(a).replace(/"/g,'""')+'"':String(a);
function batCmd(bat,args){ return ['/d','/s','/c','"'+[qa(bat),...args.map(qa)].join(' ')+'"'] }
function runBat(bat,args,opt,onl){ if(!W) return run(bat,args,opt,onl); return run(process.env.ComSpec||'cmd.exe',batCmd(bat,args),{...opt,windowsVerbatimArguments:true},onl) }
function run(cmd,args,opt,onl){ return new Promise(res=>{ const p=cp.spawn(cmd,args,{...opt,windowsHide:true}); let o=''; const dd=mkDec();
 const h=d=>{ const s=dd(d); o+=s; onl&&onl(s) }; p.stdout&&p.stdout.on('data',h); p.stderr&&p.stderr.on('data',h);
 if(opt.input!=null){ p.stdin.write(opt.input); p.stdin.end() } p.on('exit',c=>res({code:c,out:o})); p.on('error',e=>res({code:-1,out:o+String(e)})) }) }
async function extract(zip,dest){ fs.mkdirSync(dest,{recursive:true}); // tar.exe (bsdtar) есть в Windows 10 1803+
 let r=await run(W?'tar.exe':'unzip',W?['-xf',zip,'-C',dest]:['-q','-o',zip,'-d',dest],{});
 if(r.code!==0&&W) r=await run('powershell.exe',['-NoProfile','-Command',`Expand-Archive -LiteralPath '${zip}' -DestinationPath '${dest}' -Force`],{}); if(r.code!==0) throw new Error('распаковка: '+r.out.slice(-400)) }
function hoist(dest,sub){ // если в архиве одна папка верхнего уровня — поднимаем содержимое
 const src=sub?path.join(dest,sub):(()=>{ const e=fs.readdirSync(dest); return e.length===1&&fs.statSync(path.join(dest,e[0])).isDirectory()?path.join(dest,e[0]):null })();
 if(!src) return; for(const n of fs.readdirSync(src)) renameRetry(path.join(src,n),path.join(dest,n+(fs.existsSync(path.join(dest,n))?'_':''))); fs.rmSync(src,{recursive:true,force:true,maxRetries:10,retryDelay:300}) }
// Защитник Windows проверяет свежераспакованные файлы и держит их — rename падает с EPERM/EBUSY; ждём и повторяем
function renameRetry(a,b){ for(let i=0;;i++){ try{ return fs.renameSync(a,b) }catch(e){ if(i>=20||!/EPERM|EBUSY|EACCES/.test(e.code)) throw e; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,250) } } }
function ruErr(e){ const m=String(e&&e.message||e); if(/ENOTFOUND|EAI_AGAIN|ECONNREFUSED|ECONNRESET|ETIMEDOUT|socket hang up/i.test(m)) return 'нет связи с сайтом загрузки (проверьте интернет, прокси или антивирус): '+m; if(/EACCES|EPERM|EBUSY/i.test(m)) return 'нет доступа к папке (её держит антивирус или другая программа, либо нет прав): '+m; if(/ENOSPC/i.test(m)) return 'на диске не хватает места'; if(/HTTP 4\d\d/.test(m)) return 'файл для загрузки недоступен ('+m+')'; if(/HTTP 5\d\d/.test(m)) return 'сайт загрузки временно не работает ('+m+')'; return m }
function tail(s,n=6){ return String(s||'').replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(x=>x&&!/^\[=*\s*\]|^\d+%/.test(x)).slice(-n).join(' | ').slice(-700)||'(sdkmanager ничего не написал)' }
async function install(id,log){ try{ return await install0(id,log) }catch(e){ const m=ruErr(e); lastErr[id]=m; throw new Error(m) } }
async function install0(id,log){ const t=TOOLS[id]; for(const n of t.needs||[]) if(!installed(n)){ log(`Сначала ставлю зависимость: ${TOOLS[n].name}\n`); await install0(n,log) }
 const dest=tdir(id); fs.mkdirSync(TROOT(),{recursive:true}); const tmp=path.join(TROOT(),'_dl'); fs.mkdirSync(tmp,{recursive:true}); log(`== ${t.name} → ${dest}\n`);
 if(t.script){ const ps=path.join(tmp,'dotnet-install.ps1'); await download('https://dot.net/v1/dotnet-install.ps1',ps); { const b=fs.readFileSync(ps); if(!(b[0]===0xEF&&b[1]===0xBB&&b[2]===0xBF)) fs.writeFileSync(ps,Buffer.concat([Buffer.from([0xEF,0xBB,0xBF]),b])) }
  const r=await run('powershell.exe',['-NoProfile','-ExecutionPolicy','Bypass','-File',ps,'-Channel','8.0','-InstallDir',dest],{},log); if(r.code) throw new Error('dotnet-install код '+r.code) }
 else { const zip=path.join(tmp,id+'.zip'); let last=0; await download(t.url,zip,(g,tot)=>{ const p=tot?Math.floor(g*100/tot):Math.floor(g/1048576); if(p!==last){ last=p; log(`\r${tot?p+'%':p+' МБ'} (${(g/1048576).toFixed(1)} МБ)`,true) } }); log('\nРаспаковка…\n');
  if(id==='android'){ const cl=path.join(dest,'cmdline-tools'); fs.rmSync(cl,{recursive:true,force:true}); await extract(zip,cl); renameRetry(path.join(cl,'cmdline-tools'),path.join(cl,'latest'));
   const sdkm=path.join(cl,'latest','bin','sdkmanager.bat'); rescan(); const env=javaEnv(); log('Java для sdkmanager: '+env.JAVA_HOME+'\n'); const yes='y\n'.repeat(60);
   log('Принимаю лицензии Android SDK…\n'); await runBat(sdkm,['--sdk_root='+dest,'--licenses'],{env,input:yes},log);
   log('Скачиваю platform-tools, build-tools;35.0.0, platforms;android-35…\n'); const r=await runBat(sdkm,['--sdk_root='+dest,'platform-tools','build-tools;35.0.0','platforms;android-35'],{env,input:yes},log); if(r.code) throw new Error('sdkmanager код '+r.code+': '+tail(r.out)) }
  else { fs.rmSync(dest,{recursive:true,force:true}); await extract(zip,dest); if(!t.flat) hoist(dest,t.sub) }
  try{ fs.unlinkSync(zip) }catch{} }
 rescan(); if(!fs.existsSync(path.join(tdir(id),t.check))) throw new Error('файлы скачаны, но '+t.check+' не появился в '+dest+' — установка не удалась');
 const v=TF.find(id,{...realDeps(id),where:()=>[],env:{}}); if(!v.found) throw new Error('установлен, но не запускается: '+((v.tried.find(x=>x.path.startsWith(TROOT()))||{}).why||'нет ответа на проверку версии'));
 delete lastErr[id]; log(`✔ ${t.name} установлен и проверен: ${v.version}\n`); return true }
// ---- типы проектов и сборка ----
function detect(root){ const has=f=>fs.existsSync(path.join(root,f)); const ls=fs.readdirSync(root);
 try{ if(has('index.html')&&/content="ivancode-web/.test(fs.readFileSync(path.join(root,'index.html'),'utf8').slice(0,600))) return 'web' }catch{}
 if(has('settings.gradle')||has('settings.gradle.kts')||has('build.gradle')||has('build.gradle.kts')) return 'android';
 if(ls.some(f=>/\.(csproj|sln)$/i.test(f))) return 'dotnet';
 if(has('package.json')){ try{ const p=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')); if((p.devDependencies||{}).electron||(p.dependencies||{}).electron) return 'electron' }catch{} return 'node' }
 if(ls.some(f=>/\.pon$/i.test(f))) return 'ponyatny'; if(ls.some(f=>/\.py$/i.test(f))) return 'python'; if(ls.some(f=>/\.nsi$/i.test(f))) return 'nsis'; return 'unknown' }
function targets(kind){ return ({
 android:[['debug','APK debug'],['release','APK release (подписанный)'],['bundle','AAB release (Google Play)']],
 dotnet:[['build','Сборка (проверка)'],['exe','EXE (один файл, win-x64)'],['portable','Портативный ZIP'],['installer','Установщик NSIS']],
 electron:[['build','Проверка (npm install)'],['installer','Установщик + портативный (electron-builder)']],
 node:[['build','npm run build']],
 python:[['check','Проверка синтаксиса'],['exe','EXE (PyInstaller)'],['portable','Портативный ZIP'],['installer','Установщик NSIS']],
 web:[['exe','Программа для ПК (EXE, за секунды)'],['installer','Установщик для ПК'],['apk','APK для телефона (за секунды)']],
 ponyatny:[['check','Проверка (ponyatny проверить)'],['exe','EXE настоящим компилятором (ponyatny собрать)'],['run','Запуск']],
 nsis:[['installer','makensis']],unknown:[]})[kind]||[] }
function gradleCmd(root){ if(fs.existsSync(path.join(root,W?'gradlew.bat':'gradlew'))) return W?'gradlew.bat':'./gradlew'; return 'gradle' }
function pyEntry(root,o){ if(o.main&&/\.py$/i.test(o.main)) return path.relative(root,path.resolve(root,o.main)); for(const f of ['main.py','run.py','app.py','__main__.py','manage.py']) if(fs.existsSync(path.join(root,f))) return f; const py=fs.readdirSync(root).filter(f=>/\.py$/i.test(f)&&!/^test/i.test(f)); return py[0]||'main.py' }
function pyData(root,W){ const out=[]; const walk=(d,depth)=>{ if(depth>3) return; for(const e of fs.readdirSync(d,{withFileTypes:true})){ if(!e.isDirectory()||/^(\.|__pycache__|build|dist|ivancode-out|venv|\.venv|tests?|node_modules)$/i.test(e.name)) continue; const full=path.join(d,e.name); if(/^(templates|static|assets|data|res|resources|images|img|fonts|locale|i18n)$/i.test(e.name)){ const rel=path.relative(root,full); out.push(`--add-data "${W?rel.replace(/\//g,'\\'):rel}${W?';':':'}${W?rel.replace(/\//g,'\\'):rel}"`) } else walk(full,depth+1) } }; walk(root,0); return out.join(' ') }
function zipDir(src,out){ const zlib=require('zlib'); const files=[]; const walk=d=>{ for(const e of fs.readdirSync(d,{withFileTypes:true})){ const f=path.join(d,e.name); if(e.isDirectory()) walk(f); else files.push(f) } }; walk(src);
 const T=new Uint32Array(256).map((_,n)=>{ let c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; return c>>>0 }); const crc=b=>{ let c=0xFFFFFFFF; for(let i=0;i<b.length;i++) c=T[(c^b[i])&255]^(c>>>8); return (c^0xFFFFFFFF)>>>0 };
 fs.mkdirSync(path.dirname(out),{recursive:true}); const fd=fs.openSync(out,'w'); let off=0; const cd=[]; const wr=b=>{ fs.writeSync(fd,b); off+=b.length };
 for(const f of files){ const data=fs.readFileSync(f); const name=Buffer.from(path.relative(src,f).split(path.sep).join('/'),'utf8'); const comp=zlib.deflateRawSync(data); const c=crc(data); const st=fs.statSync(f).mtime;
  const dt=((st.getHours()<<11)|(st.getMinutes()<<5)|(st.getSeconds()>>1))&0xFFFF, dd=(((st.getFullYear()-1980)<<9)|((st.getMonth()+1)<<5)|st.getDate())&0xFFFF;
  if(comp.length>0xFFFFFFF0||data.length>0xFFFFFFF0) throw new Error('файл больше 4 ГБ: '+f);
  const h=Buffer.alloc(30); h.writeUInt32LE(0x04034b50,0); h.writeUInt16LE(20,4); h.writeUInt16LE(0x0800,6); h.writeUInt16LE(8,8); h.writeUInt16LE(dt,10); h.writeUInt16LE(dd,12); h.writeUInt32LE(c,14); h.writeUInt32LE(comp.length,18); h.writeUInt32LE(data.length,22); h.writeUInt16LE(name.length,26); h.writeUInt16LE(0,28);
  const lo=off; wr(h); wr(name); wr(comp);
  const e=Buffer.alloc(46); e.writeUInt32LE(0x02014b50,0); e.writeUInt16LE(20,4); e.writeUInt16LE(20,6); e.writeUInt16LE(0x0800,8); e.writeUInt16LE(8,10); e.writeUInt16LE(dt,12); e.writeUInt16LE(dd,14); e.writeUInt32LE(c,16); e.writeUInt32LE(comp.length,20); e.writeUInt32LE(data.length,24); e.writeUInt16LE(name.length,28); e.writeUInt32LE(lo,42); cd.push(Buffer.concat([e,name])) }
 if(files.length>65535) throw new Error('слишком много файлов для ZIP');
 const cdo=off; for(const b of cd) wr(b); const end=Buffer.alloc(22); end.writeUInt32LE(0x06054b50,0); end.writeUInt16LE(cd.length,8); end.writeUInt16LE(cd.length,10); end.writeUInt32LE(off-cdo,12); end.writeUInt32LE(cdo,16); wr(end); fs.closeSync(fd); return {files:files.length,size:off} }
function binName(root){ const b=path.basename(root); return (/^[\w.-]+$/.test(b)?b:module.exports.translit(b).replace(/[^\w.-]/g,'_'))||'app' }
function postFor(root,kind,target,o={}){ const name=binName(root); if(target!=='portable') return null; const pub=path.join(root,'ivancode-out','publish'); return {zip:{src:kind==='python'?path.join(pub,name):pub,out:path.join(root,'ivancode-out',name+'-portable.zip')}} }
function cmdFor(root,kind,target,o={}){ const W=o.win!=null?o.win:process.platform==='win32'; const P=W?path.win32:path; const name=binName(root); const outd='ivancode-out';
 const mk=`${W?'if not exist '+outd+' mkdir '+outd:'mkdir -p '+outd}`;
 const nsi=(src)=>{ fs.mkdirSync(path.join(root,outd),{recursive:true}); const f=path.join(root,outd,'setup.nsi'); const exe=o.exe||name+'.exe';
  fs.writeFileSync(f,'\uFEFF'+`Unicode true\nName "${name}"\n${iconIco(root)?`Icon "${iconIco(root)}"\nUninstallIcon "${iconIco(root)}"\n!define MUI_ICON "${iconIco(root)}"\n!define MUI_UNICON "${iconIco(root)}"\n`:''}OutFile "${name}-Setup.exe"\nInstallDir "$LOCALAPPDATA\\Programs\\${name}"\nRequestExecutionLevel user\n!include MUI2.nsh\n!insertmacro MUI_PAGE_DIRECTORY\n!insertmacro MUI_PAGE_INSTFILES\n!insertmacro MUI_LANGUAGE "Russian"\nSection\n SetOutPath "$INSTDIR"\n File /r "${src}${W?'\\':'/'}*.*"\n CreateShortcut "$DESKTOP\\${name}.lnk" "$INSTDIR\\${exe}"\n CreateShortcut "$SMPROGRAMS\\${name}.lnk" "$INSTDIR\\${exe}"\n WriteUninstaller "$INSTDIR\\uninstall.exe"\nSectionEnd\nSection "Uninstall"\n RMDir /r "$INSTDIR"\n Delete "$DESKTOP\\${name}.lnk"\n Delete "$SMPROGRAMS\\${name}.lnk"\nSectionEnd\n`,'utf8'); return `makensis "${W?P.join(outd,'setup.nsi'):f}"` };
 const g=gradleCmd(root); const sign=o.keystore?` -Pandroid.injected.signing.store.file="${o.keystore}" -Pandroid.injected.signing.store.password="${o.storePass}" -Pandroid.injected.signing.key.alias="${o.alias}" -Pandroid.injected.signing.key.password="${o.keyPass||o.storePass}"`:'';
 const ico=iconIco(root), icoP=ico?(W?path.relative(root,ico).replace(/\//g,'\\'):path.relative(root,ico)):''; const pub=W?P.join(outd,'publish'):path.join(root,outd,'publish'); const pubAbs=W&&o.winRoot?P.join(o.winRoot,outd,'publish'):path.join(root,outd,'publish'); const ent=pyEntry(root,o); const pyi=`python -m pip install -q pyinstaller${fs.existsSync(path.join(root,'requirements.txt'))?' -r requirements.txt':''} && python -m PyInstaller --noconfirm --clean --name "${name}" ${pyData(root,W)} --workpath "${P.join(outd,'pybuild')}"${ico?` --icon "${icoP}"`:''}`;
 switch(kind+':'+target){
  case 'android:debug': return `${g} assembleDebug --console=plain`;
  case 'android:release': return `${g} assembleRelease --console=plain${sign}`;
  case 'android:bundle': return `${g} bundleRelease --console=plain${sign}`;
  case 'dotnet:build': return 'dotnet build -nologo';
  case 'dotnet:exe': return `dotnet publish -nologo -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true${ico?' -p:ApplicationIcon=app.ico':''} -o "${pub}"`;
  case 'dotnet:portable': return `dotnet publish -nologo -c Release -r win-x64 --self-contained true -o "${pub}"`;
  case 'dotnet:installer': return `dotnet publish -nologo -c Release -r win-x64 --self-contained true -o "${pub}" && ${nsi(pubAbs)}`;
  case 'electron:build': return 'npm install';
  case 'electron:installer': return 'npm install && npx --yes electron-builder --win nsis zip';
  case 'node:build': return 'npm install && npm run build';
  case 'python:check': return 'python -m py_compile '+fs.readdirSync(root).filter(f=>f.endsWith('.py')).map(f=>`"${f}"`).join(' ');
  case 'python:exe': return `${pyi} --onefile --distpath "${pub}" "${ent}"`;
  case 'python:portable': return `${pyi} --onedir --distpath "${pub}" "${ent}" && ${mk}`;
  case 'python:installer': return `${pyi} --onedir --distpath "${pub}" "${ent}" && ${nsi(P.join(pubAbs,name))}`;
  case 'ponyatny:check': case 'ponyatny:exe': case 'ponyatny:run': { const NB=require('./nativebuild.js'); const b=NB.ponBin(); const pon=fs.readdirSync(root).filter(f=>/\.pon$/i.test(f)); const main=pon.find(f=>/^(главная|main|программа)\.pon$/i.test(f))||pon[0]; const q=s=>'"'+s+'"'; if(!b) return null; return target==='check'?pon.map(f=>q(b)+' проверить '+q(f)).join(' && '):target==='run'?q(b)+' запустить '+q(main):(W?'':'mkdir -p ivancode-out && ')+q(b)+' собрать '+q(main)+' -o '+q((W?'ivancode-out\\':'ivancode-out/')+main.replace(/\.pon$/i,'')+(W?'.exe':'')) }
 case 'nsis:installer': return 'makensis '+fs.readdirSync(root).filter(f=>/\.nsi$/i.test(f)).map(f=>`"${f}"`).join(' ') }
 return null }
// ---- значок проекта (.ivancode/icon, файлы готовит окно студии через canvas) ----
function iconDir(root){ return path.join(root,'.ivancode','icon') }
function iconIco(root){ const f=path.join(iconDir(root),'app.ico'); return fs.existsSync(f)?f:null }
function iconSave(root,files,cfg){ const d=iconDir(root); fs.mkdirSync(d,{recursive:true});
 for(const [rel,b64] of Object.entries(files||{})){ if(rel.includes('..')) continue; const p=path.join(d,rel); fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p,Buffer.from(b64,'base64')) }
 fs.writeFileSync(path.join(d,'icon.json'),JSON.stringify(cfg||{},null,1)); return applyIcon(root) }
function applyIcon(root,kind){ const d=iconDir(root); if(!fs.existsSync(path.join(d,'icon.json'))) return []; kind=kind||detect(root); const done=[]; let cfg={}; try{ cfg=JSON.parse(fs.readFileSync(path.join(d,'icon.json'),'utf8')) }catch{}
 const cp=(a,b)=>{ const s=path.join(d,a); if(!fs.existsSync(s)) return; fs.mkdirSync(path.dirname(b),{recursive:true}); fs.copyFileSync(s,b); done.push(path.relative(root,b)) };
 if(kind==='android'){ const res=path.join(root,'app','src','main','res'); if(fs.existsSync(path.join(root,'app','src','main'))){
  const ad=path.join(d,'android'); const walk=r=>{ for(const e of fs.readdirSync(path.join(ad,r),{withFileTypes:true})){ const rr=path.join(r,e.name); if(e.isDirectory()) walk(rr); else cp(path.join('android',rr),path.join(res,rr)) } }; if(fs.existsSync(ad)) walk('');
  // старая векторная иконка шаблона мешала бы (дубликат ресурса)
  for(const f of ['drawable/ic_launcher_foreground.xml','drawable/ic_launcher_background.xml']){ const p=path.join(res,f); if(fs.existsSync(p)){ fs.unlinkSync(p) } }
  const bgf=path.join(res,'values','ic_launcher_colors.xml'); const col=/^#[0-9a-fA-F]{6}$/.test(cfg.bg||'')?cfg.bg:'#3F6FB5';
  for(const f of fs.existsSync(path.join(res,'values'))?fs.readdirSync(path.join(res,'values')):[]){ if(f==='ic_launcher_colors.xml') continue; const p=path.join(res,'values',f); let t=fs.readFileSync(p,'utf8'); if(/name="ic_launcher_background"/.test(t)){ t=t.replace(/\s*<color name="ic_launcher_background">[^<]*<\/color>/,''); fs.writeFileSync(p,t) } }
  fs.mkdirSync(path.dirname(bgf),{recursive:true}); fs.writeFileSync(bgf,`<?xml version="1.0" encoding="utf-8"?>\n<resources>\n  <color name="ic_launcher_background">${col}</color>\n</resources>\n`); done.push(path.relative(root,bgf));
  const mf=path.join(root,'app','src','main','AndroidManifest.xml'); if(fs.existsSync(mf)){ let t=fs.readFileSync(mf,'utf8'); const o=t;
   t=t.replace(/(<application\b[^>]*?)\s+android:icon="[^"]*"/,'$1').replace(/(<application\b[^>]*?)\s+android:roundIcon="[^"]*"/,'$1').replace(/<application\b/,'<application android:icon="@mipmap/ic_launcher" android:roundIcon="@mipmap/ic_launcher_round"'); if(t!==o){ fs.writeFileSync(mf,t); done.push('AndroidManifest.xml') } } } }
 if(kind==='python'||kind==='dotnet'||kind==='nsis'||kind==='electron'){ /* .ico подставляется в команду сборки (cmdFor) */ if(kind==='electron') cp('app.ico',path.join(root,'build','icon.ico')); if(kind==='dotnet') cp('app.ico',path.join(root,'app.ico')) }
 if(fs.existsSync(path.join(root,'index.html'))||fs.existsSync(path.join(root,'static'))||fs.existsSync(path.join(root,'public'))||fs.existsSync(path.join(root,'app','static'))){ const dst=fs.existsSync(path.join(root,'app','static'))?path.join(root,'app','static'):fs.existsSync(path.join(root,'static'))?path.join(root,'static'):fs.existsSync(path.join(root,'public'))?path.join(root,'public'):root;
  cp('web/favicon.ico',path.join(dst,'favicon.ico')); cp('web/favicon-192.png',path.join(dst,'favicon-192.png'));
  const ih=path.join(root,'index.html'); if(fs.existsSync(ih)){ let t=fs.readFileSync(ih,'utf8'); if(!/rel="icon"/.test(t)&&/<\/head>/i.test(t)){ t=t.replace(/<\/head>/i,'  <link rel="icon" href="favicon.ico">\n</head>'); fs.writeFileSync(ih,t) } } }
 return done }
// ---- разбор ошибок компиляторов ----
function parseErrors(out,root){ const errs=[]; const seen=new Set(); const add=(file,line,col,msg)=>{ file=file.replace(/^file:\/\/\/?/,''); if(!path.isAbsolute(file)) file=path.join(root,file);
  const k=file+':'+line+':'+msg; if(seen.has(k)) return; seen.add(k); errs.push({file,line:+line||0,col:+col||0,msg:msg.trim().slice(0,400)}) };
 const lines=out.split(/\r?\n/); let m;
 lines.forEach((l,i)=>{
  if((m=l.match(/^\s*(.+?)\((\d+),(\d+)\):\s*error\s+(\w+:.*)$/))) add(m[1],m[2],m[3],m[4]);                       // C#/MSBuild
  else if((m=l.match(/^e:\s*(?:file:\/\/)?(.+?):(\d+):(\d+)\s+(.*)$/))) add(m[1],m[2],m[3],m[4]);                    // Kotlin
  else if((m=l.match(/^(.+\.(?:java|kt|xml|c|cpp|h|go|rs|ts|tsx|js)):(\d+):(?:(\d+):)?\s*(?:error|ошибка)\s*:?\s*(.*)$/i))) add(m[1],m[2],m[3],m[4]); // javac/gcc/tsc-like
  else if((m=l.match(/^(.+\.(?:ts|tsx))\((\d+),(\d+)\):\s*error\s*(.*)$/))) add(m[1],m[2],m[3],m[4]);                // tsc
  else if((m=l.match(/^ERROR:\s*(.+?):(\d+):\s*(.*)$/))) add(m[1],m[2],0,m[3]);                                      // AAPT
  else if((m=l.match(/^\s*File "(.+?)", line (\d+)/))&&!/[\\/](lib|site-packages)[\\/]/i.test(m[1])){ let msg=''; for(let j=i+1;j<Math.min(lines.length,i+8);j++) if(/^\w*(Error|Exception)\b/.test(lines[j])){ msg=lines[j]; break } add(m[1],m[2],0,msg||'исключение Python') }
 });
 return errs.filter(e=>fs.existsSync(e.file)) }
// ---- шаблоны ----
function tpl(kind,root,name,opt){ opt=opt||{}; const W_=(f,t)=>{ const p=path.join(root,f); fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p,t.replace(/^\n/,''),'utf8') };
 const TR={а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'};
 const lat=String(name).toLowerCase().split('').map(c=>c in TR?TR[c]:c).join(''); let seg=lat.replace(/[^a-z0-9]/g,''); if(!seg) seg='app'; if(/^\d/.test(seg)) seg='app'+seg;
 const pkg='ru.ivancode.'+seg; let id=lat.replace(/(^|[^a-z0-9]+)([a-z0-9])/g,(m,a,b)=>b.toUpperCase()).replace(/[^A-Za-z0-9]/g,''); if(!id) id='App'; if(/^\d/.test(id)) id='App'+id;
 if(kind==='android-kotlin'||kind==='android-java'){ const kt=kind==='android-kotlin';
  W_('settings.gradle',`pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }\ndependencyResolutionManagement { repositories { google(); mavenCentral() } }\nrootProject.name = "${id}"\ninclude ':app'\n`);
  W_('build.gradle',`plugins {\n  id 'com.android.application' version '8.7.3' apply false\n${kt?"  id 'org.jetbrains.kotlin.android' version '2.0.21' apply false\n":''}}\n`);
  W_('gradle.properties','android.useAndroidX=true\nandroid.overridePathCheck=true\norg.gradle.jvmargs=-Xmx2g -Dfile.encoding=UTF-8\n');
  W_('app/build.gradle',`plugins {\n  id 'com.android.application'\n${kt?"  id 'org.jetbrains.kotlin.android'\n":''}}\nandroid {\n  namespace '${pkg}'\n  compileSdk 35\n  defaultConfig { applicationId '${pkg}'; minSdk 24; targetSdk 35; versionCode 1; versionName '1.0'; resourceConfigurations += ['ru', 'en'] }\n  compileOptions { sourceCompatibility JavaVersion.VERSION_17; targetCompatibility JavaVersion.VERSION_17 }\n${kt?"  kotlinOptions { jvmTarget = '17' }\n":''}  buildTypes { release { minifyEnabled true; shrinkResources true; proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro' } }\n}\ndependencies {\n  implementation platform('org.jetbrains.kotlin:kotlin-bom:1.8.22')\n  implementation 'androidx.appcompat:appcompat:1.7.0'\n  implementation 'androidx.core:core-ktx:1.13.1'\n  implementation 'com.google.android.material:material:1.12.0'\n}\n`);
  W_('app/src/main/AndroidManifest.xml',`<?xml version="1.0" encoding="utf-8"?>\n<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n  <application android:label="${name}" android:icon="@mipmap/ic_launcher" android:roundIcon="@mipmap/ic_launcher" android:theme="@style/Theme.App">\n    <activity android:name=".MainActivity" android:exported="true">\n      <intent-filter><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent-filter>\n    </activity>\n  </application>\n</manifest>\n`);

  // тема Material 3 + корректные отступы (ActionBar не перекрывает контент на Android 15+)
  const col=/^#[0-9a-fA-F]{6}$/.test(opt.color||'')?opt.color:'#3F6FB5';
  W_('app/src/main/res/values/colors.xml',`<?xml version="1.0" encoding="utf-8"?>\n<resources>\n  <color name="brand">${col}</color>\n  <color name="ic_launcher_background">${col}</color>\n</resources>\n`);
  W_('app/src/main/res/values/themes.xml',`<?xml version="1.0" encoding="utf-8"?>\n<resources>\n  <!-- Material 3, светлая/тёмная тема по системе -->\n  <style name="Theme.App" parent="Theme.Material3.DayNight">\n    <item name="colorPrimary">@color/brand</item>\n  </style>\n</resources>\n`);
  W_('app/src/main/res/values-v35/themes.xml',`<?xml version="1.0" encoding="utf-8"?>\n<resources>\n  <style name="Theme.App" parent="Theme.Material3.DayNight">\n    <item name="colorPrimary">@color/brand</item>\n    <!-- Android 15: не уводить контент под ActionBar/статус-бар -->\n    <item name="android:windowOptOutEdgeToEdgeEnforcement">true</item>\n  </style>\n</resources>\n`);
  // adaptive-иконка: картинка пользователя или первая буква названия (PNG готовит окно студии)
  const xml=`<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n  <background android:drawable="@color/ic_launcher_background"/>\n  <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n  <monochrome android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n`;
  W_('app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml',xml);
  const B=(f,b64)=>{ const p=path.join(root,f); fs.mkdirSync(path.dirname(p),{recursive:true}); fs.writeFileSync(p,Buffer.from(b64,'base64')) };
  if(opt.fg) B('app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png',opt.fg);
  else W_('app/src/main/res/drawable/ic_launcher_foreground.xml',`<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">\n  <path android:fillColor="#FFFFFF" android:pathData="M38,32h32a4,4 0,0 1,4 4v36a4,4 0,0 1,-4 4h-32a4,4 0,0 1,-4 -4v-36a4,4 0,0 1,4 -4zM42,44h24v4h-24zM42,52h24v4h-24zM42,60h16v4h-16z"/>\n</vector>\n`);
  if(!opt.fg) W_('app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml',xml.replace(/@mipmap\/ic_launcher_foreground/g,'@drawable/ic_launcher_foreground'));
  if(opt.legacy) B('app/src/main/res/mipmap-xxxhdpi/ic_launcher.png',opt.legacy);
  W_('IVANCODE.md',`# Подсказки для ИИ (дизайн Android)\n- Тема Material 3 (Theme.App, Theme.Material3.DayNight): цвета из ?attr/colorPrimary, colorSurface и т.п., без жёстких цветов — тёмная тема работает сама.\n- Компоненты Material 3: MaterialCardView/MaterialToolbar/ExtendedFloatingActionButton, отступы 16dp, скругления, иконки (у FAB обязательно app:srcCompat).\n- Edge-to-edge: при targetSdk 35 обрабатывай WindowInsets (ViewCompat.setOnApplyWindowInsetsListener) или оставь windowOptOutEdgeToEdgeEnforcement из values-v35/themes.xml.\n- Пустые состояния, понятные русские тексты, не перекрывать поля ввода.\n- Иконка: res/mipmap-anydpi-v26/ic_launcher.xml (adaptive), не удаляй её.\n`);
  const dir='app/src/main/'+(kt?'kotlin/':'java/')+pkg.replace(/\./g,'/');
  if(kt) W_(dir+'/MainActivity.kt',`package ${pkg}\n\nimport android.os.Bundle\nimport android.widget.TextView\nimport androidx.appcompat.app.AppCompatActivity\nimport androidx.core.view.ViewCompat\nimport androidx.core.view.WindowInsetsCompat\n\nclass MainActivity : AppCompatActivity() {\n    override fun onCreate(savedInstanceState: Bundle?) {\n        super.onCreate(savedInstanceState)\n        val tv = TextView(this).apply { text = "Привет из ${name}!"; textSize = 24f; setPadding(48, 48, 48, 48) }\n        setContentView(tv)\n        // отступы под статус-бар/навигацию (edge-to-edge на Android 15+)\n        ViewCompat.setOnApplyWindowInsetsListener(tv) { v, i -> val b = i.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.ime()); v.setPadding(48 + b.left, 48 + b.top, 48 + b.right, 48 + b.bottom); i }\n    }\n}\n`);
  else W_(dir+'/MainActivity.java',`package ${pkg};\n\nimport android.os.Bundle;\nimport android.widget.TextView;\nimport androidx.appcompat.app.AppCompatActivity;\n\npublic class MainActivity extends AppCompatActivity {\n    @Override protected void onCreate(Bundle b) {\n        super.onCreate(b);\n        TextView t = new TextView(this); t.setText("Привет из ${name}!"); t.setTextSize(24); t.setPadding(48,48,48,48);\n        setContentView(t);\n    }\n}\n`);
  W_('app/proguard-rules.pro','# Правила R8 для релизной сборки (сжатие и обфускация включены в app/build.gradle).\n# Сохраняем имена для понятных отчётов о падениях:\n-keepattributes SourceFile,LineNumberTable\n-renamesourcefileattribute SourceFile\n# Активити/вью из XML и манифеста R8 сохраняет сам. Если используете рефлексию/Gson — добавьте -keep для своих моделей:\n# -keep class '+pkg+'.model.** { *; }\n');
  W_('.gitignore','.gradle/\nbuild/\nlocal.properties\nivancode-out/\n*.jks\n'); return 'android' }
 if(kind==='wpf'){ W_(id+'.csproj',`<Project Sdk="Microsoft.NET.Sdk">\n  <PropertyGroup>\n    <OutputType>WinExe</OutputType>\n    <TargetFramework>net8.0-windows</TargetFramework>\n    <UseWPF>true</UseWPF>\n    <Nullable>enable</Nullable>\n    <AssemblyName>${id}</AssemblyName>\n  </PropertyGroup>\n</Project>\n`);
  W_('App.xaml',`<Application x:Class="${id}.App" xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml" StartupUri="MainWindow.xaml"/>\n`);
  W_('App.xaml.cs',`namespace ${id};\npublic partial class App : System.Windows.Application { }\n`);
  W_('MainWindow.xaml',`<Window x:Class="${id}.MainWindow" xmlns="http://schemas.microsoft.com/winfx/2006/xaml/presentation" xmlns:x="http://schemas.microsoft.com/winfx/2006/xaml" Title="${name}" Height="350" Width="520">\n  <StackPanel Margin="20">\n    <TextBlock FontSize="22" Text="Привет из ${name}!"/>\n    <Button Content="Нажми" Width="120" Margin="0,16,0,0" HorizontalAlignment="Left" Click="OnClick"/>\n  </StackPanel>\n</Window>\n`);
  W_('MainWindow.xaml.cs',`using System.Windows;\nnamespace ${id};\npublic partial class MainWindow : Window\n{\n    public MainWindow() => InitializeComponent();\n    private void OnClick(object s, RoutedEventArgs e) => MessageBox.Show("Работает!");\n}\n`);
  W_('.gitignore','bin/\nobj/\nivancode-out/\n'); return 'dotnet' }
 if(kind==='winforms'){ W_(id+'.csproj',`<Project Sdk="Microsoft.NET.Sdk">\n  <PropertyGroup>\n    <OutputType>WinExe</OutputType>\n    <TargetFramework>net8.0-windows</TargetFramework>\n    <UseWindowsForms>true</UseWindowsForms>\n    <Nullable>enable</Nullable>\n    <AssemblyName>${id}</AssemblyName>\n  </PropertyGroup>\n</Project>\n`);
  W_('Program.cs',`using System.Windows.Forms;\nApplicationConfiguration.Initialize();\nvar f = new Form { Text = "${name}", Width = 520, Height = 320 };\nvar b = new Button { Text = "Нажми", Left = 20, Top = 20, Width = 120 };\nb.Click += (_, _) => MessageBox.Show("Работает!");\nf.Controls.Add(b);\nApplication.Run(f);\n`);
  W_('.gitignore','bin/\nobj/\nivancode-out/\n'); return 'dotnet' }
 if(kind==='electron'){ W_('package.json',JSON.stringify({name:id.toLowerCase(),productName:name,version:'1.0.0',main:'main.js',scripts:{start:'electron .'},devDependencies:{electron:'^33.0.0','electron-builder':'^25.0.0'},build:{appId:pkg,win:{target:['nsis','zip']},nsis:{oneClick:false,allowToChangeInstallationDirectory:true}}},null,2));
  W_('main.js',`const { app, BrowserWindow } = require('electron');\napp.whenReady().then(() => {\n  const w = new BrowserWindow({ width: 900, height: 600 });\n  w.setMenuBarVisibility(false);\n  w.loadFile('index.html');\n});\napp.on('window-all-closed', () => app.quit());\n`);
  W_('index.html',`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${name}</title></head>\n<body style="font-family:Segoe UI;padding:30px"><h1>Привет из ${name}!</h1><button onclick="alert('Работает!')">Нажми</button></body></html>\n`);
  W_('.gitignore','node_modules/\ndist/\n'); return 'electron' }
 if(kind==='html'){ W_('index.html',`<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>${name}</title><link rel="stylesheet" href="style.css"></head>\n<body><h1>${name}</h1><script src="app.js"></script></body></html>\n`); W_('style.css','body{font-family:Segoe UI,sans-serif;padding:30px}\n'); W_('app.js','console.log("Привет!");\n'); return 'html' }

 if(kind==='pyweb'){ // настольная программа: Flask + окно браузера, данные в %APPDATA%
  W_('requirements.txt','Flask>=3.0\npytest>=7.0\n');
  W_('run.py',`import os, socket, sys, threading, webbrowser\nfrom app import create_app\n\napp = create_app()\n\n\ndef free_port():\n    with socket.socket() as s:\n        s.bind(("127.0.0.1", 0))\n        return s.getsockname()[1]\n\n\nif __name__ == "__main__":\n    port = free_port()\n    url = f"http://127.0.0.1:{port}/"\n    if not os.environ.get("IVANCODE_UI_CHECK"):\n        threading.Timer(1.0, lambda: webbrowser.open(url)).start()\n    print("${name} работает:", url)\n    app.run(host="127.0.0.1", port=port, debug=False, use_reloader=False)\n`);
  W_('app/__init__.py',`import os\nfrom flask import Flask\n\nAPP_DIR = "${id}"\n\n\ndef data_dir():\n    base = os.environ.get("APPDATA") or os.path.join(os.path.expanduser("~"), ".local", "share")\n    d = os.path.join(base, APP_DIR)\n    os.makedirs(d, exist_ok=True)\n    return d\n\n\ndef create_app(config=None):\n    app = Flask(__name__)\n    app.config["DATABASE"] = os.environ.get("IVANCODE_DB") or os.path.join(data_dir(), "data.db")\n    if config:\n        app.config.update(config)\n    from . import routes\n    routes.register(app)\n    return app\n`);
  W_('app/routes.py',`from flask import render_template\n\n\ndef register(app):\n    @app.route("/")\n    def index():\n        return render_template("index.html")\n`);
  W_('app/templates/index.html',`<!doctype html>\n<html lang="ru">\n<head>\n  <meta charset="utf-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1">\n  <title>${name}</title>\n  <link rel="icon" href="/static/favicon.ico">\n  <link rel="stylesheet" href="/static/css/base.css">\n</head>\n<body>\n  <header class="top"><h1>${name}</h1><button id="themeToggle" title="Тема">🌙</button></header>\n  <main id="app"></main>\n  <script src="/static/js/app.js"></script>\n</body>\n</html>\n`);
  W_('app/static/css/base.css',`:root{--bg:#f6f7fb;--card:#fff;--text:#1d1f27;--muted:#6b7080;--accent:#4f6bed;--line:#e3e6ee;--radius:14px;--shadow:0 2px 10px rgba(20,30,60,.08)}\n[data-theme=dark]{--bg:#14161c;--card:#1d2029;--text:#e8eaf2;--muted:#9aa0b2;--accent:#8ea2ff;--line:#2b2f3b;--shadow:0 2px 10px rgba(0,0,0,.4)}\n*{box-sizing:border-box}body{margin:0;font-family:system-ui,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--text)}\n.top{display:flex;align-items:center;justify-content:space-between;padding:16px 24px}.top h1{margin:0;font-size:24px}\nbutton{font:inherit;border:1px solid var(--line);background:var(--card);color:var(--text);border-radius:10px;padding:8px 14px;cursor:pointer}\n#app{max-width:960px;margin:0 auto;padding:0 16px 40px}\n`);
  W_('app/static/js/app.js',`// Тема: светлая/тёмная, запоминается\nconst root = document.documentElement;\nroot.dataset.theme = localStorage.getItem("theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");\ndocument.getElementById("themeToggle").onclick = () => {\n  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";\n  localStorage.setItem("theme", root.dataset.theme);\n};\n`);
  W_('tests/test_app.py',`from app import create_app\n\n\ndef test_index(tmp_path):\n    app = create_app({"DATABASE": str(tmp_path / "t.db"), "TESTING": True})\n    r = app.test_client().get("/")\n    assert r.status_code == 200\n`);
  W_('.gitignore','__pycache__/\nivancode-out/\n*.spec\n.pytest_cache/\n'); return 'python' }
 if(kind==='python'){ W_('main.py',`def main():\n    name = input("Как вас зовут? ")\n    print(f"Привет, {name}! Это ${name}.")\n\n\nif __name__ == "__main__":\n    main()\n`); W_('requirements.txt',''); W_('.gitignore','__pycache__/\nbuild/\ndist/\nivancode-out/\n*.spec\n'); return 'python' }
 if(kind==='ponyatny'){ W_('программа.pon',`# ${name} — программа на языке «Понятный»
# F5 — запустить. Справка по языку: кнопка 📖 «Справка».
подключи "стд/консоль"

рамка("${String(name).replace(/["\\{}]/g,'')}")
пусть имя = спроси("Как вас зовут?")
если имя == ничего или имя == "" то
    имя = "друг"
конец
напиши "Привет, {имя}!"
`); W_('.gitignore','ivancode-out/\n'); return 'ponyatny' }
 throw new Error('неизвестный шаблон') }
// подготовка к сборке: то, что ломает сборку на машинах новичков
function prepBuild(root,kind){ if(kind==='android'){ const gp=path.join(root,'gradle.properties'); let t=fs.existsSync(gp)?fs.readFileSync(gp,'utf8'):'';
  const add=[]; if(!/android\.overridePathCheck/.test(t)) add.push('android.overridePathCheck=true'); if(!/android\.useAndroidX/.test(t)) add.push('android.useAndroidX=true'); if(!/org\.gradle\.jvmargs/.test(t)) add.push('org.gradle.jvmargs=-Xmx2g -Dfile.encoding=UTF-8');
  if(add.length) fs.writeFileSync(gp,t.replace(/\s*$/,'\n')+add.join('\n')+'\n') } }
module.exports={download,extract,install,TROOT,mkDec,renameRetry,shortPath,dec,batCmd,runBat,asciiOk,pickAsciiRoot,javaMajor,goodJdk,javaEnv,deps,webview2,installWebview2,report,rescan,refreshPath,found,pyCmd,fixPy,prepBuild,translit:(n)=>String(n).toLowerCase().split('').map(c=>({а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'ts',ч:'ch',ш:'sh',щ:'sch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya'})[c]??c).join('').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'app',iconSave,applyIcon,iconIco,zipDir,postFor,pyEntry,TOOLS,installed,install,buildEnv,detect,targets,cmdFor,parseErrors,tpl,run,TROOT,download};
