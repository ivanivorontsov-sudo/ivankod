// ИванКод 1.4: перевод декомпилированного кода (Java, C#, C/C++, Python) в «Понятный» 2.5.
// Разбор — готовым tree-sitter (web-tree-sitter + грамматики java/c_sharp/c), перевод — готовым переводчиком компилятора «Понятный»
// (perevod-v.js: дерево ESTree → «Понятный»). Что не переводится, остаётся в программе комментарием с исходной строкой.
const fs=require('fs'), path=require('path');
const V=require('./pon/perevod-v.js');
const TSDIR=path.join(__dirname,'ts');
const GRAM={java:'tree-sitter-java.wasm',csharp:'tree-sitter-c_sharp.wasm',c:'tree-sitter-c.wasm'};
let _ts=null; const _lang={};
async function parser(lang){ const TS=require('./ts/tree-sitter.cjs');
 if(!_ts) _ts=TS.Parser.init({locateFile:(f)=>path.join(TSDIR,f)}); await _ts;
 if(!_lang[lang]) _lang[lang]=TS.Language.load(fs.readFileSync(path.join(TSDIR,GRAM[lang])));
 const p=new TS.Parser(); p.setLanguage(await _lang[lang]); return p }

const MAXNOTE=160;
function short(s){ s=String(s).replace(/\s+/g,' ').trim(); return s.length>MAXNOTE?s.slice(0,MAXNOTE)+'…':s }
// tree-sitter → ESTree (подмножество, которое понимает переводчик «Понятного»)
const INT_T=/^(int|long|short|byte|char|uint|ulong|ushort|sbyte|nint|Integer|Long|Short|Byte|size_t|ssize_t|(unsigned|signed)( (int|long|short|char|long long))?|long (long|int)|long long int|short int|u?int(8|16|32|64)_t)$/;
const NUM_T=/^(float|double|decimal|Float|Double|long double)$/, BOOL_T=/^(boolean|bool|Boolean|_Bool)$/;
const STD_EXC=/^(Exception|RuntimeException|Throwable|Error|[A-Z]\w*(Exception|Error))$/;
function convert(root,lang){
 const L=n=>({start:{line:n.startPosition.row+1,column:n.startPosition.column}});
 const F=(n,f)=>n.childForFieldName(f);
 const kids=n=>n.namedChildren.filter(x=>x.type!=='comment'&&x.type!=='line_comment'&&x.type!=='block_comment');
 const id=name=>({type:'Identifier',name});
 const lit=value=>({type:'Literal',value});
 const mem=(o,p)=>({type:'MemberExpression',object:o,property:typeof p==='string'?id(p):p,computed:typeof p!=='string'});
 const note=(n,why)=>({type:'PonNote',text:(why?why+': ':'исходник: ')+short(n.text),loc:L(n)});
 const unsup=(n,why)=>({type:'PonUnsupported',text:(why||'не переводится')+': '+short(n.text)});
 const expr=(e,n)=>({type:'ExpressionStatement',expression:e,loc:L(n)});
 const nameOf=n=>{ if(!n) return '_'; if(['identifier','field_identifier','type_identifier'].includes(n.type)) return n.text;
  const d=F(n,'declarator')||F(n,'name'); if(d) return nameOf(d); const k=kids(n).find(x=>/identifier$/.test(x.type)); return k?k.text:n.text.replace(/[^\wА-яЁё]/g,'')||'_' };
 const walkAll=(n,f)=>{ f(n); for(const k of n.namedChildren) walkAll(k,f) };
 const modText=m=>m.namedChildren.filter(x=>x.type==='modifiers'||x.type==='modifier').map(x=>x.text).join(' ');
 const typeText=t=>t?t.text.replace(/<.*>/s,'').replace(/\s+/g,' ').trim():null;
 // ---------- предварительный проход: что объявлено в файле ----------
 const C={cls:[],fnStatic:false,types:[new Map()],enums:new Map(),ifaces:new Set(),classes:new Set(),structs:new Map(),userMethods:new Set(),userProps:new Set()};
 walkAll(root,n=>{ const nm=F(n,'name');
  if(['method_declaration','local_function_statement'].includes(n.type)&&nm) C.userMethods.add(nm.text);
  if(n.type==='property_declaration'&&nm) C.userProps.add(nm.text);
  if(n.type==='function_definition') C.userMethods.add(nameOf(F(F(n,'declarator')||n,'declarator')||F(n,'declarator')));
  if(n.type==='enum_declaration'&&nm){ const b=F(n,'body'); C.enums.set(nm.text,b?kids(b).filter(x=>/^enum_(constant|member_declaration)$/.test(x.type)).map(x=>F(x,'name').text):[]) }
  if(n.type==='interface_declaration'&&nm) C.ifaces.add(nm.text);
  if(/^(class|record|struct)_declaration$/.test(n.type)&&nm) C.classes.add(nm.text);
  if(lang==='c'&&n.type==='struct_specifier'&&F(n,'body')){ const tag=nm&&nm.text; const td=n.parent&&n.parent.type==='type_definition'?nameOf(F(n.parent,'declarator')):null; const real=td||tag; if(tag) C.structs.set(tag,real); if(td) C.structs.set(td,real) } });
 const lookupType=nm=>{ for(let i=C.types.length-1;i>=0;i--) if(C.types[i].has(nm)) return C.types[i].get(nm); return undefined };
 const shortTy=t=>t?String(t).replace(/<.*>/s,'').split(/\.|::/).pop():t;
 const structOf=t=>t&&C.structs.get(t.replace(/^struct\s+/,''));
 function defaultFor(t){ if(!t) return lit(null); if(INT_T.test(t)||NUM_T.test(t)) return lit(0); if(BOOL_T.test(t)) return lit(false); const st=lang==='c'&&structOf(t); if(st) return {type:'NewExpression',callee:id(st),arguments:[]}; return lit(null) }
 const opOf=n=>((F(n,'operator')||n.children[1]||{}).text);
 function isInt(n){ if(!n) return false; switch(n.type){
   case 'decimal_integer_literal': case 'hex_integer_literal': case 'octal_integer_literal': case 'binary_integer_literal': case 'integer_literal': return true;
   case 'number_literal': return /^(0x[\da-f]+|\d+)[uUlL]*$/i.test(n.text);
   case 'identifier': { const t=lookupType(n.text); return !!t&&INT_T.test(t) }
   case 'parenthesized_expression': return kids(n).length===1&&isInt(kids(n)[0]);
   case 'binary_expression': return ['+','-','*','/','%','&','|','^','<<','>>','>>>'].includes(opOf(n))&&isInt(F(n,'left'))&&isInt(F(n,'right'));
   case 'unary_expression': case 'prefix_unary_expression': return /^[-+~]/.test(n.text)&&isInt(F(n,'operand')||F(n,'argument')||kids(n)[0]);
   case 'cast_expression': return INT_T.test(typeText(F(n,'type'))||'');
   case 'method_invocation': return /^(size|length|indexOf)$/.test(F(n,'name').text)&&!C.userMethods.has(F(n,'name').text);
   case 'field_access': return F(n,'field').text==='length';
   case 'member_access_expression': return /^(Count|Length)$/.test(nameOf(F(n,'name')))&&!C.userProps.has(nameOf(F(n,'name')));
  } return false }
 // локальные имена и типы метода/функции
 function scanLocals(n){ const m=new Map(); C.types.push(m); const add=(nm,t)=>{ if(nm&&!m.has(nm)) m.set(nm,t) };
  const declOf=(x,t)=>{ for(const k of kids(x)){ if(k.type==='variable_declarator'){ let tt=t; const v=F(k,'value')||(kids(k).find(z=>z.type==='equals_value_clause')||{namedChildren:[]}).namedChildren[0]||kids(k)[1]; if(tt==='var'&&v&&isInt(v)) tt='int'; add(F(k,'name')&&F(k,'name').text,tt) }
    else if(lang==='c'&&k!==F(x,'type')){ if(k.type==='identifier') add(k.text,t); else if(k.type==='init_declarator'){ const d=F(k,'declarator'); add(nameOf(d),d.type==='identifier'?t:d.type) } else if(/declarator$/.test(k.type)) add(nameOf(k),k.type==='array_declarator'?'array':k.type==='pointer_declarator'?'pointer':t) } } };
  const w=x=>{ switch(x.type){
    case 'formal_parameter': case 'parameter': case 'catch_formal_parameter': case 'catch_declaration': case 'spread_parameter': { const nm=F(x,'name'); if(nm) add(nm.text,typeText(F(x,'type'))); break }
    case 'parameter_declaration': { const d=F(x,'declarator'); if(d) add(nameOf(d),d.type==='identifier'?typeText(F(x,'type')):d.type); break }
    case 'local_variable_declaration': case 'variable_declaration': declOf(x,typeText(F(x,'type'))); break;
    case 'declaration': if(lang==='c') declOf(x,typeText(F(x,'type'))); break;
    case 'enhanced_for_statement': add(F(x,'name').text,typeText(F(x,'type'))); break;
    case 'foreach_statement': { const l=F(x,'left'); if(l&&l.type==='identifier') add(l.text,typeText(F(x,'type'))); break }
    case 'lambda_expression': { const ps=F(x,'parameters'); if(ps) walkAll(ps,z=>{ if(z.type==='identifier') add(z.text,null) }); break }
    case 'class_body': case 'declaration_list': if(x!==n) return; }
   for(const k of x.namedChildren) w(k) };
  w(n); return m }
 // имя без объекта: локальное, поле объекта (это.x) или общее поле класса (Класс.x)
 function resolve(nm){ if(lang==='c'||!C.cls.length) return id(nm);
  for(let i=C.types.length-1;i>=1;i--){ if(C.types[i].has(nm)&&!C.types[i].__cls) return id(nm); if(C.types[i].__cls) break }
  for(let i=C.cls.length-1;i>=0;i--){ const k=C.cls[i]; if(k.inst.has(nm)) return i===C.cls.length-1&&!C.fnStatic?mem({type:'ThisExpression'},nm):id(nm); if(k.stat.has(nm)) return k.flat?id(nm):mem(id(k.name),nm) }
  return id(nm) }
 // ---------- выражения ----------
 function num(t){ let s=t.replace(/_/g,'').replace(/[lLfFdDmMuU]+$/,''); if(/^0x/i.test(s)) return parseInt(s,16); if(/^0b/i.test(s)) return parseInt(s.slice(2),2); const v=Number(s); return isNaN(v)?null:v }
 function strLit(n){ const t=n.text; if(lang==='csharp'&&/^[@$]/.test(t)) { if(t.startsWith('$')) return null; return t.slice(2,-1).replace(/""/g,'"') }
  if(n.type==='text_block') return t.slice(3,-3).replace(/^[ \t]*\n/,'').replace(/^[ \t]+/gm,'');
  try{ return JSON.parse(t.replace(/^'(.*)'$/s,'"$1"').replace(/\\'/g,"'").replace(/\\0/g,'\\u0000')) }catch{ return t.replace(/^["']|["']$/g,'') } }
 const tmpl=(parts)=>{ const quasis=[], expressions=[]; let cur=''; for(const p of parts){ if(typeof p==='string') cur+=p; else { quasis.push({value:{cooked:cur}}); expressions.push(p); cur='' } } quasis.push({value:{cooked:cur}}); return expressions.length?{type:'TemplateLiteral',quasis,expressions}:lit(cur) };
 // printf / String.format: %d %s %f %.2f %c %x %%; {0} у C#
 function fmt(fs,args,n,cs){ const parts=[]; let i=0, bad=false;
  if(cs){ fs.split(/(\{\d+(?:,-?\d+)?(?::[^}]*)?\})/).forEach(s=>{ const m=/^\{(\d+)(?:,-?\d+)?(?::([^}]*))?\}$/.exec(s); if(!m){ parts.push(s.replace(/\{\{/g,'{').replace(/\}\}/g,'}')); return } const a=args[+m[1]]||lit(null); const fm=/^[FN](\d+)$/i.exec(m[2]||''); if(m[2]&&!fm) bad=true; parts.push(fm?call(mem(a,'toFixed'),[lit(+fm[1])]):a) }); return {e:tmpl(parts),bad} }
  fs.split(/(%[-+ 0#]*\d*(?:\.\d+)?[lhzjt]*[diouxXeEfgGcsb%n])/).forEach(s=>{ const m=/^%[-+ 0#]*(\d*)(?:\.(\d+))?[lhzjt]*([diouxXeEfgGcsb%n])$/.exec(s); if(!m){ parts.push(s); return }
   if(m[3]==='%'){ parts.push('%'); return } if(m[3]==='n'){ parts.push('\n'); return } const a=args[i++]||lit(null); if(m[1]||/[xXo]/.test(m[3])) bad=true;
   parts.push(m[3]==='f'&&m[2]?call(mem(a,'toFixed'),[lit(+m[2])]):m[3]==='c'&&lang==='c'?call(mem(id('String'),'fromCharCode'),[a]):a) });
  return {e:tmpl(parts),bad} }
 function printOut(n,argsN,{err,fmt:isF,nl,cs}){ let args=argsN.map(E); let pre=[];
  if(isF&&argsN.length&&/string_literal|interpolated|verbatim/.test(argsN[0].type)){ let fs=strLit(argsN[0]); if(fs===null) fs=''; const r=fmt(fs,args.slice(1),n,cs); if(r.bad){ pre.push(note(n,'ширина поля и форматы %x/%e переведены через формат()')); const fs0=/\n$/.test(fs)?fs.replace(/\n$/,''):fs; args=[call(id('формат'),[lit(fs0)].concat(argsN.slice(1).map(E)))]; if(!cs&&!/\n$/.test(fs)) nl=false }
   else { args=[r.e]; if(!cs){ if(/\n$/.test(fs)){ args=[fmt(fs.replace(/\n$/,''),argsN.slice(1).map(E),n,cs).e] } else nl=false } } }
  else if(isF&&argsN.length) pre.push(note(n,'формат печати не строка — переведён как есть'));
  if(nl===false) pre.push(note(n,'печать без перевода строки: в «Понятном» каждое «пиши» печатает с новой строки'));
  if(args.length===1&&args[0].type==='Literal'&&args[0].value===''&&nl!==false) args=[lit('')];
  return {pre,e:call(err?mem(id('console'),'error'):PRINT(),args)} }
 const pendingNotes=[];
 function E(n){ if(!n) return lit(null);
  switch(n.type){
   case 'parenthesized_expression': { const k=kids(n); return k.length===1?E(k[0]):unsup(n) }
   case 'identifier': return resolve(n.text);
   case 'field_identifier': case 'type_identifier': case 'predefined_type': return id(n.text);
   case 'this': case 'this_expression': return {type:'ThisExpression'};
   case 'super': case 'base': case 'base_expression': return {type:'Super'};
   case 'true': case 'false': return lit(n.type==='true');
   case 'boolean_literal': return lit(n.text==='true');
   case 'null_literal': case 'null': return lit(null);
   case 'decimal_integer_literal': case 'hex_integer_literal': case 'octal_integer_literal': case 'binary_integer_literal': case 'decimal_floating_point_literal':
   case 'integer_literal': case 'real_literal': case 'number_literal': { const v=num(n.text); return v===null?unsup(n,'число'):lit(v) }
   case 'string_literal': case 'verbatim_string_literal': case 'raw_string_literal': case 'character_literal': case 'char_literal': case 'text_block': case 'concatenated_string': {
    if(n.type==='concatenated_string') return kids(n).map(E).reduce((a,b)=>({type:'BinaryExpression',operator:'+',left:a,right:b}));
    const s=strLit(n); return s===null?unsup(n,'строка с вставками'):lit(s) }
   case 'interpolated_string_expression': { const parts=[]; for(const k of n.namedChildren){ if(k.type==='string_content'||k.type==='string_literal_content') parts.push(k.text.replace(/\{\{/g,'{').replace(/\}\}/g,'}')); else if(k.type==='escape_sequence') parts.push(strLit({text:'"'+k.text+'"',type:'string_literal'})); else if(k.type==='interpolation'){ const ex=kids(k).find(z=>!/^interpolation_(brace|format_clause|alignment_clause)$/.test(z.type)); const fc=kids(k).find(z=>z.type==='interpolation_format_clause'); const fm=fc&&/^:[FN](\d+)$/i.exec(fc.text); let v=E(ex); if(fm) v=call(mem(v,'toFixed'),[lit(+fm[1])]); else if(fc) pendingNotes.push(note(n,'формат «'+fc.text+'» в строке не переведён')); parts.push(v) } } return tmpl(parts) }
   case 'binary_expression': { const op=opOf(n); const ln=F(n,'left'), rn=F(n,'right'); const l=E(ln), r=E(rn);
    if(op==='&&'||op==='||'||op==='??') return {type:'LogicalExpression',operator:op,left:l,right:r};
    if(op==='/'&&isInt(ln)&&isInt(rn)) return call(mem(id('Math'),'trunc'),[{type:'BinaryExpression',operator:'/',left:l,right:r}]);
    if(['+','-','*','/','%','<','>','<=','>=','==','!=','&','|','^','<<','>>','>>>'].includes(op)) return {type:'BinaryExpression',operator:op==='=='?'===':op==='!='?'!==':op,left:l,right:r};
    return unsup(n,'операция «'+op+'»') }
   case 'unary_expression': case 'prefix_unary_expression': { const op=(F(n,'operator')||n.children[0]).text; const a=F(n,'operand')||F(n,'argument')||kids(n)[0];
    if(['!','-','+','~'].includes(op)) return {type:'UnaryExpression',operator:op,argument:E(a)};
    if(op==='*'||op==='&'){ pendingNotes.push(note(n,'указатели: переведены как безопасная ссылка «Понятного»')); return {type:'UnaryExpression',operator:op,argument:E(a)} }
    return unsup(n,'операция «'+op+'» внутри выражения') }
   case 'ternary_expression': case 'conditional_expression': return {type:'ConditionalExpression',test:E(F(n,'condition')),consequent:E(F(n,'consequence')),alternate:E(F(n,'alternative'))};
   case 'cast_expression': { const v=F(n,'value')||kids(n).slice(-1)[0]; const t=typeText(F(n,'type'))||''; if(INT_T.test(t)&&!/^char$/.test(t)&&!isInt(v)) return call(mem(id('Math'),'trunc'),[E(v)]); return E(v) }
   case 'field_access': { const o=F(n,'object'), f=F(n,'field').text; if(f==='length'&&!C.userProps.has(f)) return mem(E(o),'length'); if(o.type==='identifier'&&C.enums.has(o.text)) return mem(id(o.text),f); return mem(E(o),f) }
   case 'member_access_expression': { const o=F(n,'expression'), f=nameOf(F(n,'name'));
    if(/^(Count|Length)$/.test(f)&&!C.userProps.has(f)) return mem(E(o),'length');
    if(/^(Keys|Values)$/.test(f)&&!C.userProps.has(f)) return call(mem(E(o),'__пон_'+(f==='Keys'?'ключи':'значения')),[]);
    if(o.type==='identifier'&&o.text==='Math') return f==='PI'?mem(id('Math'),'PI'):f==='E'?call(mem(id('Math'),'exp'),[lit(1)]):mem(id('Math'),f);
    if(o.type==='identifier'&&/^(int|Int32|long|Int64)$/.test(o.text)&&/^(MaxValue|MinValue)$/.test(f)) return lit(f==='MaxValue'?(o.text==='int'||o.text==='Int32'?2147483647:Number.MAX_SAFE_INTEGER):(o.text==='int'||o.text==='Int32'?-2147483648:Number.MIN_SAFE_INTEGER));
    return mem(E(o),f) }
   case 'field_expression': { const o=F(n,'argument'); if(n.children.some(c=>c.type==='->')) pendingNotes.push(note(n,'«->» переведён как обычное поле: указатели в «Понятном» не нужны'));
    return mem(o.type==='pointer_expression'?E(F(o,'argument')):E(o),F(n,'field').text) }
   case 'scoped_identifier': case 'qualified_name': return id(n.text.split(/\.|::/).pop());
   case 'array_access': return mem(E(F(n,'array')),E(F(n,'index')));
   case 'subscript_expression': return mem(E(F(n,'argument')),E(F(n,'index')||kids(n)[1]));
   case 'element_access_expression': { const b=F(n,'subscript')||kids(n)[1]; const a=b&&kids(b)[0]; return mem(E(F(n,'expression')),E(a&&a.type==='argument'?kids(a)[0]:a)) }
   case 'method_invocation': return invoke(n,F(n,'object'),F(n,'name').text,kids(F(n,'arguments')||{namedChildren:[]}));
   case 'invocation_expression': { const f=F(n,'function'); const an=kids(F(n,'arguments')||{namedChildren:[]}).map(x=>x.type==='argument'?kids(x).slice(-1)[0]:x);
    if(f.type==='member_access_expression') return invoke(n,F(f,'expression'),nameOf(F(f,'name')),an);
    if(f.type==='identifier'||f.type==='generic_name') return invoke(n,null,nameOf(f),an);
    return call(E(f),an.map(E)) }
   case 'call_expression': { const f=F(n,'function'); const an=kids(F(n,'arguments')||{namedChildren:[]});
    if(f.type==='identifier') return invoke(n,null,f.text,an);
    return call(E(f),an.map(E)) }
   case 'object_creation_expression': { const t=F(n,'type'); const nm=t?t.text.replace(/<.*$/s,'').split('.').pop():'Объект'; const an=kids(F(n,'arguments')||{namedChildren:[]}).map(x=>x.type==='argument'?kids(x).slice(-1)[0]:x); const args=an.map(E);
    const init=kids(n).find(x=>/initializer/.test(x.type)); const bodyC=kids(n).find(x=>x.type==='class_body');
    if(bodyC){ pendingNotes.push(note(n,'анонимный класс переведён как «новый '+nm+'»: методы из тела проверьте вручную')); return {type:'PonAnonClass',parent:nm,arguments:args} }
    if(/^(ArrayList|LinkedList|List|Vector|Stack|ArrayDeque|Queue)$/.test(nm)) return init?E(init):an.length&&!isInt(an[0])?call(mem(args[0],'slice'),[]):{type:'ArrayExpression',elements:[]};
    if(/^(HashMap|TreeMap|LinkedHashMap|Dictionary|SortedDictionary|Hashtable)$/.test(nm)) return init?{type:'ObjectExpression',properties:kids(init).map(p=>{ const kv=kids(p); return {type:'Property',computed:true,key:E(kv[0]),value:E(kv[1])} })}:{type:'ObjectExpression',properties:[]};
    if(/^(HashSet|TreeSet|LinkedHashSet|SortedSet)$/.test(nm)) return call(id('set'),init?[{type:'ArrayExpression',elements:kids(init).map(E)}]:args.length?[args[0]]:[]);
    if(/^(StringBuilder|StringBuffer)$/.test(nm)) return args.length&&!isInt(an[0])?call(id('String'),[args[0]]):lit('');
    if(/^(Scanner|BufferedReader|InputStreamReader|Random|Object)$/.test(nm)) return lit(null);
    if(/^(Integer|Double|Long|String)$/.test(nm)&&args.length===1) return nm==='String'?call(id('String'),args):call(id('Number'),args);
    return {type:'NewExpression',callee:id(nm),arguments:args} }
   case 'array_creation_expression': { const v=F(n,'value')||kids(n).find(x=>/initializer/.test(x.type)); if(v) return E(v);
    const dims=kids(n).filter(x=>x.type==='dimensions_expr'); const rank=kids(n).find(x=>x.type==='array_rank_specifier'); const t=typeText(F(n,'type'))||'';
    const sizes=dims.length?dims.map(d=>kids(d)[0]):rank?kids(rank):[]; const base=t.replace(/\[.*$/,''); const d0=defaultFor(base);
    if(sizes.length===1) return {type:'BinaryExpression',operator:'*',left:{type:'ArrayExpression',elements:[d0]},right:E(sizes[0])};
    if(sizes.length===2){ pendingNotes.push(note(n,'двумерный массив: если потом меняете элемент, скопируйте строку — иначе все строки общие'));
     return {type:'BinaryExpression',operator:'*',left:{type:'ArrayExpression',elements:[{type:'BinaryExpression',operator:'*',left:{type:'ArrayExpression',elements:[d0]},right:E(sizes[1])}]},right:E(sizes[0])} }
    pendingNotes.push(note(n,'массив с числом измерений больше двух переведён как пустой список'));
    return {type:'ArrayExpression',elements:[]} }
   case 'array_initializer': case 'initializer_list': case 'initializer_expression': return {type:'ArrayExpression',elements:kids(n).map(E)};
   case 'implicit_array_creation_expression': case 'collection_expression': return {type:'ArrayExpression',elements:kids(n).flatMap(x=>/initializer/.test(x.type)?kids(x):[x]).map(E)};
   case 'lambda_expression': { const ps=F(n,'parameters'); const params=ps?(ps.type==='identifier'?[id(ps.text)]:kids(ps).map(p=>id(nameOf(p)))):kids(n).filter(x=>x.type==='identifier'&&x!==F(n,'body')).map(x=>id(x.text)); const b=F(n,'body');
    return b&&(b.type==='block')?{type:'FunctionExpression',params,body:block(b)}:{type:'ArrowFunctionExpression',params,body:E(b)} }
   case 'instanceof_expression': { if(F(n,'name')||kids(n).length>2) return unsup(n,'проверка типа с новой переменной'); return {type:'BinaryExpression',operator:'instanceof',left:E(F(n,'left')),right:id(typeText(F(n,'right')).split('.').pop())} }
   case 'is_pattern_expression': case 'is_expression': { const l=F(n,'expression')||F(n,'left')||kids(n)[0]; const p=F(n,'pattern')||F(n,'right')||kids(n)[1]; const t=p&&(p.type==='constant_pattern'||p.type==='type_pattern'?kids(p)[0]:p);
    if(!t||!/identifier|predefined_type|qualified_name|generic_name/.test(t.type)) return unsup(n,'проверка типа с новой переменной'); return {type:'BinaryExpression',operator:'instanceof',left:E(l),right:id(t.text.replace(/<.*$/s,'').split('.').pop())} }
   case 'assignment_expression': case 'update_expression': case 'postfix_unary_expression': return unsup(n,'присваивание внутри выражения');
   case 'pointer_expression': { const a=F(n,'argument')||kids(n)[0]; const op=(F(n,'operator')||n.children[0]||{}).text||n.text[0];
    pendingNotes.push(note(n,'указатели: переведены как безопасная ссылка «Понятного»'));
    return {type:'UnaryExpression',operator:(op==='&'||n.text.trim().startsWith('&'))?'&':'*',argument:E(a)} }
   case 'sizeof_expression': { const a=F(n,'value')||F(n,'argument')||kids(n)[0];
    pendingNotes.push(note(n,'sizeof переведён как размер() — абстракция «Понятного», не байты языка Си'));
    if(a&&/type|specifier/.test(a.type)&&!['identifier','field_identifier'].includes(a.type)) return call(id('размер'),[lit(8)]);
    return call(id('размер'),[a?E(a):lit(8)]) }
   case 'method_reference': { const parts=kids(n); const o=F(n,'object')||parts[0]; const nameN=F(n,'name')||parts[parts.length-1];
    pendingNotes.push(note(n,'ссылка на метод «::» переведена как оператор «::» «Понятного»'));
    return {type:'PonMethodRef',object:E(o),name:nameN&&nameN.text==='new'?'создать':nameOf(nameN)} }
   case 'switch_expression': { const disc=E(F(n,'condition')||F(n,'value')||kids(n)[0]); const body=F(n,'body'); let acc=lit(null);
    for(const g of [...kids(body||{namedChildren:[]})].reverse()){ const labels=kids(g).filter(x=>x.type==='switch_label'||/switch_label|switch_pattern/.test(x.type));
     const rest=kids(g).filter(x=>!labels.includes(x)); const isDef=labels.some(lb=>/^default\b/.test(lb.text.trim()))||!labels.length;
     const val=rest[0]?E(rest[0]):lit(null); if(isDef){ acc=val; continue }
     const tests=labels.flatMap(lb=>kids(lb).length?kids(lb).map(E):[]);
     const test=tests.reduce((a,t)=>a?{type:'LogicalExpression',operator:'||',left:a,right:{type:'BinaryExpression',operator:'===',left:disc,right:t}}:{type:'BinaryExpression',operator:'===',left:disc,right:t},null);
     if(test) acc={type:'ConditionalExpression',test,consequent:val,alternate:acc} } return acc }
   case 'await_expression': return {type:'AwaitExpression',argument:E(F(n,'expression')||F(n,'argument')||F(n,'value')||kids(n)[0])};
  }
  return unsup(n) }
 const PRINT=()=>mem(id('console'),'log');
 const call=(callee,args)=>({type:'CallExpression',callee,arguments:args});
 const pm=(o,name,args)=>call(mem(o,'__пон_'+name),args);
 // вызовы методов Java/C#/C → «Понятный»
 function invoke(n,o,nm,an){ const ot=o&&o.text; const args=()=>an.map(E); const user=C.userMethods.has(nm);
  if(o){
   if(/(?:^|\.)System\.(out|err)$/.test(ot)&&/^(print|println|printf|format)$/.test(nm)){ const r=printOut(n,an,{err:/System\.err$/.test(ot),fmt:/^(printf|format)$/.test(nm),nl:nm==='println'?true:/^(printf|format)$/.test(nm)?undefined:false}); pendingNotes.push(...r.pre); return r.e }
   if(/(?:^|\.)Console(?:\.Error|\.Out)?$/.test(ot)&&/^Write(Line)?$/.test(nm)){ const isF=an.length>1&&/string_literal|verbatim/.test(an[0].type); const r=printOut(n,an,{err:/Error$/.test(ot),fmt:isF,cs:true,nl:nm==='WriteLine'?true:false}); pendingNotes.push(...r.pre); return r.e }
   if(/(?:^|\.)Console$/.test(ot)&&/^Read(Line)?$/.test(nm)) return call(id('prompt'),[]);
   if(/(?:^|\.)(?:String|string)$/.test(ot)&&/^[Ff]ormat$/.test(nm)&&an.length&&/string_literal|verbatim/.test(an[0].type)){ const r=fmt(strLit(an[0])||'',an.slice(1).map(E),n,lang==='csharp'); if(r.bad) pendingNotes.push(note(n,'форматы ширины/%x переведены без форматирования')); return r.e }
   if(/(?:^|\.)(?:String|string)$/.test(ot)&&/^[Jj]oin$/.test(nm)&&an.length===2) return call(mem(E(an[1]),'join'),[E(an[0])]);
   if(/(?:^|\.)(?:String|string)$/.test(ot)&&nm==='valueOf') return call(id('String'),args());
   if(/(?:^|\.)(?:Integer|Double|Long|Float|Short|Byte|int|double|long|float|Int32|Int64|decimal)$/.test(ot)&&/^([Pp]arse|valueOf)/.test(nm)) return /^(Integer|Long|Short|Byte|int|long|Int32|Int64)$/.test(ot)?call(mem(id('Math'),'trunc'),[call(id('Number'),args())]):call(id('Number'),args());
   if(/(?:^|\.)(?:Integer|Double|Long)$/.test(ot)&&nm==='toString') return call(id('String'),args());
   if(/(?:^|\.)Convert$/.test(ot)&&/^To(Int\d+|Double|Single|Decimal|String|Boolean)$/.test(nm)) return /String/.test(nm)?call(id('String'),args()):/Boolean/.test(nm)?call(id('Boolean'),args()):/Int/.test(nm)?call(mem(id('Math'),'round'),[call(id('Number'),args())]):call(id('Number'),args());
   if(/(?:^|\.)(?:System|Environment)$/.test(ot)&&/^[Ee]xit$/.test(nm)) return call(mem(id('process'),'exit'),args());
   if(/(?:^|\.)Thread$/.test(ot)&&/^[Ss]leep$/.test(nm)) return call(id('пауза'),args());
   if(/(?:^|\.)(?:Math|MathF)$/.test(ot)){ const m=nm[0].toLowerCase()+nm.slice(1); if(m==='truncate') return call(mem(id('Math'),'trunc'),args()); if(m==='ceiling') return call(mem(id('Math'),'ceil'),args()); return call(mem(id('Math'),m),args()) }
   if(/(?:^|\.)(?:Arrays|List|Set|Collections)$/.test(ot)&&/^(asList|of)$/.test(nm)) return /(?:^|\.)Set$/.test(ot)?call(id('set'),[{type:'ArrayExpression',elements:args()}]):{type:'ArrayExpression',elements:args()};
   if(/(?:^|\.)(?:Arrays|Collections)$/.test(ot)&&/^(sort|reverse)$/.test(nm)&&an.length===1) return call(mem(E(an[0]),nm),[]);
   if(/(?:^|\.)Arrays$/.test(ot)&&nm==='toString'&&an.length===1) return call(id('String'),args());
   if(/(?:^|\.)Collections$/.test(ot)&&/^(max|min)$/.test(nm)&&an.length===1){ const aa=id('а'), bb=id('б'); const cmp={type:'BinaryExpression',operator:nm==='max'?'>':'<',left:aa,right:bb}; return call(mem(E(an[0]),'reduce'),[{type:'ArrowFunctionExpression',params:[aa,bb],body:{type:'ConditionalExpression',test:cmp,consequent:aa,alternate:bb}}]) }
   if(/(?:^|\.)Arrays$/.test(ot)&&nm==='fill'&&an.length===2) return unsup(n,'Arrays.fill');
   const ty=o.type==='identifier'?shortTy(lookupType(o.text)):undefined;
   if(ty&&/^(Scanner|BufferedReader|TextReader|StreamReader)$/.test(ty)){ if(/^(nextLine|next|readLine|ReadLine)$/.test(nm)) return call(id('prompt'),[]); if(/^next(Int|Long|Short|Byte)$/.test(nm)) return call(mem(id('Math'),'trunc'),[call(id('Number'),[call(id('prompt'),[])])]); if(/^next(Double|Float)$/.test(nm)) return call(id('Number'),[call(id('prompt'),[])]); if(/^(hasNext\w*)$/.test(nm)) return lit(true); if(/^[Cc]lose$/.test(nm)) return lit(null) }
   if(ty&&/^Random$/.test(ty)&&/^next(Int)?$/.test(nm)) return an.length===1?call(mem(id('Math'),'floor'),[{type:'BinaryExpression',operator:'*',left:call(mem(id('Math'),'random'),[]),right:E(an[0])}]):an.length===2?{type:'BinaryExpression',operator:'+',left:E(an[0]),right:call(mem(id('Math'),'floor'),[{type:'BinaryExpression',operator:'*',left:call(mem(id('Math'),'random'),[]),right:{type:'BinaryExpression',operator:'-',left:E(an[1]),right:E(an[0])}}])}:call(mem(id('Math'),'random'),[]);
   if(o.type==='super'||ot==='base') return call(mem({type:'Super'},nm==='toString'||nm==='ToString'?'toString':nm),args());
   if(!user){ const ob=()=>E(o); const k=nm[0].toLowerCase()+nm.slice(1); const a=args;
    switch(k){
     case 'add': case 'addLast': case 'offer': case 'push': case 'enqueue': if(an.length===1) return call(mem(ob(),'push'),a()); if(an.length===2) return pm(ob(),'вставь',a()); break;
     case 'insert': if(an.length===2) return pm(ob(),'вставь',a()); break;
     case 'addFirst': if(an.length===1) return pm(ob(),'вставь',[lit(0)].concat(a())); break;
     case 'addAll': case 'addRange': case 'putAll': break;
     case 'size': case 'length': case 'count': if(!an.length) return mem(ob(),'length'); break;
     case 'get': case 'charAt': case 'elementAt': if(an.length===1) return mem(ob(),E(an[0])); break;
     case 'getOrDefault': if(an.length===2) return pm(ob(),'получи',a()); break;
     case 'getKey': if(!an.length) return mem(ob(),lit(0)); break;
     case 'getValue': if(!an.length) return mem(ob(),lit(1)); break;
     case 'containsKey': return pm(ob(),'есть',a());
     case 'contains': return call(mem(ob(),'includes'),a());
     case 'containsValue': return call(mem(pm(ob(),'значения',[]),'includes'),a());
     case 'remove': case 'removeAt': case 'pop': case 'poll': case 'removeLast': case 'dequeue': if(an.length===1){ pendingNotes.push(note(n,'«'+nm+'» переведён как «убери»: по номеру у списка и по ключу у словаря')); return pm(ob(),'убери',a()) } if(!an.length) return k==='poll'||k==='dequeue'?pm(ob(),'убери',[lit(0)]):call(mem(ob(),'pop'),[]); break;
     case 'removeFirst': if(!an.length) return pm(ob(),'убери',[lit(0)]); break;
     case 'peek': case 'getFirst': case 'peekFirst': case 'first': if(!an.length) return mem(ob(),lit(0)); break;
     case 'getLast': case 'peekLast': case 'last': if(!an.length) return pm(ob(),'последний',[]); break;
     case 'isEmpty': if(!an.length) return {type:'BinaryExpression',operator:'===',left:mem(ob(),'length'),right:lit(0)}; break;
     case 'clear': if(!an.length) return pm(ob(),'очисти',[]); break;
     case 'keySet': case 'keys': if(!an.length) return pm(ob(),'ключи',[]); break;
     case 'values': if(!an.length) return pm(ob(),'значения',[]); break;
     case 'entrySet': if(!an.length) return pm(ob(),'пары',[]); break;
     case 'indexOf': return call(mem(ob(),'indexOf'),a());
     case 'toUpperCase': case 'toUpper': case 'toUpperInvariant': return call(mem(ob(),'toUpperCase'),[]);
     case 'toLowerCase': case 'toLower': case 'toLowerInvariant': return call(mem(ob(),'toLowerCase'),[]);
     case 'trim': case 'strip': return call(mem(ob(),'trim'),[]);
     case 'split': if(an.length===1) return call(mem(ob(),'split'),a()); break;
     case 'startsWith': case 'endsWith': return call(mem(ob(),k),a());
     case 'replace': case 'replaceAll': if(an.length===2&&!(k==='replaceAll'&&lang==='java')) return pm(ob(),'заменить',a()); break;
     case 'substring': if(an.length===1) return call(mem(ob(),'slice'),a()); if(an.length===2) return lang==='csharp'?call(mem(ob(),'slice'),[E(an[0]),{type:'BinaryExpression',operator:'+',left:E(an[0]),right:E(an[1])}]):call(mem(ob(),'slice'),a()); break;
     case 'equals': if(an.length===1) return {type:'BinaryExpression',operator:'===',left:ob(),right:E(an[0])}; break;
     case 'equalsIgnoreCase': if(an.length===1) return {type:'BinaryExpression',operator:'===',left:call(mem(ob(),'toLowerCase'),[]),right:call(mem(E(an[0]),'toLowerCase'),[])}; break;
     case 'toString': if(!an.length) return call(id('String'),[ob()]); break;
     case 'toCharArray': if(!an.length) return pm(ob(),'символы',[]); break;
     case 'sort': if(!an.length) return call(mem(ob(),'sort'),[]); break;
     case 'reverse': if(!an.length) return call(mem(ob(),'reverse'),[]); break;
     case 'repeat': return call(mem(ob(),'repeat'),a());
     case 'join': return call(mem(ob(),'join'),a());
     case 'compareTo': if(an.length===1){ const l=ob(), r=E(an[0]); return {type:'BinaryExpression',operator:'-',left:{type:'ConditionalExpression',test:{type:'BinaryExpression',operator:'>',left:l,right:r},consequent:lit(1),alternate:lit(0)},right:{type:'ConditionalExpression',test:{type:'BinaryExpression',operator:'<',left:l,right:r},consequent:lit(1),alternate:lit(0)}} } break;
     case 'stream': if(!an.length) return ob(); break;
     case 'filter': case 'map': case 'forEach': case 'reduce': return call(mem(ob(),k),a());
     case 'collect': case 'toList': case 'toArray': if(!an.length||/Collectors\.toList|toList/.test(an[0]&&an[0].text||'')) return ob(); break;
     case 'hasNext': case 'iterator': return unsup(n,'итераторы');
    }
   }
   return call(mem(E(o),nm),args()) }
  // без объекта: функции C и собственные методы класса
  if(lang==='c'){ switch(nm){
    case 'printf': { const r=printOut(n,an,{fmt:true}); pendingNotes.push(...r.pre); return r.e }
    case 'puts': return call(PRINT(),args());
    case 'putchar': pendingNotes.push(note(n,'putchar печатает символ с новой строки')); return call(PRINT(),[call(mem(id('String'),'fromCharCode'),args())]);
    case 'fprintf': if(an.length&&/^std(err|out)$/.test(an[0].text)){ const r=printOut(n,an.slice(1),{fmt:true,err:an[0].text==='stderr'}); pendingNotes.push(...r.pre); return r.e } break;
    case 'exit': return call(mem(id('process'),'exit'),args());
    case 'strlen': return mem(E(an[0]),'length');
    case 'strcmp': return {type:'BinaryExpression',operator:'-',left:{type:'ConditionalExpression',test:{type:'BinaryExpression',operator:'>',left:E(an[0]),right:E(an[1])},consequent:lit(1),alternate:lit(0)},right:{type:'ConditionalExpression',test:{type:'BinaryExpression',operator:'<',left:E(an[0]),right:E(an[1])},consequent:lit(1),alternate:lit(0)}};
    case 'atoi': case 'atol': return call(mem(id('Math'),'trunc'),[call(id('Number'),args())]);
    case 'atof': return call(id('Number'),args());
    case 'abs': case 'fabs': case 'labs': return call(mem(id('Math'),'abs'),args());
    case 'sqrt': case 'pow': case 'floor': case 'ceil': case 'sin': case 'cos': case 'tan': case 'atan': case 'atan2': case 'exp': case 'log': case 'round': return call(mem(id('Math'),nm),args());
    case 'rand': return call(mem(id('Math'),'floor'),[{type:'BinaryExpression',operator:'*',left:call(mem(id('Math'),'random'),[]),right:lit(2147483647)}]);
    case 'getchar': return call(id('prompt'),[]);
    case 'sleep': return call(id('пауза'),[{type:'BinaryExpression',operator:'*',left:E(an[0]),right:lit(1000)}]);
    case 'malloc': case 'calloc': case 'realloc': case 'free': case 'memset': case 'memcpy': return unsup(n,'ручная работа с памятью');
   } }
  if(lang==='csharp'&&/^(nameof|typeof)$/.test(nm)) return unsup(n);
  return call(resolve(nm),args()) }
 function argsOf(a){ if(!a) return []; return kids(a).map(x=>x.type==='argument'?E(kids(x).slice(-1)[0]):E(x)) }
 // ---------- команды ----------
 function block(n){ return {type:'BlockStatement',body:stmts(n)} }
 function stmts(n){ if(!n) return []; if(['block','compound_statement','constructor_body'].includes(n.type)) return kids(n).flatMap(S); return S(n) }
 const asBlock=n=>({type:'BlockStatement',body:stmts(n)});
 const ASSIGN_OPS=['=','+=','-=','*=','/=','%=','&=','|=','^=','<<=','>>=','>>>='];
 function assignStmt(e,n){
  if(e.type==='assignment_expression'){ const op=(F(e,'operator')||e.children[1]).text; if(!ASSIGN_OPS.includes(op)) return note(n,'присваивание «'+op+'» не переводится');
   const ln=F(e,'left'), rn=F(e,'right');
   if(op==='/='&&isInt(ln)&&isInt(rn)) return expr({type:'AssignmentExpression',operator:'=',left:E(ln),right:call(mem(id('Math'),'trunc'),[{type:'BinaryExpression',operator:'/',left:E(ln),right:E(rn)}])},n);
   if(op==='>>>=') return expr({type:'AssignmentExpression',operator:'=',left:E(ln),right:{type:'BinaryExpression',operator:'>>>',left:E(ln),right:E(rn)}},n);
   return expr({type:'AssignmentExpression',operator:op,left:E(ln),right:E(rn)},n) }
  const t=e.text; const inc=/\+\+/.test(t); const a=F(e,'argument')||F(e,'operand')||kids(e)[0];
  return expr({type:'UpdateExpression',operator:inc?'++':'--',argument:E(a)},n) }
 function declarators(n,tnode){ // локальные переменные / поля
  const t=typeText(tnode||F(n,'type')||(kids(n).find(x=>x.type==='variable_declaration')&&F(kids(n).find(x=>x.type==='variable_declaration'),'type')));
  const out=[]; const walk=x=>{ for(const k of kids(x)){ if(['variable_declarator','init_declarator'].includes(k.type)){ const d=F(k,'name')||F(k,'declarator')||kids(k)[0]; const nm=nameOf(d); let v=F(k,'value');
    if(!v&&lang==='csharp'){ const eq=kids(k).find(z=>z.type==='equals_value_clause'); v=eq?kids(eq)[0]:kids(k)[1] }
    let init=v?E(v):defaultFor(t);
    if(lang==='c'&&d.type==='array_declarator'&&v&&v.type==='string_literal') init=E(v);
    if(lang==='c'&&d.type==='array_declarator'&&!v){ const inner=F(d,'declarator'); const sz=F(d,'size');
     if(inner&&inner.type==='array_declarator'){ const rows=F(inner,'size'), cols=sz; const cell=defaultFor(t); init={type:'BinaryExpression',operator:'*',left:{type:'ArrayExpression',elements:[{type:'BinaryExpression',operator:'*',left:{type:'ArrayExpression',elements:[cell]},right:cols?E(cols):lit(0)}]},right:rows?E(rows):lit(0)} }
     else init=/^char$/.test(t)?lit(''):sz?{type:'BinaryExpression',operator:'*',left:{type:'ArrayExpression',elements:[defaultFor(t)]},right:E(sz)}:{type:'ArrayExpression',elements:[]} }
    if(lang==='c'&&d.type==='array_declarator'&&v&&v.type==='initializer_list'){ const sz=F(d,'size'); const nv=kids(v).length; const szv=sz&&num(sz.text); if(szv&&szv>nv) init={type:'BinaryExpression',operator:'+',left:init,right:{type:'BinaryExpression',operator:'*',left:{type:'ArrayExpression',elements:[defaultFor(t)]},right:lit(szv-nv)}} }
    out.push({type:'VariableDeclarator',id:id(nm),init}) } else if(k.type==='variable_declaration') walk(k)
   else if(lang==='c'&&k!==F(x,'type')&&(k.type==='identifier'||k.type==='array_declarator'||k.type==='pointer_declarator')){ const nm=nameOf(k); let init=defaultFor(t);
    if(k.type==='array_declarator'){ const inner=F(k,'declarator'); const sz=F(k,'size');
     if(inner&&inner.type==='array_declarator'){ const rows=F(inner,'size'), cols=sz; init={type:'BinaryExpression',operator:'*',left:{type:'ArrayExpression',elements:[{type:'BinaryExpression',operator:'*',left:{type:'ArrayExpression',elements:[defaultFor(t)]},right:cols?E(cols):lit(0)}]},right:rows?E(rows):lit(0)} }
     else init=/^char$/.test(t)?lit(''):sz?{type:'BinaryExpression',operator:'*',left:{type:'ArrayExpression',elements:[defaultFor(t)]},right:E(sz)}:{type:'ArrayExpression',elements:[]} } else if(k.type==='pointer_declarator') init=lit(null);
    out.push({type:'VariableDeclarator',id:id(nm),init}) } } }; walk(n); return out }
 const withNotes=arr=>{ if(!pendingNotes.length) return arr; const ns=pendingNotes.splice(0); return ns.concat(arr) };
 function caseTest(v){ if(v&&v.type==='identifier'&&lang!=='c'){ for(const [en,cs] of C.enums) if(cs.includes(v.text)) return mem(id(en),v.text) } return E(v) }
 function switchStmt(n){ const loc=L(n); const disc=E(F(n,'condition')||F(n,'value')||kids(n)[0]); const body=F(n,'body'); const cases=[];
  const stmtsOf=arr=>arr.flatMap(S);
  if(lang==='java'){ for(const g of kids(body)){ const labels=kids(g).filter(x=>x.type==='switch_label'); const rest=kids(g).filter(x=>x.type!=='switch_label');
    const tests=labels.flatMap(lb=>lb.text.trim().startsWith('default')?[null]:kids(lb).map(caseTest));
    let cons=stmtsOf(rest); if(g.type==='switch_rule') cons=cons.concat([{type:'BreakStatement'}]);
    tests.forEach((t,i)=>cases.push({test:t,consequent:i===tests.length-1?cons:[]})) } }
  else if(lang==='csharp'){ for(const sec of kids(body)){ const pats=kids(sec).filter(x=>/pattern$|^case_switch_label$/.test(x.type)); const rest=kids(sec).filter(x=>!pats.includes(x)&&x.type!=='when_clause');
    if(kids(sec).some(x=>x.type==='when_clause')) return [note(n,'switch с условием when не переводится')];
    const tests=pats.map(p=>p.type==='constant_pattern'?caseTest(kids(p)[0]):E(p)); if(!pats.length||/^default\b/.test(sec.text.trim())) tests.push(null);
    const cons=stmtsOf(rest); tests.forEach((t,i)=>cases.push({test:t,consequent:i===tests.length-1?cons:[]})) } }
  else { for(const cs of kids(body)){ if(cs.type!=='case_statement'){ if(cases.length) cases[cases.length-1].consequent.push(...S(cs)); continue } const v=F(cs,'value'); cases.push({test:v?caseTest(v):null,consequent:stmtsOf(kids(cs).filter(x=>/statement$|declaration$/.test(x.type)))}) } }
  return [{type:'SwitchStatement',discriminant:disc,cases,loc}] }
 function appendChain(e){ const parts=[]; let x=e; while(x&&x.type==='method_invocation'&&/^(append|Append|AppendLine)$/.test(F(x,'name').text)&&!C.userMethods.has('append')){ const a=argsOf(F(x,'arguments')); parts.unshift(F(x,'name').text==='AppendLine'?{type:'BinaryExpression',operator:'+',left:a[0]||lit(''),right:lit('\n')}:a[0]||lit('')); x=F(x,'object') }
  return parts.length&&x&&(x.type==='identifier'||x.type==='field_access')?{target:E(x),parts}:null }
 function S(n){ const loc=L(n); return withNotes(S0(n,loc)) }
 function S0(n,loc){
  switch(n.type){
   case 'expression_statement': { const e=kids(n)[0]; if(!e) return [];
    if(['assignment_expression','update_expression','postfix_unary_expression'].includes(e.type)||(e.type==='prefix_unary_expression'&&/^(\+\+|--)/.test(e.text))) return [assignStmt(e,n)];
    if(e.type==='method_invocation'){ const nm=F(e,'name').text, o=F(e,'object'); const an=kids(F(e,'arguments')||{namedChildren:[]});
     const ch=appendChain(e); if(ch) return [expr({type:'AssignmentExpression',operator:'+=',left:ch.target,right:ch.parts.reduce((a,b)=>({type:'BinaryExpression',operator:'+',left:a,right:b}))},n)];
     if(o&&!C.userMethods.has(nm)&&/^(put|set)$/.test(nm)&&an.length===2) return [expr({type:'AssignmentExpression',operator:'=',left:mem(E(o),E(an[0])),right:E(an[1])},n)];
     if(o&&!C.userMethods.has(nm)&&/^(addAll|putAll)$/.test(nm)&&an.length===1){ const v=id('_э'); return nm==='addAll'?[{type:'ForOfStatement',left:{type:'VariableDeclaration',kind:'let',declarations:[{type:'VariableDeclarator',id:v}]},right:E(an[0]),body:{type:'BlockStatement',body:[expr(call(mem(E(o),'push'),[v]),n)]},loc}]:[note(n,'putAll не переводится')] }
     if(o&&shortTy(lookupType(o.text))==='Scanner'&&/^close$/.test(nm)) return [] }
    if(e.type==='invocation_expression'){ const f=F(e,'function'); if(f.type==='member_access_expression'&&!C.userMethods.has(nameOf(F(f,'name')))){ const nm=nameOf(F(f,'name')); const an=kids(F(e,'arguments')||{namedChildren:[]}).map(x=>x.type==='argument'?kids(x).slice(-1)[0]:x);
      if(/^(Append|AppendLine)$/.test(nm)){ const parts=[]; let x=e; while(x&&x.type==='invocation_expression'&&F(x,'function').type==='member_access_expression'&&/^(Append|AppendLine)$/.test(nameOf(F(F(x,'function'),'name')))){ const ff=F(x,'function'); const a=kids(F(x,'arguments')).map(z=>z.type==='argument'?E(kids(z).slice(-1)[0]):E(z)); parts.unshift(nameOf(F(ff,'name'))==='AppendLine'?{type:'BinaryExpression',operator:'+',left:a[0]||lit(''),right:lit('\n')}:a[0]||lit('')); x=F(ff,'expression') }
       if(x&&x.type==='identifier') return [expr({type:'AssignmentExpression',operator:'+=',left:E(x),right:parts.reduce((a,b)=>({type:'BinaryExpression',operator:'+',left:a,right:b}))},n)] }
      if(nm==='AddRange'&&an.length===1){ const v=id('_э'); return [{type:'ForOfStatement',left:{type:'VariableDeclaration',kind:'let',declarations:[{type:'VariableDeclarator',id:v}]},right:E(an[0]),body:{type:'BlockStatement',body:[expr(call(mem(E(F(f,'expression')),'push'),[v]),n)]},loc}] } } }
    if(e.type==='call_expression'&&lang==='c'){ const f=F(e,'function').text; const an=kids(F(e,'arguments')||{namedChildren:[]});
     if(f==='scanf'&&an.length>1&&an[0].type==='string_literal'){ const specs=(strLit(an[0])||'').match(/%[*\d]*[lh]*[a-z]/g)||[]; return an.slice(1).map((a,i)=>{ const tg=a.type==='pointer_expression'?F(a,'argument'):a; const sp=specs[i]||'%s'; const v=/[dioux]$/.test(sp)?call(mem(id('Math'),'trunc'),[call(id('Number'),[call(id('prompt'),[])])]):/[feg]$/.test(sp)?call(id('Number'),[call(id('prompt'),[])]):call(id('prompt'),[]); return expr({type:'AssignmentExpression',operator:'=',left:E(tg),right:v},n) }) }
     if((f==='strcpy'||f==='strcat')&&an.length===2) return [expr({type:'AssignmentExpression',operator:f==='strcpy'?'=':'+=',left:E(an[0]),right:E(an[1])},n)];
     if(f==='free') return [];
     if(f==='srand') return [note(n,'srand не нужен: случайные числа в «Понятном» уже случайные')] }
    const ex=E(e); if(ex===null) return [note(n,'не переводится')]; return [expr(ex,n)] }
   case 'local_variable_declaration': case 'local_declaration_statement': case 'declaration': case 'field_declaration': {
    if(lang==='c'&&kids(n).some(k=>k.type==='function_declarator')) return [];
    if(lang==='c'){ const t=F(n,'type'); if(t&&/^(struct|enum|union)_specifier$/.test(t.type)&&F(t,'body')){ const pre=top(t); const d=declarators(n); return pre.concat(d.length?[{type:'VariableDeclaration',kind:'let',declarations:d,loc}]:[]) } }
    const d=declarators(n); return d.length?[{type:'VariableDeclaration',kind:/\bfinal\b|\bconst\b|\breadonly\b/.test(n.text.split('=')[0])?'const':'let',declarations:d,loc}]:[] }
   case 'if_statement': { const alt=F(n,'alternative'); let a=alt; if(a&&a.type==='else_clause') a=kids(a)[0];
    return [{type:'IfStatement',test:E(F(n,'condition')),consequent:asBlock(F(n,'consequence')),alternate:a?asBlock(a):null,loc}] }
   case 'while_statement': return [{type:'WhileStatement',test:E(F(n,'condition')),body:asBlock(F(n,'body')),loc}];
   case 'do_statement': return [{type:'DoWhileStatement',test:E(F(n,'condition')),body:asBlock(F(n,'body')),loc}];
   case 'for_statement': {
    const initN=F(n,'init')||F(n,'initializer'), cond=F(n,'condition'), upd=F(n,'update')||F(n,'updater');
    let init=null; if(initN){ if(/declaration/.test(initN.type)){ const d=declarators(initN); init={type:'VariableDeclaration',kind:'let',declarations:d} } else if(initN.type==='assignment_expression') init={type:'AssignmentExpression',operator:'=',left:E(F(initN,'left')),right:E(F(initN,'right'))} }
    let update=null; if(upd){ if(upd.type==='assignment_expression') update={type:'AssignmentExpression',operator:(F(upd,'operator')||upd.children[1]).text,left:E(F(upd,'left')),right:E(F(upd,'right'))}; else if(/unary|update/.test(upd.type)) update={type:'UpdateExpression',operator:/\+\+/.test(upd.text)?'++':'--',argument:E(F(upd,'argument')||F(upd,'operand')||kids(upd)[0])} }
    return [{type:'ForStatement',init,test:cond?E(cond):null,update,body:asBlock(F(n,'body')),loc}] }
   case 'enhanced_for_statement': return [{type:'ForOfStatement',left:{type:'VariableDeclaration',kind:'let',declarations:[{type:'VariableDeclarator',id:id(F(n,'name').text)}]},right:E(F(n,'value')),body:asBlock(F(n,'body')),loc}];
   case 'foreach_statement': { const l=F(n,'left'); if(l&&l.type!=='identifier') return [note(n,'foreach с разбором на части не переводится')]; return [{type:'ForOfStatement',left:id(nameOf(l)),right:E(F(n,'right')),body:asBlock(F(n,'body')),loc}] }
   case 'return_statement': { const k=kids(n)[0]; return [{type:'ReturnStatement',argument:k?E(k):null,loc}] }
   case 'break_statement': return kids(n).length?[note(n,'break с меткой переведён как обычный'),{type:'BreakStatement',loc}]:[{type:'BreakStatement',loc}];
   case 'continue_statement': return kids(n).length?[note(n,'continue с меткой переведён как обычный'),{type:'ContinueStatement',loc}]:[{type:'ContinueStatement',loc}];
   case 'throw_statement': case 'throw_expression': { const k=kids(n)[0]; if(!k) return [{type:'ThrowStatement',argument:id('е'),loc,rethrow:true}];
    if(k.type==='object_creation_expression'){ const t=F(k,'type'); const tn=t?t.text.replace(/<.*$/s,'').split('.').pop():''; const a=argsOf(F(k,'arguments'));
     if(C.classes.has(tn)) return [{type:'ThrowStatement',argument:{type:'NewExpression',callee:id(tn),arguments:a},loc}];
     return [{type:'ThrowStatement',argument:a[0]||lit(tn||'ошибка'),loc}] }
    return [{type:'ThrowStatement',argument:E(k),loc}] }
   case 'try_statement': case 'try_with_resources_statement': {
    const pre=[]; const res=F(n,'resources')||kids(n).find(x=>x.type==='resource_specification'); if(res){ pre.push(note(res,'ресурсы try() переведены обычными переменными: закрывать их в «Понятном» не нужно')); for(const r of kids(res)){ const nm=F(r,'name'); if(nm) pre.push({type:'VariableDeclaration',kind:'let',declarations:[{type:'VariableDeclarator',id:id(nm.text),init:E(F(r,'value'))}],loc}) } }
    const handlers=kids(n).filter(x=>x.type==='catch_clause').map(c=>{ const p=kids(c).find(x=>/catch_(formal_parameter|declaration)/.test(x.type)); let types=[], param=null;
     if(p){ const nm=F(p,'name')||(lang==='java'?kids(p).filter(x=>x.type==='identifier').slice(-1)[0]:null); if(nm) param=id(nm.text); const ct=kids(p).find(x=>x.type==='catch_type'); types=(ct?kids(ct):[F(p,'type')].filter(Boolean)).map(t=>t.text.replace(/<.*$/s,'').split('.').pop()) }
     if(kids(c).some(x=>x.type==='catch_filter_clause')) pendingNotes.push(note(c,'фильтр when у catch не переводится'));
     return {types:types.map(t=>C.classes.has(t)?t:STD_EXC.test(t)?t:t),param,body:asBlock(F(c,'body')||kids(c).find(x=>x.type==='block'))} });
    const f=kids(n).find(x=>x.type==='finally_clause');
    return pre.concat([{type:'TryStatement',block:asBlock(F(n,'body')),handler:handlers[0]?{param:handlers[0].param,body:handlers[0].body}:null,handlers,finalizer:f?asBlock(kids(f).find(x=>x.type==='block')):null,loc}]) }
   case 'block': case 'compound_statement': return [{type:'BlockStatement',body:stmts(n),loc}];
   case 'labeled_statement': { const lb=F(n,'label')||kids(n)[0]; const body=F(n,'body')||kids(n).slice(-1)[0];
    return [{type:'LabeledStatement',label:id(nameOf(lb)),body:body&&body!==lb?{type:'BlockStatement',body:S(body)}:{type:'EmptyStatement'},loc}] }
   case 'goto_statement': { const lb=F(n,'label')||kids(n)[0]; return [note(n,'goto переведён как «иди к»'),{type:'GotoStatement',name:nameOf(lb),label:{name:nameOf(lb)},loc}] }
   case ';': case 'empty_statement': return [];
   case 'switch_expression': case 'switch_statement': return switchStmt(n);
   case 'assert_statement': { const k=kids(n); return [{type:'PonAssert',test:E(k[0]),message:k[1]?E(k[1]):null,loc}] }
   case 'explicit_constructor_invocation': { const c=F(n,'constructor'); if(c&&c.text==='super'){ if(!C.cls.length||!C.cls[C.cls.length-1].sup) return []; return [expr(call({type:'Super'},argsOf(F(n,'arguments'))),n)] } return [expr(call({type:'ThisExpression'},argsOf(F(n,'arguments'))),n)] }
   case 'using_statement': { const bodyN=F(n,'body')||kids(n).slice(-1)[0]; const decl=F(n,'variable')||F(n,'declaration')||F(n,'expression')||kids(n).find(x=>x!==bodyN&&x.type!=='block'&&x.type!=='compound_statement');
    let name='_ресурс', value=lit(null);
    if(decl&&/declaration/.test(decl.type)){ const d=declarators(decl); if(d[0]){ name=d[0].id.name; value=d[0].init||lit(null) } }
    else if(decl) value=E(decl);
    return [{type:'PonWith',name,value,body:asBlock(bodyN).body,loc,note:'using переведён как «с … как»'}] }
   case 'yield_statement': return [note(n,'yield не переводится')];
   case 'synchronized_statement': case 'lock_statement': return [note(n,'синхронизация потоков не нужна')].concat(stmts(F(n,'body')||kids(n).slice(-1)[0]));
  }
  if(/declaration|definition|specifier/.test(n.type)) return top(n);
  return [note(n)] }
 // ---------- объявления верхнего уровня ----------
 function params(p){ if(!p) return []; return kids(p).filter(x=>/parameter/.test(x.type)&&x.text!=='void').map(x=>id(nameOf(F(x,'name')||F(x,'declarator')||x))) }
 function fn(n){ const nm=lang==='c'?nameOf(F(F(n,'declarator'),'declarator')||F(n,'declarator')):F(n,'name').text;
  let pnode=F(n,'parameters'); if(lang==='c'){ let d=F(n,'declarator'); while(d&&d.type!=='function_declarator') d=F(d,'declarator'); pnode=d&&F(d,'parameters') }
  const body=F(n,'body'); scanLocals(n);
  try{ return {name:nm,params:params(pnode),body:body?(body.type==='arrow_expression_clause'?{type:'BlockStatement',body:[{type:'ReturnStatement',argument:E(kids(body)[0])}]}:asBlock(body)):null} } finally { C.types.pop() } }
 function cls(n){ const nm=F(n,'name').text; let sup=null; const ifs=[];
  const sc=F(n,'superclass'); if(sc){ const t=kids(sc)[0]; if(t) sup=t.text.replace(/<.*$/s,'').split('.').pop() }
  const si=F(n,'interfaces'); if(si) walkAll(si,x=>{ if(x.type==='type_identifier'||x.type==='generic_type') ifs.push(x.text.replace(/<.*$/s,'')) });
  const bl=kids(n).find(x=>x.type==='base_list'); if(bl) kids(bl).forEach(b=>{ const t=b.text.replace(/<.*$/s,'').split('.').pop(); if(C.ifaces.has(t)||(/^I[A-ZА-Я]/.test(t)&&!C.classes.has(t))) ifs.push(t); else if(!sup) sup=t });
  if(sup==='Object') sup=null;
  const body=F(n,'body'); const ms=body?kids(body):[];
  const isSt=m=>/\b(static|const)\b/.test(modText(m))||(n.type==='interface_declaration');
  const isPriv=m=>/\bprivate\b/.test(modText(m));
  const inst=new Set(), stat=new Set(), ftypes=new Map(); ftypes.__cls=true;
  let hasInst=false;
  for(const m of ms){ if(m.type==='method_declaration'){ (isSt(m)?stat:inst).add(F(m,'name').text); if(!isSt(m)) hasInst=true }
   else if(m.type==='constructor_declaration'){ if(!isSt(m)) hasInst=true }
   else if(m.type==='field_declaration'){ const st=isSt(m); const vd=kids(m).find(x=>x.type==='variable_declaration'); const t=typeText(F(m,'type')||(vd&&F(vd,'type'))); walkAll(m,x=>{ if(x.type==='variable_declarator'){ const nn=F(x,'name').text; (st?stat:inst).add(nn); ftypes.set(nn,t) } }); if(!st) hasInst=true }
   else if(m.type==='property_declaration'){ const st=isSt(m); (st?stat:inst).add(F(m,'name').text); ftypes.set(F(m,'name').text,typeText(F(m,'type'))); if(!st) hasInst=true } }
  const flat=!hasInst&&!sup&&!ifs.length&&!/\babstract\b/.test(modText(n))&&n.type!=='record_declaration';
  C.cls.push({name:nm,inst,stat,flat,sup}); C.types.push(ftypes);
  const members=[]; const pre=[];
  try{
  for(const m of ms){ const st=isSt(m), priv=isPriv(m);
   if(m.type==='method_declaration'||m.type==='constructor_declaration'){ C.fnStatic=st; const f=fn(m); C.fnStatic=false; const abs=!f.body;
    if(m.type==='constructor_declaration'){ const ci=kids(m).find(x=>x.type==='constructor_initializer'); if(ci){ const isBase=/^:\s*base\b/.test(ci.text); const a=argsOf(kids(ci).find(x=>x.type==='argument_list')); if(isBase) f.body.body.unshift(expr(call({type:'Super'},a),ci)); else f.body.body.unshift(expr(call({type:'ThisExpression'},a),ci)) }
     members.push({type:'MethodDefinition',kind:'constructor',key:id('constructor'),value:{params:f.params,body:f.body},loc:L(m)}) }
    else if(st&&flat) pre.push({type:'FunctionDeclaration',id:id(f.name),params:f.params,body:f.body||{type:'BlockStatement',body:[]},async:/\basync\b/.test(modText(m)),loc:L(m)});
    else members.push({type:'MethodDefinition',kind:'method',static:st&&n.type!=='interface_declaration',private:priv,abstract:abs,key:id(f.name==='ToString'?'toString':f.name),value:{params:f.params,body:f.body||{type:'BlockStatement',body:[]},async:/\basync\b/.test(modText(m))},loc:L(m)}) }
   else if(m.type==='field_declaration'){ const vd=kids(m).find(x=>x.type==='variable_declaration'); C.fnStatic=st; const d=declarators(vd||m,F(m,'type')||(vd&&F(vd,'type'))); C.fnStatic=false; const cst=/\b(final|readonly|const)\b/.test(modText(m));
    if(st&&flat) pre.push({type:'VariableDeclaration',kind:cst?'const':'let',declarations:d,loc:L(m)});
    else for(const x of d) members.push({type:'PropertyDefinition',key:x.id,value:x.init,static:st,private:priv,loc:L(m)}) }
   else if(m.type==='property_declaration'){ const pn=F(m,'name').text; const v=F(m,'value'); const acc=F(m,'accessors');
    if(v&&v.type==='arrow_expression_clause'){ C.fnStatic=st; scanLocals(m); const e=E(kids(v)[0]); C.types.pop(); C.fnStatic=false; members.push({type:'MethodDefinition',kind:'get',static:st,key:id(pn),value:{params:[],body:{type:'BlockStatement',body:[{type:'ReturnStatement',argument:e}]}},loc:L(m)}); continue }
    const getB=acc&&kids(acc).find(a=>/^get/.test(a.text)&&kids(a).some(z=>z.type==='block'||z.type==='arrow_expression_clause'));
    if(getB){ const b=kids(getB).find(z=>z.type==='block'||z.type==='arrow_expression_clause'); C.fnStatic=st; scanLocals(m); const body=b.type==='block'?asBlock(b):{type:'BlockStatement',body:[{type:'ReturnStatement',argument:E(kids(b)[0])}]}; C.types.pop(); C.fnStatic=false;
     members.push({type:'MethodDefinition',kind:'get',static:st,key:id(pn),value:{params:[],body},loc:L(m)});
     const setA=acc&&kids(acc).find(a=>/^set/.test(a.text));
     if(setA){ const sb=kids(setA).find(z=>z.type==='block'||z.type==='arrow_expression_clause');
      if(sb){ C.fnStatic=st; scanLocals(m); const sbody=sb.type==='block'?asBlock(sb):{type:'BlockStatement',body:[]}; C.types.pop(); C.fnStatic=false;
       members.push({type:'MethodDefinition',kind:'set',static:st,key:id(pn),value:{params:[id('значение')],body:sbody},loc:L(m)}) } }
     continue }
    members.push({type:'PropertyDefinition',key:id(pn),value:v?E(v):defaultFor(typeText(F(m,'type'))),static:st,private:false,loc:L(m)}) }
   else if(/^(class|record|struct|enum|interface)_declaration$/.test(m.type)){ C.cls.pop(); C.types.pop(); try{ pre.push(...top(m)) } finally { C.cls.push({name:nm,inst,stat,flat,sup}); C.types.push(ftypes) } }
   else if(m.type==='static_initializer'||m.type==='block') pre.push(...stmts(kids(m).find(x=>x.type==='block')||m));
   else pre.push(note(m,'член класса не переводится')) }
  } finally { C.cls.pop(); C.types.pop() }
  if(flat) return pre.concat(members.length?[{type:'ClassDeclaration',id:id(nm),superClass:null,implements:[],body:{body:members},loc:L(n)}]:[]); // класс-обёртка из одних static → просто функции
  return pre.concat([{type:'ClassDeclaration',id:id(nm),superClass:sup?id(sup):null,implements:ifs,body:{body:members},loc:L(n)}]) }
 function iface(n){ const nm=F(n,'name').text; const body=F(n,'body'); const methods=[]; const pre=[];
  for(const m of body?kids(body):[]){ if(m.type==='method_declaration'){ if(F(m,'body')||/\b(default|static)\b/.test(modText(m))) pre.push(note(m,'метод интерфейса с телом не переводится')); else methods.push({name:F(m,'name').text,params:params(F(m,'parameters'))}) }
   else if(m.type==='constant_declaration'||m.type==='field_declaration') pre.push({type:'VariableDeclaration',kind:'const',declarations:declarators(m),loc:L(m)});
   else if(m.type==='property_declaration') methods.push({name:F(m,'name').text,params:[]});
   else pre.push(note(m,'член интерфейса не переводится')) }
  return pre.concat([{type:'PonInterface',name:nm,methods,loc:L(n)}]) }
 function enumDecl(n){ const nm=F(n,'name').text; const body=F(n,'body'); const items=[]; const out=[];
  for(const m of body?kids(body):[]){ if(m.type==='enum_constant'){ if(F(m,'arguments')||F(m,'body')) out.push(note(m,'значение перечисления с параметрами переведено без них')); items.push({name:F(m,'name').text,value:null}) }
   else if(m.type==='enum_member_declaration'){ const v=F(m,'value'); items.push({name:F(m,'name').text,value:v?E(v):null}) }
   else if(m.type==='enum_body_declarations') out.push(note(m,'поля и методы перечисления не переводятся')) }
  return out.concat([{type:'PonEnum',name:nm,items,loc:L(n)}]) }
 function cEnum(n){ const body=F(n,'body'); if(!body) return []; let cur=lit(0); const decls=[];
  for(const e of kids(body)){ if(e.type!=='enumerator') continue; const v=F(e,'value'); if(v) cur=E(v); decls.push({type:'VariableDeclarator',id:id(F(e,'name').text),init:cur}); cur=cur.type==='Literal'?lit(cur.value+1):{type:'BinaryExpression',operator:'+',left:id(F(e,'name').text),right:lit(1)} }
  return decls.length?[{type:'VariableDeclaration',kind:'const',declarations:decls,loc:L(n)}]:[] }
 function cStruct(n,name){ const body=F(n,'body'); if(!body) return []; const fields=[];
  for(const f of kids(body)){ if(f.type!=='field_declaration') continue; const t=typeText(F(f,'type')); for(const d of kids(f).filter(x=>/identifier$|declarator$/.test(x.type))){ const fnm=nameOf(d); const v=d.type==='array_declarator'?(F(d,'size')?/^char$/.test(t)?lit(''):{type:'BinaryExpression',operator:'*',left:{type:'ArrayExpression',elements:[defaultFor(t)]},right:E(F(d,'size'))}:{type:'ArrayExpression',elements:[]}):d.type==='pointer_declarator'?lit(null):defaultFor(t); fields.push({name:fnm,value:v}) } }
  return [{type:'PonStruct',name:name||structOf(F(n,'name').text)||F(n,'name').text,fields,loc:L(n)}] }
 function top(n){
  switch(n.type){
   case 'class_declaration': case 'record_declaration': case 'struct_declaration': return cls(n);
   case 'interface_declaration': return iface(n);
   case 'enum_declaration': return enumDecl(n);
   case 'annotation_type_declaration': return [note(n,'аннотации не переводятся')];
   case 'namespace_declaration': case 'file_scoped_namespace_declaration': { const b=F(n,'body'); return b?kids(b).flatMap(top):kids(n).filter(x=>/declaration/.test(x.type)).flatMap(top) }
   case 'declaration_list': return kids(n).flatMap(top);
   case 'package_declaration': case 'import_declaration': case 'using_directive': case 'preproc_include': case 'preproc_call': return [];
   case 'preproc_def': { const v=F(n,'value'); if(!v) return []; const t=v.text.trim(); let val=null; if(/^-?(\d+(\.\d+)?|0x[\da-f]+)[uUlLfF]*$/i.test(t)) val=lit(num(t.replace(/^-/,''))*(t.startsWith('-')?-1:1)); else if(/^"(.*)"$/s.test(t)) val=lit(strLit({text:t,type:'string_literal'})); else if(/^'.'$/.test(t)) val=lit(t[1]);
    return val?[{type:'VariableDeclaration',kind:'const',declarations:[{type:'VariableDeclarator',id:id(F(n,'name').text),init:val}],loc:L(n)}]:[note(n,'макрос #define не переводится')] }
   case 'preproc_function_def': return [note(n,'макрос с параметрами не переводится')];
   case 'preproc_ifdef': case 'preproc_if': return kids(n).filter(x=>!/^(identifier|preproc_else|preproc_elif|preproc_defined|binary_expression|number_literal)$/.test(x.type)).flatMap(top);
   case 'type_definition': { const t=F(n,'type'); if(t&&t.type==='struct_specifier'&&F(t,'body')) return cStruct(t,nameOf(F(n,'declarator'))); if(t&&t.type==='enum_specifier') return cEnum(t); return [] }
   case 'struct_specifier': case 'union_specifier': return F(n,'body')?cStruct(n):[];
   case 'enum_specifier': return cEnum(n);
   case 'function_definition': case 'method_declaration': case 'local_function_statement': { const f=fn(n); return [{type:'FunctionDeclaration',id:id(f.name),params:f.params,body:f.body||{type:'BlockStatement',body:[]},loc:L(n)}] }
   case 'global_statement': return kids(n).flatMap(S);
   case 'declaration': return S(n);
   case 'expression_statement': return S(n);
  }
  if(/statement/.test(n.type)) return S(n);
  return [note(n,'не переводится')] }
 const body=kids(root).flatMap(top);
 // точка входа: main/Main вызывается в конце, как при запуске программы
 const isMain=x=>x.type==='FunctionDeclaration'&&/^[Mm]ain$/.test(x.id.name);
 const mainF=body.find(isMain); let mainCls=null;
 if(!mainF) for(const x of body) if(x.type==='ClassDeclaration'&&x.body.body.some(m=>m.type==='MethodDefinition'&&m.static&&/^[Mm]ain$/.test(m.key.name))) { mainCls=x; break }
 const mainArgs=ps=>ps.length===0?[]:ps.length===1?[{type:'ArrayExpression',elements:[]}]:[lit(0),{type:'ArrayExpression',elements:[]}];
 if(mainF){ const c=call(id(mainF.id.name),mainArgs(mainF.params)); body.push(expr(lang==='c'?call(mem(id('process'),'exit'),[c]):c,root)) }
 else if(mainCls){ const m=mainCls.body.body.find(m=>m.type==='MethodDefinition'&&m.static&&/^[Mm]ain$/.test(m.key.name)); body.push(expr(call(mem(id(mainCls.id.name),m.key.name),mainArgs(m.value.params)),root)) }
 const prog={type:'Program',body:withNotes(body)};
 (function fix(o,loc){ if(!o||typeof o!=='object') return; if(Array.isArray(o)){ o.forEach(x=>fix(x,loc)); return } if(o.type&&!o.loc) o.loc=loc; for(const k in o) if(k!=='loc') fix(o[k],o.loc||loc) })(prog,{start:{line:1,column:0}});
 return prog }

