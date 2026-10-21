// ИванКод: сборка APK без Gradle/JDK/SDK — готовый шаблон WebView + файлы программы + подпись APK v2 (чистый JS)
const fs=require('fs'), zlib=require('zlib'), crypto=require('crypto');
// ---- zip ----
function crc32(b){ let c, crc=0xFFFFFFFF; if(!crc32.t){ crc32.t=new Int32Array(256); for(let n=0;n<256;n++){ c=n; for(let k=0;k<8;k++) c=c&1?0xEDB88320^(c>>>1):c>>>1; crc32.t[n]=c } }
 for(let i=0;i<b.length;i++) crc=crc32.t[(crc^b[i])&0xFF]^(crc>>>8); return (crc^0xFFFFFFFF)>>>0 }
function zipRead(buf){ let e=buf.length-22; while(e>=0&&buf.readUInt32LE(e)!==0x06054b50) e--; if(e<0) throw new Error('не zip');
 const n=buf.readUInt16LE(e+10), cdOff=buf.readUInt32LE(e+16); const out=[]; let p=cdOff;
 for(let i=0;i<n;i++){ if(buf.readUInt32LE(p)!==0x02014b50) throw new Error('битый каталог zip'); const method=buf.readUInt16LE(p+10), crc=buf.readUInt32LE(p+16), csize=buf.readUInt32LE(p+20), usize=buf.readUInt32LE(p+24), nl=buf.readUInt16LE(p+28), xl=buf.readUInt16LE(p+30), cl=buf.readUInt16LE(p+32), lho=buf.readUInt32LE(p+42);
  const name=buf.slice(p+46,p+46+nl).toString('utf8'); const lnl=buf.readUInt16LE(lho+26), lxl=buf.readUInt16LE(lho+28); const ds=lho+30+lnl+lxl;
  out.push({name,method,crc,csize,usize,raw:buf.slice(ds,ds+csize)}); p+=46+nl+xl+cl } return out }
function entryData(e){ return e.method===0?e.raw:zlib.inflateRawSync(e.raw) }
function mkEntry(name,data,store){ const raw=store?data:zlib.deflateRawSync(data,{level:9}); return {name,method:store?0:8,crc:crc32(data),csize:raw.length,usize:data.length,raw} }
function zipWrite(entries){ const parts=[], cd=[]; let off=0;
 for(const e of entries){ const nb=Buffer.from(e.name,'utf8'); let pad=0; if(e.method===0){ const al=/\.so$/.test(e.name)?4096:4; pad=(al-((off+30+nb.length)%al))%al }
  const h=Buffer.alloc(30); h.writeUInt32LE(0x04034b50,0); h.writeUInt16LE(20,4); h.writeUInt16LE(0x0800,6); h.writeUInt16LE(e.method,8); h.writeUInt16LE(0,10); h.writeUInt16LE(0x21,12); h.writeUInt32LE(e.crc,14); h.writeUInt32LE(e.csize,18); h.writeUInt32LE(e.usize,22); h.writeUInt16LE(nb.length,26); h.writeUInt16LE(pad,28);
  parts.push(h,nb,Buffer.alloc(pad),e.raw); const c=Buffer.alloc(46); c.writeUInt32LE(0x02014b50,0); c.writeUInt16LE(20,4); c.writeUInt16LE(20,6); c.writeUInt16LE(0x0800,8); c.writeUInt16LE(e.method,10); c.writeUInt16LE(0,12); c.writeUInt16LE(0x21,14); c.writeUInt32LE(e.crc,16); c.writeUInt32LE(e.csize,20); c.writeUInt32LE(e.usize,24); c.writeUInt16LE(nb.length,28); c.writeUInt32LE(off,42);
  cd.push(c,nb); off+=30+nb.length+pad+e.raw.length }
 const cdb=Buffer.concat(cd); const eo=Buffer.alloc(22); eo.writeUInt32LE(0x06054b50,0); eo.writeUInt16LE(entries.length,8); eo.writeUInt16LE(entries.length,10); eo.writeUInt32LE(cdb.length,12); eo.writeUInt32LE(off,16);
 return {body:Buffer.concat(parts),cd:cdb,eocd:eo} }
