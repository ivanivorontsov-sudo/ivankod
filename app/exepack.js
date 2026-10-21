// ИванКод: сборка EXE без Python/NSIS — готовая запускалка (tpl/runner.exe) + приложенные файлы программы
const fs=require('fs'), path=require('path');
function payload(files,name,id){ const parts=[]; const all=[['__name',Buffer.from(name,'utf8')],['__id',Buffer.from(id,'utf8')],...Object.entries(files).map(([n,d])=>[n.replace(/\\/g,'/'),Buffer.isBuffer(d)?d:Buffer.from(d,'utf8')])];
 const c=Buffer.alloc(4); c.writeUInt32LE(all.length); parts.push(c);
 for(const [n,d] of all){ const nb=Buffer.from(n,'utf8'); const h=Buffer.alloc(2); h.writeUInt16LE(nb.length); const l=Buffer.alloc(4); l.writeUInt32LE(d.length); parts.push(h,nb,l,d) } return Buffer.concat(parts) }
// значок: resedit (чистый JS, без внешних программ)
async function setIcon(buf,ico){ if(!ico||!fs.existsSync(ico)) return {buf,icon:false}; try{ const R=await import('resedit'); const exe=R.NtExecutable.from(buf); const res=R.NtExecutableResource.from(exe); const g=res.entries.find(e=>e.type===14);
 const f=R.Data.IconFile.from(fs.readFileSync(ico)); R.Resource.IconGroupEntry.replaceIconsForResource(res.entries,g?g.id:1,g?g.lang:1033,f.icons.map(i=>i.data)); res.outputResource(exe); return {buf:Buffer.from(exe.generate()),icon:true} }catch(e){ return {buf,icon:false,err:e.message} } }
/** o: {tplDir, out, name, id, files, ico, installer:bool} */
async function buildExe(o){ const t0=Date.now(); const ic=await setIcon(fs.readFileSync(path.join(o.tplDir,'runner.exe')),o.ico); const base=ic.buf;
 const pl=payload(o.files,o.name,o.id); const tr=Buffer.alloc(13); tr.write('IVKPACK1',0,'latin1'); tr.writeUInt32LE(base.length,8); tr[12]=o.installer?1:0;
 const out=Buffer.concat([base,pl,tr]); fs.mkdirSync(path.dirname(o.out),{recursive:true}); fs.writeFileSync(o.out,out); return {ok:true,file:o.out,size:out.length,icon:ic.icon,ms:Date.now()-t0} }
module.exports={buildExe,payload};
