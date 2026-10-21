// ИванКод 1.2: поиск уже установленных инструментов на Windows (и Linux для тестов). Зависимости внедряются — функции проверяются юнит-тестами.
const path=require('path');
const STUB=/\\WindowsApps\\/i; // заглушка Microsoft Store: «python» без Python, печатает «Python» и код 9009
function expand(s,env){ return String(s||'').replace(/%([^%]+)%/g,(m,k)=>{ const key=Object.keys(env).find(x=>x.toUpperCase()===k.toUpperCase()); return key?env[key]:m }) }
function parseRegPath(out,env){ const m=String(out||'').match(/\s(?:Path|PATH)\s+REG_(?:EXPAND_)?SZ\s+(.*)/); return m?expand(m[1].trim(),env).split(';').map(s=>s.trim()).filter(Boolean):[] }
function mergePath(cur,extra,W){ const sep=W?';':':'; const seen=new Set(); const out=[]; for(const p of String(cur||'').split(sep).concat(extra)){ const k=W?p.toLowerCase().replace(/\\+$/,''):p; if(!p||seen.has(k)) continue; seen.add(k); out.push(p) } return out.join(sep) }
function pathDirs(env,W){ const k=Object.keys(env).find(x=>x.toUpperCase()==='PATH')||'PATH'; return String(env[k]||'').split(W?';':':').filter(Boolean) }
// glob одного уровня: C:\...\Python3*\python.exe
function globOne(pat,d){ const P=path.win32; const parts=pat.split(/[\\/]/); const i=parts.findIndex(x=>x.includes('*')); if(i<0) return d.exists(pat)?[pat]:[];
 const dir=parts.slice(0,i).join('\\'), re=new RegExp('^'+parts[i].replace(/[.+^${}()|[\]\\]/g,'\\$&').replace(/\*/g,'.*')+'$','i'); let names=[]; try{ names=d.readdir(dir) }catch{ return [] }
 return names.filter(n=>re.test(n)).sort().reverse().flatMap(n=>globOne([dir,n,...parts.slice(i+1)].join('\\'),d)) }
const SPEC={
 python:{exe:'python.exe',lx:'python3',ver:['--version'],ok:/Python 3\.\d+/,own:'python\\python.exe',
  dirs:e=>[`${e.LOCALAPPDATA}\\Programs\\Python\\Python3*\\python.exe`,`${e.ProgramFiles}\\Python3*\\python.exe`,`${e['ProgramFiles(x86)']}\\Microsoft Visual Studio\\Shared\\Python3*_64\\python.exe`,`${e.ProgramFiles}\\Microsoft Visual Studio\\Shared\\Python3*_64\\python.exe`,`${e.SystemDrive||'C:'}\\Python3*\\python.exe`,`${e.LOCALAPPDATA}\\anaconda3\\python.exe`,`${e.USERPROFILE}\\anaconda3\\python.exe`]},
 jdk:{exe:'java.exe',lx:'java',ver:['-version'],ok:/version "?(1[7-9]|2\d)/,own:'jdk\\bin\\java.exe',home:2,
  dirs:e=>[e.JAVA_HOME&&`${e.JAVA_HOME}\\bin\\java.exe`,`${e.ProgramFiles}\\Android\\Android Studio\\jbr\\bin\\java.exe`,`${e.LOCALAPPDATA}\\Programs\\Android Studio\\jbr\\bin\\java.exe`,`${e.ProgramFiles}\\Eclipse Adoptium\\jdk-*\\bin\\java.exe`,`${e.ProgramFiles}\\Microsoft\\jdk-*\\bin\\java.exe`,`${e.ProgramFiles}\\Java\\jdk-*\\bin\\java.exe`]},
 android:{exe:'adb.exe',lx:'adb',ver:['version'],ok:/Android Debug Bridge/,own:'android-sdk\\platform-tools\\adb.exe',home:2,noPath:true,
  dirs:e=>[e.ANDROID_HOME&&`${e.ANDROID_HOME}\\platform-tools\\adb.exe`,e.ANDROID_SDK_ROOT&&`${e.ANDROID_SDK_ROOT}\\platform-tools\\adb.exe`,`${e.LOCALAPPDATA}\\Android\\Sdk\\platform-tools\\adb.exe`]},
 gradle:{exe:'gradle.bat',lx:'gradle',ver:['--version'],ok:/Gradle \d/,own:'gradle\\bin\\gradle.bat',dirs:e=>[e.GRADLE_HOME&&`${e.GRADLE_HOME}\\bin\\gradle.bat`]},
 node:{exe:'node.exe',lx:'node',ver:['--version'],ok:/^v\d+/m,own:'node\\node.exe',dirs:e=>[`${e.ProgramFiles}\\nodejs\\node.exe`,`${e.LOCALAPPDATA}\\Programs\\nodejs\\node.exe`]},
 git:{exe:'git.exe',lx:'git',ver:['--version'],ok:/git version/,own:'git\\cmd\\git.exe',dirs:e=>[`${e.ProgramFiles}\\Git\\cmd\\git.exe`,`${e.LOCALAPPDATA}\\Programs\\Git\\cmd\\git.exe`]},
 nsis:{exe:'makensis.exe',lx:'makensis',ver:['/VERSION'],ok:/v?3\.\d+/,own:'nsis\\makensis.exe',dirs:e=>[`${e['ProgramFiles(x86)']}\\NSIS\\makensis.exe`,`${e.ProgramFiles}\\NSIS\\makensis.exe`]},
 dotnet:{exe:'dotnet.exe',lx:'dotnet',ver:['--version'],ok:/^\d+\.\d+/m,own:'dotnet\\dotnet.exe',dirs:e=>[`${e.ProgramFiles}\\dotnet\\dotnet.exe`]}};
