// ИванКод 1.2: главный процесс быстрого пути — встроенная проверка веб-программы и упаковка EXE/установщика/APK за секунды
const { BrowserWindow, ipcMain, app } = require('electron');
const path=require('path'), fs=require('fs'), os=require('os');
const TPL=()=>path.join(__dirname,'tpl');
function init(T){
ipcMain.handle('web:check',async(e,file,o={})=>{ const errors=[], warns=[]; let action='загрузка страницы', nav=0;
 const w=new BrowserWindow({show:false,width:o.width||1100,height:o.height||760,webPreferences:{sandbox:true,partition:'webcheck-'+Date.now(),backgroundThrottling:false}});
 const t0=Date.now();
 try{ w.webContents.on('console-message',(ev,level,msg,line,src)=>{ if(String(msg).startsWith('ACT ')){ action='нажатие «'+String(msg).slice(4)+'»'; return } if(level>=3&&!/favicon/.test(msg)) errors.push({msg:String(msg).slice(0,300),line,src:(src||'').split('/').pop(),action}) });
  w.webContents.on('render-process-gone',()=>errors.push({msg:'страница аварийно закрылась',action}));
  w.webContents.on('did-start-navigation',(ev,url,inPage,isMain)=>{ if(isMain&&!inPage&&nav++>0) warns.push('страница перезагрузилась при действии «'+action+'» (у формы нет e.preventDefault())') });
  w.webContents.session.webRequest.onBeforeRequest((d,cb)=>{ if(/^https?:/.test(d.url)){ warns.push('запрос в интернет: '+d.url.slice(0,80)); return cb({cancel:true}) } cb({}) });
  await w.loadFile(file).catch(er=>errors.push({msg:'не загрузилось: '+er.message,action}));
  await new Promise(r=>setTimeout(r,400));
  const smoke=await w.webContents.executeJavaScript(`(async()=>{ const sleep=ms=>new Promise(r=>setTimeout(r,ms)); window.alert=()=>{}; window.confirm=()=>true; window.prompt=(m,d)=>d||'1';
   const vis=e=>e.offsetParent!==null&&e.getBoundingClientRect().width>0; const lab=b=>((b.innerText||b.value||b.title||b.id||'кнопка').trim().replace(/\\s+/g,' ').slice(0,30));
   const fill=()=>{ let n=0; for(const i of document.querySelectorAll('input,textarea,select')){ if(!vis(i)||i.disabled) continue; const t=(i.type||'').toLowerCase(); n++;
     if(i.tagName==='SELECT'){ if(i.options.length>1&&!i.value) i.selectedIndex=1 } else if(t==='checkbox'||t==='radio'){ } else if(t==='number'||t==='range'){ i.value=i.min&&+i.min>0?i.min:'150' } else if(t==='date'){ i.value='2026-10-21' } else if(t==='time'){ i.value='12:30' } else if(t==='color'){ } else if(t==='email'){ i.value='test@example.com' } else if(t==='file'){ } else { i.value='Тест запись' }
     i.dispatchEvent(new Event('input',{bubbles:true})); i.dispatchEvent(new Event('change',{bubbles:true})) } return n };
   const before=document.body.innerText.length; const R={inputs:fill(),clicked:[],textBefore:before};
   const btns=[...document.querySelectorAll('button,input[type=submit],input[type=button],[role=button]')].filter(b=>vis(b)&&b.id!=='themeToggle').slice(0,25);
   for(const b of btns){ if(!b.isConnected||!vis(b)) continue; window.__act=lab(b); console.debug('ACT '+window.__act); try{ b.click() }catch(e){ console.error(e&&e.message||String(e)) } R.clicked.push(window.__act); await sleep(120); fill() }
   const tm=document.getElementById('themeToggle'); if(tm){ tm.click(); await sleep(50); tm.click() }
   const t=document.body.innerText; const bad=t.match(/\\b(undefined|NaN|\\[object Object\\])\\b/); R.bad=bad?bad[1]:''; R.text=t.length; R.ls=Object.keys(localStorage).filter(k=>k!=='__theme').length; R.title=document.title; return R })()`).catch(er=>({err:String(er.message||er)}));
  if(smoke.err) errors.push({msg:'проверка не смогла выполнить действия: '+smoke.err,action:'проверка'});
  if(smoke.bad) errors.push({msg:`на экране виден текст «${smoke.bad}» — ошибка в выводе данных`,src:'smoke'});
  if(smoke.text<15) errors.push({msg:'страница почти пустая — интерфейс не отрисовался',src:'smoke'});
  if(smoke.inputs&&smoke.clicked&&smoke.clicked.length&&!smoke.ls) warns.push('после действий ничего не сохранилось в localStorage — данные могут пропадать после перезапуска');
  let shot=null; try{ const img=await w.webContents.capturePage(); if(o.shot){ fs.mkdirSync(path.dirname(o.shot),{recursive:true}); fs.writeFileSync(o.shot,img.toPNG()); shot=o.shot } }catch{}
  return {ok:!errors.length,errors:errors.slice(0,12),warns:[...new Set(warns)].slice(0,6),smoke,shot,ms:Date.now()-t0} }
 finally{ try{ w.destroy() }catch{} } });
// действия кнопок — подписываем ошибки названием нажатой кнопки
ipcMain.on('noop',()=>{});
ipcMain.handle('web:pack',async(e,root,target,o={})=>{ const t0=Date.now(); try{
 const AP=require('./apkpack'), EP=require('./exepack'); const name=String(o.name||path.basename(root)).trim()||'Программа'; const slug=(T.translit(name).replace(/[^a-z0-9]+/gi,'-').replace(/^-+|-+$/g,'').toLowerCase()||'app').slice(0,40);
 const files={'index.html':fs.readFileSync(path.join(root,'index.html'))}; for(const f of ['favicon.ico','favicon-192.png']) if(fs.existsSync(path.join(root,f))) files[f]=fs.readFileSync(path.join(root,f));
 const out=path.join(root,'Готовая программа'); fs.mkdirSync(out,{recursive:true}); const safe=name.replace(/[\\/:*?"<>|]+/g,'_'); const icoDir=path.join(root,'.ivancode','icon'); const ico=path.join(icoDir,'app.ico');
 if(target==='apk'){ const icons={}; for(const d of ['mdpi','hdpi','xhdpi','xxhdpi','xxxhdpi']){ const p=path.join(icoDir,'android','mipmap-'+d,'ic_launcher.png'); if(fs.existsSync(p)) icons[d]=fs.readFileSync(p) }
  const r=AP.buildApk({template:path.join(TPL(),'webview.apk'),out:path.join(out,safe+'.apk'),label:name,pkg:AP.pkgName(slug.replace(/-/g,'_')),files,icons,keyFile:path.join(app.getPath('userData'),'apk-key.json'),version:o.version});
  return {code:0,file:r.file,size:r.size,ms:Date.now()-t0,out:`APK собран: ${r.file} (${Math.round(r.size/1024)} КБ) за ${Date.now()-t0} мс`} }
 const inst=target==='installer'; const r=await EP.buildExe({tplDir:TPL(),out:path.join(out,inst?`${safe} — установщик.exe`:`${safe}.exe`),name,id:slug,files,ico:fs.existsSync(ico)?ico:null,installer:inst});
 return {code:0,file:r.file,size:r.size,ms:Date.now()-t0,out:`${inst?'Установщик':'Программа'} собран(а): ${r.file} (${Math.round(r.size/1024)} КБ) за ${Date.now()-t0} мс${r.icon?'':' (значок по умолчанию)'}`} }
 catch(er){ return {code:1,out:'Упаковка не удалась: '+er.message,env:true,ms:Date.now()-t0} } });
ipcMain.handle('tools:report',()=>T.report());
}
module.exports={init};
