// ИванКод: чтение/запись с сохранением кодировки (UTF-8, UTF-8 BOM, UTF-16 LE BOM, Windows-1251)
'use strict';
const fs=require('fs');
const encOf=new Map();
let rev=null; const dec1251=new TextDecoder('windows-1251');
function revMap(){ if(rev) return rev; rev=new Map(); for(let i=0;i<256;i++){ const ch=dec1251.decode(Uint8Array.of(i)); if(ch!=='\uFFFD'&&!rev.has(ch)) rev.set(ch,i) } return rev }
function decode(buf){ if(buf.length>=2&&buf[0]===0xFF&&buf[1]===0xFE) return {enc:'utf16le',text:'\uFEFF'+buf.slice(2).toString('utf16le')};
 try{ return {enc:'utf8',text:new TextDecoder('utf-8',{fatal:true,ignoreBOM:true}).decode(buf)} }catch{ return {enc:'cp1251',text:dec1251.decode(buf)} } }
function encode(text,enc){ if(enc==='utf16le'){ return Buffer.concat([Buffer.from([0xFF,0xFE]),Buffer.from(String(text).replace(/^\uFEFF/,''),'utf16le')]) }
 if(enc==='cp1251'){ const m=revMap(); const t=String(text).replace(/^\uFEFF/,''); const out=Buffer.alloc(t.length); let i=0; for(const ch of t){ const b=ch.charCodeAt(0)<128?ch.charCodeAt(0):m.get(ch); if(b===undefined) return null; out[i++]=b } return out.slice(0,i) }
 return Buffer.from(String(text),'utf8') }
function read(f){ const r=decode(fs.readFileSync(f)); encOf.set(f,r.enc); return r.text }
function write(f,text){ const enc=encOf.get(f)||'utf8'; let b=encode(text,enc); if(!b){ b=Buffer.from('\uFEFF'+String(text).replace(/^\uFEFF/,''),'utf8'); encOf.set(f,'utf8') } fs.writeFileSync(f,b); return enc }
module.exports={read,write,decode,encode,encOf};