const EXT={java:'java',cs:'csharp',c:'c',cpp:'c',h:'c',py:'python'};
/** src: текст, lang: java|csharp|c|python → {code, notes, errors} */
async function translate(src,lang){
 if(lang==='python'){ try{ const r=V.translateToPon(src,'python'); return {code:r.code,notes:r.notes||[],check:r.checkError||null} }
  catch(e){ return {code:commentAll(src,'Python не перевёлся автоматически ('+e.message+')'),notes:[{line:0,text:e.message}],check:null,fallback:true} } }
 if(!GRAM[lang]) throw new Error('неизвестный язык: '+lang);
 const p=await parser(lang); const tree=p.parse(src); let ast;
 try{ ast=convert(tree.rootNode,lang) }finally{ tree.delete(); p.delete() }
 try{ const r=V.translateAstToPon(ast,'javascript'); return {code:r.code,notes:r.notes||[],check:r.checkError||null} }
 catch(e){ return {code:commentAll(src,'перевод не удался ('+e.message+')'),notes:[{line:0,text:e.message}],check:null,fallback:true} } }
function commentAll(src,why){ return '# '+why+'. Ниже — исходный код декомпилятора как комментарий:\n'+String(src).split(/\r?\n/).map(l=>'# '+l).join('\n')+'\n' }
module.exports={translate,convert,parser,EXT,commentAll};
