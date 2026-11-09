(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./yadro"), (() => { try { return require("acorn"); } catch (e) { return null; } })(), require("./perevod-iz"));
  else root.PonyatnyPerevodV = factory(root.PonyatnyYadro, root.acorn, root.PonyatnyPerevodIz);
})(typeof self !== "undefined" ? self : this, function (Y, acorn, IZ) {
  const PRELUDES = IZ ? { python: IZ.PY_PRELUDE, javascript: IZ.JS_PRELUDE } : null;
  class TranslateError extends Error {
    constructor(msg, line, col) { super((line ? "Строка " + line + (col ? ", столбец " + col : "") + ": " : "") + msg); this.line = line; }
  }

  function pyTokenize(src) {
    const toks = [];
    const lines = src.replace(/\r/g, "").split("\n");
    const indents = [0];
    let depth = 0;
    let cont = false;
    for (let ln = 0; ln < lines.length; ln++) {
      let raw = lines[ln];
      let i = 0;
      if (depth === 0 && !cont) {
        const m = raw.match(/^[ \t]*/)[0];
        const rest = raw.slice(m.length);
        if (rest === "" || rest[0] === "#") continue;
        const w = m.replace(/\t/g, "    ").length;
        if (w > indents[indents.length - 1]) { indents.push(w); toks.push({ t: "indent", line: ln + 1 }); }
        while (w < indents[indents.length - 1]) { indents.pop(); toks.push({ t: "dedent", line: ln + 1 }); }
        if (w !== indents[indents.length - 1]) throw new TranslateError("непонятный отступ", ln + 1);
        i = m.length;
      }
      cont = false;
      while (i < raw.length) {
        const c = raw[i];
        const col = i + 1;
        if (c === " " || c === "\t") { i++; continue; }
        if (c === "#") break;
        if (c === "\\" && i === raw.length - 1) { cont = true; i++; continue; }
        let m;
        if ((m = raw.slice(i).match(/^([fFrRbBuU]{0,2})("""|'''|"|')/))) {
          const prefix = m[1].toLowerCase();
          const q = m[2];
          let j = i + m[0].length;
          let s = "";
          const sLine = ln + 1;
          for (;;) {
            if (j >= raw.length && q.length === 3 && ln + 1 < lines.length) { s += "\n"; ln++; raw = lines[ln]; j = 0; continue; }
            if (j >= raw.length) throw new TranslateError("строка не закрыта", ln + 1, col);
            if (raw.startsWith(q, j)) { j += q.length; break; }
            if (raw[j] === "\\" && !prefix.includes("r")) {
              const e = raw[j + 1];
              const map = { n: "\n", t: "\t", "\\": "\\", "'": "'", '"': '"' };
              s += e in map ? map[e] : "\\" + e;
              j += 2;
              continue;
            }
            s += raw[j++];
          }
          toks.push({ t: prefix.includes("f") ? "fstr" : "str", v: s, line: sLine, col });
          i = j;
          continue;
        }
        if ((m = raw.slice(i).match(/^\d[\d_]*(\.\d+)?([eE][+-]?\d+)?|^\.\d+/))) { toks.push({ t: "num", v: parseFloat(m[0].replace(/_/g, "")), line: ln + 1, col }); i += m[0].length; continue; }
        if ((m = raw.slice(i).match(/^[\p{L}_][\p{L}\p{N}\p{Mn}\p{Mc}_]*/u))) { toks.push({ t: "name", v: m[0].normalize("NFKC"), line: ln + 1, col }); i += m[0].length; continue; }
        if ((m = raw.slice(i).match(/^(\*\*=|\/\/=|<<=|>>=|\*\*|\/\/|==|!=|<=|>=|\+=|-=|\*=|\/=|%=|&=|\|=|\^=|<<|>>|->|:=|[-+*\/%<>=()\[\]{},.:;@~|&^])/))) {
          const op = m[0];
          if ("([{".includes(op)) depth++;
          if (")]}".includes(op)) depth--;
          toks.push({ t: "op", v: op, line: ln + 1, col });
          i += op.length;
          continue;
        }
        throw new TranslateError("непонятный символ «" + c + "»", ln + 1, col);
      }
      if (depth === 0 && !cont && toks.length && toks[toks.length - 1].t !== "nl") toks.push({ t: "nl", line: ln + 1 });
    }
    while (indents.length > 1) { indents.pop(); toks.push({ t: "dedent", line: lines.length }); }
    toks.push({ t: "eof", line: lines.length });
    return toks;
  }

  function pyParse(src) {
    const toks = pyTokenize(src);
    let p = 0;
    const peek = (o) => toks[Math.min(p + (o || 0), toks.length - 1)];
    const next = () => toks[p++];
    const is = (t, v) => peek().t === t && (v === undefined || peek().v === v);
    const isOp = (v) => is("op", v);
    const isKw = (v) => is("name", v);
    const accept = (t, v) => (is(t, v) ? next() : null);
    const fail = (msg) => { throw new TranslateError(msg, peek().line, peek().col); };
    const expect = (t, v) => { if (is(t, v)) return next(); fail("ожидалось «" + (v || t) + "»"); };
    const endStmt = () => { if (accept("op", ";")) return; if (!is("eof") && !is("dedent")) expect("nl"); };
    function block() {
      expect("op", ":");
      if (!is("nl")) return [simple()];
      expect("nl");
      expect("indent");
      const body = [];
      while (!is("dedent") && !is("eof")) body.push(statement());
      accept("dedent");
      return body;
    }
    function ifTail(line) {
      const test = expr();
      const body = block();
      let orelse = null;
      if (isKw("elif")) { const l = peek().line; next(); orelse = [ifTail(l)]; }
      else if (isKw("else")) { next(); orelse = block(); }
      return { t: "if", test, body, orelse, line };
    }
    function statement() {
      const line = peek().line;
      if (isKw("if")) { next(); return ifTail(line); }
      if (isKw("while")) { next(); const test = expr(); const body = block(); let note = null; if (isKw("else")) { next(); block(); note = "блок else у while не переведён"; } return { t: "while", test, body, line, note }; }
      if (isKw("for")) {
        next();
        const targets = [];
        do { targets.push(expect("name").v); } while (accept("op", ","));
        expect("name", "in");
        const iter = expr();
        const body = block();
        let note = null;
        if (isKw("else")) { next(); block(); note = "блок else у for не переведён"; }
        return { t: "for", targets, iter, body, line, note };
      }
      if (isKw("async")) {
        next();
        if (!isKw("def")) fail("после «async» ожидалось «def»");
        next();
        const name = expect("name").v;
        const params = paramsList();
        if (accept("op", "->")) expr();
        return { t: "def", name, params, body: block(), line, async: true };
      }
      if (isKw("def")) {
        next();
        const name = expect("name").v;
        const params = paramsList();
        if (accept("op", "->")) expr();
        return { t: "def", name, params, body: block(), line };
      }
      if (isKw("class")) {
        next();
        const name = expect("name").v;
        let parent = null;
        if (accept("op", "(")) { if (!isOp(")")) parent = expr(); expect("op", ")"); }
        return { t: "class", name, parent: parent && parent.t === "name" ? parent.v : null, body: block(), line };
      }
      if (isKw("try")) {
        next();
        const body = block();
        let fin = null, note = null;
        const handlers = [];
        while (isKw("except")) {
          next();
          let types = [], en = null;
          if (!isOp(":")) { const te = expr(); types = te.t === "tuple" ? te.items : [te]; if (accept("name", "as")) en = expect("name").v; }
          const h = block();
          handlers.push({ types: types.map((x) => (x.t === "name" ? x.v : x.t === "attr" ? x.name : null)), errName: en, body: h });
        }
        if (isKw("else")) { next(); block(); note = "блок else у try не переведён"; }
        if (isKw("finally")) { next(); fin = block(); }
        return { t: "try", body, handlers, handler: handlers[0] ? handlers[0].body : null, errName: handlers[0] ? handlers[0].errName : null, fin, line, note };
      }
      if (isKw("with")) {
        next();
        const value = expr();
        let name = "_ресурс";
        if (accept("name", "as")) name = expect("name").v;
        const body = block();
        return { t: "with", value, name, body, line, note: "конструкция with переведена как «с … как»; проверьте открытие файлов" };
      }
      if (isOp("@")) { next(); const d = expr(); expect("nl"); const s = statement(); if (d.t === "name" && (d.v === "staticmethod" || d.v === "classmethod") && s.t === "def") s.isStatic = true; else if (d.t === "name" && d.v === "property" && s.t === "def") s.isGetter = true; else if (d.t === "attr" && d.name === "setter" && s.t === "def") s.isSetter = true; else if (d.t === "name" && d.v === "abstractmethod" && s.t === "def") s.isAbstract = true; else s.note = "декоратор не переведён"; return s; }
      return simple();
    }
    function simple() {
      const line = peek().line;
      let r;
      if (isKw("pass")) { next(); r = { t: "pass", line }; }
      else if (isKw("break")) { next(); r = { t: "break", line }; }
      else if (isKw("continue")) { next(); r = { t: "continue", line }; }
      else if (isKw("return")) { next(); r = { t: "return", value: is("nl") || is("eof") || isOp(";") ? null : exprList(), line }; }
      else if (isKw("raise")) { next(); r = { t: "raise", value: is("nl") ? null : expr(), line }; }
      else if (isKw("import") || isKw("from")) { while (!is("nl") && !is("eof")) next(); r = { t: "import", line, text: "импорт модулей Python не переводится: известные функции заменены встроенными" }; }
      else if (isKw("global") || isKw("nonlocal")) { next(); const names = [expect("name").v]; while (accept("op", ",")) names.push(expect("name").v); r = { t: "global", names, line }; }
      else if (isKw("assert")) { next(); const test = expr(); const msg = accept("op", ",") ? expr() : null; r = { t: "assert", test, msg, line }; }
      else if (isKw("del")) { next(); const tg = exprList(); const items = tg.t === "tuple" ? tg.items : [tg]; r = { t: "del", items, line }; }
      else {
        const target = exprList();
        if (is("op") && ["=", "+=", "-=", "*=", "/=", "%=", "**=", "//=", "&=", "|=", "^=", "<<=", ">>="].includes(peek().v)) {
          const op = next().v;
          let value = exprList();
          const targets = [target];
          while (accept("op", "=")) { targets.push(value); value = exprList(); }
          r = { t: "assign", targets, op, value, line };
        } else if (isOp(":")) { next(); expr(); let value = null; if (accept("op", "=")) value = exprList(); r = value ? { t: "assign", targets: [target], op: "=", value, line } : { t: "pass", line }; }
        else r = { t: "expr", e: target, line };
      }
      endStmt();
      return r;
    }
    function paramsList() {
      expect("op", "(");
      const ps = [];
      while (!isOp(")")) {
        if (accept("op", "*") || accept("op", "**")) { if (is("name")) ps.push({ name: next().v, rest: true }); }
        else {
          const name = expect("name").v;
          if (accept("op", ":")) expr();
          let def = null;
          if (accept("op", "=")) def = expr();
          ps.push({ name, def });
        }
        if (!accept("op", ",")) break;
      }
      expect("op", ")");
      return ps;
    }
    function exprList() {
      const first = expr();
      if (!isOp(",")) return first;
      const items = [first];
      while (accept("op", ",")) { if (is("nl") || isOp("=") || isOp(")")) break; items.push(expr()); }
      return { t: "tuple", items };
    }
    function expr() {
      if (isKw("lambda")) {
        next();
        const ps = [];
        while (!isOp(":")) { const n = expect("name").v; let def = null; if (accept("op", "=")) def = expr(); ps.push({ name: n, def }); if (!accept("op", ",")) break; }
        expect("op", ":");
        return { t: "lambda", params: ps, body: expr() };
      }
      if (isKw("await")) { next(); return { t: "await", e: expr() }; }
      const a = orE();
      if (isOp(":=")) {
        next();
        if (a.t !== "name") fail("слева от «:=» должно быть имя");
        return { t: "walrus", name: a.v, value: expr() };
      }
      if (isKw("if")) { next(); const test = orE(); expect("name", "else"); return { t: "cond", test, a, b: expr() }; }
      return a;
    }
    function orE() { let l = andE(); while (isKw("or")) { next(); l = { t: "bin", op: "или", l, r: andE() }; } return l; }
    function andE() { let l = notE(); while (isKw("and")) { next(); l = { t: "bin", op: "и", l, r: notE() }; } return l; }
    function notE() { if (isKw("not")) { next(); return { t: "un", op: "не", e: notE() }; } return cmpE(); }
    function cmpE() {
      let l = bitE();
      for (;;) {
        if (is("op") && ["==", "!=", "<", ">", "<=", ">="].includes(peek().v)) { const op = next().v; l = { t: "bin", op, l, r: bitE() }; continue; }
        if (isKw("in")) { next(); l = { t: "bin", op: "в", l, r: bitE() }; continue; }
        if (isKw("not") && peek(1).t === "name" && peek(1).v === "in") { next(); next(); l = { t: "un", op: "не", e: { t: "bin", op: "в", l, r: bitE() } }; continue; }
        if (isKw("is")) { next(); const neg = !!accept("name", "not"); l = { t: "bin", op: neg ? "!=" : "==", l, r: bitE() }; continue; }
        return l;
      }
    }
    function bitE() { let l = xorE(); while (isOp("|")) { next(); l = { t: "bin", op: "|", l, r: xorE() }; } return l; }
    function xorE() { let l = andBE(); while (isOp("^")) { next(); l = { t: "bin", op: "^^", l, r: andBE() }; } return l; }
    function andBE() { let l = shiftE(); while (isOp("&")) { next(); l = { t: "bin", op: "&", l, r: shiftE() }; } return l; }
    function shiftE() { let l = addE(); while (isOp("<<") || isOp(">>")) { const op = next().v; l = { t: "bin", op, l, r: addE() }; } return l; }
    function addE() { let l = mulE(); while (isOp("+") || isOp("-")) { const op = next().v; l = { t: "bin", op, l, r: mulE() }; } return l; }
    function mulE() { let l = unE(); while (isOp("*") || isOp("/") || isOp("%") || isOp("//")) { const op = next().v; l = { t: "bin", op, l, r: unE() }; } return l; }
    function unE() { if (isOp("-")) { next(); return { t: "un", op: "-", e: unE() }; } if (isOp("+")) { next(); return unE(); } if (isOp("~")) { next(); return { t: "un", op: "~", e: unE() }; } return powE(); }
    function powE() { const b = postE(); if (isOp("**")) { next(); return { t: "bin", op: "^", l: b, r: unE() }; } return b; }
    function args() {
      expect("op", "(");
      const a = [], kw = [];
      while (!isOp(")")) {
        if (is("name") && peek(1).t === "op" && peek(1).v === "=") { const n = next().v; next(); kw.push({ name: n, value: expr() }); }
        else if (accept("op", "*") || accept("op", "**")) a.push({ t: "unsupported", text: "распаковка аргументов * не переводится", inner: expr() });
        else { const e = expr(); a.push(isKw("for") ? comprehension(e) : e); }
        if (!accept("op", ",")) break;
      }
      expect("op", ")");
      return { a, kw };
    }
    function comprehension(e) {
      next();
      const targets = [];
      do { targets.push(expect("name").v); } while (accept("op", ","));
      expect("name", "in");
      const iter = orE();
      let cond = null;
      if (isKw("if")) { next(); cond = orE(); }
      return { t: "comp", e, targets, iter, cond };
    }
    function postE() {
      let e = atom();
      for (;;) {
        if (isOp("(")) { const { a, kw } = args(); e = { t: "call", fn: e, args: a, kw }; continue; }
        if (isOp("[")) {
          next();
          let lo = null, hi = null, slice = false, stepped = false;
          if (!isOp(":")) lo = expr();
          if (accept("op", ":")) { slice = true; if (!isOp("]") && !isOp(":")) hi = expr(); if (accept("op", ":")) { if (!isOp("]")) expr(); stepped = true; } }
          expect("op", "]");
          e = stepped ? { t: "unsupported", text: "срез с шагом не переводится" } : slice ? { t: "slice", obj: e, lo, hi } : { t: "index", obj: e, index: lo };
          continue;
        }
        if (isOp(".")) { next(); e = { t: "attr", obj: e, name: expect("name").v }; continue; }
        return e;
      }
    }
    function atom() {
      const tok = peek();
      if (accept("num")) return { t: "num", v: tok.v };
      if (is("str") || is("fstr")) {
        const parts = [];
        while (is("str") || is("fstr")) { const s = next(); if (s.t === "str") parts.push(s.v); else parts.push(...fparts(s)); }
        if (parts.every((x) => typeof x === "string")) return { t: "str", v: parts.join("") };
        return { t: "fstr", parts };
      }
      if (accept("name", "True")) return { t: "bool", v: true };
      if (accept("name", "False")) return { t: "bool", v: false };
      if (accept("name", "None")) return { t: "null" };
      if (accept("name")) return { t: "name", v: tok.v };
      if (accept("op", "(")) {
        if (accept("op", ")")) return { t: "tuple", items: [] };
        const e = expr();
        if (isKw("for")) { const c = comprehension(e); expect("op", ")"); return c; }
        if (isOp(",")) { const items = [e]; while (accept("op", ",")) { if (isOp(")")) break; items.push(expr()); } expect("op", ")"); return { t: "tuple", items }; }
        expect("op", ")");
        return e;
      }
      if (accept("op", "[")) {
        const items = [];
        while (!isOp("]")) {
          const e = expr();
          if (isKw("for")) { const c = comprehension(e); expect("op", "]"); return c; }
          items.push(e);
          if (!accept("op", ",")) break;
        }
        expect("op", "]");
        return { t: "list", items };
      }
      if (accept("op", "{")) {
        const entries = [];
        while (!isOp("}")) {
          const k = expr();
          if (!accept("op", ":")) {
            if (isKw("for")) { const c = comprehension(k); expect("op", "}"); return { t: "call", fn: { t: "name", v: "set" }, args: [c], kw: [] }; }
            const items = [k];
            while (accept("op", ",")) { if (isOp("}")) break; items.push(expr()); }
            expect("op", "}");
            return { t: "call", fn: { t: "name", v: "set" }, args: [{ t: "list", items }], kw: [] };
          }
          const val = expr();
          if (isKw("for")) {
            next();
            const targets = [];
            do { targets.push(expect("name").v); } while (accept("op", ","));
            expect("name", "in");
            const iter = orE();
            let cond = null;
            if (isKw("if")) { next(); cond = orE(); }
            expect("op", "}");
            return { t: "dictcomp", key: k, value: val, targets, iter, cond };
          }
          entries.push({ key: k, value: val });
          if (!accept("op", ",")) break;
        }
        expect("op", "}");
        return { t: "dict", entries };
      }
      fail("не получается разобрать «" + (tok.v || tok.t) + "»");
    }
    function fparts(tok) {
      const s = tok.v, parts = [];
      let cur = "";
      for (let i = 0; i < s.length; i++) {
        if (s[i] === "{" && s[i + 1] === "{") { cur += "{"; i++; continue; }
        if (s[i] === "}" && s[i + 1] === "}") { cur += "}"; i++; continue; }
        if (s[i] !== "{") { cur += s[i]; continue; }
        let d = 1, j = i + 1, inner = "";
        while (j < s.length) { if (s[j] === "{") d++; if (s[j] === "}" && --d === 0) break; inner += s[j++]; }
        if (cur) parts.push(cur);
        cur = "";
        let fmt = null;
        const colon = inner.lastIndexOf(":");
        if (colon > 0 && !/[\[\]()'"]/.test(inner.slice(colon))) { fmt = inner.slice(colon + 1); inner = inner.slice(0, colon); }
        const sub = pyParse(inner.trim() + "\n");
        const e = sub[0] && sub[0].t === "expr" ? sub[0].e : { t: "unsupported", text: "непонятная вставка в f-строке" };
        parts.push(fmt ? { t: "fmt", e, fmt } : e);
        i = j;
      }
      if (cur) parts.push(cur);
      return parts;
    }
    const body = [];
    while (!is("eof")) { if (accept("nl")) continue; body.push(statement()); }
    return body;
  }

  function jsToIR(src) {
    if (!acorn) throw new TranslateError("для перевода с JavaScript нужен модуль acorn");
    let ast;
    try { ast = acorn.parse(src, { ecmaVersion: "latest", sourceType: "script", locations: true, allowReturnOutsideFunction: true }); }
    catch (e) { throw new TranslateError("JavaScript не разобрался: " + e.message.replace(/\s*\(\d+:\d+\)$/, ""), e.loc && e.loc.line, e.loc && e.loc.column + 1); }
    return estreeToIR(ast);
  }
  function estreeToIR(ast) {
    const un = (text) => ({ t: "unsupported", text });
    const numE = (v) => ({ t: "num", v });
    function S(n) {
      const line = n.loc.start.line;
      switch (n.type) {
        case "PonNote": return { t: "note", text: n.text, line };
        case "PonEnum": return { t: "enum", name: n.name, items: n.items.map((it) => ({ name: it.name, value: it.value ? E(it.value) : null })), line };
        case "PonInterface": return { t: "iface", name: n.name, methods: n.methods.map((m) => ({ name: m.name, params: params(m.params) })), line };
        case "PonStruct": return { t: "struct", name: n.name, fields: n.fields.map((f) => (typeof f === "string" ? { name: f, value: null } : { name: f.name, value: f.value ? E(f.value) : null })), line };
        case "PonAssert": return { t: "assert", test: E(n.test), msg: n.message ? E(n.message) : null, line };
        case "PonWarn": return { t: "expr", e: { t: "call", fn: { t: "name", v: "\u0001warn" }, args: n.arguments.map(E), kw: [] }, line };
        case "VariableDeclaration":
          return n.declarations.map((d) => (d.id.type === "ArrayPattern" && d.init && d.id.elements.every((x) => x && x.type === "Identifier") ? { t: "assign", targets: [{ t: "tuple", items: d.id.elements.map((x) => ({ t: "name", v: x.name })) }], op: "=", value: E(d.init), line, decl: n.kind } : d.id.type === "Identifier" ? { t: "assign", targets: [{ t: "name", v: d.id.name }], op: "=", value: d.init ? E(d.init) : { t: "null" }, line, decl: n.kind } : { t: "note", text: "деструктуризация не переводится", line }));
        case "ExpressionStatement": {
          const e = n.expression;
          if (e.type === "AssignmentExpression") return { t: "assign", targets: [E(e.left)], op: e.operator === "**=" ? "^=" : e.operator === "^=" ? "^^=" : e.operator, value: E(e.right), line };
          if (e.type === "UpdateExpression") return { t: "assign", targets: [E(e.argument)], op: e.operator === "++" ? "+=" : "-=", value: numE(1), line };
          if (e.type === "Literal" && e.value === "use strict") return { t: "pass", line };
          return { t: "expr", e: E(e), line };
        }
        case "IfStatement": return { t: "if", test: E(n.test), body: B(n.consequent), orelse: n.alternate ? B(n.alternate) : null, line };
        case "WhileStatement": return { t: "while", test: E(n.test), body: B(n.body), line };
        case "DoWhileStatement": return { t: "dowhile", test: E(n.test), body: B(n.body), line };
        case "ForStatement": {
          const init = n.init, test = n.test, upd = n.update;
          if (init && init.type === "VariableDeclaration" && init.declarations.length === 1 && test && test.type === "BinaryExpression" && test.left.type === "Identifier" && test.left.name === init.declarations[0].id.name && upd) {
            const v = test.left.name;
            let step = null;
            if (upd.type === "UpdateExpression" && upd.argument.name === v) step = numE(upd.operator === "++" ? 1 : -1);
            if (upd.type === "AssignmentExpression" && upd.left.name === v && (upd.operator === "+=" || upd.operator === "-=")) step = upd.operator === "+=" ? E(upd.right) : (upd.right.type === "Literal" ? numE(-upd.right.value) : { t: "un", op: "-", e: E(upd.right) });
            const ops = { "<": -1, "<=": 0, ">": 1, ">=": 0 };
            if (step && test.operator in ops) {
              const r = E(test.right);
              let to = r;
              if (ops[test.operator] !== 0) to = r.t === "num" ? numE(r.v + ops[test.operator]) : { t: "bin", op: ops[test.operator] < 0 ? "-" : "+", l: r, r: numE(1) };
              const unit = step.t === "num" && Math.abs(step.v) === 1;
              const note = unit ? null : "цикл for с шагом не 1: проверьте, что конец цикла совпадает";
              return { t: "forRange", v, body: B(n.body), from: E(init.declarations[0].init), to, step: step.t === "num" && step.v === 1 ? null : step, line, note, down: step.t === "num" && step.v < 0 };
            }
          }
          const out = [];
          if (init) out.push(...[].concat(init.type === "VariableDeclaration" ? S(init) : S({ type: "ExpressionStatement", expression: init, loc: n.loc })));
          const updS = upd ? [].concat(S({ type: "ExpressionStatement", expression: upd, loc: n.loc })) : [];
          out.push({ t: "while", test: test ? E(test) : { t: "bool", v: true }, body: B(n.body).concat(updS), line, note: "цикл for переведён через «пока»; «дальше» внутри него пропустит обновление счётчика" });
          return out;
        }
        case "ForOfStatement": {
          const l = n.left.type === "VariableDeclaration" ? n.left.declarations[0].id : n.left;
          if (l.type === "ArrayPattern") return { t: "for", targets: l.elements.map((x) => x.name), iter: E(n.right), body: B(n.body), line };
          return { t: "for", targets: [l.name], iter: E(n.right), body: B(n.body), line };
        }
        case "ForInStatement": { const l = n.left.type === "VariableDeclaration" ? n.left.declarations[0].id : n.left; return { t: "for", targets: [l.name], iter: E(n.right), body: B(n.body), line }; }
        case "FunctionDeclaration": return { t: "def", name: n.id.name, params: params(n.params), body: B(n.body), line, async: !!n.async };
        case "ReturnStatement": return { t: "return", value: n.argument ? E(n.argument) : null, line };
        case "BreakStatement": return n.label ? { t: "note", text: "break с меткой не переводится", line } : { t: "break", line };
        case "ContinueStatement": return { t: "continue", line };
        case "LabeledStatement": return [{ t: "label", name: n.label && (n.label.name || n.label), line }].concat([].concat(S(n.body)));
        case "GotoStatement": return { t: "goto", name: n.name || (n.label && n.label.name), line, note: "goto переведён как «иди к»" };
        case "PonWith": return { t: "with", value: E(n.value), name: n.name, body: (n.body || []).flatMap((x) => [].concat(S(x))), line, note: n.note || "конструкция using переведена как «с … как»" };
        case "BlockStatement": return B(n);
        case "EmptyStatement": return { t: "pass", line };
        case "ThrowStatement": {
          const a = n.argument;
          if (a.type === "NewExpression" && a.callee.name && /Error$/.test(a.callee.name)) return { t: "raise", value: a.arguments[0] ? E(a.arguments[0]) : { t: "str", v: "ошибка" }, line };
          return { t: "raise", value: E(a), line };
        }
        case "TryStatement": {
          const hs = n.handlers ? n.handlers.map((h) => ({ types: h.types || [], errName: h.param ? h.param.name : null, body: B(h.body) })) : n.handler ? [{ types: [], errName: n.handler.param ? n.handler.param.name : null, body: B(n.handler.body) }] : [];
          return { t: "try", body: B(n.block), handlers: hs, handler: hs[0] ? hs[0].body : null, errName: hs[0] ? hs[0].errName : null, fin: n.finalizer ? B(n.finalizer) : null, line };
        }
        case "SwitchStatement": {
          const cases = [];
          let def = null, note = null, vals = [];
          for (const c of n.cases) {
            let body = c.consequent.flatMap((x) => [].concat(S(x)));
            if (!c.test) { def = body.filter((x) => x.t !== "break"); continue; }
            vals.push(E(c.test));
            if (!body.length) continue;
            const last = body[body.length - 1];
            if (last.t === "break") body = body.slice(0, -1);
            else if (last.t !== "return" && last.t !== "raise") note = "в switch был переход в следующий case без break — в «выбор» так не бывает, проверьте";
            cases.push({ values: vals, body });
            vals = [];
          }
          return { t: "switch", subject: E(n.discriminant), cases, def, line, note };
        }
        case "ClassDeclaration": {
          const body = n.body.body.map((m) => {
            const ml = m.loc.start.line;
            if (m.type === "PropertyDefinition" && !m.computed && (m.key.type === "Identifier" || m.key.type === "PrivateIdentifier")) return { t: "assign", targets: [{ t: "name", v: m.key.name }], op: "=", value: m.value ? E(m.value) : { t: "null" }, line: ml, isStatic: !!m.static, isPrivate: !!m.private || m.key.type === "PrivateIdentifier" };
            if (m.type === "PonNote") return { t: "note", text: m.text, line: ml };
            if (m.type !== "MethodDefinition") return { t: "note", text: "поля класса вне конструктора не переводятся", line: ml };
            if (m.kind === "set") return { t: "def", name: m.key.name, params: (m.static ? [] : [{ name: "self" }]).concat(params(m.value.params)), body: m.value.body ? B(m.value.body) : [], line: ml, isStatic: !!m.static, isSetter: true, isPrivate: !!m.private || m.key.type === "PrivateIdentifier", async: !!(m.value && m.value.async) };
            const name = m.kind === "constructor" ? "__init__" : m.key.name === "toString" ? "__str__" : m.key.name;
            return { t: "def", name, params: (m.static ? [] : [{ name: "self" }]).concat(params(m.value.params)), body: m.value.body ? B(m.value.body) : [], line: ml, isStatic: !!m.static, isGetter: m.kind === "get", isAbstract: !!m.abstract, isPrivate: !!m.private || m.key.type === "PrivateIdentifier", async: !!(m.value && m.value.async) };
          });
          return { t: "class", name: n.id.name, parent: n.superClass && n.superClass.name, ifaces: n.implements || [], body, line };
        }
      }
      return { t: "note", text: "конструкция «" + n.type + "» не переводится", line };
    }
    function params(ps) { return ps.map((q) => (q.type === "Identifier" ? { name: q.name } : q.type === "AssignmentPattern" ? { name: q.left.name, def: E(q.right) } : q.type === "RestElement" ? { name: q.argument.name, rest: true } : { name: "_параметр", rest: true })); }
    function B(n) { if (n.type === "BlockStatement") return n.body.flatMap((x) => [].concat(S(x))); return [].concat(S(n)); }
    function E(n) {
      switch (n.type) {
        case "PonUnsupported": return un(n.text);
        case "Literal":
          if (n.regex) return un("регулярные выражения не переводятся");
          if (n.value === null) return { t: "null" };
          if (typeof n.value === "number") return numE(n.value);
          if (typeof n.value === "string") return { t: "str", v: n.value };
          if (typeof n.value === "boolean") return { t: "bool", v: n.value };
          return un("непонятное значение");
        case "Identifier": return n.name === "undefined" ? { t: "null" } : { t: "name", v: n.name };
        case "TemplateLiteral": {
          const parts = [];
          n.quasis.forEach((q, i) => { if (q.value.cooked) parts.push(q.value.cooked); if (n.expressions[i]) parts.push(E(n.expressions[i])); });
          return parts.every((x) => typeof x === "string") ? { t: "str", v: parts.join("") } : { t: "fstr", parts };
        }
        case "ArrayExpression": return { t: "list", items: n.elements.map((x) => (x && x.type !== "SpreadElement" ? E(x) : un("«...» в списке не переводится"))) };
        case "ObjectExpression": return { t: "dict", entries: n.properties.map((p) => (p.type === "Property" ? { key: p.computed ? E(p.key) : { t: "str", v: p.key.name !== undefined ? p.key.name : String(p.key.value) }, value: E(p.value) } : { key: { t: "str", v: "_" }, value: un("«...» в объекте не переводится") })) };
        case "BinaryExpression": {
          const map = { "===": "==", "!==": "!=", "==": "==", "!=": "!=", "<": "<", ">": ">", "<=": "<=", ">=": ">=", "+": "+", "-": "-", "*": "*", "/": "/", "%": "%", "**": "^", "in": "в", "&": "&", "|": "|", "^": "^^", "<<": "<<", ">>": ">>", ">>>": ">>>" };
          if (n.operator === "instanceof") return { t: "call", fn: { t: "name", v: "isinstance" }, args: [E(n.left), E(n.right)], kw: [] };
          if (n.operator === "//") return { t: "bin", op: "//", l: E(n.left), r: E(n.right) };
          if (!(n.operator in map)) return un("операция «" + n.operator + "» не переводится");
          return { t: "bin", op: map[n.operator], l: E(n.left), r: E(n.right), jsLoose: n.operator === "==" || n.operator === "!=" };
        }
        case "LogicalExpression":
          if (n.operator === "??") {
            const l = E(n.left), r = E(n.right);
            if (l.t === "index") return { t: "call", fn: { t: "attr", obj: l.obj, name: "__получи" }, args: [l.index, r], kw: [] };
            return { t: "cond", test: { t: "bin", op: "==", l, r: { t: "null" } }, a: r, b: l };
          }
          return { t: "bin", op: n.operator === "&&" ? "и" : "или", l: E(n.left), r: E(n.right) };
        case "UnaryExpression":
          if (n.operator === "!") return { t: "un", op: "не", e: E(n.argument) };
          if (n.operator === "-") return n.argument.type === "Literal" && typeof n.argument.value === "number" ? numE(-n.argument.value) : { t: "un", op: "-", e: E(n.argument) };
          if (n.operator === "+") return { t: "call", fn: { t: "name", v: "Number" }, args: [E(n.argument)], kw: [] };
          if (n.operator === "delete" && n.argument.type === "MemberExpression") { const m = E(n.argument); return { t: "call", fn: { t: "attr", obj: m.obj, name: "__убери" }, args: [m.t === "index" ? m.index : { t: "str", v: m.name }], kw: [] }; }
          if (n.operator === "typeof") return { t: "call", fn: { t: "name", v: "__typeof" }, args: [E(n.argument)], kw: [] };
          if (n.operator === "~") return { t: "un", op: "~", e: E(n.argument) };
          if (n.operator === "&") return { t: "refof", target: E(n.argument) };
          if (n.operator === "*") return { t: "deref", e: E(n.argument) };
          return un("операция «" + n.operator + "» не переводится");
        case "ConditionalExpression": return { t: "cond", test: E(n.test), a: E(n.consequent), b: E(n.alternate) };
        case "CallExpression":
          if (n.callee.type === "Super") return { t: "call", fn: { t: "attr", obj: { t: "call", fn: { t: "name", v: "super" }, args: [], kw: [] }, name: "__init__" }, args: n.arguments.map(E), kw: [] };
          if (n.callee.type === "ThisExpression") return { t: "call", fn: { t: "name", v: "это" }, args: n.arguments.map(E), kw: [], thisCtor: true };
          return { t: "call", fn: E(n.callee), args: n.arguments.map((a) => (a.type === "SpreadElement" ? un("«...» в аргументах не переводится") : E(a))), kw: [] };
        case "NewExpression": return { t: "call", fn: E(n.callee), args: n.arguments.map(E), kw: [], isNew: true };
        case "MemberExpression":
          if (n.object.type === "Super") return { t: "attr", obj: { t: "call", fn: { t: "name", v: "super" }, args: [], kw: [] }, name: n.property.name };
          if (n.computed) return { t: "index", obj: E(n.object), index: E(n.property), safe: n.optional };
          return { t: "attr", obj: E(n.object), name: n.property.name, safe: n.optional };
        case "ChainExpression": return E(n.expression);
        case "ArrayPattern": return n.elements.every((x) => x && x.type !== "RestElement") ? { t: "tuple", items: n.elements.map(E) } : un("деструктуризация с пропусками или «...» не переводится");
        case "ThisExpression": return { t: "name", v: "self" };
        case "ArrowFunctionExpression":
        case "FunctionExpression":
          if (n.body.type !== "BlockStatement") return { t: "lambda", params: params(n.params), body: E(n.body) };
          return { t: "lambdaBlock", params: params(n.params), body: B(n.body) };
        case "AssignmentExpression":
          if (n.operator === "=" && n.left.type === "Identifier") return { t: "walrus", name: n.left.name, value: E(n.right) };
          return un("присваивание внутри выражения не переводится");
        case "AwaitExpression": return { t: "await", e: E(n.argument) };
        case "PonMethodRef": return { t: "methodref", obj: E(n.object), name: n.name };
        case "PonAnonClass": return { t: "anoncls", parent: n.parent, args: (n.arguments || []).map(E) };
        case "ImportDeclaration": return un("импорт модулей JavaScript не переводится: подключайте файлы «Понятного» через подключи");
        case "UpdateExpression": return un("«++»/«--» внутри выражения не переводятся");
        case "SequenceExpression": return un("запятая между выражениями не переводится");
      }
      return un("выражение «" + n.type + "» не переводится");
    }
    return ast.body.flatMap((x) => [].concat(S(x)));
  }

  const PON_RESERVED = new Set(Y.KEYWORDS.concat(Object.keys(Y.BUILTINS)));
  const NESTED = ["body", "orelse", "handler", "fin"];

  function walkStmts(body, f) {
    for (const s of body) {
      f(s);
      if (s.t === "def" || s.t === "class") continue;
      for (const k of NESTED) if (Array.isArray(s[k])) walkStmts(s[k], f);
      if (s.t === "switch") { s.cases.forEach((c) => walkStmts(c.body, f)); if (s.def) walkStmts(s.def, f); }
    }
  }
  const usesName = (x, n) => JSON.stringify(x).includes("\"v\":\"" + n + "\"");

  function toPonIdent(n) {
    let out = "", prev = null;
    for (const c of String(n).normalize("NFKC")) {
      let cur = null;
      if (/\p{Script=Cyrillic}/u.test(c) && /\p{L}/u.test(c)) cur = "cyr";
      else if (/\p{Script=Latin}/u.test(c) && /\p{L}/u.test(c)) cur = "lat";
      if (cur) { if (prev && prev !== cur && !out.endsWith("_")) out += "_"; out += c; prev = cur; }
      else if (/[0-9_]/.test(c)) out += c;
      else { out += (out && !out.endsWith("_") ? "_" : "") + "u" + c.codePointAt(0).toString(16) + "_"; prev = "lat"; }
    }
    if (!out) out = "_";
    if (/^[0-9]/.test(out)) out = "_" + out;
    return out.slice(0, 200);
  }

  function irToPon(ir, from) {
    const lines = [];
    const notes = [];
    let ind = 0;
    const emit = (s) => lines.push("    ".repeat(ind) + s);
    let pending = [];
    const pnote = (text) => { if (!pending.includes(text)) pending.push(text); };
    const rename = Y.makeRenamer(PON_RESERVED, toPonIdent, false);
    const nm = (n) => rename(from === "python" ? String(n).normalize("NFKC") : n);
    const scopes = [];
    let classCtx = null;

    const classNames = new Set();
    const ifaceNames = new Set();
    const userMethodNames = new Set();
    walkStmts(ir, (s) => { if (s.t === "iface") ifaceNames.add(s.name); if (s.t === "class") { classNames.add(s.name); s.body.forEach((m) => m.t === "def" && userMethodNames.add(m.name)); } });
    const allDefs = (b) => { b.forEach((s) => { if (s.t === "def") allDefs(s.body); if (s.t === "class") s.body.forEach((m) => { if (m.t === "def") allDefs(m.body); }); }); };
    allDefs(ir);

    function locals(body, params, globals) {
      const loc = new Set();
      const loopVars = new Set();
      const plain = new Set();
      walkStmts(body, (s) => {
        if (s.t === "assign") for (const t of s.targets) {
          const names = t.t === "name" ? [t.v] : t.t === "tuple" || t.t === "list" ? t.items.filter((x) => x.t === "name").map((x) => x.v) : [];
          for (const n of names) {
            if (from === "javascript" && !s.decl) continue;
            plain.add(n);
          }
        }
        if (s.t === "for") s.targets.forEach((x) => loopVars.add(x));
        if (s.t === "forRange") loopVars.add(s.v);
      });
      for (const n of plain) if (!params.includes(n) && !globals.has(n)) loc.add(n);
      const pre = [];
      for (const n of loc) {
        let ok = false;
        for (const s of body) {
          if (s.t === "assign" && s.targets.length === 1 && s.targets[0].t === "name" && s.targets[0].v === n) { ok = s.op === "=" && !usesName(s.value, n); break; }
          if (s.t === "assign" && s.targets.length === 1 && s.targets[0].t === "tuple" && s.targets[0].items.some((x) => x.t === "name" && x.v === n)) { const tn = s.targets[0].items; ok = s.op === "=" && tn.every((x) => x.t === "name") && !tn.some((x) => usesName(s.value, x.v)); break; }
          if (s.t !== "def" && s.t !== "class" && usesName(s, n)) break;
        }
        if (!ok) pre.push(n);
      }
      return { loc, pre, loopVars };
    }
    function enterScope(body, params, globals) {
      const info = locals(body, params, globals || new Set());
      const sc = { declared: new Set(params), globals: globals || new Set() };
      for (const n of info.pre) { emit("пусть " + nm(n) + " = ничего"); sc.declared.add(n); }
      scopes.push(sc);
      return sc;
    }
    const cur = () => scopes[scopes.length - 1];

    const PREC = { "или": 1, "и": 2, "==": 4, "!=": 4, "<": 4, ">": 4, "<=": 4, ">=": 4, "в": 4, "+": 5, "-": 5, "*": 6, "/": 6, "%": 6, "^": 8 };
    const wrap = (s, outer, inner) => (outer > inner ? "(" + s + ")" : s);
    const strBody = (s) => s.replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\n/g, "\\n").replace(/\t/g, "\\t").replace(/[{}]/g, (c) => "\\" + c);
    const str = (s) => "\"" + strBody(s) + "\"";
    const minus1 = (x) => (x.t === "num" ? { t: "num", v: x.v - 1 } : { t: "bin", op: "-", l: x, r: { t: "num", v: 1 } });
    const plus1 = (x) => (x.t === "num" ? { t: "num", v: x.v + 1 } : { t: "bin", op: "+", l: x, r: { t: "num", v: 1 } });
    function rangeEnd(end, step) {
      const neg = step && step.t === "num" && step.v < 0;
      if (step && step.t !== "num") pnote("шаг диапазона не число: проверьте конец цикла");
      return neg ? plus1(end) : minus1(end);
    }

    function E(e, prec) {
      prec = prec || 0;
      switch (e.t) {
        case "num": return e.v < 0 ? wrap(String(e.v), prec, 6) : String(e.v);
        case "str": return str(e.v);
        case "bool": return e.v ? "истина" : "ложь";
        case "null": return "ничего";
        case "name": return e.v === "self" || (e.v === "cls" && classCtx) ? "это" : nm(e.v);
        case "fstr": return "\"" + e.parts.map((x) => (typeof x === "string" ? strBody(x) : x.t === "fmt" ? fmt(x) : "{" + E(x.t === "call" && x.fn.t === "name" && x.fn.v === "показать" && x.args.length === 1 ? x.args[0] : x) + "}")).join("") + "\"";
        case "list": return "[" + e.items.map((x) => E(x)).join(", ") + "]";
        case "tuple": pnote("кортеж переведён как список"); return "[" + e.items.map((x) => E(x)).join(", ") + "]";
        case "dict": return "{" + e.entries.map((x) => (x.key.t === "str" && /^[A-Za-zА-Яа-яЁё_][\wА-Яа-яЁё]*$/.test(x.key.v) && !PON_RESERVED.has(x.key.v) ? x.key.v : E(x.key)) + ": " + E(x.value)).join(", ") + "}";
        case "bin": {
          if (e.jsLoose) pnote("нестрогое сравнение «==» переведено как строгое");
          if (e.op === "//") return "нацело(" + E(e.l) + ", " + E(e.r) + ")";
          const BITS = { "&": "бит_и", "|": "бит_или", "^^": "бит_искл", "<<": "сдвиг_влево", ">>": "сдвиг_вправо", ">>>": "сдвиг_вправо_без_знака" };
          if (BITS[e.op]) return BITS[e.op] + "(" + E(e.l) + ", " + E(e.r) + ")";
          if (e.op === "/" && from === "python") pnote("в Python «/» всегда даёт дробь (6 / 2 = 3.0), а «Понятный» напишет 3");
          if (e.op === "%" && from === "javascript") pnote("остаток от деления отрицательных чисел в JavaScript считается иначе");
          const p = PREC[e.op];
          return wrap(E(e.l, p) + " " + e.op + " " + E(e.r, p + (e.op === "^" ? 0 : 1)), prec, p);
        }
        case "un": return e.op === "~" ? "бит_не(" + E(e.e) + ")" : e.op === "не" ? wrap("не " + E(e.e, 3), prec, 3) : wrap("-" + E(e.e, 7), prec, 7);
        case "cond": return wrap("если " + E(e.test, 1) + " то " + E(e.a, 1) + " иначе " + E(e.b, 1), prec, 0);
        case "index": return E(e.obj, 9) + (e.safe ? "?.[" : "[") + E(e.index) + "]";
        case "slice": return E(e.obj, 9) + ".срез(" + (e.lo ? E(e.lo) : "0") + (e.hi ? ", " + E(e.hi) : "") + ")";
        case "attr": return attr(e);
        case "call": return call(e);
        case "lambda": return "функция(" + e.params.map((q) => nm(q.name) + (q.def ? " = " + E(q.def) : "")).join(", ") + ") => " + E(e.body);
        case "lambdaBlock": {
          const at = lines.length;
          const si = ind;
          ind++;
          enterScope(e.body, e.params.map((q) => q.name), new Set());
          block(e.body);
          scopes.pop();
          const inner = lines.splice(at);
          ind = si;
          return "функция(" + e.params.map((q) => nm(q.name) + (q.def ? " = " + E(q.def) : "")).join(", ") + ")\n" + inner.join("\n") + "\n" + "    ".repeat(ind) + "конец";
        }
        case "walrus": return "(" + nm(e.name) + " := " + E(e.value) + ")";
        case "await": return "ждать " + E(e.e, 9);
        case "refof": return "ссылка " + E(e.target, 9);
        case "deref": return "*" + E(e.e, 9);
        case "methodref": return E(e.obj, 10) + "::" + nm(e.name);
        case "anoncls": return "новый" + (e.parent ? " " + e.parent : "") + "(" + (e.args || []).map((x) => E(x)).join(", ") + ")";
        case "dictcomp": {
          const vars = e.targets.map(nm).join(", ");
          return "{" + E(e.key) + ": " + E(e.value) + " для каждого " + vars + " из " + E(e.iter) + (e.cond ? " если " + E(e.cond) : "") + "}";
        }
        case "comp": {
          if (e.targets.length !== 1) { pnote("генератор списка с несколькими переменными не переводится"); return "ничего"; }
          const v = nm(e.targets[0]);
          let r = E(e.iter, 9);
          if (e.cond) r += ".отфильтруй(функция(" + v + ") => " + E(e.cond) + ")";
          if (!(e.e.t === "name" && e.e.v === e.targets[0])) r += ".преобразуй(функция(" + v + ") => " + E(e.e) + ")";
          return r;
        }
        case "unsupported": pnote(e.text); return "ничего";
      }
      pnote("выражение не переведено");
      return "ничего";
    }
    function fmt(x) {
      const m = x.fmt.match(/^\.(\d+)f$/);
      if (m) return "{округли(" + E(x.e) + ", " + m[1] + ")}";
      pnote("формат «:" + x.fmt + "» в f-строке не переводится");
      return "{" + E(x.e) + "}";
    }
    const PY_METHODS = { upper: "большими", lower: "маленькими", strip: "обрезать", split: "разделить", replace: "заменить", startswith: "начинается", endswith: "заканчивается", find: "найди", append: "добавь", pop: "убери", insert: "вставь", sort: "сортируй", reverse: "обрати", keys: "ключи", values: "значения", items: "пары", get: "получи", copy: "копия", index: "найди", capitalize: "с_заглавной", clear: "очисти", count: null };
    const JS_METHODS = { toUpperCase: "большими", toLowerCase: "маленькими", trim: "обрезать", split: "разделить", replaceAll: "заменить", replace: "заменить", startsWith: "начинается", endsWith: "заканчивается", indexOf: "найди", includes: "содержит", push: "добавь", pop: "убери", sort: "сортируй", reverse: "обрати", slice: "срез", filter: "отфильтруй", map: "преобразуй", reduce: "свернуть", forEach: "для_каждого", join: "соедини", repeat: "повтори" };
    function mem(n) { return /^__/.test(n) && !/__$/.test(n) ? n.replace(/^_+/, "_") : /^__/.test(n) ? "особое" + n.replace(/_/g, "") : n; }
    const PY_TYPES = { int: "целое", float: "число", str: "строка", bool: "логическое", list: "список", dict: "словарь", set: "множество", tuple: "список", String: "строка", Integer: "целое", Double: "число", Boolean: "логическое", Number: "число" };
    function attr(e) {
      if (e.name === "length" && from === "javascript") return E(e.obj, 9) + ".длина";
      if (e.obj.t === "name" && ((e.obj.v === "Math" && e.name === "PI") || (e.obj.v === "math" && e.name === "pi"))) return "ПИ";
      if (e.obj.t === "name" && e.obj.v === "self") return "это." + mem(e.name);
      return E(e.obj, 9) + (e.safe ? "?." : ".") + mem(e.name);
    }
    function isinst(args) {
      const t = args[1];
      if (!t) return "ничего";
      const one = (x) => (x.t === "name" && PY_TYPES[x.v] ? "экземпляр(" + E(args[0]) + ", " + str(PY_TYPES[x.v]) + ")" : "экземпляр(" + E(args[0]) + ", " + E(x) + ")");
      if (t.t === "tuple") return "(" + t.items.map(one).join(" или ") + ")";
      return one(t);
    }
    function compPred(c, how) {
      if (c.targets.length !== 1) { pnote("генератор с несколькими переменными не переводится"); return "ничего"; }
      const v = nm(c.targets[0]);
      let r = E(c.iter, 9);
      if (c.cond) r += ".отфильтруй(функция(" + v + ") => " + E(c.cond) + ")";
      return r + "." + how + "(функция(" + v + ") => " + E(c.e) + ")";
    }
    function call(e) {
      if (e.t === "call" && e.fn.t === "name" && e.fn.v === "print" && from === "python" && e.kw && e.kw.some((k) => k.name === "file" && k.value.t === "attr" && k.value.name === "stderr")) {
        e = { ...e, kw: e.kw.filter((k) => k.name !== "file"), fn: { t: "name", v: "\u0001warn" } };
      }
      if (e.fn.t === "name" && e.fn.v === "\u0001warn") return "\u0001" + e.args.map((x) => E(x)).join(", ");
      const a = e.args.map((x) => E(x));
      const f = e.fn;
      if (e.kw && e.kw.length) {
        const ks = e.kw.filter((k) => !(f.t === "name" && f.v === "print" && ((k.name === "end" && k.value.t === "str" && k.value.v === "\n") || (k.name === "sep" && k.value.t === "str" && k.value.v === " "))));
        if (ks.length) pnote("именованные аргументы (" + ks.map((k) => k.name).join(", ") + ") не переводятся");
      }
      if (f.t === "name") {
        const n = f.v;
        const own = { "напиши": "\u0000", "показать": "строка", "спроси": "спроси", "число": "число", "длина": "длина", "тип": "тип", "диапазон": "от" }[n];
        if (own === "\u0000") return "\u0000" + a.join(", ");
        if (own) return own + "(" + a.join(", ") + ")";
        if (from === "python") {
          switch (n) {
            case "print": return "\u0000" + a.join(", ");
            case "input": return "спроси(" + (e.args[0] && e.args[0].t === "str" ? str(e.args[0].v.replace(/\s+$/, "")) : a[0] || "") + ")";
            case "len": return "длина(" + a[0] + ")";
            case "str": return "строка(" + a[0] + ")";
            case "int": return "целое(число(" + a[0] + "))";
            case "float": return "число(" + a[0] + ")";
            case "abs": return "модуль(" + a[0] + ")";
            case "round": return "округли(" + a.join(", ") + ")";
            case "max": return "макс(" + a.join(", ") + ")";
            case "min": return "мин(" + a.join(", ") + ")";
            case "sum": return "сумма(" + a[0] + ")";
            case "sorted": return E(e.args[0], 9) + ".отсортировано()";
            case "list": return a.length ? (e.args[0].t === "call" && e.args[0].fn.v === "range" ? a[0] : E(e.args[0], 9) + ".копия()") : "[]";
            case "dict": return "{}";
            case "bool": return "логическое(" + a[0] + ")";
            case "range": {
              const r = e.args;
              if (r.length === 1) return "от(0, " + E(minus1(r[0])) + ")";
              if (r.length === 2) return "от(" + a[0] + ", " + E(minus1(r[1])) + ")";
              return "от(" + a[0] + ", " + E(rangeEnd(r[1], r[2])) + ", " + a[2] + ")";
            }
            case "super": return "родитель";
            case "isinstance": return isinst(e.args);
            case "enumerate": if (e.args.length === 1) return "нумеруй(" + a[0] + ")"; break;
            case "zip": if (e.args.length === 2) return "попарно(" + a.join(", ") + ")"; break;
            case "set": return "множество(" + (a[0] || "") + ")";
            case "frozenset": return "множество(" + (a[0] || "") + ")";
            case "chr": return "символ(" + a[0] + ")";
            case "ord": return "код(" + a[0] + ")";
            case "exit": case "quit": return "выход(" + (a[0] || "") + ")";
            case "divmod": return "[нацело(" + a.join(", ") + "), " + E(e.args[0], 6) + " % " + E(e.args[1], 7) + "]";
            case "pow": if (e.args.length === 2) return "степень(" + a.join(", ") + ")"; break;
            case "reversed": return E(e.args[0], 9) + ".перевёрнуто()";
            case "any": if (e.args[0] && e.args[0].t === "comp") return compPred(e.args[0], "любой"); return E(e.args[0], 9) + ".любой(x => x)";
            case "all": if (e.args[0] && e.args[0].t === "comp") return compPred(e.args[0], "все"); return E(e.args[0], 9) + ".все(x => x)";
            case "open": return "открой(" + a.join(", ") + ")";
            case "type": case "map": case "filter": pnote("функция Python «" + n + "» не переводится точно"); break;
          }
        }
        if (from === "javascript") {
          switch (n) {
            case "prompt": return "спроси(" + (a[0] || "") + ")";
            case "Number": case "parseFloat": return "число(" + a[0] + ")";
            case "parseInt": return "целое(число(" + a[0] + "))";
            case "String": return "строка(" + a[0] + ")";
            case "Boolean": return "логическое(" + a[0] + ")";
            case "__typeof": pnote("typeof переведён как тип(): названия типов будут русскими"); return "тип(" + a[0] + ")";
            case "isinstance": return isinst(e.args);
            case "super": return "родитель";
          }
        }
        return nm(n) + "(" + a.join(", ") + ")";
      }
      if (f.t === "attr") {
        const o = f.obj;
        if (from === "javascript" && o.t === "name" && o.v === "console" && ["log", "info"].includes(f.name)) return "\u0000" + a.join(", ");
        if (from === "javascript" && o.t === "name" && o.v === "console" && ["error", "warn"].includes(f.name)) return "\u0001" + a.join(", ");
        if (o.t === "name" && (o.v === "sys" || o.v === "process") && f.name === "exit") return "выход(" + (a[0] || "") + ")";
        if (o.t === "name" && (o.v === "json" || o.v === "JSON") && ["dumps", "stringify"].includes(f.name)) return "в_json(" + a[0] + ")";
        if (o.t === "name" && (o.v === "json" || o.v === "JSON") && ["loads", "parse"].includes(f.name)) return "из_json(" + a[0] + ")";
        if (from === "javascript" && o.t === "name" && o.v === "String" && f.name === "fromCharCode" && a.length === 1) return "символ(" + a[0] + ")";
        if (from === "javascript" && f.name === "charCodeAt" && !userMethodNames.has(f.name)) return "код(" + E(o, 9) + "[" + (a[0] || "0") + "])";
        if (o.t === "name" && (o.v === "Math" || o.v === "math")) {
          if (f.name === "random") return "случайное()";
          const m = { sqrt: "корень", abs: "модуль", round: "округли", max: "макс", min: "мин", pow: "степень", trunc: "целое" }[f.name];
          if (m) return m + "(" + a.join(", ") + ")";
          if (f.name === "floor") return "вниз(" + a[0] + ")";
          if (f.name === "ceil") return "вверх(" + a[0] + ")";
          const m2 = { tan: "тангенс", atan: "арктангенс", atan2: "арктангенс", exp: "экспонента", sin: "синус", cos: "косинус", log: "логарифм" }[f.name];
          if (m2) return m2 + "(" + a.join(", ") + ")";
        }
        if (from === "python" && o.t === "name" && o.v === "random") {
          if (f.name === "randint") return "случайное(" + a.join(", ") + ")";
          if (f.name === "random") return "случайное()";
          if (f.name === "choice") return E(e.args[0], 9) + "[случайное(0, длина(" + a[0] + ") - 1)]";
        }
        if (from === "javascript" && o.t === "name" && o.v === "Object") {
          if (f.name === "keys") return E(e.args[0], 9) + ".ключи()";
          if (f.name === "values") return E(e.args[0], 9) + ".значения()";
          if (f.name === "entries") return E(e.args[0], 9) + ".пары()";
        }
        if (o.t === "call" && o.fn.t === "name" && o.fn.v === "super") {
          const m = f.name === "__init__" ? "создать" : f.name === "__str__" || f.name === "toString" ? "строкой" : f.name;
          return "родитель." + m + "(" + a.join(", ") + ")";
        }
        if (from === "python" && f.name === "join" && e.args.length === 1) return E(e.args[0], 9) + ".соедини(" + E(o) + ")";
        if (/^__пон_/.test(f.name)) return E(o, 9) + "." + f.name.slice(6) + "(" + a.join(", ") + ")";
        if (f.name === "__получи" || f.name === "__убери") return E(o, 9) + "." + f.name.slice(2) + "(" + a.join(", ") + ")";
        if (from === "javascript" && f.name === "join" && o.t === "call" && o.fn.t === "attr" && o.fn.name === "map" && o.args[0] && o.args[0].t === "lambda" && o.args[0].body.t === "call" && o.args[0].body.fn.v === "показать") return E(o.fn.obj, 9) + ".соедини(" + a.join(", ") + ")";
        const isSelf = o.t === "name" && o.v === "self";
        const table = from === "python" ? PY_METHODS : JS_METHODS;
        if (!isSelf && table[f.name] && !userMethodNames.has(f.name)) {
          if (from === "javascript" && f.name === "slice" && a.length === 0) return E(o, 9) + ".копия()";
          if (from === "javascript" && f.name === "sort" && a.length) pnote("функция сравнения в sort() должна возвращать число");
          if (from === "javascript" && f.name === "replace") pnote("replace() в JavaScript заменяет только первое вхождение, а «заменить» — все");
          if (from === "python" && f.name === "index") pnote("index() переведён как найди(): если элемента нет, вернётся -1, а не ошибка");
          return E(o, 9) + "." + table[f.name] + "(" + a.join(", ") + ")";
        }
        if (from === "javascript" && f.name === "toString" && !a.length) return "строка(" + E(o) + ")";
        if (from === "javascript" && f.name === "toFixed") return "округли(" + E(o) + ", " + (a[0] || "0") + ")";
        if (!isSelf && !userMethodNames.has(f.name)) pnote("функция «" + f.name + "» оставлена без изменений — в «Понятном» её может не быть");
        const mname = f.name === "__str__" || f.name === "toString" ? "строкой" : f.name;
        return (isSelf ? "это" : E(o, 9)) + (f.safe ? "?." : ".") + mem(mname) + "(" + a.join(", ") + ")";
      }
      return E(f, 9) + "(" + a.join(", ") + ")";
    }

    function handlerOut(type, errName, body, typed) {
      emit("если ошибка " + (type ? nm(type) : "Ошибка") + (errName ? " как " + nm(errName) : ""));
      let h = body;
      if (errName && !typed) {
        const n = errName;
        const fix = (x) => {
          if (Array.isArray(x)) return x.map(fix);
          if (!x || typeof x !== "object") return x;
          if (x.t === "attr" && (x.name === "message" || x.name === "Message") && x.obj.t === "name" && x.obj.v === n) return { t: "name", v: n };
          if (x.t === "call" && x.fn.t === "attr" && x.fn.name === "getMessage" && x.fn.obj.t === "name" && x.fn.obj.v === n && !x.args.length) return { t: "name", v: n };
          if (x.t === "call" && x.fn.t === "name" && x.fn.v === "str" && x.args.length === 1 && x.args[0].t === "name" && x.args[0].v === n) return { t: "name", v: n };
          const o = {};
          for (const k of Object.keys(x)) o[k] = fix(x[k]);
          return o;
        };
        h = fix(h);
        pnote("тексты встроенных ошибок в «Понятном» другие");
      } else if (errName && typed) {
        const n = errName;
        const fix = (x) => {
          if (Array.isArray(x)) return x.map(fix);
          if (!x || typeof x !== "object") return x;
          if (x.t === "attr" && (x.name === "message" || x.name === "Message") && x.obj.t === "name" && x.obj.v === n) return { t: "attr", obj: x.obj, name: "сообщение" };
          if (x.t === "call" && x.fn.t === "attr" && x.fn.name === "getMessage" && x.fn.obj.t === "name" && x.fn.obj.v === n && !x.args.length) return { t: "attr", obj: x.fn.obj, name: "сообщение" };
          const o = {};
          for (const k of Object.keys(x)) o[k] = fix(x[k]);
          return o;
        };
        h = fix(h);
      }
      inner(h);
    }
    function stmtWrap(s) {
      const at = lines.length;
      const startInd = ind;
      const saved = pending;
      pending = [];
      if (s.note) pnote(s.note);
      S(s);
      if (pending.length) {
        const ins = pending.map((t) => { notes.push({ line: s.line, text: t }); return "    ".repeat(startInd) + "# ПРИМЕЧАНИЕ (строка " + s.line + "): " + t; });
        lines.splice(at, 0, ...ins);
      }
      pending = saved;
    }
    function block(body) { body.forEach(stmtWrap); }
    function inner(body) { ind++; block(body); ind--; }
    function exprStmt(e) {
      const c = E(e);
      if (c[0] === "\u0000") return "пиши" + (c.length > 1 ? " " + c.slice(1) : "");
      if (c[0] === "\u0001") return "предупреди" + (c.length > 1 ? " " + c.slice(1) : "");
      return c;
    }
    function assignName(n, op, v, decl) {
      const sc = cur();
      if (!sc.declared.has(n) && !sc.globals.has(n) && (from === "python" || decl)) {
        sc.declared.add(n);
        if (op === "=") { emit((decl === "const" ? "конст " : "пусть ") + nm(n) + " = " + v); return; }
        pnote("переменная «" + n + "» изменяется до объявления");
        emit("пусть " + nm(n) + " = 0");
      }
      emit(nm(n) + " " + op + " " + v);
    }
    function S(s) {
      switch (s.t) {
        case "pass": return;
        case "import": case "note": pnote(s.text); return;
        case "global": return;
        case "expr": if (s.e.t !== "str") emit(exprStmt(s.e)); return;
        case "assign": {
          if (s.targets.length > 1) {
            pnote("цепочка присваиваний разбита на несколько строк");
            const last = s.targets[s.targets.length - 1];
            S({ ...s, targets: [last] });
            for (let i = s.targets.length - 2; i >= 0; i--) S({ ...s, targets: [s.targets[i]], value: last });
            return;
          }
          const t = s.targets[0];
          if ((t.t === "tuple" || t.t === "list") && s.op === "=" && t.items.length > 1 && t.items.every((x) => ["name", "index", "attr"].includes(x.t))) {
            const sc = cur();
            const names = t.items.filter((x) => x.t === "name").map((x) => x.v);
            const canDecl = (n) => !sc.declared.has(n) && !sc.globals.has(n) && (from === "python" || s.decl);
            const rhs = s.value.t === "tuple" || s.value.t === "list" ? s.value.items.map((x) => E(x)).join(", ") : E(s.value);
            if (names.length === t.items.length && names.every(canDecl) && new Set(names).size === names.length) {
              names.forEach((n) => sc.declared.add(n));
              emit((s.decl === "const" ? "конст " : "пусть ") + names.map(nm).join(", ") + " = " + rhs);
              return;
            }
            for (const n of names) if (canDecl(n)) { sc.declared.add(n); emit("пусть " + nm(n) + " = ничего"); }
            emit(t.items.map((x) => E(x)).join(", ") + " = " + rhs);
            return;
          }
          if (t.t === "tuple" || t.t === "list") {
            const tmpName = "_временно" + (lines.length + 1);
            pnote("множественное присваивание переведено через временный список");
            emit("пусть " + tmpName + " = " + (s.value.t === "tuple" || s.value.t === "list" ? "[" + s.value.items.map((x) => E(x)).join(", ") + "]" : E(s.value)));
            t.items.forEach((x, i) => S({ t: "assign", targets: [x], op: "=", value: { t: "index", obj: { t: "name", v: tmpName }, index: { t: "num", v: i } }, decl: s.decl || (from === "javascript" ? "let" : undefined) }));
            return;
          }
          let op = s.op, value = s.value;
          const BIT_ASSIGN = { "&=": "&", "|=": "|", "^^=": "^^", "<<=": "<<", ">>=": ">>", ">>>=": ">>>" };
          if (from === "python" && op === "^=") op = "^^=";
          if (BIT_ASSIGN[op]) { value = { t: "bin", op: BIT_ASSIGN[op], l: t, r: s.value }; op = "="; }
          if (!["=", "+=", "-=", "*=", "/=", "%=", "**=", "^=", "//="].includes(op)) { pnote("присваивание «" + op + "» не переводится"); return; }
          if (op === "**=" || op === "^=") { op = "="; value = { t: "bin", op: "^", l: t, r: s.value }; }
          if (op === "//=") { op = "="; value = { t: "bin", op: "//", l: t, r: s.value }; }
          if (t.t === "name") { assignName(t.v, op, E(value), s.decl); return; }
          emit(E(t) + " " + op + " " + E(value));
          return;
        }
        case "if": {
          emit("если " + E(s.test) + " то");
          inner(s.body);
          let o = s.orelse;
          while (o && o.length === 1 && o[0].t === "if") { emit("иначе если " + E(o[0].test) + " то"); inner(o[0].body); o = o[0].orelse; }
          if (o && o.length) { emit("иначе"); inner(o); }
          emit("конец");
          return;
        }
        case "while": emit("пока " + E(s.test)); inner(s.body); emit("конец"); return;
        case "dowhile": emit("делай"); inner(s.body); emit("конец пока " + E(s.test)); return;
        case "assert": emit("убедись " + E(s.test) + (s.msg ? ", " + E(s.msg) : "")); return;
        case "del":
          for (const it of s.items) {
            if (it.t === "index") emit(E(it.obj, 9) + ".убери(" + E(it.index) + ")");
            else if (it.t === "attr") emit(E(it.obj, 9) + ".убери(" + str(it.name) + ")");
            else pnote("del переменной не переводится: в «Понятном» переменные не удаляются");
          }
          return;
        case "enum": {
          emit("перечисление " + nm(s.name));
          ind++;
          for (const it of s.items) emit(nm(it.name) + (it.value ? " = " + E(it.value) : ""));
          ind--;
          emit("конец");
          return;
        }
        case "iface": {
          emit("интерфейс " + nm(s.name));
          ind++;
          for (const m of s.methods) emit("функция " + nm(m.name) + "(" + m.params.filter((q) => !q.rest).map((q) => nm(q.name)).join(", ") + ")");
          ind--;
          emit("конец");
          return;
        }
        case "struct": emit("структура " + nm(s.name) + "(" + s.fields.map((f) => (typeof f === "string" ? nm(f) + " = ничего" : nm(f.name) + " = " + (f.value ? E(f.value) : "ничего"))).join(", ") + ")"); return;
        case "forRange": emit("для " + nm(s.v) + " от " + E(s.from) + " до " + E(s.to) + (s.step ? " шаг " + E(s.step) : s.down ? "" : " шаг 1")); inner(s.body); emit("конец"); return;
        case "for": {
          const it = s.iter;
          if (from === "python" && it.t === "call" && it.fn.t === "name" && it.fn.v === "range" && s.targets.length === 1) {
            const r = it.args;
            const v = nm(s.targets[0]);
            if (r.length === 1 && s.targets[0] === "_") emit("повтори " + E(r[0]) + " раз");
            else if (r.length === 1) emit("для " + v + " от 0 до " + E(minus1(r[0])) + " шаг 1");
            else if (r.length === 2) emit("для " + v + " от " + E(r[0]) + " до " + E(minus1(r[1])) + " шаг 1");
            else emit("для " + v + " от " + E(r[0]) + " до " + E(rangeEnd(r[1], r[2])) + " шаг " + E(r[2]));
          } else if (s.targets.length === 2) {
            let iter = it;
            if (it.t === "call" && it.fn.t === "attr" && it.fn.name === "items") iter = it.fn.obj;
            else if (it.t === "call" && it.fn.t === "name" && it.fn.v === "enumerate") iter = it.args[0];
            else if (it.t === "call" && it.fn.t === "attr" && it.fn.obj.v === "Object" && it.fn.name === "entries") iter = it.args[0];
            else if (it.t === "call" && it.fn.t === "attr" && it.fn.name === "entries") iter = it.fn.obj;
            else {
              const pv = "_пара" + (lines.length + 1);
              emit("для каждого " + pv + " из " + E(it));
              ind++;
              emit("пусть " + nm(s.targets[0]) + ", " + nm(s.targets[1]) + " = " + pv);
              ind--;
              inner(s.body);
              emit("конец");
              return;
            }
            emit("для каждого " + nm(s.targets[0]) + ", " + nm(s.targets[1]) + " из " + E(iter));
          } else if (s.targets.length === 1) emit("для каждого " + nm(s.targets[0]) + " из " + E(it));
          else { pnote("цикл с " + s.targets.length + " переменными не переводится"); emit("для каждого _элемент из " + E(it)); }
          inner(s.body);
          emit("конец");
          return;
        }
        case "with":
          emit("с " + E(s.value) + " как " + nm(s.name));
          inner(s.body);
          emit("конец");
          return;
        case "label": emit("метка " + nm(s.name)); return;
        case "goto": emit("иди к " + nm(s.name)); return;
        case "def": {
          let params = s.params.filter((q) => !q.rest);
          if (s.params.some((q) => q.rest)) pnote("параметры *args/**kwargs и «...» не переводятся");
          const inCls = !!classCtx;
          if (inCls && params.length && (params[0].name === "self" || (s.isStatic && params[0].name === "cls"))) params = params.slice(1);
          let name = inCls && s.name === "__init__" ? "создать" : inCls && (s.name === "__str__" || s.name === "__repr__") ? "строкой" : s.name;
          if (/^__.+__$/.test(s.name) && !["__init__", "__str__", "__repr__"].includes(s.name)) pnote("особый метод «" + s.name + "» не имеет аналога в «Понятном»");
          const priv = inCls && (s.isPrivate || (/^__/.test(s.name) && !/__$/.test(s.name)));
          if (inCls) name = mem(name);
          const mods = (inCls && s.isStatic ? "общая " : "") + (priv ? "скрытая " : "");
          const plist = "(" + params.map((q) => nm(q.name) + (q.def ? " = " + E(q.def) : "")).join(", ") + ")";
          if (inCls && s.isAbstract && !s.body.some((b) => b.t !== "pass" && !(b.t === "expr" && b.e.t === "str") && b.t !== "raise")) { emit(mods + "абстрактная функция " + (inCls ? name : nm(name)) + plist); return; }
          if (inCls && s.isGetter && !params.length) emit(mods + "свойство " + name);
          else if (inCls && s.isSetter) emit(mods + "свойство " + name + "\n" + "    ".repeat(ind + 1) + "установить " + (params[0] ? nm(params[0].name) : "значение"));
          else emit(mods + (s.async ? "асинхронная " : "") + "функция " + (inCls ? name : nm(name)) + plist);
          ind++;
          const globals = new Set();
          walkStmts(s.body, (b) => { if (b.t === "global") b.names.forEach((n) => globals.add(n)); });
          const savedCls = classCtx;
          classCtx = null;
          enterScope(s.body, params.map((q) => q.name), globals);
          block(s.body);
          scopes.pop();
          classCtx = savedCls;
          ind--;
          emit("конец");
          return;
        }
        case "return": emit("верни" + (s.value ? " " + E(s.value) : "")); return;
        case "break": emit("стоп"); return;
        case "continue": emit("дальше"); return;
        case "raise": {
          let v = s.value;
          if (v && v.t === "call" && v.fn.t === "name" && /(Error|Exception)$/.test(v.fn.v) && !classNames.has(v.fn.v)) v = v.args[0] || { t: "str", v: v.fn.v };
          emit("брось " + (v ? E(v) : "\"ошибка\""));
          return;
        }
        case "try": {
          emit("пробуй");
          inner(s.body);
          const hs = s.handlers || (s.handler ? [{ types: [], errName: s.errName, body: s.handler }] : []);
          for (let hi = 0; hi < hs.length; hi++) {
            const hh = hs[hi];
            const user = hh.types.filter((x) => x && classNames.has(x));
            const all = !hh.types.length || user.length < hh.types.length;
            if (all && hh.types.length) pnote("тип ошибки «" + hh.types.filter((x) => !user.includes(x)).join(", ") + "» переведён как любая ошибка");
            const heads = all ? [null] : user;
            for (const ty of heads) handlerOut(ty, hh.errName, hh.body, ty !== null);
            if (all) { if (hi < hs.length - 1) pnote("следующие блоки обработки ошибок не переведены: ошибку уже ловит общий блок"); break; }
          }
          if (s.fin) { emit("наконец"); inner(s.fin); }
          emit("конец");
          return;
        }
        case "switch": {
          emit("выбор " + E(s.subject));
          ind++;
          for (const c of s.cases) { emit("вариант " + c.values.map((x) => E(x)).join(", ")); inner(c.body); }
          if (s.def) { emit("иначе"); inner(s.def); }
          ind--;
          emit("конец");
          return;
        }
        case "class": {
          let parent = s.parent;
          if (parent && !classNames.has(parent) && /(Exception|Error|Throwable)$/.test(parent)) parent = "Ошибка";
          if (parent === "object" || parent === "Object") parent = null;
          const ifs = (s.ifaces || []).filter((x) => ifaceNames.has(x));
          if ((s.ifaces || []).length > ifs.length) pnote("интерфейсы «" + s.ifaces.filter((x) => !ifaceNames.has(x)).join(", ") + "» объявлены не в этом файле и не указаны");
          emit("класс " + nm(s.name) + (parent ? " наследует " + (parent === "Ошибка" ? parent : nm(parent)) : "") + (ifs.length ? " реализует " + ifs.map(nm).join(", ") : ""));
          ind++;
          const saved = classCtx;
          classCtx = s;
          for (const m of s.body) {
            if (m.t === "def") stmtWrap(m);
            else if (m.t === "assign" && m.targets[0].t === "name") emit((m.isStatic ? "общая " : "") + (m.isPrivate || /^__[^_]/.test(m.targets[0].v) ? "скрытая " : "") + "пусть " + mem(m.targets[0].v) + " = " + E(m.value));
            else if (m.t === "note") pnote(m.text);
            else if (m.t !== "pass" && !(m.t === "expr" && m.e.t === "str")) pnote("в теле класса переводятся только функции и поля");
          }
          classCtx = saved;
          ind--;
          emit("конец");
          return;
        }
      }
      pnote("команда не переведена");
    }

    enterScope(ir, [], new Set());
    block(ir);
    return { code: lines.join("\n") + "\n", notes };
  }

  function translateToPon(src, from) {
    const f = { python: "python", py: "python", javascript: "javascript", js: "javascript" }[String(from).toLowerCase()];
    if (!f) throw new TranslateError("переводить в «Понятный» можно с python или javascript");
    if (PRELUDES && PRELUDES[f] && src.startsWith(PRELUDES[f])) src = "\n".repeat(PRELUDES[f].split("\n").length - 1) + src.slice(PRELUDES[f].length);
    const ir = f === "python" ? pyParse(src) : jsToIR(src);
    const r = irToPon(ir, f);
    try { Y.frontend(r.code, {}); } catch (e) { r.notes.push({ line: 0, text: "получившийся код не прошёл проверку «Понятного»: " + e.message }); r.checkError = e.message; }
    return r;
  }

  function translateAstToPon(ast, from) {
    const r = irToPon(estreeToIR(ast), from || "javascript");
    try { Y.frontend(r.code, {}); } catch (e) { r.notes.push({ line: 0, text: "получившийся код не прошёл проверку «Понятного»: " + e.message }); r.checkError = e.message; }
    return r;
  }

  return { toPonIdent, translateToPon, translateAstToPon, pyParse, jsToIR, estreeToIR, irToPon, TranslateError };
});
