// Поиск инструментов на «чистом» Windows 11 и с Android Studio — на поддельной файловой системе
const test=require('node:test'), assert=require('node:assert');
const TF=require('../app/toolfind.js');
const E={LOCALAPPDATA:'C:\\Users\\i\\AppData\\Local',ProgramFiles:'C:\\Program Files','ProgramFiles(x86)':'C:\\Program Files (x86)',USERPROFILE:'C:\\Users\\i',SystemDrive:'C:'};
function fake(files,vers,where={}){ const F=new Set(files.map(f=>f.toLowerCase())); return {W:true,env:E,own:r=>'C:\\IvanTools\\'+r,
 exists:p=>F.has(String(p).toLowerCase()),
 readdir:d=>{ const pre=d.toLowerCase().replace(/\\+$/,'')+'\\'; const s=new Set(); for(const f of files){ if(f.toLowerCase().startsWith(pre)) s.add(f.slice(pre.length).split('\\')[0]) } if(!s.size) throw new Error('нет папки'); return [...s] },
 run:(exe)=>{ const v=vers[String(exe).toLowerCase()]; return v?{code:0,out:v}:{code:1,out:''} }, where:n=>where[n]||[] } }
test('чистый Windows: ничего не найдено, причины понятны',()=>{ for(const id of ['jdk','android','gradle','python']){ const r=TF.find(id,fake([],{})); assert.equal(r.found,false,id) } });
test('заглушка Microsoft Store не принимается за Python',()=>{ const stub='C:\\Users\\i\\AppData\\Local\\Microsoft\\WindowsApps\\python.exe'; const r=TF.find('python',fake([stub],{[stub.toLowerCase()]:'Python'},{'python.exe':[stub]})); assert.equal(r.found,false); assert.match(r.tried.map(t=>t.why).join(' '),/заглушка/) });
test('Java из Android Studio (jbr) находится и даёт JAVA_HOME',()=>{ const j='C:\\Program Files\\Android\\Android Studio\\jbr\\bin\\java.exe'; const r=TF.find('jdk',fake([j,'C:\\Program Files\\Android\\Android Studio\\jbr\\bin\\javac.exe'],{[j.toLowerCase()]:'openjdk version "21.0.3" 2024-04-16'}));
 assert.ok(r.found); assert.equal(r.home,'C:\\Program Files\\Android\\Android Studio\\jbr') });
test('JRE без javac отвергается',()=>{ const j='C:\\Program Files\\Java\\jdk-17\\bin\\java.exe'; const r=TF.find('jdk',fake([j],{[j.toLowerCase()]:'java version "17.0.2"'})); assert.equal(r.found,false) });
test('Android SDK из Android Studio (%LOCALAPPDATA%\\Android\\Sdk)',()=>{ const a='C:\\Users\\i\\AppData\\Local\\Android\\Sdk\\platform-tools\\adb.exe'; const r=TF.find('android',fake([a],{[a.toLowerCase()]:'Android Debug Bridge version 1.0.41'})); assert.ok(r.found) });
test('Gradle, скачанный Android Studio (.gradle\\wrapper\\dists), находится; старый 7.x — нет',()=>{ const g='C:\\Users\\i\\.gradle\\wrapper\\dists\\gradle-8.10.2-bin\\abc123\\gradle-8.10.2\\bin\\gradle.bat'; const old='C:\\Users\\i\\.gradle\\wrapper\\dists\\gradle-7.5-bin\\x\\gradle-7.5\\bin\\gradle.bat';
 let r=TF.find('gradle',fake([g],{[g.toLowerCase()]:'Gradle 8.10.2'})); assert.ok(r.found); assert.equal(r.path,g);
 r=TF.find('gradle',fake([old],{[old.toLowerCase()]:'Gradle 7.5'})); assert.equal(r.found,false) });
test('deps(): Kotlin требует JDK, Android SDK, Gradle; Понятный — встроенный компилятор',()=>{ const T=require('../app/tools.js'); const k=T.deps('kotlin','phone'); assert.deepEqual(k.map(d=>d.id),['jdk','android','gradle']); for(const d of k){ assert.ok(d.why&&d.name) }
 const p=T.deps('pon','pc'); assert.equal(p.length,1); assert.equal(p[0].id,'ponyatny'); assert.ok(p[0].found,'компилятор в bin/ должен находиться') });
test('проблемы компьютера распознаются и не отдаются ИИ',()=>{ const K=require('../app/kotlinapp.js'); assert.ok(K.envProblem('SDK location not found. Define a valid SDK location with an ANDROID_HOME')); assert.ok(K.envProblem('Could not resolve com.android.tools.build:gradle:8.7.3')); assert.equal(K.envProblem("e: file:///x/App.kt:12:5 Unresolved reference 'foo'."),null);
 const WA=require('../app/webapp.js'); assert.ok(WA.envProblem('Python'),'однословный вывод заглушки Store — не ошибка программы') });
