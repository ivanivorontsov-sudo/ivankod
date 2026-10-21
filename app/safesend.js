// 1.3.1: безопасная отправка в окно. Дочерние процессы, потоки и таймеры могут сработать после закрытия окна —
// тогда webContents уже уничтожен и send() бросает «Object has been destroyed» (падение студии в 1.3.0).
function alive(w){ try{ return !!(w&&!w.isDestroyed()&&w.webContents&&!w.webContents.isDestroyed()) }catch{ return false } }
function makeSend(getWin){ return (ch,...a)=>{ const w=getWin(); if(!alive(w)) return false; try{ w.webContents.send(ch,...a); return true }catch{ return false } } }
// необработанная ошибка: в журнал, а не окно-ошибку Electron
function guard(proc,logFile,fs=require('fs')){ const h=kind=>e=>{ try{ fs.appendFileSync(logFile,new Date().toISOString()+' '+kind+': '+((e&&e.stack)||e)+'\n') }catch{} }; proc.on('uncaughtException',h('uncaughtException')); proc.on('unhandledRejection',h('unhandledRejection')); return h }
module.exports={alive,makeSend,guard};
