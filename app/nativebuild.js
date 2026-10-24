// ИванКод 1.3: сборка простого режима «Kotlin» (Gradle → APK) и «Понятный» (ponyatny собрать → EXE). Без Electron — используется и студией, и тестами.
const fs=require('fs'), path=require('path'), cp=require('child_process'), os=require('os');
const K=require('./kotlinapp.js'), P=require('./ponapp.js');
const W=process.platform==='win32';
function writeTree(root,files){ for(const [rel,t] of Object.entries(files)){ const f=path.join(root,...rel.split('/')); fs.mkdirSync(path.dirname(f),{recursive:true}); fs.writeFileSync(f,t) } }
function run(cmd,args,o={}){ return new Promise(res=>{ const t0=Date.now(); let out=''; let p;
 try{ p=cp.spawn(cmd,args,{cwd:o.cwd,env:o.env||process.env,shell:o.shell||false,windowsHide:true}) }catch(e){ return res({code:-1,out:String(e.message),ms:0}) }
 const tm=o.timeout?setTimeout(()=>{ try{ W?cp.spawnSync('taskkill',['/pid',String(p.pid),'/T','/F']):p.kill('SIGKILL') }catch{} out+='\n[превышено время '+Math.round(o.timeout/1000)+' с]'; },o.timeout):null;
 const dd=require('./tools.js').mkDec(); const on=d=>{ const s=dd(d); out+=s; if(o.onData) o.onData(s) }; p.stdout&&p.stdout.on('data',on); p.stderr&&p.stderr.on('data',on);
 if(o.input!=null){ try{ p.stdin.end(o.input) }catch{} } else { try{ p.stdin.end() }catch{} }
 p.on('error',e=>{ out+=String(e.message) }); p.on('close',code=>{ clearTimeout(tm); res({code:code==null?-1:code,out,ms:Date.now()-t0}) }) }) }
// ---------- Kotlin ----------
function gradleExe(env){ if(env.IVANCODE_GRADLE) return env.IVANCODE_GRADLE; return W?'gradle.bat':'gradle' }
function ktWrite(root,name,body,o={}){ const icoDir=path.join(root,'.ivancode','icon','android'); const icon=fs.existsSync(icoDir);
 writeTree(root,K.project(name,body,{icon,appId:o.appId,versionCode:o.versionCode}));
 if(icon){ for(const d of fs.readdirSync(icoDir)){ const s=path.join(icoDir,d,'ic_launcher.png'); if(fs.existsSync(s)){ const t=path.join(root,'app','src','main','res',d); fs.mkdirSync(t,{recursive:true}); fs.copyFileSync(s,path.join(t,'ic_launcher.png')) } } }
 if(o.sdk) fs.writeFileSync(path.join(root,'local.properties'),'sdk.dir='+o.sdk.replace(/\\/g,'\\\\').replace(/:/g,'\\:')+'\n') }
const APK_REL=['app','build','outputs','apk','debug','app-debug.apk'];
/** компиляция + сборка APK. Возвращает {ok, errors[{line,ru}], env (проблема окружения), apk, ms, out} */
const NONASCII=/[^\x00-\x7f]/;
function asciiBase(){ const c=[process.env.IVANCODE_ASCII_DIR,W?(process.env.SystemDrive||'C:')+'\\IvanCodeBuild':path.join(os.tmpdir(),'ivancode-build'),W?(process.env.PUBLIC||'C:\\Users\\Public')+'\\IvanCodeBuild':null].filter(Boolean); for(const d of c){ if(NONASCII.test(d)) continue; try{ fs.mkdirSync(d,{recursive:true}); fs.accessSync(d,fs.constants.W_OK); return d }catch{} } return null }
const SKIP=new Set(['build','.gradle','.ivancode','Готовая программа','ivancode-out']);
function mirror(root,base){ const id=require('crypto').createHash('sha1').update(root).digest('hex').slice(0,10); const dst=path.join(base,'p-'+id); fs.mkdirSync(dst,{recursive:true});
 for(const n of fs.readdirSync(root)){ if(SKIP.has(n)) continue; fs.cpSync(path.join(root,n),path.join(dst,n),{recursive:true,force:true,filter:src=>!/^(build|\.gradle)$/.test(path.basename(src))}) } return dst }
function ktHealEnv(env,o={}){ const e={...env}; const notes=[]; const J=e.JAVA_HOME; if(J&&!fs.existsSync(path.join(J,'bin',W?'java.exe':'java'))){ delete e.JAVA_HOME; notes.push('JAVA_HOME указывал на несуществующую Java — убрал') }
 if(!e.JAVA_HOME&&o.jdk){ e.JAVA_HOME=o.jdk; notes.push('JAVA_HOME = '+o.jdk) }
 const home=o.home||os.homedir(); if(!e.GRADLE_USER_HOME&&NONASCII.test(home)){ const b=o.base||asciiBase(); if(b){ e.GRADLE_USER_HOME=path.join(b,'gradle-home'); notes.push('кэш Gradle перенесён в папку без русских букв: '+e.GRADLE_USER_HOME) } }
 return {env:e,notes} }
