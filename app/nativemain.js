// ИванКод 1.3: главный процесс для простого режима «Kotlin» и «Понятный»
const { ipcMain, app, BrowserWindow } = require('electron');
const path=require('path'), fs=require('fs');
const NB=require('./nativebuild.js');
function init(T){
 const SS=require('./safesend'); const send=(ch,...a)=>{ for(const w of BrowserWindow.getAllWindows()) if(SS.alive(w)) try{ w.webContents.send(ch,...a) }catch{} };
 const ktEnv=()=>{ const env=T.buildEnv(); const g=T.found('gradle'); if(g&&g.found) env.IVANCODE_GRADLE=g.path; return env };
 // 1.3.1: проверка компьютера и исправления (после каждого — повторная проверка)
 const D=require('./diag.js');
 ipcMain.handle('pon:bin',()=>NB.ponBin()||'');
 ipcMain.handle('diag:run',async(e,o)=>{ try{ return await D.runAll(T,o||{}) }catch(err){ return {items:[],err:String(err.message||err)} } });
 ipcMain.handle('diag:fix',async(e,id,o)=>{ const log=t=>send('diag:log',String(t)); let ok=true, err=''; try{ await D.fix(T,id,log,o||{}) }catch(x){ ok=false; err=String(x.message||x); log('✖ '+err+'\n') } const after=await D.runAll(T,o||{}); return {ok,err,...after} });
 let warm=null; // один прогрев на запуск студии
 ipcMain.handle('kt:prewarm',async()=>{ if(warm) return warm; const env=ktEnv(); if(!env.IVANCODE_GRADLE||!env.ANDROID_HOME) return {ok:false,skip:true};
  warm=NB.ktPrewarm(path.join(app.getPath('userData'),'kt-warm'),{env,sdk:env.ANDROID_HOME}).then(r=>{ if(!r.ok) warm=null; return {ok:r.ok,ms:r.ms,env:r.env} }); return warm });
 ipcMain.handle('kt:build',async(e,root,name,body)=>{ const env=ktEnv(); if(warm) await warm.catch(()=>{}); NB.ktWrite(root,name,body,{sdk:env.ANDROID_HOME,appId:'ru.ivancode.'+(T.translit(name).replace(/[^a-z0-9]/g,'')||'app').replace(/^(\d)/,'a$1').slice(0,30)});
  const out=path.join(root,'Готовая программа'); const dst=path.join(out,name.replace(/[\\/:*?"<>|]+/g,'_')+'.apk'); try{ fs.rmSync(dst,{force:true}) }catch{} // сломанная сборка не оставит старый APK
  const r=await NB.ktBuild(root,{env,onData:s=>send('kt:log',s)}); if(r.ok){ fs.mkdirSync(out,{recursive:true}); fs.copyFileSync(r.apk,dst); r.file=dst; r.size=fs.statSync(dst).size } return r });
 ipcMain.handle('kt:body',(e,root)=>{ try{ return require('./kotlinapp.js').body(fs.readFileSync(path.join(root,...require('./kotlinapp.js').APP_FILE.split('/')),'utf8')) }catch{ return '' } });
 const csEnv=()=>{ const env=T.buildEnv(); const d=T.found('dotnet'); if(d&&d.found) env.IVANCODE_DOTNET=d.path; return env };
 let cwarm=null;
 ipcMain.handle('cs:prewarm',async()=>{ if(cwarm) return cwarm; const env=csEnv(); if(!env.IVANCODE_DOTNET) return {ok:false,skip:true}; cwarm=NB.csPrewarm(path.join(app.getPath('userData'),'cs-warm'),{env}).then(r=>{ if(!r.ok) cwarm=null; return {ok:r.ok,ms:r.ms,env:r.env} }); return cwarm });
 ipcMain.handle('cs:build',async(e,root,name,body)=>{ const env=csEnv(); if(cwarm) await cwarm.catch(()=>{}); NB.csWrite(root,name,body,{asm:(T.translit(name).replace(/[^a-z0-9-]/g,'')||'app').slice(0,40)});
  const out=path.join(root,'Готовая программа'); const dst=path.join(out,name.replace(/[\\/:*?"<>|]+/g,'_')+'.exe'); try{ fs.rmSync(dst,{force:true}) }catch{}
  const r=await NB.csBuild(root,{env,onData:s=>send('cs:log',s)}); if(!r.ok) return r;
  if(process.platform==='win32'){ const s=await NB.csSmoke(r.exe); r.smoke=s; if(!s.ok&&s.err&&/^SMOKE|[A-Z]\w+Exception/.test(s.text||'')){ r.ok=false; r.runtime=s.err; return r } }
  fs.mkdirSync(out,{recursive:true}); fs.copyFileSync(r.exe,dst); r.file=dst; r.size=fs.statSync(dst).size; return r });
 ipcMain.handle('cs:body',(e,root)=>{ try{ return require('./csapp.js').body(fs.readFileSync(path.join(root,'AppForm.cs'),'utf8')) }catch{ return '' } });
 ipcMain.handle('pon:check',(e,file)=>NB.ponCheck(file));
 ipcMain.handle('pon:smoke',(e,file)=>NB.ponSmoke(file));
 ipcMain.handle('pon:build',(e,file,exe)=>NB.ponBuild(file,exe));
 ipcMain.handle('pon:try',(e,code,o)=>NB.ponTry(String(code),o||{}));
 ipcMain.handle('pon:translate',(e,file,lang)=>NB.ponTranslate(file,lang));
 // 1.4: декомпиляция (программа не запускается; инструменты скачиваются по требованию в папку инструментов)
 ipcMain.handle('decomp:pick',async()=>{ const {dialog}=require('electron'); const w=BrowserWindow.getFocusedWindow(); const r=await dialog.showOpenDialog(w,{title:'Какую программу декомпилировать?',properties:['openFile'],filters:[{name:'Программы',extensions:['apk','dex','jar','class','exe','dll','pyc','so','elf','bin','aab']},{name:'Все файлы',extensions:['*']}]}); return r.canceled?null:r.filePaths[0] });
 ipcMain.handle('decomp:run',async(e,file,o={})=>{ const DC=require('./decomp/decomp.js'); const log=t=>send('decomp:log',String(t));
  try{ const W=process.platform==='win32'; const docs=path.join(app.getPath('documents'),'ИванКод — мои программы','Декомпиляция');
   const name=path.basename(file).replace(/[^\p{L}\p{N}._-]+/gu,'_'); const outDir=path.join(docs,name.replace(/\.[^.]+$/,'')+'-'+new Date().toISOString().slice(0,19).replace(/[:T]/g,'-'));
   const env=DC.makeEnv({root:path.join(T.TROOT(),'decomp'),log,download:(u,f)=>T.download(u,f,(d,t)=>{ if(t) log('\r'+Math.round(d/t*100)+'% ') }),extract:(z,d)=>T.extract(z,d),python:()=>{ const f=T.found('python'); return f&&f.found?f.path:null }});
   const java=()=>{ const j=T.goodJdk(); return j?path.join(j.home,'bin',W?'java.exe':'java'):null };
   const dotnet=()=>{ const f=T.found('dotnet'); return f&&f.found?f.path:null };
   const pycdc=()=>{ const f=path.join(T.TROOT(),'decomp',W?'pycdc.exe':'pycdc'); return fs.existsSync(f)?f:null };
   if(o.installJdk){ await T.install('jdk',log) } if(o.installDotnet){ await T.install('dotnet',log) }
   return await DC.decompile(file,{env,java,dotnet,python:env&&(()=>{ const f=T.found('python'); return f&&f.found?f.path:null }),pycdc,allowGhidra:!!o.allowGhidra,outDir,log}) }
  catch(err){ log('✖ '+err.message+'\n'); return {ok:false,error:String(err.message||err)} } });
}
module.exports={init};