// ---- бинарный AndroidManifest: замена строк в пуле ----
function axmlReplace(buf,map){ if(buf.readUInt16LE(0)!==3) throw new Error('не AXML'); const sp=8; if(buf.readUInt16LE(sp)!==1) throw new Error('нет пула строк');
 const hs=buf.readUInt16LE(sp+2), size=buf.readUInt32LE(sp+4), cnt=buf.readUInt32LE(sp+8), styles=buf.readUInt32LE(sp+12), flags=buf.readUInt32LE(sp+16), sStart=buf.readUInt32LE(sp+20);
 if(styles) throw new Error('стили в пуле не поддерживаются'); const u8=!!(flags&0x100); const strs=[];
 for(let i=0;i<cnt;i++){ let p=sp+sStart+buf.readUInt32LE(sp+hs+i*4);
  if(u8){ let n=buf[p++]; if(n&0x80) p++; let bl=buf[p++]; if(bl&0x80) bl=((bl&0x7f)<<8)|buf[p++]; strs.push(buf.slice(p,p+bl).toString('utf8')) }
  else { let n=buf.readUInt16LE(p); p+=2; if(n&0x8000){ n=((n&0x7fff)<<16)|buf.readUInt16LE(p); p+=2 } strs.push(buf.slice(p,p+n*2).toString('utf16le')) } }
 const ns=strs.map(s=>map[s]!=null?map[s]:s); const datas=ns.map(s=>{ const t=Buffer.from(s,'utf16le'); const n=s.length; const l=n>0x7fff?Buffer.from([((n>>16)&0x7fff|0x8000)&0xff,((n>>16)&0x7fff|0x8000)>>8,n&0xff,(n>>8)&0xff]):Buffer.from([n&0xff,n>>8]); return Buffer.concat([l,t,Buffer.alloc(2)]) });
 const offs=Buffer.alloc(cnt*4); let o=0; datas.forEach((d,i)=>{ offs.writeUInt32LE(o,i*4); o+=d.length }); let sd=Buffer.concat(datas); if(sd.length%4) sd=Buffer.concat([sd,Buffer.alloc(4-sd.length%4)]);
 const head=Buffer.from(buf.slice(sp,sp+hs)); const nStart=hs+cnt*4; const nSize=nStart+sd.length; head.writeUInt32LE(nSize,4); head.writeUInt32LE(flags&~0x100,16); head.writeUInt32LE(nStart,20); head.writeUInt32LE(0,24);
 const rest=buf.slice(sp+size); const out=Buffer.concat([buf.slice(0,8),head,offs,sd,rest]); out.writeUInt32LE(out.length,4); return {buf:out,strings:strs} }
// ---- DER и самоподписанный сертификат ----
const der=(tag,...c)=>{ const b=Buffer.concat(c); const l=b.length; const L=l<128?Buffer.from([l]):l<256?Buffer.from([0x81,l]):l<65536?Buffer.from([0x82,l>>8,l&255]):Buffer.from([0x83,l>>16,(l>>8)&255,l&255]); return Buffer.concat([Buffer.from([tag]),L,b]) };
const oid=s=>{ const p=s.split('.').map(Number); const b=[40*p[0]+p[1]]; for(const v of p.slice(2)){ const t=[]; let x=v; do{ t.unshift(x&0x7f); x>>=7 }while(x); for(let i=0;i<t.length-1;i++) t[i]|=0x80; b.push(...t) } return der(6,Buffer.from(b)) };
function makeCert(name){ const {privateKey,publicKey}=crypto.generateKeyPairSync('rsa',{modulusLength:2048}); const spki=publicKey.export({type:'spki',format:'der'});
 const alg=der(0x30,oid('1.2.840.113549.1.1.11'),Buffer.from([5,0])); const nm=der(0x30,der(0x31,der(0x30,oid('2.5.4.3'),der(0x0c,Buffer.from(name,'utf8')))));
 const gt=d=>der(0x18,Buffer.from(d.toISOString().replace(/[-:T]/g,'').slice(0,14)+'Z')); const now=new Date(); const end=new Date(now.getTime()+30*365*864e5);
 const serial=crypto.randomBytes(8); serial[0]&=0x7f; const tbs=der(0x30,der(0xa0,der(2,Buffer.from([2]))),der(2,serial),alg,nm,der(0x30,gt(now),gt(end)),nm,spki);
 const sig=crypto.sign('sha256',tbs,privateKey); const cert=der(0x30,tbs,alg,der(3,Buffer.concat([Buffer.from([0]),sig])));
 return {key:privateKey.export({type:'pkcs8',format:'pem'}),cert:cert.toString('base64')} }