const DAEMON=/Gradle build daemon disappeared|Could not connect to the Gradle daemon|Timeout waiting to lock|Could not create service of type|is locked by another process|The process cannot access the file because it is being used/i;
async function ktBuild(root,o={}){ const h=ktHealEnv(o.env||process.env,{jdk:o.jdk}); const env=h.env; const heal=[...h.notes]; const apk=path.join(root,...APK_REL); try{ fs.rmSync(apk,{force:true}) }catch{}
 let dir=root; if(NONASCII.test(root)&&(W||o.forceMirror)){ const b=o.base||asciiBase(); if(b){ dir=mirror(root,b); heal.push('в пути проекта русские буквы — собираю в копии '+dir) } }
 const g=gradleExe(env); const args=['assembleDebug','--console=plain','-q','--build-cache','-Pandroid.overridePathCheck=true'];
 let r=await run(g,args,{cwd:dir,env,shell:W,timeout:o.timeout||15*60e3,onData:o.onData});
 if(r.code!==0&&DAEMON.test(r.out)){ heal.push('демон Gradle завис — перезапускаю'); await run(g,['--stop'],{cwd:dir,env,shell:W,timeout:60e3}); r=await run(g,args,{cwd:dir,env,shell:W,timeout:o.timeout||15*60e3,onData:o.onData}) }
 const built=path.join(dir,...APK_REL); if(dir!==root&&r.code===0&&fs.existsSync(built)){ fs.mkdirSync(path.dirname(apk),{recursive:true}); fs.copyFileSync(built,apk) }
 const errors=K.parseErrors(r.out); const ok=r.code===0&&fs.existsSync(apk);
 return {ok,errors,heal,dir,env:ok?null:(errors.length?null:(K.envProblem(r.out)||'Gradle завершился с ошибкой (код '+r.code+')')),apk:ok?apk:null,ms:r.ms,out:r.out.slice(-6000)} }
/** прогрев: собрать пустую заготовку, чтобы Gradle скачал плагины и запустил демон (следующие сборки — секунды) */
async function ktPrewarm(dir,o={}){ fs.mkdirSync(dir,{recursive:true}); ktWrite(dir,'Прогрев',K.DEFAULT_BODY,{sdk:o.sdk}); return ktBuild(dir,o) }
// ---------- Понятный ----------
function ponBin(o={}){ const c=[o.bin,process.env.IVANCODE_PON,process.resourcesPath&&path.join(process.resourcesPath,'ponyatny',W?'ponyatny.exe':'ponyatny-linux'),path.join(__dirname,'..','bin',W?'ponyatny.exe':'ponyatny-linux')].filter(Boolean); return c.find(f=>{ try{ return fs.existsSync(f) }catch{ return false } })||null }
// под wine вывод в канал ломается (EBADF) — для тестов на Linux можно запускать .exe через wine с выводом в файл
async function ponRun(args,o={}){ const bin=o.bin||ponBin(); if(!bin) return {code:-1,out:'Компилятор «Понятный» не найден в студии',ms:0};
 if(/\.exe$/i.test(bin)&&!W){ const of=path.join(os.tmpdir(),'pon-'+process.pid+'-'+Date.now()+'.txt'); const fd=fs.openSync(of,'w'); const t0=Date.now();
  const r=cp.spawnSync('wine',[bin,...args],{cwd:o.cwd,stdio:['ignore',fd,fd],env:{...process.env,WINEDEBUG:'-all'},timeout:o.timeout||120e3}); fs.closeSync(fd); const out=fs.readFileSync(of,'utf8'); fs.rmSync(of,{force:true}); return {code:r.status==null?-1:r.status,out,ms:Date.now()-t0} }
 return run(bin,args,{cwd:o.cwd,timeout:o.timeout||120e3,input:o.input}) }
