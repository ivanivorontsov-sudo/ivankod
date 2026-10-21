// Запуск под wine (настоящий Windows-node): .bat в пути «C:\Users\Иван Дубль\…\ИванКод\…», JAVA_HOME с пробелом и кириллицей, папка из латиницы.
// wine node.exe test/wine/cyr-path.js  → печатает PASS/FAIL
const fs=require('fs'), path=require('path'), cp=require('child_process');
const T=require('../../app/tools.js');
const fails=[]; const ok=(c,m)=>{ console.log((c?'PASS ':'FAIL ')+m); if(!c) fails.push(m) };
const prof='C:\\users\\Иван Дубль'; const tools=path.join(prof,'AppData','Roaming','ИванКод','tools'); const jdk=path.join(tools,'jdk'); const gb=path.join(tools,'gradle','bin');
fs.mkdirSync(path.join(jdk,'bin'),{recursive:true}); fs.mkdirSync(gb,{recursive:true}); fs.writeFileSync(path.join(jdk,'bin','marker.txt'),'x');
const bat=path.join(gb,'gradle.bat'); fs.writeFileSync(bat,'@echo off\r\nif "%JAVA_HOME%"=="" (echo ERROR: JAVA_HOME is not set& exit /b 9009)\r\nif not exist "%JAVA_HOME%\\bin\\marker.txt" (echo ERROR: bad JAVA_HOME "%JAVA_HOME%"& exit /b 3)\r\necho Gradle 8.10.2 arg=%1\r\n');
// так студия запускает .bat (realDeps.run): полный путь в кавычках, shell:true
const run=(env)=>cp.spawnSync('"'+bat+'" --version',{shell:true,encoding:'utf8',timeout:20000,windowsHide:true,env});
let r=run({...process.env,JAVA_HOME:''}); ok(r.status!==0&&/JAVA_HOME is not set/.test(r.stdout),'без JAVA_HOME — та самая ошибка 1.3.0 воспроизводится ('+r.status+')');
r=run({...process.env,JAVA_HOME:jdk}); ok(r.status===0&&/Gradle 8\.10\.2 arg=--version/.test(r.stdout),'с JAVA_HOME на кириллице и с пробелом .bat работает: '+JSON.stringify((r.stdout||'')+(r.stderr||'')).slice(0,120));
ok(!T.asciiOk(prof)&&T.asciiOk('C:\\ProgramData\\IvanCode\\tools'),'кириллица и пробел распознаются как «не латиница»');
const root=T.pickAsciiRoot(process.env); ok(!!root&&T.asciiOk(root),'папка из латиницы для инструментов создаётся: '+root);
// sdkmanager.bat в пути с кириллицей и пробелом через runBat; ответ cmd в cp866 перекодируется
const sdkm=path.join(tools,'android-sdk','cmdline-tools','latest','bin','sdkmanager.bat'); fs.mkdirSync(path.dirname(sdkm),{recursive:true});
const cp866=s=>Buffer.from([...s].map(c=>{ const k=c.charCodeAt(0); if(k<128) return k; if(k>=0x410&&k<=0x42F) return k-0x410+0x80; if(k>=0x430&&k<=0x43F) return k-0x430+0xA0; if(k>=0x440&&k<=0x44F) return k-0x440+0xE0; return 63 }));
fs.writeFileSync(sdkm,Buffer.concat([Buffer.from('@echo off\r\nif exist "%~1\\x.txt" (echo FOUND) else (echo NOTFOUND)\r\necho '),cp866('Лицензии приняты'),Buffer.from('\r\nexit /b 0\r\n')]));
fs.writeFileSync(path.join(tools,'android-sdk','x.txt'),'1'); T.runBat(sdkm,[path.join(tools,'android-sdk'),'--licenses'],{env:process.env,input:'y\n'},null).then(r=>{
 ok(r.code===0&&/FOUND/.test(r.out)&&!/NOTFOUND/.test(r.out),'sdkmanager.bat в «…\\Иван Дубль\\…\\ИванКод\\…» запускается, путь доходит целым: '+JSON.stringify(r.out).slice(0,160));
 ok(/Лицензии приняты/.test(r.out)&&!/\uFFFD/.test(r.out),'вывод в cp866 читается без «�»');
 console.log(fails.length?'RESULT FAIL '+fails.length:'RESULT PASS') });
if(0)console.log(fails.length?'RESULT FAIL '+fails.length:'RESULT PASS');
