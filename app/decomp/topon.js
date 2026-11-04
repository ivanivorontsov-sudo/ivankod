// ИванКод 1.4: перевод декомпилированного кода (Java, C#, C/C++, Python) в «Понятный».
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
function convert(root,lang){
 const L=n=>({start:{line:n.startPosition.row+1,column:n.startPosition.column}});
 const F=(n,f)=>n.childForFieldName(f);
 const kids=n=>n.namedChildren.filter(x=>x.type!=='comment'&&x.type!=='line_comment'&&x.type!=='block_comment');
 const id=name=>({type:'Identifier',name});
 const note=(n,why)=>({type:'PonNote',text:(why?why+': ':'исходник: ')+short(n.text),loc:L(n)});
 const unsup=(n,why)=>({type:'PonUnsupported',text:(why||'не переводится')+': '+short(n.text)});
 const expr=(e,n)=>({type:'ExpressionStatement',expression:e,loc:L(n)});
 const nameOf=n=>{ if(!n) return '_'; if(['identifier','field_identifier','type_identifier'].includes(n.type)) return n.text;
  const d=F(n,'declarator')||F(n,'name'); if(d) return nameOf(d); const k=kids(n).find(x=>/identifier$/.test(x.type)); return k?k.text:n.text.replace(/[^\wА-яЁё]/g,'')||'_' };
 // ---------- выражения ----------
 function num(t){ let s=t.replace(/_/g,'').replace(/[lLfFdDmMuU]+$/,''); if(/^0x/i.test(s)) return parseInt(s,16); if(/^0b/i.test(s)) return parseInt(s.slice(2),2); const v=Number(s); return isNaN(v)?null:v }
 function strLit(n){ const t=n.text; if(lang==='csharp'&&/^[@$]/.test(t)) { if(t.startsWith('$')) return null; return t.slice(2,-1).replace(/""/g,'"') }
  try{ return JSON.parse(t.replace(/^'(.*)'$/s,'"$1"').replace(/\\'/g,"'")) }catch{ return t.replace(/^["']|["']$/g,'') } }
 function E(n){ if(!n) return {type:'Literal',value:null};
  switch(n.type){
   case 'parenthesized_expression': { const k=kids(n); return k.length===1?E(k[0]):unsup(n) }
   case 'identifier': case 'field_identifier': case 'type_identifier': return id(n.text);
   case 'this': case 'this_expression': return {type:'ThisExpression'};
   case 'true': case 'false': return {type:'Literal',value:n.type==='true'};
   case 'boolean_literal': return {type:'Literal',value:n.text==='true'};
   case 'null_literal': case 'null': return {type:'Literal',value:null};
   case 'decimal_integer_literal': case 'hex_integer_literal': case 'octal_integer_literal': case 'binary_integer_literal': case 'decimal_floating_point_literal':
   case 'integer_literal': case 'real_literal': case 'number_literal': { const v=num(n.text); return v===null?unsup(n,'число'):{type:'Literal',value:v} }
   case 'string_literal': case 'verbatim_string_literal': case 'raw_string_literal': case 'character_literal': case 'char_literal': case 'text_block': case 'concatenated_string': {
    if(n.type==='concatenated_string') return kids(n).map(E).reduce((a,b)=>({type:'BinaryExpression',operator:'+',left:a,right:b}));
    const s=strLit(n); return s===null?unsup(n,'строка с вставками'):{type:'Literal',value:s} }
   case 'interpolated_string_expression': return unsup(n,'строка с вставками $"…"');
   case 'binary_expression': { let op=(F(n,'operator')||{}).text||n.children[1].text; const l=E(F(n,'left')), r=E(F(n,'right'));
    if(op==='&&'||op==='||') return {type:'LogicalExpression',operator:op,left:l,right:r};
    if(op==='??') return {type:'LogicalExpression',operator:'??',left:l,right:r};
    if(['+','-','*','/','%','<','>','<=','>=','==','!='].includes(op)) return {type:'BinaryExpression',operator:op==='=='?'===':op==='!='?'!==':op,left:l,right:r};
    return unsup(n,'операция «'+op+'»') }
   case 'unary_expression': case 'prefix_unary_expression': { const op=(F(n,'operator')||n.children[0]).text; const a=F(n,'operand')||F(n,'argument')||kids(n)[0];
    if(op==='!'||op==='-'||op==='+') return {type:'UnaryExpression',operator:op,argument:E(a)}; return unsup(n,'операция «'+op+'»') }
   case 'ternary_expression': case 'conditional_expression': return {type:'ConditionalExpression',test:E(F(n,'condition')),consequent:E(F(n,'consequence')),alternate:E(F(n,'alternative'))};
   case 'cast_expression': return E(F(n,'value')||kids(n).slice(-1)[0]);
   case 'field_access': return {type:'MemberExpression',object:E(F(n,'object')),property:id(F(n,'field').text),computed:false};
   case 'member_access_expression': return {type:'MemberExpression',object:E(F(n,'expression')),property:id(nameOf(F(n,'name'))),computed:false};
   case 'field_expression': return {type:'MemberExpression',object:E(F(n,'argument')),property:id(F(n,'field').text),computed:false};
   case 'scoped_identifier': case 'qualified_name': return id(n.text.split(/\.|::/).pop());
   case 'array_access': return {type:'MemberExpression',object:E(F(n,'array')),property:E(F(n,'index')),computed:true};
   case 'subscript_expression': return {type:'MemberExpression',object:E(F(n,'argument')),property:E(F(n,'index')||kids(n)[1]),computed:true};
   case 'element_access_expression': { const b=F(n,'subscript')||kids(n)[1]; const a=b&&kids(b)[0]; return {type:'MemberExpression',object:E(F(n,'expression')),property:E(a&&a.type==='argument'?kids(a)[0]:a),computed:true} }
   case 'method_invocation': { const o=F(n,'object'), nm=F(n,'name').text; const args=argsOf(F(n,'arguments'));
    if(o&&/^System\.out$/.test(o.text)&&/^print(ln)?$/.test(nm)) return call(PRINT(),args);
    if(o&&/^String$/.test(o.text)&&nm==='valueOf') return call(id('String'),args);
    if(o&&/^Integer$|^Double$|^Long$/.test(o.text)&&/^parse/.test(nm)) return call(id('Number'),args);
    return call(o?{type:'MemberExpression',object:E(o),property:id(nm),computed:false}:id(nm),args) }
   case 'invocation_expression': { const f=F(n,'function'); const args=argsOf(F(n,'arguments')); if(/^Console\.Write(Line)?$/.test(f.text)) return call(PRINT(),args); return call(E(f),args) }
   case 'call_expression': { const f=F(n,'function'); const args=argsOf(F(n,'arguments')); if(/^(printf|puts)$/.test(f.text)) return call(PRINT(),args); return call(E(f),args) }
   case 'object_creation_expression': { const t=F(n,'type'); const nm=t?t.text.replace(/<.*$/,'').split('.').pop():'Объект'; const args=argsOf(F(n,'arguments'));
    if(/^(ArrayList|LinkedList|List)$/.test(nm)&&!args.length) return {type:'ArrayExpression',elements:[]};
    if(/^(HashMap|TreeMap|LinkedHashMap|Dictionary)$/.test(nm)&&!args.length) return {type:'ObjectExpression',properties:[]};
    if(/^StringBuilder$/.test(nm)) return {type:'Literal',value:''};
    return {type:'NewExpression',callee:id(nm),arguments:args} }
   case 'array_creation_expression': { const v=F(n,'value')||kids(n).find(x=>/initializer/.test(x.type)); return v?E(v):{type:'ArrayExpression',elements:[]} }
   case 'array_initializer': case 'initializer_list': case 'initializer_expression': return {type:'ArrayExpression',elements:kids(n).map(E)};
   case 'lambda_expression': { const ps=F(n,'parameters'); const params=ps?(ps.type==='identifier'?[id(ps.text)]:kids(ps).map(p=>id(nameOf(p)))):[]; const b=F(n,'body');
    return b&&(b.type==='block')?{type:'FunctionExpression',params,body:block(b)}:{type:'ArrowFunctionExpression',params,body:E(b)} }
   case 'assignment_expression': case 'update_expression': case 'postfix_unary_expression': return unsup(n,'присваивание внутри выражения');
   case 'pointer_expression': return unsup(n,'указатели');
   case 'sizeof_expression': return unsup(n,'sizeof');
   case 'instanceof_expression': case 'is_pattern_expression': case 'is_expression': return unsup(n,'проверка типа');
  }
  return unsup(n) }
 const PRINT=()=>({type:'MemberExpression',object:id('console'),property:id('log'),computed:false});
 const call=(callee,args)=>({type:'CallExpression',callee,arguments:args});
 function argsOf(a){ if(!a) return []; return kids(a).map(x=>x.type==='argument'?E(kids(x).slice(-1)[0]):E(x)) }
 // ---------- команды ----------
 function block(n){ return {type:'BlockStatement',body:stmts(n)} }
 function stmts(n){ if(!n) return []; if(['block','compound_statement'].includes(n.type)) return kids(n).flatMap(S); return S(n) }
 const asBlock=n=>({type:'BlockStatement',body:stmts(n)});
 function assignStmt(e,n){ // e: tree-sitter assignment / update
  if(e.type==='assignment_expression'){ const op=(F(e,'operator')||e.children[1]).text; if(!['=','+=','-=','*=','/=','%='].includes(op)) return note(n,'присваивание «'+op+'» не переводится');
   return expr({type:'AssignmentExpression',operator:op,left:E(F(e,'left')),right:E(F(e,'right'))},n) }
  const t=e.text; const inc=/\+\+/.test(t); const a=F(e,'argument')||F(e,'operand')||kids(e)[0];
  return expr({type:'UpdateExpression',operator:inc?'++':'--',argument:E(a)},n) }
 function declarators(n){ // локальные переменные / поля
  const out=[]; const walk=x=>{ for(const k of kids(x)){ if(['variable_declarator','init_declarator'].includes(k.type)){ const nm=nameOf(F(k,'name')||F(k,'declarator')||kids(k)[0]); let v=F(k,'value');
    if(!v&&lang==='csharp'){ const eq=kids(k).find(z=>z.type==='equals_value_clause'); v=eq?kids(eq)[0]:kids(k)[1] }
    out.push({type:'VariableDeclarator',id:id(nm),init:v?E(v):null}) } else if(k.type==='variable_declaration') walk(k)
   else if(lang==='c'&&k.type==='identifier'&&k!==F(x,'type')) out.push({type:'VariableDeclarator',id:id(k.text),init:null}) } }; walk(n); return out }
 function S(n){ const loc=L(n);
  switch(n.type){
   case 'expression_statement': { const e=kids(n)[0]; if(!e) return [];
    if(['assignment_expression','update_expression','postfix_unary_expression'].includes(e.type)||(e.type==='prefix_unary_expression'&&/^(\+\+|--)/.test(e.text))) return [assignStmt(e,n)];
    return [expr(E(e),n)] }
   case 'local_variable_declaration': case 'local_declaration_statement': case 'declaration': case 'field_declaration': {
    if(lang==='c'&&kids(n).some(k=>k.type==='function_declarator')) return [];
    const d=declarators(n); return d.length?[{type:'VariableDeclaration',kind:/\bfinal\b|\bconst\b|\breadonly\b/.test(n.text)?'const':'let',declarations:d,loc}]:[] }
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
   case 'foreach_statement': return [{type:'ForOfStatement',left:id(nameOf(F(n,'left'))),right:E(F(n,'right')),body:asBlock(F(n,'body')),loc}];
   case 'return_statement': { const k=kids(n)[0]; return [{type:'ReturnStatement',argument:k?E(k):null,loc}] }
   case 'break_statement': return [{type:'BreakStatement',loc}];
   case 'continue_statement': return [{type:'ContinueStatement',loc}];
   case 'throw_statement': { const k=kids(n)[0]; const a=k&&k.type==='object_creation_expression'?argsOf(F(k,'arguments'))[0]:null; return [{type:'ThrowStatement',argument:a||(k?E(k):{type:'Literal',value:'ошибка'}),loc}] }
   case 'try_statement': case 'try_with_resources_statement': { const c=kids(n).find(x=>x.type==='catch_clause'), f=kids(n).find(x=>x.type==='finally_clause');
    let param=null; if(c){ const p=kids(c).find(x=>/catch_(formal_parameter|declaration)/.test(x.type)); if(p){ const nm=F(p,'name')||kids(p).filter(x=>x.type==='identifier').slice(-1)[0]; if(nm) param=id(nm.text) } }
    const cb=c&&(F(c,'body')||kids(c).find(x=>x.type==='block'));
    return [{type:'TryStatement',block:asBlock(F(n,'body')),handler:c?{param,body:asBlock(cb)}:null,finalizer:f?asBlock(kids(f).find(x=>x.type==='block')):null,loc}] }
   case 'block': case 'compound_statement': return [{type:'BlockStatement',body:stmts(n),loc}];
   case 'labeled_statement': return [note(n,'метка (goto) не переводится')].concat(kids(n).slice(1).flatMap(S));
   case 'goto_statement': return [note(n,'goto не переводится')];
   case ';': case 'empty_statement': return [];
   case 'switch_expression': case 'switch_statement': return [note(n,'switch не переводится автоматически')];
  }
  if(/declaration|definition|specifier/.test(n.type)) return top(n);
  return [note(n)] }
 // ---------- объявления верхнего уровня ----------
 function params(p){ if(!p) return []; return kids(p).filter(x=>/parameter/.test(x.type)&&x.text!=='void').map(x=>id(nameOf(F(x,'name')||F(x,'declarator')||x))) }
 function fn(n){ const nm=lang==='c'?nameOf(F(F(n,'declarator'),'declarator')||F(n,'declarator')):F(n,'name').text;
  let pnode=F(n,'parameters'); if(lang==='c'){ let d=F(n,'declarator'); while(d&&d.type!=='function_declarator') d=F(d,'declarator'); pnode=d&&F(d,'parameters') }
  const body=F(n,'body'); return {name:nm,params:params(pnode),body:body?(body.type==='arrow_expression_clause'?{type:'BlockStatement',body:[{type:'ReturnStatement',argument:E(kids(body)[0])}]}:asBlock(body)):{type:'BlockStatement',body:[]}} }
 function cls(n){ const nm=F(n,'name').text; let sup=null; const sc=F(n,'superclass')||F(n,'bases'); if(sc){ const t=kids(sc)[0]; if(t) sup=t.text.replace(/<.*$/,'').split('.').pop(); if(sup==='Object') sup=null }
  const body=F(n,'body'); const members=[]; const pre=[]; const ctorFields=[];
  for(const m of kids(body||{namedChildren:[]})){
   if(m.type==='method_declaration'||m.type==='constructor_declaration'){ const f=fn(m); const isStatic=/\bstatic\b/.test(m.text.split('(')[0]);
    if(m.type==='constructor_declaration') members.push({type:'MethodDefinition',kind:'constructor',key:id('constructor'),value:{params:f.params,body:f.body},loc:L(m)});
    else if(isStatic) pre.push({type:'FunctionDeclaration',id:id(f.name),params:f.params,body:f.body,loc:L(m)});
    else members.push({type:'MethodDefinition',kind:'method',key:id(f.name),value:{params:f.params,body:f.body},loc:L(m)}) }
   else if(m.type==='field_declaration'){ const st=/\bstatic\b/.test(m.text); const d=declarators(m); if(st) pre.push({type:'VariableDeclaration',kind:/\bfinal\b|\breadonly\b|\bconst\b/.test(m.text)?'const':'let',declarations:d,loc:L(m)}); else ctorFields.push(...d.map(x=>expr({type:'AssignmentExpression',operator:'=',left:{type:'MemberExpression',object:{type:'ThisExpression'},property:x.id,computed:false},right:x.init||{type:'Literal',value:null}},m))) }
   else if(/class_declaration|record_declaration/.test(m.type)) pre.push(...top(m));
   else pre.push(note(m,'член класса не переводится')) }
  if(ctorFields.length){ let c=members.find(x=>x.kind==='constructor'); if(!c){ c={type:'MethodDefinition',kind:'constructor',key:id('constructor'),value:{params:[],body:{type:'BlockStatement',body:[]}},loc:L(n)}; members.unshift(c) } c.value.body.body.unshift(...ctorFields) }
  const onlyStatic=!members.length;
  if(onlyStatic) return pre; // класс-обёртка из одних static (Program, MainActivity…) → просто функции
  return pre.concat([{type:'ClassDeclaration',id:id(nm),superClass:sup?id(sup):null,body:{body:members},loc:L(n)}]) }
 function top(n){
  switch(n.type){
   case 'class_declaration': case 'record_declaration': case 'struct_declaration': return cls(n);
   case 'interface_declaration': case 'enum_declaration': case 'annotation_type_declaration': return [note(n,'объявление «'+n.type.replace('_declaration','')+'» не переводится')];
   case 'namespace_declaration': case 'file_scoped_namespace_declaration': { const b=F(n,'body'); return b?kids(b).flatMap(top):kids(n).filter(x=>/declaration/.test(x.type)).flatMap(top) }
   case 'declaration_list': return kids(n).flatMap(top);
   case 'package_declaration': case 'import_declaration': case 'using_directive': case 'preproc_include': case 'preproc_def': case 'preproc_call': case 'type_definition': case 'struct_specifier': case 'enum_specifier': return [];
   case 'function_definition': case 'method_declaration': case 'local_function_statement': { const f=fn(n); return [{type:'FunctionDeclaration',id:id(f.name),params:f.params,body:f.body,loc:L(n)}] }
   case 'global_statement': return kids(n).flatMap(S);
   case 'declaration': return S(n);
  }
  if(/statement/.test(n.type)) return S(n);
  return [note(n,'не переводится')] }
 const prog={type:'Program',body:kids(root).flatMap(top)};
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