async function ponCheck(file,o={}){ const r=await ponRun(['проверить',path.basename(file)],{...o,cwd:path.dirname(file)}); const errs=P.parseErrors(r.out); return {ok:r.code===0,errors:errs.filter(e=>e.kind==='error'),warns:errs.filter(e=>e.kind==='warn'),out:r.out,ms:r.ms} }
// пробный запуск: ввод — несколько «1» и пустой ввод, ограничение по времени; ловлю ошибки выполнения
async function ponSmoke(file,o={}){ const r=await ponRun(['запустить',path.basename(file)],{...o,cwd:path.dirname(file),input:o.input!=null?o.input:'1\n2\n0\n0\n0\n',timeout:o.timeout||8000}); const errs=P.parseErrors(r.out).filter(e=>e.kind==='error'); const hung=/\[превышено время/.test(r.out);
 return {ok:r.code===0&&!errs.length,errors:errs,hung,out:r.out.slice(-3000),ms:r.ms} }
async function ponBuild(file,exe,o={}){ fs.mkdirSync(path.dirname(exe),{recursive:true}); try{ fs.rmSync(exe,{force:true}) }catch{}
 const rel=path.relative(path.dirname(file),exe); const r=await ponRun(['собрать',path.basename(file),'-o',rel],{...o,cwd:path.dirname(file),timeout:o.timeout||180e3}); const ok=r.code===0&&fs.existsSync(exe);
 return {ok,exe:ok?exe:null,size:ok?fs.statSync(exe).size:0,errors:P.parseErrors(r.out).filter(e=>e.kind==='error'),out:r.out,ms:r.ms} }
const LANGS={python:'.py',javascript:'.js',csharp:'.cs'};
async function ponTranslate(file,lang,o={}){ if(!LANGS[lang]) return {ok:false,out:'неизвестный язык: '+lang}; const r=await ponRun(['перевести',path.basename(file),'--в',lang,...(o.latin?['--латиница']:[])],{...o,cwd:path.dirname(file)}); const outF=file.replace(/\.pon$/i,'')+LANGS[lang]; return {ok:r.code===0&&fs.existsSync(outF),file:outF,out:r.out,ms:r.ms} }
module.exports={ktHealEnv,mirror,asciiBase,run,writeTree,ktWrite,ktBuild,ktPrewarm,APK_REL,ponBin,ponRun,ponCheck,ponSmoke,ponBuild,ponTranslate,LANGS};
// самоучитель: проверить и запустить кусок кода во временной папке (+ файлы урока)
async function ponTry(code,o={}){ const d=fs.mkdtempSync(path.join(os.tmpdir(),'pon-tut-')); try{ for(const [n,t] of Object.entries(o.files||{})) fs.writeFileSync(path.join(d,n),t); const f=path.join(d,'урок.pon'); fs.writeFileSync(f,code);
 const c=await ponCheck(f,o); if(!c.ok) return {compiled:false,error:P.fmtErrors(c.errors).join('\n')||c.out,out:c.out,warns:c.warns};
 const r=await ponRun(['запустить','урок.pon'],{...o,cwd:d,input:o.input!=null?o.input:'',timeout:o.timeout||8000}); return {compiled:true,ok:r.code===0,out:r.out.split('\n').filter(l=>!/^Предупреждение\./.test(l)).join('\n'),warns:c.warns.map(w=>'строка '+w.line+': '+w.msg),code:r.code} }
 finally{ try{ fs.rmSync(d,{recursive:true,force:true}) }catch{} } }
module.exports.ponTry=ponTry;
// ---------- C# WinForms ----------
const C=require('./csapp.js');
function dotnetExe(env){ return env.IVANCODE_DOTNET||(W?'dotnet.exe':'dotnet') }
function csWrite(root,name,body,o={}){ const ico=path.join(root,'.ivancode','icon','app.ico'); const icon=fs.existsSync(ico); writeTree(root,C.project(name,body,{icon,asm:o.asm})); if(icon) fs.copyFileSync(ico,path.join(root,'app.ico')) }
async function csBuild(root,o={}){ const env={DOTNET_CLI_TELEMETRY_OPTOUT:'1',DOTNET_NOLOGO:'1',DOTNET_SKIP_FIRST_TIME_EXPERIENCE:'1',...(o.env||process.env)}; const outD=path.join(root,'bin','publish'); try{ fs.rmSync(outD,{recursive:true,force:true}) }catch{}
 const r=await run(dotnetExe(env),['publish','-c','Release','-o',outD,'-nologo','-clp:NoSummary','-v','q'],{cwd:root,env,timeout:o.timeout||15*60e3,onData:o.onData});
 const exe=fs.existsSync(outD)?fs.readdirSync(outD).find(f=>/\.exe$/i.test(f)):null; const errors=C.parseErrors(r.out); const ok=r.code===0&&!!exe;
 return {ok,errors,env:ok?null:(errors.length?null:(C.envProblem(r.out)||'.NET завершился с ошибкой (код '+r.code+')')),exe:ok?path.join(outD,exe):null,ms:r.ms,out:r.out.slice(-6000)} }
async function csPrewarm(dir,o={}){ fs.mkdirSync(dir,{recursive:true}); csWrite(dir,'Прогрев',C.DEFAULT_BODY); return csBuild(dir,o) }
module.exports.csWrite=csWrite; module.exports.csBuild=csBuild; module.exports.csPrewarm=csPrewarm;
// пробный запуск: окно должно открыться (Start() без исключений); программа сама записывает итог и закрывается
async function csSmoke(exe,o={}){ const f=path.join(os.tmpdir(),'ivk-smoke-'+Date.now()+'.txt'); const t0=Date.now(); let r;
 if(W) r=await run(exe,[],{env:{...process.env,IVANCODE_SMOKE_FILE:f},timeout:o.timeout||30000});
 else r=await run('wine',[exe],{env:{...process.env,WINEDEBUG:'-all',IVANCODE_SMOKE_FILE:'Z:'+f.replace(/\//g,'\\')},timeout:o.timeout||90000});
 let txt=''; try{ txt=fs.readFileSync(f,'utf8'); fs.rmSync(f,{force:true}) }catch{}
 return {ok:/^SMOKE_OK/.test(txt),err:/^SMOKE_ERR/.test(txt)?txt.slice(10):(!txt?'окно не открылось за отведённое время':''),text:txt,ms:Date.now()-t0} }
module.exports.csSmoke=csSmoke;
