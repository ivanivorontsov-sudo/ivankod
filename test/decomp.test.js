// Декомпиляция 1.4: образцы собираются прямо в тесте (javac, gcc, python3.8), декомпилируются готовыми инструментами.
// Инструменты берутся из IVK_DTOOLS (cfr.jar, jadx/, ilspycmd/, pyinstxtractor.py, pylib/), иначе соответствующие тесты пропускаются.
// Программы-образцы НИКОГДА не запускаются. С IVANCODE_SANDBOX_USER=ivtest инструменты идут через sudo -u ivtest nice prlimit timeout.
const test=require('node:test'), assert=require('node:assert'), fs=require('fs'), path=require('path'), os=require('os'), cp=require('child_process');
const D=require('../app/decomp/decomp.js'), TP=require('../app/decomp/topon.js'), Y=require('../app/decomp/pon/yadro.js');
const TOOLS=process.env.IVK_DTOOLS||'', JAVA=process.env.IVK_JAVA||'', DOTNET=process.env.IVK_DOTNET||'', PY38=process.env.IVK_PY38||'';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'ivk-dt-')); fs.chmodSync(tmp,0o777);
const env=()=>D.makeEnv({root:TOOLS,log(){},download(){throw new Error('в тестах ничего не скачиваем')},extract(){throw new Error('нет')},python:()=>PY38});
const opts=(extra={})=>({env:extra.env||env(),java:()=>JAVA,dotnet:()=>DOTNET,python:()=>PY38,tmp,outDir:fs.mkdtempSync(path.join(tmp,'o-')),timeout:300,...extra});
const has=x=>{ try{ return cp.spawnSync(x,['--version']).status===0 }catch{ return false } };
let jar=null, cls=null;
test.before(()=>{ if(JAVA){ const jd=path.dirname(JAVA); const s=path.join(tmp,'j'); fs.mkdirSync(path.join(s,'demo'),{recursive:true});
  fs.writeFileSync(path.join(s,'demo','Hello.java'),'package demo;\npublic class Hello {\n  static int sum(int n){ int s=0; for(int i=0;i<n;i++){ s+=i; } return s; }\n  public static void main(String[] a){ int x=sum(10); if(x>40){ System.out.println("много " + x); } else { System.out.println("мало"); } }\n}\n');
  assert.strictEqual(cp.spawnSync(path.join(jd,'javac'),['-encoding','UTF-8','-d',path.join(s,'c'),path.join(s,'demo','Hello.java')]).status,0);
  jar=path.join(tmp,'hello.jar'); assert.strictEqual(cp.spawnSync(path.join(jd,'jar'),['cf',jar,'-C',path.join(s,'c'),'.']).status,0); cls=path.join(s,'c','demo','Hello.class'); fs.chmodSync(jar,0o644) } });
test.after(()=>{ try{ fs.rmSync(tmp,{recursive:true,force:true}) }catch{} });

test('detect: форматы по сигнатурам',()=>{ const w=(n,b)=>{ const f=path.join(tmp,n); fs.writeFileSync(f,b); return f };
 assert.strictEqual(D.detect(w('a.dex',Buffer.from('dex\n035\0'+'x'.repeat(100)))).kind,'dex');
 assert.strictEqual(D.detect(w('a.bin',Buffer.from([0x55,0x0d,0x0d,0x0a,0,0,0,0]))).py,'3.8');
 const pe=Buffer.alloc(512); pe.write('MZ'); pe.writeUInt32LE(0x80,0x3c); pe.write('PE\0\0',0x80,'latin1'); pe.writeUInt16LE(0x10b,0x80+24);
 assert.strictEqual(D.detect(w('n.exe',pe)).kind,'native'); const pe2=Buffer.from(pe); pe2.writeUInt32LE(0x2000,0x80+24+96+14*8); assert.strictEqual(D.detect(w('d.dll',pe2)).kind,'dotnet');
 assert.strictEqual(D.detect(w('p.exe',Buffer.concat([pe,Buffer.from('MEI\x0c\x0b\x0a\x0b\x0e','latin1'),Buffer.alloc(80)]))).kind,'pyinstaller');
 if(has('gcc')){ const c=path.join(tmp,'f.c'), o=path.join(tmp,'f.elf'); fs.writeFileSync(c,'int main(){return 0;}'); cp.spawnSync('gcc',[c,'-o',o]); assert.strictEqual(D.detect(o).kind,'native') }
 if(jar){ assert.strictEqual(D.detect(jar).kind,'jar'); assert.strictEqual(D.detect(cls).kind,'class') } });

