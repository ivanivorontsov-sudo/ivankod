// каждый урок: пример компилируется и запускается, эталонное решение проходит автопроверку, пустое решение — нет
const test=require('node:test'), assert=require('node:assert');
const TU=require('../app/tutorial.js'), NB=require('../app/nativebuild.js');
test('11 уроков по описанию синтаксиса',()=>{ assert.ok(TU.LESSONS.length>=11); for(const id of ['vars','io','if','loops','func','lists','classes','modules','typos']) assert.ok(TU.LESSONS.find(l=>l.id===id),id) });
for(const l of TU.LESSONS){
 test('урок «'+l.title+'»: пример работает',async()=>{ const r=await NB.ponTry(l.example,{files:l.files,input:'Иван\n'}); assert.ok(r.compiled,r.error); assert.equal(r.code,0,r.out); assert.ok(r.out.trim().length>0) });
 test('урок «'+l.title+'»: решение проходит проверку',async()=>{ const r=await NB.ponTry(l.solution,{files:l.files,input:l.check.input}); const j=TU.judge(l,l.solution,r); assert.ok(j.ok,j.why+' | '+r.out) });
 test('урок «'+l.title+'»: неверное решение не засчитывается',async()=>{ const wrong='напиши "не то"'; const r=await NB.ponTry(wrong,{files:l.files,input:l.check.input}); assert.equal(TU.judge(l,wrong,r).ok,false) });
}
test('синтаксическая ошибка в решении: понятное сообщение со строкой',async()=>{ const r=await NB.ponTry('если 1 > 0 то\nнапиши 1\n'); assert.equal(r.compiled,false); assert.match(r.error,/строка 1/) });
