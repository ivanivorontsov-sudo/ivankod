(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory(require("./yadro"));
  else root.PonyatnyPerevodIz = factory(root.PonyatnyYadro);
})(typeof self !== "undefined" ? self : this, function (Y) {
  const PY_PRELUDE = [
    "import math",
    "import random",
    "",
    "",
    "def показать(v):",
    "    if v is None:",
    "        return \"ничего\"",
    "    if v is True:",
    "        return \"истина\"",
    "    if v is False:",
    "        return \"ложь\"",
    "    if isinstance(v, float):",
    "        if v.is_integer():",
    "            return str(int(v))",
    "        return repr(round(v, 10)).replace(\".\", \",\")",
    "    if isinstance(v, list):",
    "        return \"[\" + \", \".join(показать_внутри(x) for x in v) + \"]\"",
    "    if isinstance(v, dict):",
    "        return \"{\" + \", \".join(показать_внутри(k) + \": \" + показать_внутри(x) for k, x in v.items()) + \"}\"",
    "    if callable(v) and not hasattr(v, \"__dict__\"):",
    "        return \"функция\"",
    "    if hasattr(v, \"__dict__\") and type(v).__str__ is object.__str__:",
    "        return type(v).__name__ + \"(\" + \", \".join(k + \": \" + показать_внутри(x) for k, x in vars(v).items()) + \")\"",
    "    return str(v)",
    "",
    "",
    "def показать_внутри(v):",
    "    return '\"' + v + '\"' if isinstance(v, str) else показать(v)",
    "",
    "",
    "def напиши(*значения):",
    "    print(\" \".join(показать(v) for v in значения))",
    "",
    "",
    "def спроси(вопрос=\"\"):",
    "    try:",
    "        return input(вопрос + \" \" if вопрос else \"\")",
    "    except EOFError:",
    "        return \"\"",
    "",
    "",
    "def тип(v):",
    "    имена = {type(None): \"ничего\", bool: \"логическое\", int: \"число\", float: \"число\", str: \"строка\", list: \"список\", dict: \"словарь\"}",
    "    return имена.get(type(v), \"функция\" if callable(v) and not hasattr(v, \"__dict__\") else type(v).__name__)",
    "",
    "",
    "def число(v):",
    "    if isinstance(v, str):",
    "        v = v.strip().replace(\",\", \".\")",
    "    n = float(v)",
    "    return int(n) if n.is_integer() else n",
  ].join("\n");

  const JS_PRELUDE = [
    "const показать = (v, внутри = false) => {",
    "  if (v === null || v === undefined) return \"ничего\";",
    "  if (v === true) return \"истина\";",
    "  if (v === false) return \"ложь\";",
    "  if (typeof v === \"number\") return String(Math.round(v * 1e10) / 1e10).replace(\".\", \",\");",
    "  if (typeof v === \"string\") return внутри ? `\"${v}\"` : v;",
    "  if (Array.isArray(v)) return \"[\" + v.map((x) => показать(x, true)).join(\", \") + \"]\";",
    "  if (typeof v === \"function\") return \"функция\";",
    "  if (v.constructor && v.constructor !== Object) {",
    "    if (v.toString !== Object.prototype.toString) return v.toString();",
    "    return v.constructor.name + \"(\" + Object.entries(v).map(([k, x]) => k + \": \" + показать(x, true)).join(\", \") + \")\";",
    "  }",
    "  return \"{\" + Object.entries(v).map(([k, x]) => `\"${k}\": ` + показать(x, true)).join(\", \") + \"}\";",
    "};",
    "const напиши = (...значения) => console.log(значения.map((v) => показать(v)).join(\" \"));",
    "const спроси = (вопрос = \"\") => {",
    "  const fs = require(\"fs\");",
    "  if (вопрос) process.stdout.write(вопрос + \" \");",
    "  const байты = [];",
    "  const буфер = Buffer.alloc(1);",
    "  for (;;) {",
    "    let n = 0;",
    "    try { n = fs.readSync(0, буфер, 0, 1, null); } catch (e) { if (e.code === \"EAGAIN\") continue; break; }",
    "    if (n === 0 || буфер[0] === 10) break;",
    "    байты.push(буфер[0]);",
    "  }",
    "  return Buffer.from(байты).toString(\"utf8\").replace(/\\r$/, \"\");",
    "};",
    "const тип = (v) => v === null || v === undefined ? \"ничего\" : typeof v === \"number\" ? \"число\" : typeof v === \"string\" ? \"строка\" : typeof v === \"boolean\" ? \"логическое\" : Array.isArray(v) ? \"список\" : typeof v === \"function\" ? \"функция\" : v.constructor !== Object ? v.constructor.name : \"словарь\";",
    "const длина = (v) => (typeof v === \"string\" || Array.isArray(v) ? v.length : Object.keys(v).length);",
    "const диапазон = (от, до, шаг = 1) => { const r = []; for (let i = от; шаг > 0 ? i <= до : i >= до; i += шаг) r.push(i); return r; };",
  ].join("\n");

  const CS_PRELUDE = [
    "using System;",
    "using System.Collections.Generic;",
    "using System.Linq;",
    "",
    "static class Помощь",
    "{",
    "    public static string Показать(dynamic v, bool внутри = false)",
    "    {",
    "        if (v == null) return \"ничего\";",
    "        if (v is bool b) return b ? \"истина\" : \"ложь\";",
    "        if (v is string s) return внутри ? \"\\\"\" + s + \"\\\"\" : s;",
    "        if (v is double || v is int || v is long) return Math.Round((double)v, 10).ToString(System.Globalization.CultureInfo.InvariantCulture).Replace(\".\", \",\");",
    "        if (v is List<dynamic> l) return \"[\" + string.Join(\", \", l.Select(x => Показать(x, true))) + \"]\";",
    "        if (v is Dictionary<dynamic, dynamic> d) return \"{\" + string.Join(\", \", d.Select(p => Показать(p.Key, true) + \": \" + Показать(p.Value, true))) + \"}\";",
    "        return v.ToString();",
    "    }",
    "    public static void Напиши(params dynamic[] значения) => Console.WriteLine(string.Join(\" \", значения.Select(x => Показать(x))));",
    "    public static string Спроси(string вопрос = \"\") { if (вопрос != \"\") Console.Write(вопрос + \" \"); return Console.ReadLine() ?? \"\"; }",
    "    public static double Число(dynamic v) => v is string s ? double.Parse(s.Trim().Replace(\",\", \".\"), System.Globalization.CultureInfo.InvariantCulture) : (double)v;",
    "    public static List<dynamic> Диапазон(double от, double до, double шаг = 1) { var r = new List<dynamic>(); for (var i = от; шаг > 0 ? i <= до : i >= до; i += шаг) r.Add(i); return r; }",
    "    public static int Длина(dynamic v) => v is string s ? s.Length : v.Count;",
    "}",
  ].join("\n");

  const PY_KEYWORDS = new Set(["False", "None", "True", "and", "as", "assert", "async", "await", "break", "class", "continue", "def", "del", "elif", "else", "except", "finally", "for", "from", "global", "if", "import", "in", "is", "lambda", "nonlocal", "not", "or", "pass", "raise", "return", "try", "while", "with", "yield", "print", "input", "len", "list", "dict", "str", "int", "float", "range", "math", "random"]);
  const JS_KEYWORDS = new Set(["break", "case", "catch", "class", "const", "continue", "debugger", "default", "delete", "do", "else", "export", "extends", "finally", "for", "function", "if", "import", "in", "instanceof", "new", "return", "super", "switch", "this", "throw", "try", "typeof", "var", "void", "while", "with", "yield", "let", "static", "await", "length", "Math", "console"]);

  const CS_KEYWORDS = new Set(["abstract", "as", "base", "bool", "break", "byte", "case", "catch", "char", "checked", "class", "const", "continue", "decimal", "default", "delegate", "do", "double", "else", "enum", "event", "explicit", "extern", "false", "finally", "fixed", "float", "for", "foreach", "goto", "if", "implicit", "in", "int", "interface", "internal", "is", "lock", "long", "namespace", "new", "null", "object", "operator", "out", "override", "params", "private", "protected", "public", "readonly", "ref", "return", "sbyte", "sealed", "short", "sizeof", "stackalloc", "static", "string", "struct", "switch", "this", "throw", "true", "try", "typeof", "uint", "ulong", "unchecked", "unsafe", "ushort", "using", "virtual", "void", "volatile", "while", "dynamic", "var", "System", "Console", "Math", "Func", "Action", "List", "Dictionary", "Exception", "Main", "Program", "Помощь"]);
  function preludeNames(L) {
    const src = (L === "python" ? PY_PRELUDE : L === "javascript" ? JS_PRELUDE : CS_PRELUDE);
    const out = new Set();
    const re = L === "python" ? /^(?:def|class)\s+([^\s(:]+)|^([^\s=]+)\s*=/gmu : L === "javascript" ? /(?:const|let|function|class)\s+([^\s=(]+)/gu : /class\s+([^\s{:]+)/gu;
    let m;
    while ((m = re.exec(src))) out.add(m[1] || m[2]);
    return out;
  }
  function translate(src, lang, opts) {
    opts = opts || {};
    const program = Y.frontend(src, { file: opts.file, resolve: opts.resolve });
    const L = { python: "python", py: "python", питон: "python", javascript: "javascript", js: "javascript", csharp: "csharp", "c#": "csharp", cs: "csharp" }[String(lang).toLowerCase()];
    if (!L) throw new Error("не знаю язык «" + lang + "». Можно: python, javascript, csharp");
    const notes = [];
    const note = (n, text) => { notes.push({ line: n.line, text }); if (typeof pending !== "undefined" && pending && !pending.includes(text)) pending.push(text); return text; };
    const reserved = new Set([...(L === "python" ? PY_KEYWORDS : L === "javascript" ? JS_KEYWORDS : CS_KEYWORDS), ...preludeNames(L)]);
    const nm = Y.makeRenamer(reserved, opts.latin ? Y.transliterate : null, L === "python");
    const out = [];
    let ind = 0;
    let tmp = 0;
    const emit = (s) => out.push("    ".repeat(ind) + s);
    const isStrish = (e) => e.k === "str" || e.k === "tmpl";
    const comment = L === "python" ? "# " : "// ";
    const emitNote = (n, text) => { notes.push({ line: n.line, text }); emit(comment + "ПРИМЕЧАНИЕ (строка " + n.line + "): " + text); };
    let inClass = null;

    const py = {
      str: (s) => JSON.stringify(s),
      bool: (v) => (v ? "True" : "False"),
      nul: "None",
      self: "self",
    };

    function E(e, prec) {
      prec = prec || 0;
      switch (e.k) {
        case "raw": return e.js || "None";
        case "num": return L === "csharp" && Number.isInteger(e.v) ? e.v + ".0" : String(e.v);
        case "str": return JSON.stringify(e.v);
        case "bool": return L === "python" ? (e.v ? "True" : "False") : e.v ? "true" : "false";
        case "null": return L === "python" ? "None" : "null";
        case "this": return L === "python" ? "self" : "this";
        case "name": return nameRef(e);
        case "tmpl": {
          if (L === "python") return "f" + JSON.stringify(e.parts.map((x) => (typeof x === "string" ? x.replace(/[{}]/g, (c) => c + c) : "{показать(" + E(x).replace(/"/g, "'") + ")}")).join(""));
          if (L === "javascript") return "`" + e.parts.map((x) => (typeof x === "string" ? x.replace(/[`$\\]/g, (c) => "\\" + c) : "${показать(" + E(x) + ")}")).join("") + "`";
          return "$" + JSON.stringify(e.parts.map((x) => (typeof x === "string" ? x.replace(/[{}]/g, (c) => c + c) : "{Помощь.Показать(" + E(x) + ")}")).join(""));
        }
        case "list": return L === "csharp" ? "new List<dynamic> { " + e.items.map((x) => E(x)).join(", ") + " }" : "[" + e.items.map((x) => E(x)).join(", ") + "]";
        case "dict":
          if (L === "csharp") return "new Dictionary<dynamic, dynamic> { " + e.entries.map((x) => "[" + E(x.key) + "] = " + E(x.value)).join(", ") + " }";
          return "{" + e.entries.map((x) => (L === "javascript" && x.key.k === "str" && /^[A-Za-zА-Яа-яЁё_][\wА-Яа-яЁё]*$/.test(x.key.v) ? x.key.v : L === "javascript" ? "[" + E(x.key) + "]" : E(x.key)) + ": " + E(x.value)).join(", ") + "}";
        case "bin": return bin(e, prec);
        case "un":
          if (e.op === "-") return "-" + E(e.e, 9);
          return wrap((L === "python" ? "not " : "!") + E(e.e, L === "python" ? 3 : 9), prec, L === "python" ? 3 : 9);
        case "cond":
          if (L === "python") return wrap(E(e.a, 1) + " if " + E(e.cond, 1) + " else " + E(e.b, 1), prec, 0);
          return wrap(E(e.cond, 1) + " ? " + E(e.a, 1) + " : " + E(e.b, 1), prec, 0);
        case "index":
          if (e.safe && L === "python") return "(" + E(e.obj) + "[" + E(e.index) + "] if " + E(e.obj) + " is not None else None)";
          if (e.safe && L === "javascript") return E(e.obj, 10) + "?.[" + E(e.index) + "]";
          if (e.safe) return E(e.obj, 10) + "?[" + E(e.index) + "]";
          return E(e.obj, 10) + "[" + E(e.index) + "]";
        case "member": return member(e);
        case "mcall": return method(e, E(e.obj, 10), e.name, e.args, e.safe);
        case "new": return newObj(e.name, e.args);
        case "super":
          if (L === "python") return "super()." + (e.name === "создать" ? "__init__" : nm(e.name)) + "(" + e.args.map((x) => E(x)).join(", ") + ")";
          if (L === "javascript") return e.name === "создать" ? "super(" + e.args.map((x) => E(x)).join(", ") + ")" : "super." + nm(e.name) + "(" + e.args.map((x) => E(x)).join(", ") + ")";
          return "base." + nm(e.name) + "(" + e.args.map((x) => E(x)).join(", ") + ")";
        case "call": {
          if (e.thisCtor || (e.fn && e.fn.k === "this")) {
            const a = e.args.map((x) => E(x)).join(", ");
            note(e, "цепочка конструкторов «это(...)» переведена приблизительно: в целевом языке проверьте вызов другого конструктора");
            if (L === "python") return "self.__init__(" + a + ")";
            if (L === "csharp") return "this(" + a + ")";
            return "this[\"создать\"](" + a + ")";
          }
          if (e.fn.k === "name" && e.fn.ref === "builtin") return builtin(e, e.fn.name, e.args);
          if (e.fn.k === "name" && e.fn.ref === "class") return newObj(e.fn.name, e.args);
          return E(e.fn, 10) + "(" + e.args.map((x) => E(x)).join(", ") + ")";
        }
        case "pipe": {
          const all = [e.left].concat(e.args);
          if (e.fn) return E(e.fn, 10) + "(" + all.map((x) => E(x)).join(", ") + ")";
          if (e.mode === "builtin") return builtin(e, e.name, all);
          if (e.mode === "class") return newObj(e.name, all);
          if (e.mode === "user") return nm(e.name) + "(" + all.map((x) => E(x)).join(", ") + ")";
          return method(e, E(e.left, 10), e.name, e.args, false);
        }
        case "walrus":
          if (L === "python") return wrap("(" + nm(e.name) + " := " + E(e.value) + ")", prec, 0);
          return wrap("(" + nm(e.name) + " = " + E(e.value) + ")", prec, 0);
        case "await":
          return wrap("await " + E(e.e, 9), prec, 9);
        case "refof":
          note(e, "ссылка в «Понятном» — безопасная обёртка, а не настоящий указатель");
          if (L === "python") return "{\"значение\": " + E(e.target) + "}";
          return "{ get значение() { return " + E(e.target) + "; } }";
        case "deref":
          if (L === "python") return E(e.e, 10) + "[\"значение\"]";
          return E(e.e, 10) + ".значение";
        case "methodref":
          if (L === "python") return "getattr(" + E(e.obj) + ", " + JSON.stringify(e.name) + ")";
          if (L === "javascript") return E(e.obj, 10) + "." + nm(e.name) + ".bind(" + E(e.obj) + ")";
          note(e, "ссылка на метод «::» в C# переведена как обычный доступ к методу — проверьте");
          return E(e.obj, 10) + "." + nm(e.name);
        case "thread":
          note(e, "«поток» в «Понятном» выполняется сразу в том же потоке, это не настоящая нить ОС");
          return L === "python" ? "None" : "null";
        case "setlit": {
          const inner = (e.items || []).map((x) => E(x)).join(", ");
          if (L === "python") return inner ? "{" + inner + "}" : "set()";
          if (L === "javascript") return "new Set([" + inner + "])";
          return "new HashSet<dynamic> { " + inner + " }";
        }
        case "listcomp": {
          const vars = e.name2 ? nm(e.name) + ", " + nm(e.name2) : nm(e.name);
          if (L === "python") return "[" + E(e.value) + " for " + vars + " in " + (e.name2 ? E(e.list) + ".items()" : E(e.list)) + (e.cond ? " if " + E(e.cond) : "") + "]";
          const bind = e.name2 ? "([" + nm(e.name) + ", " + nm(e.name2) + "])" : "(" + nm(e.name) + ")";
          const src = e.name2 ? "Object.entries(" + E(e.list) + ")" : E(e.list, 10);
          return src + (e.cond ? ".filter(" + bind + " => " + E(e.cond) + ")" : "") + ".map(" + bind + " => " + E(e.value) + ")";
        }
        case "dictcomp": {
          if (L === "python") return "{" + E(e.key) + ": " + E(e.value) + " for " + (e.name2 ? nm(e.name) + ", " + nm(e.name2) : nm(e.name)) + " in " + (e.name2 ? E(e.list) + ".items()" : E(e.list)) + (e.cond ? " if " + E(e.cond) : "") + "}";
          const bind = e.name2 ? "([" + nm(e.name) + ", " + nm(e.name2) + "])" : "(" + nm(e.name) + ")";
          const src = e.name2 ? "Object.entries(" + E(e.list) + ")" : E(e.list, 10);
          return "Object.fromEntries(" + src + (e.cond ? ".filter(" + bind + " => " + E(e.cond) + ")" : "") + ".map(" + bind + " => [" + E(e.key) + ", " + E(e.value) + "]))";
        }
        case "setcomp": {
          if (L === "python") return "{" + E(e.value) + " for " + (e.name2 ? nm(e.name) + ", " + nm(e.name2) : nm(e.name)) + " in " + (e.name2 ? E(e.list) + ".items()" : E(e.list)) + (e.cond ? " if " + E(e.cond) : "") + "}";
          const bind = e.name2 ? "([" + nm(e.name) + ", " + nm(e.name2) + "])" : "(" + nm(e.name) + ")";
          const src = e.name2 ? "Object.entries(" + E(e.list) + ")" : E(e.list, 10);
          return "new Set(" + src + (e.cond ? ".filter(" + bind + " => " + E(e.cond) + ")" : "") + ".map(" + bind + " => " + E(e.value) + "))";
        }
        case "switchexpr": {
          note(e, "выражение «выбор» переведено через цепочку условий");
          let acc = e.def ? (Array.isArray(e.def) ? (L === "python" ? "None" : "null") : E(e.def)) : (L === "python" ? "None" : "null");
          for (let i = (e.cases || []).length - 1; i >= 0; i--) {
            const c = e.cases[i];
            const val = c.value ? E(c.value) : (L === "python" ? "None" : "null");
            let cond;
            if (c.bind) cond = c.guard ? E(c.guard) : (L === "python" ? "True" : "true");
            else {
              const eq = L === "javascript" ? " === " : " == ";
              cond = (c.values || []).map((x) => E(e.subject) + eq + E(x, 5)).join(L === "python" ? " or " : " || ") || (L === "python" ? "False" : "false");
              if (c.guard) cond = "(" + cond + ")" + (L === "python" ? " and " : " && ") + E(c.guard, 3);
            }
            acc = L === "python" ? "(" + val + " if " + cond + " else " + acc + ")" : "(" + cond + " ? " + val + " : " + acc + ")";
          }
          return acc;
        }
        case "anonclass": {
          note(e, "безымянный класс переведён приблизительно");
          if (L === "javascript") return "new (class " + (e.parent ? "extends " + nm(e.parent) + " " : "") + "{ })(" + (e.args || []).map((x) => E(x)).join(", ") + ")";
          if (L === "python") return "type(\"Аноним\", (" + (e.parent ? nm(e.parent) : "object") + ",), {})()";
          return "null";
        }
        case "lambda": {
          const ps = e.params.map((q) => nm(q.name) + (q.def ? (L === "python" ? "=" : " = ") + E(q.def) : "")).join(", ");
          if (!e.body) {
            if (L === "python") return wrap("lambda " + ps + ": " + E(e.value), prec, 0);
            if (L === "javascript") return "(" + ps + ") => " + E(e.value, 1);
            return "new Func<" + e.params.map(() => "dynamic, ").join("") + "dynamic>((" + e.params.map((q) => "dynamic " + nm(q.name)).join(", ") + ") => " + E(e.value) + ")";
          }
          if (L === "javascript") {
            const saved = out.length; const si = ind; ind = 0;
            const start = out.length;
            ind = 1; block(e.body); const lines = out.splice(start); ind = si;
            return "(" + ps + ") => {\n" + lines.map((x) => "    ".repeat(si) + x).join("\n") + "\n" + "    ".repeat(si) + "}";
          }
          note(e, "многострочную безымянную функцию нужно переписать вручную как отдельную функцию");
          return L === "python" ? "None" : "null";
        }
      }
      return note(e, "не удалось перевести выражение");
    }
    function wrap(s, outer, inner) { return outer > inner ? "(" + s + ")" : s; }
    const PREC = { "или": 1, "и": 2, "==": 4, "!=": 4, "<": 4, ">": 4, "<=": 4, ">=": 4, "в": 4, "+": 5, "-": 5, "*": 6, "/": 6, "%": 6, "^": 8 };
    function bin(e, prec) {
      const p = PREC[e.op];
      const l = E(e.l, p), r = E(e.r, p + (e.op === "^" ? 0 : 1));
      if (e.op === "+" && (isStrish(e.l) || isStrish(e.r))) {
        const sl = isStrish(e.l) ? l : show(E(e.l));
        const sr = isStrish(e.r) ? r : show(E(e.r));
        return wrap(sl + " + " + sr, prec, p);
      }
      if (e.op === "в") {
        if (L === "python") return wrap(l + " in " + r, prec, p);
        if (L === "javascript") return isDictLike(e.r) ? wrap(l + " in " + r, prec, p) : E(e.r, 10) + ".includes(" + E(e.l) + ")";
        return isDictLike(e.r) ? E(e.r, 10) + ".ContainsKey(" + E(e.l) + ")" : E(e.r, 10) + ".Contains(" + E(e.l) + ")";
      }
      if (e.op === "*" && L !== "python" && e.l.k === "list") return L === "javascript" ? "Array(Math.max(0, Math.floor(" + E(e.r) + "))).fill(" + E(e.l) + ").flat()" : "Enumerable.Repeat(" + E(e.l) + ", (int)(" + E(e.r) + ")).SelectMany(x => x).ToList()";
      if (e.op === "*" && L !== "python" && e.l.k === "str") return L === "javascript" ? E(e.l, 10) + ".repeat(" + E(e.r) + ")" : "string.Concat(Enumerable.Repeat(" + E(e.l) + ", (int)(" + E(e.r) + ")))";
      if (e.op === "^") return L === "python" ? wrap(l + " ** " + r, prec, p) : L === "javascript" ? wrap(l + " ** " + r, prec, p) : "Math.Pow(" + E(e.l) + ", " + E(e.r) + ")";
      if (e.op === "/" && L !== "python") note(e, "деление на ноль в " + (L === "javascript" ? "JavaScript" : "C#") + " не вызывает ошибку, как в «Понятном»");
      if (e.op === "%" && L !== "python") note(e, "остаток от деления отрицательных чисел в " + (L === "javascript" ? "JavaScript" : "C#") + " считается иначе, чем в «Понятном»");
      const opMap = L === "python" ? { "и": "and", "или": "or" } : { "и": "&&", "или": "||", "==": L === "javascript" ? "===" : "==", "!=": L === "javascript" ? "!==" : "!=" };
      if ((e.op === "==" || e.op === "!=") && L !== "python" && (e.l.k === "list" || e.r.k === "list" || e.l.k === "dict" || e.r.k === "dict")) note(e, "сравнение списков и словарей в " + (L === "javascript" ? "JavaScript" : "C#") + " сравнивает ссылки, а не содержимое");
      return wrap(l + " " + (opMap[e.op] || e.op) + " " + r, prec, p);
    }
    function show(code) { return L === "python" ? "показать(" + code + ")" : L === "javascript" ? "показать(" + code + ")" : "Помощь.Показать(" + code + ")"; }
    function nameRef(e) {
      if (e.ref === "builtin") {
        if (e.name === "ПИ") return L === "python" ? "math.pi" : "Math.PI";
        return builtinRef(e);
      }
      return nm(e.name);
    }
    function builtinRef(e) {
      const map = { python: { "большими": "str.upper", "маленькими": "str.lower", "корень": "math.sqrt", "модуль": "abs", "число": "число", "строка": "показать", "длина": "len" }, javascript: { "корень": "Math.sqrt", "модуль": "Math.abs", "число": "Number", "строка": "показать", "длина": "длина" }, csharp: {} }[L];
      if (e.name === "аргументы" || e.name === "argv") {
        if (L === "python") return "__import__(\"sys\").argv[1:]";
        if (L === "javascript") return "process.argv.slice(2)";
        return "Environment.GetCommandLineArgs().Skip(1).ToList()";
      }
      if (map[e.name]) return map[e.name];
      note(e, "встроенную функцию «" + e.name + "» как значение перевести нельзя");
      return e.name;
    }
    function newObj(name, args) {
      const a = args.map((x) => E(x)).join(", ");
      return L === "python" ? nm(name) + "(" + a + ")" : "new " + nm(name) + "(" + a + ")";
    }
    function member(e) {
      const o = E(e.obj, 10);
      if (e.name === "длина") return L === "python" ? "len(" + E(e.obj) + ")" : L === "javascript" ? "длина(" + E(e.obj) + ")" : "Помощь.Длина(" + E(e.obj) + ")";
      if (L === "python") {
        if (e.obj.k === "this") return "self." + nm(e.name);
        if (e.safe) return "(" + o + ".get(" + JSON.stringify(e.name) + ") if isinstance(" + o + ", dict) else getattr(" + o + ", " + JSON.stringify(nm(e.name)) + ", None))";
        if (isDictLike(e.obj)) return o + "[" + JSON.stringify(e.name) + "]";
        return o + "." + nm(e.name);
      }
      if (L === "javascript") return o + (e.safe ? "?." : ".") + nm(e.name);
      return o + (e.safe ? "?." : ".") + nm(e.name);
    }
    function isDictLike(o) { return o.k === "dict" || (o.k === "name" && dictVars.has(o.name)) || (o.k === "index") || (o.k === "member" && o.safe); }
    const dictVars = new Set();
    function builtin(n, name, args) {
      const a = args.map((x) => E(x));
      const A = (i) => a[i];
      if (L === "python") {
        switch (name) {
          case "спроси": return "спроси(" + (a[0] ? (isStrish(args[0]) ? A(0) : show(A(0))) : "") + ")";
          case "число": return "число(" + A(0) + ")";
          case "строка": return "показать(" + A(0) + ")";
          case "длина": return "len(" + A(0) + ")";
          case "добавь": return A(0) + ".append(" + A(1) + ")";
          case "убери": return A(0) + ".pop(" + (a[1] || "") + ")";
          case "случайное": return a.length === 2 ? "random.randint(" + A(0) + ", " + A(1) + ")" : a.length === 1 ? "random.randint(1, " + A(0) + ")" : "random.random()";
          case "округли": return "round(" + a.join(", ") + ")";
          case "корень": return "math.sqrt(" + A(0) + ")";
          case "модуль": return "abs(" + A(0) + ")";
          case "большими": return E(args[0], 10) + ".upper()";
          case "маленькими": return E(args[0], 10) + ".lower()";
          case "соедини": return (a[1] || "\"\"") + ".join(показать(x) for x in " + A(0) + ")";
          case "от": return "list(range(" + rangeArgs(args) + "))";
          case "тип": return "тип(" + A(0) + ")";
          case "сумма": return "sum(" + A(0) + ")";
          case "макс": return "max(" + a.join(", ") + ")";
          case "мин": return "min(" + a.join(", ") + ")";
          case "целое": return "int(" + A(0) + ")";
          case "степень": return E(args[0], 8) + " ** " + E(args[1], 8);
          case "логическое": return "bool(" + A(0) + ")";
          case "время": return "__import__(\"time\").time()";
          case "прочитай_файл": return "open(" + A(0) + ", encoding=\"utf-8\").read()";
          case "запиши_файл": return "open(" + A(0) + ", \"w\", encoding=\"utf-8\").write(показать(" + A(1) + "))";
          case "допиши_файл": return "open(" + A(0) + ", \"a\", encoding=\"utf-8\").write(показать(" + A(1) + "))";
          case "файл_есть": return "__import__(\"os\").path.exists(" + A(0) + ")";
          case "формат": case "printf": return A(0) + " % (" + a.slice(1).join(", ") + (a.length === 2 ? "," : "") + ")";
          case "размер": case "sizeof": note(n, "размер — абстракция «Понятного» (число 8, логическое 1, строка длина×2), а не sizeof языка Си"); return "(8 if isinstance(" + A(0) + ", (int, float)) and not isinstance(" + A(0) + ", bool) else 1 if isinstance(" + A(0) + ", bool) else (len(" + A(0) + ") * 2 if isinstance(" + A(0) + ", str) else len(" + A(0) + ")))";
          case "открой": return "open(" + A(0) + (a[1] ? ", " + A(1) : "") + ", encoding=\"utf-8\")";
        }
      }
      if (L === "javascript") {
        switch (name) {
          case "спроси": return "спроси(" + (a[0] ? (isStrish(args[0]) ? A(0) : show(A(0))) : "") + ")";
          case "число": return "Number(String(" + A(0) + ").replace(\",\", \".\"))";
          case "строка": return "показать(" + A(0) + ")";
          case "длина": return "длина(" + A(0) + ")";
          case "добавь": return E(args[0], 10) + ".push(" + A(1) + ")";
          case "убери": return a[1] ? E(args[0], 10) + ".splice(" + A(1) + ", 1)[0]" : E(args[0], 10) + ".pop()";
          case "случайное": return a.length === 2 ? "Math.floor(Math.random() * (" + A(1) + " - " + E(args[0], 5) + " + 1)) + " + E(args[0], 5) : a.length === 1 ? "Math.floor(Math.random() * " + E(args[0], 6) + ") + 1" : "Math.random()";
          case "округли": return a[1] ? "Math.round(" + A(0) + " * 10 ** " + E(args[1], 8) + ") / 10 ** " + E(args[1], 8) : "Math.round(" + A(0) + ")";
          case "корень": return "Math.sqrt(" + A(0) + ")";
          case "модуль": return "Math.abs(" + A(0) + ")";
          case "большими": return E(args[0], 10) + ".toUpperCase()";
          case "маленькими": return E(args[0], 10) + ".toLowerCase()";
          case "соедини": return E(args[0], 10) + ".map((x) => показать(x)).join(" + (a[1] || "\"\"") + ")";
          case "от": return "диапазон(" + a.join(", ") + ")";
          case "тип": return "тип(" + A(0) + ")";
          case "сумма": return E(args[0], 10) + ".reduce((a, b) => a + b, 0)";
          case "макс": return args.length === 1 ? "Math.max(..." + A(0) + ")" : "Math.max(" + a.join(", ") + ")";
          case "мин": return args.length === 1 ? "Math.min(..." + A(0) + ")" : "Math.min(" + a.join(", ") + ")";
          case "целое": return "Math.trunc(" + A(0) + ")";
          case "степень": return E(args[0], 8) + " ** " + E(args[1], 8);
          case "логическое": return "Boolean(" + A(0) + ")";
          case "время": return "Date.now() / 1000";
          case "прочитай_файл": return "require(\"fs\").readFileSync(" + A(0) + ", \"utf8\")";
          case "запиши_файл": return "require(\"fs\").writeFileSync(" + A(0) + ", показать(" + A(1) + "))";
          case "допиши_файл": return "require(\"fs\").appendFileSync(" + A(0) + ", показать(" + A(1) + "))";
          case "файл_есть": return "require(\"fs\").existsSync(" + A(0) + ")";
          case "формат": case "printf": return A(0) + ".replace(/%[sdif]/g, () => String(arguments.length && 0))" + " /* формат: проверьте вручную */";
          case "размер": case "sizeof": note(n, "размер — абстракция «Понятного», а не sizeof языка Си"); return "(typeof " + A(0) + " === \"number\" ? 8 : typeof " + A(0) + " === \"boolean\" ? 1 : typeof " + A(0) + " === \"string\" ? " + A(0) + ".length * 2 : Array.isArray(" + A(0) + ") ? " + A(0) + ".length : 8)";
          case "открой": note(n, "открой() переведён как open-подобный объект — проверьте работу с файлом"); return "{ path: " + A(0) + " }";
        }
      }
      if (L === "csharp") {
        switch (name) {
          case "спроси": return "Помощь.Спроси(" + (a[0] || "") + ")";
          case "число": return "Помощь.Число(" + A(0) + ")";
          case "строка": return "Помощь.Показать(" + A(0) + ")";
          case "длина": return "Помощь.Длина(" + A(0) + ")";
          case "добавь": return A(0) + ".Add(" + A(1) + ")";
          case "корень": return "Math.Sqrt(" + A(0) + ")";
          case "модуль": return "Math.Abs(" + A(0) + ")";
          case "округли": return "Math.Round(" + a.join(", ") + ")";
          case "большими": return A(0) + ".ToUpper()";
          case "маленькими": return A(0) + ".ToLower()";
          case "от": return "Помощь.Диапазон(" + a.join(", ") + ")";
          case "соедини": return "string.Join(" + (a[1] || "\"\"") + ", ((List<dynamic>)" + A(0) + ").Select(x => Помощь.Показать(x)))";
          case "случайное": return "new Random().Next((int)" + A(0) + ", (int)" + A(1) + " + 1)";
          case "целое": return "Math.Truncate((double)" + A(0) + ")";
          case "сумма": return "((IEnumerable<dynamic>)" + A(0) + ").Sum(x => (double)x)";
          case "макс": return "((List<dynamic>)" + A(0) + ").Max()";
          case "мин": return "((List<dynamic>)" + A(0) + ").Min()";
          case "формат": case "printf": return "string.Format(" + a.join(", ") + ")";
          case "размер": case "sizeof": note(n, "размер — абстракция «Понятного», а не sizeof языка Си"); return "8";
          case "открой": note(n, "открой() в C# нужно заменить на File.Open"); return "null";
        }
      }
      note(n, "встроенная функция «" + name + "» не имеет точного аналога, оставлена как есть");
      return name + "(" + a.join(", ") + ")";
    }
    function rangeArgs(args) {
      const a = E(args[0]);
      const step = args[2];
      const neg = step && ((step.k === "num" && step.v < 0) || (step.k === "un" && step.e.k === "num"));
      const b = neg ? E(args[1], 5) + " - 1" : E(args[1], 5) + " + 1";
      return a + ", " + b + (step ? ", " + E(step) : "");
    }
    const METHODS = {
      python: {
        "большими": "$o.upper()", "заглавными": "$o.upper()", "маленькими": "$o.lower()", "строчными": "$o.lower()", "обрезать": "$o.strip()",
        "содержит": "($1 in $o)", "заменить": "$o.replace($1, $2)", "разделить": "$o.split($1)", "начинается": "$o.startswith($1)", "заканчивается": "$o.endswith($1)",
        "добавь": "$o.append($1)", "убери": "$o.pop($1)", "соедини": "$1.join(показать(x) for x in $o)", "сортируй": "$o.sort()", "обрати": "$o.reverse()",
        "срез": "$o[$1:$2]", "отфильтруй": "list(filter($1, $o))", "преобразуй": "list(map($1, $o))", "свернуть": "__import__(\"functools\").reduce($1, $o, $2)", "сумма": "sum($o)", "ключи": "list($o.keys())",
        "значения": "list($o.values())", "есть": "($1 in $o)", "получи": "$o.get($1, $2)", "копия": "$o.copy()", "первый": "$o[0]", "последний": "$o[-1]",
        "вставь": "$o.insert($1, $2)", "отсортировано": "sorted($o)", "символы": "list($o)", "повтори": "$o * $1", "пусто": "(len($o) == 0)", "очисти": "$o.clear()",
      },
      javascript: {
        "большими": "$o.toUpperCase()", "заглавными": "$o.toUpperCase()", "маленькими": "$o.toLowerCase()", "строчными": "$o.toLowerCase()", "обрезать": "$o.trim()",
        "содержит": "$o.includes($1)", "заменить": "$o.replaceAll($1, $2)", "разделить": "$o.split($1)", "начинается": "$o.startsWith($1)", "заканчивается": "$o.endsWith($1)",
        "добавь": "$o.push($1)", "убери": "$o.splice($1, 1)[0]", "соедини": "$o.map((x) => показать(x)).join($1)", "сортируй": "$o.sort((a, b) => (a > b) - (a < b))", "обрати": "$o.reverse()",
        "срез": "$o.slice($1, $2)", "отфильтруй": "$o.filter($1)", "преобразуй": "$o.map($1)", "сумма": "$o.reduce((a, b) => a + b, 0)", "ключи": "Object.keys($o)",
        "значения": "Object.values($o)", "есть": "($1 in $o)", "получи": "($o[$1] ?? $2)", "копия": "[...$o]", "первый": "$o[0]", "последний": "$o.at(-1)",
        "вставь": "$o.splice($1, 0, $2)", "отсортировано": "[...$o].sort((a, b) => (a > b) - (a < b))", "символы": "[...$o]", "повтори": "$o.repeat($1)", "пусто": "(длина($o) === 0)", "свернуть": "$o.reduce($1, $2)",
      },
      csharp: {
        "большими": "$o.ToUpper()", "маленькими": "$o.ToLower()", "обрезать": "$o.Trim()", "содержит": "$o.Contains($1)", "заменить": "$o.Replace($1, $2)",
        "разделить": "new List<dynamic>($o.Split($1))", "добавь": "$o.Add($1)", "ключи": "new List<dynamic>($o.Keys)", "значения": "new List<dynamic>($o.Values)", "есть": "$o.ContainsKey($1)",
        "начинается": "$o.StartsWith($1)", "заканчивается": "$o.EndsWith($1)", "сортируй": "$o.Sort()", "обрати": "$o.Reverse()",
        "соедини": "string.Join($1, ((IEnumerable<dynamic>)$o).Select(x => Помощь.Показать(x)))", "убери": "$o.RemoveAt($1)", "сумма": "((IEnumerable<dynamic>)$o).Sum(x => (double)x)",
        "найди": "$o.IndexOf($1)", "срез": "$o.Substring($1, $2 - $1)", "копия": "new List<dynamic>($o)", "отсортировано": "((IEnumerable<dynamic>)$o).OrderBy(x => x).ToList()",
      },
    };
    function method(n, o, name, args, safe) {
      if (n.obj && n.obj.k === "this" || (n.obj && n.obj.k === "name" && n.obj.ref === "user" && classVars.has(n.obj.name))) return o + "." + nm(name) + "(" + args.map((x) => E(x)).join(", ") + ")";
      let tpl = METHODS[L][name];
      if (n.obj && isDictLike(n.obj) && L === "javascript") tpl = { "убери": "delete $o[$1]", "длина": "длина($o)", "копия": "{ ...$o }", "пусто": "(длина($o) === 0)" }[name] || tpl;
      if (n.obj && isDictLike(n.obj) && L === "csharp") tpl = { "убери": "$o.Remove($1)", "получи": "($o.ContainsKey($1) ? $o[$1] : $2)" }[name] || tpl;
      if (!tpl) {
        if (!userMethods.has(name)) note(n, "функция «" + name + "» оставлена как есть: проверьте, что она есть у этого значения");
        return o + (safe && L !== "python" ? "?." : ".") + nm(name) + "(" + args.map((x) => E(x)).join(", ") + ")";
      }
      const a = args.map((x) => E(x));
      let r = tpl.replace(/\$o/g, o);
      r = r.replace(/\$(\d)/g, (m, d) => {
        const v = a[d - 1];
        if (v !== undefined) return v;
        if (name === "соедини") return "\"\"";
        if (name === "срез" && L === "python") return "";
        if (name === "убери") return L === "python" ? "" : "-1";
        if (name === "разделить") return L === "python" ? "" : "\" \"";
        if (name === "получи") return L === "python" ? "None" : "null";
        return "undefined";
      });
      r = r.replace(/, \)/g, ")").replace(/\(, /g, "(");
      if (safe) note(n, "безопасный вызов «?.» переведён как обычный");
      return r;
    }
    const classVars = new Set();
    const userMethods = new Set();
    function collect(list) {
      for (const s of list) {
        if (s.k === "class") s.methods.forEach((m) => userMethods.add(m.name));
        if (s.k === "let" && s.value.k === "dict") dictVars.add(s.name);
        if (s.k === "let" && s.value.k === "call" && s.value.fn.ref === "class") classVars.add(s.name);
        if (s.k === "let" && s.value.k === "new") classVars.add(s.name);
        for (const key of ["body", "then", "otherwise", "handler", "fin", "def", "methods"]) if (Array.isArray(s[key])) collect(s[key]);
        if (s.cases) s.cases.forEach((c) => collect(c.body));
      }
    }
    collect(program.body);

    function block(list) {
      if (!list.length) { if (L === "python") emit("pass"); return; }
      list.forEach(S);
    }
    function inner(list) { ind++; block(list); ind--; }
    function open(head) { if (L === "python") emit(head + ":"); else emit(head + " {"); }
    function close() { if (L !== "python") emit("}"); }
    let pending = [];
    function S(s) {
      const at = out.length;
      const saved = pending;
      pending = [];
      S0(s);
      if (pending.length) out.splice(at, 0, ...pending.map((t) => "    ".repeat(ind) + comment + "ПРИМЕЧАНИЕ (строка " + s.line + "): " + t));
      pending = saved;
    }
    function S0(s) {
      switch (s.k) {
        case "let": {
          if (s.kind === "forever" && L === "python") emitNote(s, "в Python нет неизменяемых переменных, «навсегда» не переведено");
          if (s.kind === "const" && L === "python") emitNote(s, "в Python нет констант, это обычная переменная");
          const v = E(s.value);
          if (L === "python") emit(nm(s.name) + " = " + v);
          else if (L === "javascript") emit((s.kind === "let" ? "let " : "const ") + nm(s.name) + " = " + (s.kind === "forever" ? "Object.freeze(" + v + ")" : v) + ";");
          else emit("dynamic " + nm(s.name) + " = " + v + ";");
          return;
        }
        case "assign": {
          const t = s.target.k === "name" ? nm(s.target.name) : s.target.k === "member" && L === "python" && s.target.obj.k !== "this" && isDictLike(s.target.obj) ? E(s.target.obj, 10) + "[" + JSON.stringify(s.target.name) + "]" : E(s.target);
          if (s.target.safe) {
            const objCode = E(s.target.obj, 10);
            if (L === "python") { emit("if " + objCode + " is not None:"); ind++; emit((isDictLike(s.target.obj) ? objCode + "[" + JSON.stringify(s.target.name) + "]" : objCode + "." + s.target.name) + " " + s.op + " " + E(s.value)); ind--; return; }
            emit("if (" + objCode + " != null) " + objCode + "." + s.target.name + " " + s.op + " " + E(s.value) + ";");
            return;
          }
          let v = E(s.value);
          if (s.op === "+=" && isStrish(s.value) === false && L === "python" && false) v = v;
          emit(t + " " + s.op + " " + v + (L === "python" ? "" : ";"));
          return;
        }
        case "dowhile":
          if (L === "python") { emit("while True:"); inner(s.body); ind++; emit("if not (" + E(s.cond) + "):"); ind++; emit("break"); ind -= 2; return; }
          emit("do {"); inner(s.body); emit("} while (" + E(s.cond) + ");");
          return;
        case "multilet": case "multiassign": {
          const names = s.k === "multilet" ? s.names.map(nm) : s.parts.map((pt) => (pt.target.k === "name" ? nm(pt.target.name) : E(pt.target)));
          const v = s.value.k === "list" ? s.value.items.map((x) => E(x)).join(", ") : E(s.value);
          if (L === "python") { emit(names.join(", ") + " = " + v); return; }
          if (L === "javascript") { emit((s.k === "multilet" ? (s.kind === "let" ? "let " : "const ") : "") + "[" + names.join(", ") + "] = [" + v + "];"); return; }
          emit("var __t" + (++tmp) + " = new List<dynamic> { " + v + " };");
          names.forEach((n, i) => emit((s.k === "multilet" ? "dynamic " : "") + n + " = __t" + tmp + "[" + i + "];"));
          return;
        }
        case "assert":
          if (L === "python") emit("assert " + E(s.cond) + (s.msg ? ", " + E(s.msg) : ""));
          else if (L === "javascript") emit("if (!(" + E(s.cond) + ")) throw new Error(" + (s.msg ? E(s.msg) : "\"проверка не прошла\"") + ");");
          else emit("if (!(" + E(s.cond) + ")) throw new Exception(" + (s.msg ? E(s.msg) : "\"проверка не прошла\"") + ");");
          return;
        case "enum": {
          let last = -1;
          const items = s.items.map((it) => { let v; if (it.value) { v = E(it.value); if (it.value.k === "num") last = it.value.v; } else v = String(++last); return [it.name, v]; });
          if (L === "python") emit(nm(s.name) + " = {" + items.map(([k, v]) => JSON.stringify(k) + ": " + v).join(", ") + "}");
          else if (L === "javascript") emit("const " + nm(s.name) + " = Object.freeze({ " + items.map(([k, v]) => JSON.stringify(k) + ": " + v).join(", ") + " });");
          else emit("dynamic " + nm(s.name) + " = new Dictionary<string, dynamic> { " + items.map(([k, v]) => "{ " + JSON.stringify(k) + ", " + v + " }").join(", ") + " };");
          return;
        }
        case "iface": note(s, "интерфейс «" + s.name + "» не переведён: в " + L + " проверка «реализует» не выполняется"); return;
        case "print": {
          if (s.err) note(s, s.err === "warn" ? "«предупреди» переведено как обычный вывод" : "«отладка» переведена как обычный вывод");
          const a = s.items.map((x) => E(x)).join(", ");
          emit(L === "python" ? "напиши(" + a + ")" : L === "javascript" ? "напиши(" + a + ");" : "Помощь.Напиши(" + a + ");");
          return;
        }
        case "expr": emit(E(s.expr) + (L === "python" ? "" : ";")); return;
        case "if": {
          let cur = s, first = true;
          for (;;) {
            if (L === "python") emit((first ? "if " : "elif ") + E(cur.cond) + ":");
            else emit((first ? "if (" : "} else if (") + E(cur.cond) + ") {");
            inner(cur.then);
            first = false;
            if (cur.otherwise && cur.otherwise.length === 1 && cur.otherwise[0].k === "if") { cur = cur.otherwise[0]; continue; }
            if (cur.otherwise) { emit(L === "python" ? "else:" : "} else {"); inner(cur.otherwise); }
            break;
          }
          close();
          return;
        }
        case "while": open(L === "python" ? "while " + E(s.cond) : "while (" + E(s.cond) + ")"); inner(s.body); close(); return;
        case "repeat": {
          const v = "_" + (++tmp);
          if (L === "python") open("for " + v + " in range(" + E(s.count) + ")");
          else if (L === "javascript") open("for (let " + v + " = 0; " + v + " < " + E(s.count, 4) + "; " + v + "++)");
          else open("for (var " + v + " = 0; " + v + " < " + E(s.count) + "; " + v + "++)");
          inner(s.body); close();
          return;
        }
        case "foreach": {
          const a = nm(s.name), b = s.name2 && nm(s.name2);
          const lst = E(s.list);
          const isDict = isDictLike(s.list);
          if (L === "python") {
            if (b) open("for " + a + ", " + b + " in " + (isDict ? lst + ".items()" : "enumerate(" + lst + ")"));
            else open("for " + a + " in " + lst);
          } else if (L === "javascript") {
            if (b) open("for (const [" + a + ", " + b + "] of " + (isDict ? "Object.entries(" + lst + ")" : lst + ".entries()") + ")");
            else open("for (const " + a + " of " + (isDict ? "Object.keys(" + lst + ")" : lst) + ")");
          } else {
            if (b) open("foreach (var пара in " + lst + ")"), ind++, emit("var " + a + " = пара.Key; var " + b + " = пара.Value;"), ind--;
            else open("foreach (var " + a + " in " + lst + ")");
          }
          if (b && !isDict && !(s.list.k === "list")) note(s, "проверьте тип: перебор пар переведён как перебор " + (isDict ? "словаря" : "списка"));
          inner(s.body); close();
          return;
        }
        case "forrange": {
          const v = nm(s.name);
          const autoDown = !s.step && s.from.k === "num" && s.to.k === "num" && s.from.v > s.to.v;
          if (!s.step && !(s.from.k === "num" && s.to.k === "num")) emitNote(s, "в «Понятном» цикл идёт вниз, если начало больше конца; здесь считается, что шаг +1");
          const stepE = s.step || (autoDown ? { k: "num", v: -1 } : null);
          const neg = stepE && ((stepE.k === "num" && stepE.v < 0) || (stepE.k === "un" && stepE.op === "-"));
          if (L === "python") open("for " + v + " in range(" + E(s.from) + ", " + E(s.to, 5) + (neg ? " - 1" : " + 1") + (stepE ? ", " + E(stepE) : "") + ")");
          else {
            const st = stepE ? E(stepE) : "1";
            const kw = L === "javascript" ? "let" : "var";
            open("for (" + kw + " " + v + " = " + E(s.from) + "; " + v + (neg ? " >= " : " <= ") + E(s.to, 4) + "; " + v + (st === "1" ? "++" : st === "-1" ? "--" : " += " + st) + ")");
          }
          inner(s.body); close();
          return;
        }
        case "func": {
          const ps = s.params.map((q) => (L === "csharp" ? "dynamic " + q.name + (q.def ? " = null" : "") : nm(q.name) + (q.def ? (L === "python" ? "=" : " = ") + E(q.def) : "")));
          if (s.getter && inClass) {
            if (L === "python") { emit("@property"); emit("def " + nm(s.name) + "(self):"); ind++; block(s.body); ind--; emit(""); return; }
            if (L === "javascript") { emit("get " + nm(s.name) + "() {"); inner(s.body); emit("}"); return; }
            emit("public dynamic " + nm(s.name) + " { get {"); inner(s.body); emit("} }"); return;
          }
          if (s.setter && inClass) {
            const pn = s.params[0] ? nm(s.params[0].name) : "значение";
            if (L === "python") { emit("@" + nm(s.name) + ".setter"); emit("def " + nm(s.name) + "(self, " + pn + "):"); ind++; block(s.body); ind--; emit(""); return; }
            if (L === "javascript") { emit("set " + nm(s.name) + "(" + pn + ") {"); inner(s.body); emit("}"); return; }
            emit("public void set_" + nm(s.name) + "(dynamic " + pn + ")"); emit("{"); inner(s.body); emit("}"); return;
          }
          if (L === "python") {
            const isInit = inClass && s.name === "создать";
            const name = isInit ? "__init__" : s.name === "строкой" && inClass ? "__str__" : nm(s.name);
            emit((s.async ? "async " : "") + "def " + name + "(" + (inClass ? ["self"].concat(ps) : ps).join(", ") + "):");
            ind++;
            if (isInit && inClass.fields.length) inClass.fields.forEach((f) => emit("self." + nm(f.name) + " = " + (f.value ? E(f.value) : "None")));
            block(s.body);
            ind--;
            emit("");
          } else if (L === "javascript") {
            const isInit = inClass && s.name === "создать";
            const name = isInit ? "constructor" : s.name === "строкой" && inClass ? "toString" : nm(s.name);
            emit((inClass ? (s.async ? "async " : "") : (s.async ? "async function " : "function ")) + name + "(" + ps.join(", ") + ") {");
            ind++;
            if (isInit && inClass.parent && !s.body.some((b) => b.k === "expr" && b.expr.k === "super")) emit("super();");
            if (isInit) inClass.fields.forEach((f) => emit("this." + nm(f.name) + " = " + (f.value ? E(f.value) : "null") + ";"));
            block(s.body);
            ind--;
            emit("}");
          } else {
            const isInit = inClass && s.name === "создать";
            if (isInit) emit("public " + nm(inClass.name) + "(" + ps.join(", ") + ")" + (inClass.parent ? " : base()" : ""));
            else if (inClass && s.name === "строкой") emit("public override string ToString()");
            else emit((inClass ? "public virtual " : "static ") + "dynamic " + nm(s.name) + "(" + ps.join(", ") + ")");
            emit("{");
            ind++; s.params.filter((q) => q.def && !(q.def.k === "lit" && q.def.v == null)).forEach((q) => emit("if (" + q.name + " == null) " + q.name + " = " + E(q.def) + ";")); block(s.body); if (!isInit && !(inClass && s.name === "строкой") && !(s.body.length && s.body[s.body.length - 1].k === "return")) emit("return null;"); ind--;
            emit("}");
          }
          return;
        }
        case "return": emit(L === "python" ? "return" + (s.value ? " " + E(s.value) : "") : "return" + (s.value ? " " + E(s.value) : "") + ";"); return;
        case "break": emit(L === "python" ? "break" : "break;"); return;
        case "continue": emit(L === "python" ? "continue" : "continue;"); return;
        case "throw": emit(L === "python" ? "raise Exception(" + E(s.value) + ")" : L === "javascript" ? "throw new Error(" + E(s.value) + ");" : "throw new Exception(" + E(s.value) + ");"); return;
        case "try": {
          open(L === "python" ? "try" : "try");
          inner(s.body);
          if (s.handler) {
            const en = s.errName ? nm(s.errName) : "_ошибка";
            if (L === "python") emit("except Exception as " + en + ":");
            else if (L === "javascript") emit("} catch (" + en + ") {");
            else emit("} catch (Exception " + en + ") {");
            ind++;
            if (s.errName) {
              if (L === "python") emit(en + " = str(" + en + ")");
              else if (L === "javascript") emit(en + " = " + en + " instanceof Error ? " + en + ".message : " + en + ";");
              else emit("var " + en + "Текст = " + en + ".Message;");
            }
            emitNote(s, "тексты встроенных ошибок отличаются от «Понятного»");
            block(s.handler);
            ind--;
          }
          if (s.fin) { emit(L === "python" ? "finally:" : "} finally {"); inner(s.fin); }
          close();
          return;
        }
        case "switch": {
          const v = "_выбор" + (++tmp);
          emit(L === "python" ? v + " = " + E(s.subject) : L === "javascript" ? "const " + v + " = " + E(s.subject) + ";" : "var " + v + " = " + E(s.subject) + ";");
          let first = true;
          const binds = [...new Set(s.cases.filter((c) => c.bind).map((c) => c.bind))];
          binds.forEach((b) => emit(L === "python" ? nm(b) + " = " + v : (L === "javascript" ? "let " : "var ") + nm(b) + " = " + v + ";"));
          for (const c of s.cases) {
            let cond;
            if (c.bind) {
              cond = c.guard ? E(c.guard) : L === "python" ? "True" : "true";
            } else {
              const eq = L === "javascript" ? " === " : " == ";
              cond = c.values.map((x) => v + eq + E(x, 5)).join(L === "python" ? " or " : " || ");
              if (c.guard) cond = "(" + cond + ")" + (L === "python" ? " and " : " && ") + E(c.guard, 3);
            }
            if (L === "python") emit((first ? "if " : "elif ") + cond + ":");
            else emit((first ? "if (" : "} else if (") + cond + ") {");
            first = false;
            inner(c.body);
          }
          if (s.def) {
            if (first) block(s.def);
            else { emit(L === "python" ? "else:" : "} else {"); inner(s.def); }
          }
          if (!first) close();
          if (s.cases.some((c) => c.bind)) note(s, "«когда» в «выбор» переведён через временную переменную");
          return;
        }
        case "class": {
          const saved = inClass;
          inClass = s;
          if (L === "python") {
            emit("class " + nm(s.name) + (s.parent ? "(" + nm(s.parent) + ")" : "") + ":");
            ind++;
            if (s.fields.length && !s.methods.some((m) => m.name === "создать")) {
              emit("def __init__(self):");
              ind++;
              if (s.parent) emit("super().__init__()");
              s.fields.forEach((f) => emit("self." + nm(f.name) + " = " + (f.value ? E(f.value) : "None")));
              ind--;
              emit("");
            }
            if (!s.methods.length && !s.fields.length) emit("pass");
            s.methods.forEach(S);
            ind--;
          } else if (L === "javascript") {
            emit("class " + nm(s.name) + (s.parent ? " extends " + nm(s.parent) : "") + " {");
            ind++;
            if (s.fields.length && !s.methods.some((m) => m.name === "создать")) {
              emit("constructor() {");
              ind++;
              if (s.parent) emit("super();");
              s.fields.forEach((f) => emit("this." + nm(f.name) + " = " + (f.value ? E(f.value) : "null") + ";"));
              ind--;
              emit("}");
            }
            s.methods.forEach(S);
            ind--;
            emit("}");
          } else {
            emit("class " + nm(s.name) + (s.parent ? " : " + nm(s.parent) : ""));
            emit("{");
            ind++;
            const fields = new Set(s.fields.map((f) => f.name));
            const walk = (x) => { if (!x || typeof x !== "object") return; if (x.k === "assign" && x.target.k === "member" && x.target.obj.k === "this") fields.add(x.target.name); for (const v of Object.values(x)) if (Array.isArray(v)) v.forEach(walk); else if (v && typeof v === "object") walk(v); };
            s.methods.forEach(walk);
            fields.forEach((f) => emit("public dynamic " + f + ";"));
            s.methods.forEach(S);
            ind--;
            emit("}");
          }
          inClass = saved;
          emit("");
          return;
        }
        case "struct": {
          const ps = s.params;
          if (L === "python") {
            emit("class " + nm(s.name) + ":");
            ind++;
            emit("def __init__(self, " + ps.map((q) => nm(q.name) + (q.def ? "=" + E(q.def) : "")).join(", ") + "):");
            ind++; ps.forEach((q) => emit("self." + nm(q.name) + " = " + nm(q.name))); ind--;
            ind--;
            emit("");
          } else if (L === "javascript") {
            emit("class " + nm(s.name) + " {");
            ind++;
            emit("constructor(" + ps.map((q) => nm(q.name) + (q.def ? " = " + E(q.def) : "")).join(", ") + ") {");
            ind++; ps.forEach((q) => emit("this." + nm(q.name) + " = " + nm(q.name) + ";")); ind--;
            emit("}");
            ind--;
            emit("}");
          } else {
            emit("class " + nm(s.name));
            emit("{");
            ind++;
            ps.forEach((q) => emit("public dynamic " + nm(q.name) + ";"));
            emit("public " + nm(s.name) + "(" + ps.map((q) => "dynamic " + nm(q.name) + (q.def ? " = " + E(q.def) : "")).join(", ") + ") { " + ps.map((q) => "this." + nm(q.name) + " = " + nm(q.name) + ";").join(" ") + " }");
            ind--;
            emit("}");
          }
          return;
        }
        case "label":
          if (L === "python") emitNote(s, "метка «" + s.name + "»: в Python нет goto");
          else emit(nm(s.name) + ":");
          return;
        case "goto":
          if (L === "csharp") { emit("goto " + nm(s.name) + ";"); return; }
          emitNote(s, "переход «иди к " + s.name + "» (goto) в " + L + " не имеет прямого аналога");
          return;
        case "thread":
          emitNote(s, "«поток» в «Понятном» выполняется сразу, это не отдельная нить ОС");
          if (L === "python") { emit("def __поток" + (++tmp) + "():"); inner(s.body); emit("__поток" + tmp + "()"); }
          else { emit("(() => {"); inner(s.body); emit("})();"); }
          return;
        case "with":
          if (L === "python") { emit("with " + E(s.value) + " as " + nm(s.name) + ":"); inner(s.body); }
          else if (L === "javascript") {
            emit("{");
            ind++;
            emit("const " + nm(s.name) + " = " + E(s.value) + ";");
            emit("try {");
            inner(s.body);
            emit("} finally {");
            ind++;
            emit("if (" + nm(s.name) + " && typeof " + nm(s.name) + ".выйти === \"function\") " + nm(s.name) + ".выйти();");
            emit("else if (" + nm(s.name) + " && typeof " + nm(s.name) + ".close === \"function\") " + nm(s.name) + ".close();");
            ind--;
            emit("}");
            ind--;
            emit("}");
          } else {
            emit("using (dynamic " + nm(s.name) + " = " + E(s.value) + ")");
            emit("{");
            inner(s.body);
            emit("}");
          }
          return;
        case "module":
          emitNote(s, "подключение модуля «" + (s.path || "") + "» вставлено прямо в перевод");
          (s.body || []).forEach(S0);
          if (s.alias) emitNote(s, "модуль доступен как «" + s.alias + "» — в переводе имена остались глобальными, проверьте");
          if (s.names) emitNote(s, "из модуля взяты: " + s.names.map((x) => x.as || x.name).join(", "));
          return;
      }
      emitNote(s, "эту команду перевести не удалось");
    }

    if (L === "csharp") {
      const types = program.body.filter((s) => s.k === "class" || s.k === "struct");
      const funcs = program.body.filter((s) => s.k === "func");
      const rest = program.body.filter((s) => !types.includes(s) && !funcs.includes(s));
      types.forEach(S);
      emit("static class Программа");
      emit("{");
      ind++;
      funcs.forEach(S);
      emit("static void Main()");
      emit("{");
      ind++;
      emit("Console.OutputEncoding = System.Text.Encoding.UTF8;");
      rest.forEach(S);
      ind--;
      emit("}");
      ind--;
      emit("}");
      note({ line: 0 }, "в C# все значения имеют тип dynamic: так перевод ближе к «Понятному», но не всё проверяется при сборке");
      return { code: CS_PRELUDE + "\n\n" + out.join("\n") + "\n", notes };
    }
    block(program.body);
    const prelude = L === "python" ? PY_PRELUDE : JS_PRELUDE;
    let code = out.join("\n");
    if (L === "python") code = code.replace(/\n{3,}/g, "\n\n");
    return { code: prelude + "\n\n\n" + code + "\n", notes };
  }

  return { translate, PY_PRELUDE, JS_PRELUDE };
});