test('перевод Java/C#/C/Python в Понятный проходит проверку языка',async()=>{
 for(const [l,s,want] of [['java','class A { static int sq(int x){ return x*x; } public static void main(String[] a){ for(int i=0;i<3;i++){ System.out.println(sq(i)); } } }',/пиши sq\(i\)/],
  ['csharp','class P { static int Sq(int x) => x * x; static void Main(){ foreach (var v in new int[]{1,2}) { Console.WriteLine(Sq(v)); } } }',/для каждого v из/],
  ['c','int fact(int n){ if(n<=1) return 1; return n*fact(n-1); }\nint main(void){ int i; for(i=0;i<5;i++){ puts("x"); } return 0; }',/функция fact\(n\)/],
  ['python','def f(x):\n    return x*2\nprint(f(3))\n',/пиши f\(3\)/]]){ const r=await TP.translate(s,l); assert.match(r.code,want,l+':\n'+r.code); assert.ok(!r.check,l+': '+r.check) } });

test('неподдержанное (goto) остаётся комментарием, а не теряется',async()=>{ const r=await TP.translate('int main(void){ goto e; e: return 0; }','c'); assert.match(r.code,/#.*goto/) });

test('CFR: jar → Java → Понятный',{skip:!(TOOLS&&JAVA)&&'нет IVK_DTOOLS/IVK_JAVA'},async()=>{ const r=await D.decompile(jar,opts()); assert.ok(r.ok,r.error); assert.ok(r.files.some(f=>/Hello\.java$/.test(f))); const p=fs.readFileSync(r.ponFile,'utf8'); assert.match(p,/функция sum\(n\)/); assert.match(p,/пиши/); assert.match(p,/НЕ запускалась/) });
test('JADX: тот же код через jadx',{skip:!(TOOLS&&JAVA)&&'нет IVK_DTOOLS/IVK_JAVA'},async()=>{ const r=await D.decompile(jar,opts({kind:'apk'})); assert.ok(r.ok,r.error); assert.match(fs.readFileSync(r.ponFile,'utf8'),/sum/) });
test('ILSpy: .NET dll → C# → Понятный',{skip:!(TOOLS&&DOTNET)&&'нет IVK_DOTNET'},async()=>{ const dll=path.join(TOOLS,'ilspycmd','tools','net8.0','any','Microsoft.Extensions.Logging.Debug.dll'); const r=await D.decompile(dll,opts()); assert.ok(r.ok,r.error); assert.ok(r.files.some(f=>/\.cs$/.test(f))); assert.ok(r.translated>0) });
test('decompyle3: Python 3.8 .pyc → Python → Понятный',{skip:!(TOOLS&&PY38)&&'нет IVK_PY38'},async()=>{ const s=path.join(tmp,'prog.py'); fs.writeFileSync(s,'def double(x):\n    return x * 2\n\nfor i in range(3):\n    print(double(i))\n');
 const pyc=path.join(tmp,'prog.pyc'); assert.strictEqual(cp.spawnSync(PY38,['-c','import py_compile,sys;py_compile.compile(sys.argv[1],cfile=sys.argv[2],doraise=True)',s,pyc]).status,0); fs.chmodSync(pyc,0o644);
 const r=await D.decompile(pyc,opts()); assert.ok(r.ok,r.error); const p=fs.readFileSync(r.ponFile,'utf8'); assert.match(p,/функция double\(x\)/,p); assert.match(p,/пиши double\(i\)/,p) });
test('машинный код без Ghidra: честно просит скачать Ghidra',{skip:!has('gcc')&&'нет gcc'},async()=>{ const c=path.join(tmp,'n.c'), o=path.join(tmp,'n.elf'); fs.writeFileSync(c,'int main(){return 0;}'); cp.spawnSync('gcc',[c,'-o',o]); const r=await D.decompile(o,opts({env:D.makeEnv({root:path.join(tmp,'empty'),log(){}})})); assert.strictEqual(r.ok,false); assert.strictEqual(r.need,'ghidra') });