/** d: {W, env, exists, readdir, run(exe,args)->{code,out}, own(rel)->abs, where(name)->[paths]} → {id,found,path,version,source,tried:[{path,why}]} */
function find(id,d){ const s=SPEC[id]; const e=d.env, tried=[]; const cands=[];
 const add=(p,src)=>{ if(p&&!cands.some(c=>c.p.toLowerCase()===p.toLowerCase())) cands.push({p,src}) };
 if(s.own) add(d.own(s.own),'папка инструментов студии');
 if(d.W){ for(const p of (s.dirs(e)||[]).filter(Boolean)) for(const g of globOne(p,d)) add(g,'стандартная папка');
  if(id==='python'){ const r=d.run('py',['-3','-c','import sys;print(sys.executable)']); const p=(r.code===0&&String(r.out).trim().split(/\r?\n/).pop())||''; if(p&&/python/i.test(p)) add(p.trim(),'py -3 (Python Launcher)') }
  if(!s.noPath) for(const p of d.where(s.exe)) add(p,'PATH') }
 else { if(!s.noPath) for(const p of d.where(s.lx)) add(p,'PATH'); if(id==='android'){ for(const h of [e.ANDROID_HOME,e.ANDROID_SDK_ROOT].filter(Boolean)) add(h+'/platform-tools/adb','ANDROID_HOME') } }
 for(const c of cands){ if(d.W&&STUB.test(c.p)){ tried.push({path:c.p,why:'заглушка Microsoft Store (не настоящий Python) — пропускаю'}); continue }
  if(!d.exists(c.p)){ tried.push({path:c.p,why:'файла нет'}); continue }
  const r=d.run(c.p,s.ver); const out=String(r.out||'').trim(); const m=out.match(s.ok);
  if(r.code===0||m&&id==='jdk'){ if(m){ const ver=(out.split(/\r?\n/).find(l=>s.ok.test(l))||out).trim().slice(0,80); let home=null; if(s.home){ home=c.p; for(let k=0;k<s.home;k++) home=(d.W?path.win32:path.posix).dirname(home) }
    if(id==='jdk'&&d.W&&!d.exists((home||'')+'\\bin\\javac.exe')){ tried.push({path:c.p,why:'это JRE без javac (нужен JDK)'}); continue }
    return {id,found:true,path:c.p,dir:(d.W?path.win32:path.posix).dirname(c.p),home,version:ver,source:c.src,tried} }
   tried.push({path:c.p,why:'запустился, но ответ не похож на нужную версию: '+(out.slice(0,60)||'(пусто)')}); continue }
  tried.push({path:c.p,why:'не запускается (код '+r.code+')'+(out?': '+out.slice(0,80):'')}) }
 return {id,found:false,tried} }
module.exports={find,SPEC,parseRegPath,mergePath,expand,globOne,pathDirs,STUB};