// ---- подпись APK Signature Scheme v2 ----
const u32=n=>{ const b=Buffer.alloc(4); b.writeUInt32LE(n); return b }, u64=n=>{ const b=Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b }, lp=b=>Buffer.concat([u32(b.length),b]);
function digest(sections){ const ds=[]; for(const s of sections) for(let i=0;i<s.length;i+=1048576){ const c=s.slice(i,i+1048576); ds.push(crypto.createHash('sha256').update(Buffer.from([0xa5])).update(u32(c.length)).update(c).digest()) }
 return crypto.createHash('sha256').update(Buffer.from([0x5a])).update(u32(ds.length)).update(Buffer.concat(ds)).digest() }
function signV2(z,keyPem,certB64){ const key=crypto.createPrivateKey(keyPem); const cert=Buffer.from(certB64,'base64'); const spki=crypto.createPublicKey(key).export({type:'spki',format:'der'});
 const eo=Buffer.from(z.eocd); eo.writeUInt32LE(z.body.length,16); const dg=digest([z.body,z.cd,eo]);
 const signed=Buffer.concat([lp(lp(Buffer.concat([u32(0x0103),lp(dg)]))),lp(lp(cert)),lp(Buffer.alloc(0))]);
 const sig=crypto.sign('sha256',signed,key); const signer=Buffer.concat([lp(signed),lp(lp(Buffer.concat([u32(0x0103),lp(sig)]))),lp(spki)]);
 const val=lp(lp(signer)); const pair=Buffer.concat([u64(4+val.length),u32(0x7109871a),val]); const sz=pair.length+8+16;
 const block=Buffer.concat([u64(sz),pair,u64(sz),Buffer.from('APK Sig Block 42')]); const eo2=Buffer.from(z.eocd); eo2.writeUInt32LE(z.body.length+block.length,16);
 return Buffer.concat([z.body,block,z.cd,eo2]) }
// пакет Android из имени: ru.ivancode.<транслит>
function pkgName(slug){ let s=String(slug||'app').toLowerCase().replace(/[^a-z0-9_]/g,'_').replace(/^[^a-z]+/,''); return 'ru.ivancode.'+(s||'app').slice(0,40) }
/** o: {template, out, label, pkg, files:{'index.html':Buffer|string,...}, icons:{mdpi:Buffer,...}, keyFile, version} */
function buildApk(o){ const t0=Date.now(); const ents=zipRead(fs.readFileSync(o.template)); const out=[];
 let k; try{ k=JSON.parse(fs.readFileSync(o.keyFile,'utf8')) }catch{ k=makeCert('IvanCode user'); try{ fs.writeFileSync(o.keyFile,JSON.stringify(k)) }catch{} }
 for(const e of ents){ if(/^assets\/www\//.test(e.name)) continue; if(e.name==='AndroidManifest.xml'){ const r=axmlReplace(entryData(e),{'ru.ivancode.w':o.pkg,'IVANCODE_APP_LABEL_PLACEHOLDER':o.label,'1.0':o.version||'1.0'}); out.push(mkEntry(e.name,r.buf,false)); continue }
  const m=e.name.match(/^res\/mipmap-(\w+?)-v4\/ic_launcher\.png$/); if(m&&o.icons&&o.icons[m[1]]){ out.push(mkEntry(e.name,o.icons[m[1]],true)); continue } out.push(e) }
 for(const [n,d] of Object.entries(o.files)) out.push(mkEntry('assets/www/'+n.replace(/\\/g,'/'),Buffer.isBuffer(d)?d:Buffer.from(d,'utf8'),false));
 const apk=signV2(zipWrite(out),k.key,k.cert); fs.writeFileSync(o.out,apk); return {ok:true,file:o.out,size:apk.length,ms:Date.now()-t0} }
module.exports={buildApk,zipRead,zipWrite,mkEntry,entryData,axmlReplace,makeCert,signV2,pkgName,crc32};
