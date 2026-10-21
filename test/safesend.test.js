// 1.3.1: падение «Object has been destroyed» — процесс завершился после закрытия окна
const test=require('node:test'), assert=require('node:assert'), cp=require('child_process'), fs=require('fs'), path=require('path'), os=require('os');
const SS=require('../app/safesend.js');
function fakeWin(){ const w={dead:false,sent:[],isDestroyed(){ return this.dead },webContents:{isDestroyed:()=>w.dead,send(...a){ if(w.dead) throw new TypeError('Object has been destroyed'); w.sent.push(a) }}}; return w }
test('выход дочернего процесса после закрытия окна не роняет студию',async()=>{ let win=fakeWin(); const send=SS.makeSend(()=>win); const p=cp.spawn(process.execPath,['-e','setTimeout(()=>console.log("x"),200)']);
 const done=new Promise(r=>p.on('exit',c=>{ assert.doesNotThrow(()=>send('proc:exit','run',c)); r() })); p.stdout.on('data',d=>send('proc:data','run',String(d))); win.dead=true; await done; assert.equal(win.sent.length,0);
 win=null; assert.equal(send('x'),false); const w2=fakeWin(); win=w2; assert.equal(send('y',1),true); assert.deepEqual(w2.sent,[['y',1]]) });
test('в main.js нет прямых webContents.send — только безопасная отправка',()=>{ const src=fs.readFileSync(path.join(__dirname,'..','app','main.js'),'utf8'); assert.equal((src.match(/webContents\.send\(/g)||[]).length,0); assert.match(src,/win\.on\('closed'/); assert.match(src,/SS\.guard\(process/) });
test('необработанная ошибка пишется в журнал, а не в окно',()=>{ const log=path.join(fs.mkdtempSync(path.join(os.tmpdir(),'cr-')),'crash.log'); const EE=require('events'); const pr=new EE(); SS.guard(pr,log); pr.emit('uncaughtException',new TypeError('Object has been destroyed')); assert.match(fs.readFileSync(log,'utf8'),/uncaughtException: TypeError: Object has been destroyed/) });
