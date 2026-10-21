// node scripts/gen-ponsyntax.js /workspace/ponyatny — переносит docs/СИНТАКСИС.md и src/std.js компилятора в app/
const fs=require('fs'),path=require('path'); const R=process.argv[2]||path.join(__dirname,'..','..','ponyatny');
const S=fs.readFileSync(path.join(R,'docs','СИНТАКСИС.md'),'utf8'); const STD=require(path.join(R,'src','std.js'));
const wrap=(c,v,g)=>c+"\n(function(r){const V="+JSON.stringify(v)+";if(typeof module!=='undefined')module.exports=V;else r."+g+"=V})(typeof window!=='undefined'?window:globalThis);\n";
const A=path.join(__dirname,'..','app');
fs.writeFileSync(path.join(A,'ponsyntax.js'),wrap('// Описание синтаксиса «Понятный» 2.2 (docs/СИНТАКСИС.md) — для справки и ИИ',S,'PON_SYNTAX'));
fs.writeFileSync(path.join(A,'ponstd.js'),wrap('// Стандартная библиотека «Понятный» (src/std.js компилятора) — для справки и подсказок',STD,'PON_STD'));
console.log('ok',S.length,Object.keys(STD).length);
