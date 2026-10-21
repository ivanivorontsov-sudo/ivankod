// ИванКод 1.3: простой режим «C# WinForms» — настоящая программа Windows (.NET 8, один EXE, без веба).
// ИИ пишет ТОЛЬКО тело класса AppForm (раздел ===CSHARP===); проект, Program.cs и помощники — готовые.
(function(root){
const MARK=['//<AI-CSHARP>','//</AI-CSHARP>'];
const USINGS=['System','System.Collections.Generic','System.Drawing','System.IO','System.Linq','System.Text','System.Text.Json','System.Windows.Forms'];
const HEAD=`${USINGS.map(u=>'using '+u+';').join('\n')}\n\nnamespace IvanApp;\n\n// Эту строку и всё вне раздела ИИ студия пишет сама\npublic partial class AppForm : UiForm\n{\n${MARK[0]}\n`;
const TAIL=`\n${MARK[1]}\n}\n`;
const HELPERS=`using System;
using System.Collections.Generic;
using System.Drawing;
using System.IO;
using System.Text.Json;
using System.Windows.Forms;

namespace IvanApp;

// Готовые помощники студии ИванКод. ИИ ими пользуется, но не меняет этот файл.
public class UiForm : Form
{
    protected readonly FlowLayoutPanel Root = new() { Dock = DockStyle.Fill, FlowDirection = FlowDirection.TopDown, WrapContents = false, AutoScroll = true, Padding = new Padding(16) };
    static readonly string DataFile = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "IvanApp", AppDomain.CurrentDomain.FriendlyName + ".json");
    Dictionary<string, string> data = new();
    public UiForm()
    {
        Font = new Font("Segoe UI", 11f); BackColor = Color.FromArgb(244, 246, 251); ClientSize = new Size(560, 640); StartPosition = FormStartPosition.CenterScreen;
        try { if (File.Exists(DataFile)) data = JsonSerializer.Deserialize<Dictionary<string, string>>(File.ReadAllText(DataFile)) ?? new(); } catch { }
        Controls.Add(Root);
    }
    protected void Add(params Control[] c) { foreach (var x in c) { x.Margin = new Padding(4); Root.Controls.Add(x); } }
    protected Label Title(string t) => new() { Text = t, AutoSize = true, Font = new Font("Segoe UI", 16f, FontStyle.Bold) };
    protected Label Text_(string t) => new() { Text = t, AutoSize = true, MaximumSize = new Size(500, 0) };
    protected Label Label(string t) => Text_(t);
    protected Button Button(string t, Action onClick) { var b = new Button { Text = t, AutoSize = true, Padding = new Padding(8, 4, 8, 4) }; b.Click += (s, e) => { try { onClick(); } catch (Exception ex) { Message("Ошибка: " + ex.Message); } }; return b; }
    protected TextBox Input(string hint = "") => new() { Width = 300, PlaceholderText = hint };
    protected NumericUpDown Number(decimal max = 1000000) => new() { Width = 140, Maximum = max, Minimum = -max, DecimalPlaces = 2 };
    protected ListBox List() => new() { Width = 500, Height = 220 };
    protected FlowLayoutPanel Row(params Control[] c) { var p = new FlowLayoutPanel { AutoSize = true, FlowDirection = FlowDirection.LeftToRight, WrapContents = false }; foreach (var x in c) p.Controls.Add(x); return p; }
    protected void Message(string t) => MessageBox.Show(this, t, Text);
    protected bool Confirm(string q) => MessageBox.Show(this, q, Text, MessageBoxButtons.YesNo) == DialogResult.Yes;
    protected void Save(string key, string value) { data[key] = value; try { Directory.CreateDirectory(Path.GetDirectoryName(DataFile)!); File.WriteAllText(DataFile, JsonSerializer.Serialize(data)); } catch { } }
    protected new string Load(string key, string def = "") => data.TryGetValue(key, out var v) ? v : def;
    protected void SaveList(string key, List<string> items) => Save(key, JsonSerializer.Serialize(items));
    protected List<string> LoadList(string key) { try { return JsonSerializer.Deserialize<List<string>>(Load(key, "[]")) ?? new(); } catch { return new(); } }
    protected static double Num(string t) => double.TryParse(t.Replace('.', ',').Trim(), System.Globalization.NumberStyles.Any, new System.Globalization.CultureInfo("ru-RU"), out var v) ? v : 0;
    protected static string Money(double v) => v.ToString("N2", new System.Globalization.CultureInfo("ru-RU")) + " ₽";
    protected static string Money(decimal v) => Money((double)v); // Number().Value — decimal, так тоже можно
}
`;
const PROGRAM=`using System;
using System.Windows.Forms;

namespace IvanApp;

static class Program
{
    [STAThread]
    static void Main()
    {
        ApplicationConfiguration.Initialize();
        var smoke = Environment.GetEnvironmentVariable("IVANCODE_SMOKE_FILE"); // проверка студии: окно открылось — записать и закрыться
        var f = new AppForm();
        try { f.Start(); } catch (Exception e) { if (!string.IsNullOrEmpty(smoke)) { System.IO.File.WriteAllText(smoke, "SMOKE_ERR " + e.GetType().Name + ": " + e.Message); return; } MessageBox.Show("Ошибка при запуске: " + e.Message); }
        if (!string.IsNullOrEmpty(smoke)) { f.Shown += (s, e) => { System.IO.File.WriteAllText(smoke, "SMOKE_OK " + f.Text + " " + f.Controls[0].Controls.Count); Application.Exit(); }; }
        Application.Run(f);
    }
}
`;
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;') }
function csproj(name,o={}){ return `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>WinExe</OutputType>
    <TargetFramework>net8.0-windows</TargetFramework>
    <UseWindowsForms>true</UseWindowsForms>
    <EnableWindowsTargeting>true</EnableWindowsTargeting>
    <Nullable>disable</Nullable>
    <ImplicitUsings>disable</ImplicitUsings>
    <LangVersion>12</LangVersion>
    <RootNamespace>IvanApp</RootNamespace>
    <AssemblyName>${esc(o.asm||'app')}</AssemblyName>
    <Product>${esc(name)}</Product>
    <RuntimeIdentifier>win-x64</RuntimeIdentifier>
    <SelfContained>true</SelfContained>
    <PublishSingleFile>true</PublishSingleFile>
    <IncludeNativeLibrariesForSelfExtract>true</IncludeNativeLibrariesForSelfExtract>
    <EnableCompressionInSingleFile>true</EnableCompressionInSingleFile>
    <InvariantGlobalization>false</InvariantGlobalization>
    <SatelliteResourceLanguages>ru</SatelliteResourceLanguages>
    <GenerateDocumentationFile>false</GenerateDocumentationFile>
    <TreatWarningsAsErrors>false</TreatWarningsAsErrors>
    <NoWarn>CS8618;CS8600;CS8602;CS8604;CS0168;CS0219</NoWarn>${o.icon?'\n    <ApplicationIcon>app.ico</ApplicationIcon>':''}
  </PropertyGroup>
</Project>
` }
const DEFAULT_BODY=`    public void Start()\n    {\n        Text = "Моя программа";\n        Add(Title("Моя программа"), Label("Здесь будет программа"));\n    }`;
function appCs(body){ return HEAD+String(body||DEFAULT_BODY).replace(/\s+$/,'')+TAIL }
const APP_FILE='AppForm.cs';
function project(name,body,o={}){ return {'app.csproj':csproj(name,o),'Program.cs':PROGRAM,'UiForm.cs':HELPERS,[APP_FILE]:appCs(body),'.gitignore':'bin/\nobj/\n'} }
const bodyLine0=()=>HEAD.split('\n').length;
function body(t){ t=String(t||''); const i=t.indexOf(MARK[0]), j=t.indexOf(MARK[1]); return i<0||j<0?'':t.slice(i+MARK[0].length+1,j).replace(/\s+$/,'') }
const SYS=`Ты пишешь настоящую программу для Windows на C# (WinForms, .NET 8) для студии ИванКод. Пользователь — новичок, поэтому код простой и понятный, с короткими комментариями на русском.
Студия уже сделала проект, Program.cs и базовый класс UiForm. Ты пишешь ТОЛЬКО тело класса AppForm (он наследует UiForm). Не пиши using, namespace, class AppForm, Main — их добавит студия.
Уже подключены: ${USINGS.join(', ')}.

Обязательно: метод \`public void Start()\` — задаёт Text (заголовок окна) и добавляет элементы через Add(...).
Готовые помощники (НЕ объявляй их заново):
- Add(params Control[] c) — добавить на экран сверху вниз; Row(params Control[] c) — в строку
- Title(string), Label(string) — надписи; Button(string, () => { … }) — кнопка, ошибки внутри ловятся сами
- Input(string hint) : TextBox; Number() : NumericUpDown (свойство .Value — decimal); List() : ListBox (.Items.Add/.Items.Clear/.SelectedIndex)
- Message(string), Confirm(string) : bool
- Save(key, value), Load(key, def = ""), SaveList(key, List<string>), LoadList(key) : List<string> — данные сохраняются между запусками
- Num(string) : double (безопасно, «1,5» → 1.5), Money(double) : string — ТОЛЬКО для денег
Правила:
- Только WinForms и стандартная библиотека. Никаких NuGet, файлов .Designer.cs, ресурсов, интернета, async.
- Поля объявляй как private в теле класса. Список на экране перерисовывай методом Refresh_() (НЕ называй его Refresh — это имя уже есть у Form).
- Пиши корректный C# 12: все скобки закрыты, у каждого метода есть тип. Тексты интерфейса — по-русски.
Формат ответа СТРОГО такой, без пояснений до и после:
===CSHARP===
(тело класса AppForm)
===КОНЕЦ===`;
const EXAMPLE=`    // Список дел: добавить, удалить
    private List<string> items;
    private ListBox box;
    private TextBox field;

    public void Start()
    {
        Text = "Мои дела";
        items = LoadList("items");
        box = List();
        field = Input("Новое дело");
        Add(Title("Мои дела"), Row(field, Button("Добавить", AddItem)), box, Button("Удалить выбранное", RemoveItem));
        Refresh_();
    }

    private void AddItem()
    {
        var t = field.Text.Trim();
        if (t == "") { Message("Введите дело"); return; }
        items.Add(t); SaveList("items", items); field.Text = ""; Refresh_();
    }

    private void RemoveItem()
    {
        if (box.SelectedIndex < 0) return;
        items.RemoveAt(box.SelectedIndex); SaveList("items", items); Refresh_();
    }

    private void Refresh_()
    {
        box.Items.Clear();
        foreach (var t in items) box.Items.Add(t);
    }`;
function firstPrompt(name,desc){ return `Название программы: «${name}».\nЧто должна уметь программа (описание пользователя):\n${desc}\n\nПример правильного ответа (другая программа, только для формы):\n===CSHARP===\n${EXAMPLE}\n===КОНЕЦ===\n\nНапиши тело класса AppForm для «${name}» целиком.` }
const numbered=t=>String(t).split('\n').map((l,i)=>String(i+1).padStart(3)+'| '+l).join('\n');
function fixPrompt(name,cur,errs){ return `Программа «${name}». Компилятор C# нашёл ошибки (номера строк — внутри тела AppForm):\n${errs.map(e=>'- '+e).join('\n')}\n\nТекущий код (с номерами строк):\n${numbered(cur)}\n\nИсправь ошибки и пришли тело класса AppForm ЦЕЛИКОМ в формате ===CSHARP=== … ===КОНЕЦ===.` }
function changePrompt(name,cur,desc){ return `Программа «${name}». Текущий код тела AppForm:\n===CSHARP===\n${cur}\n===КОНЕЦ===\n\nИзмени по просьбе пользователя: ${desc}\nПришли тело класса AppForm ЦЕЛИКОМ в том же формате.` }
function balance(code){ let d=0,inS=false,q='',lastTop=-1,pos=0; for(const l of String(code).split('\n')){ let k=0; while(k<l.length){ const ch=l[k]; if(inS){ if(ch==='\\'){k+=2;continue} if(ch===q) inS=false; k++; continue } if(ch==='/'&&l[k+1]==='/') break; if(ch==='"'||ch==="'"){ inS=true; q=ch; k++; continue } if(ch==='{') d++; else if(ch==='}') d--; k++ } if(d===0) lastTop=pos+l.length; pos+=l.length+1 }
 if(d<=0) return {close:0,cut:false,code}; const head=lastTop>0?String(code).slice(0,lastTop):''; if(/\bvoid\s+Start\s*\(/.test(head)) return {close:0,cut:true,code:head}; return {close:d,cut:false,code} }
function parseAnswer(a){ let t=String(a||'').replace(/\r/g,''); const fixes=[]; let truncated=!/===\s*(КОНЕЦ|END)\s*===/i.test(t);
 let m=t.match(/===\s*C(?:SHARP|#)\s*===\s*\n([\s\S]*?)(?:\n\s*===\s*(?:КОНЕЦ|END)\s*===|$)/i);
 if(!m){ const f=t.match(/```(?:csharp|cs|c#)?\s*\n([\s\S]*?)(?:```|$)/i); if(f){ m=[0,f[1]]; fixes.push('код был в блоке ``` вместо раздела ===CSHARP===') } }
 if(!m) return {code:'',fixes,truncated,ok:false}; let c=m[1].replace(/^\s*```\w*\s*$/gm,'').replace(/\s+$/,'');
 if(/\[ответ оборван лимитом длины\]/.test(c)){ c=c.replace(/\n*\[ответ оборван лимитом длины\][\s\S]*$/,''); truncated=true }
 if(/^\s*using\s+[\w.]+\s*;/m.test(c)){ c=c.replace(/^\s*using\s+[\w.]+\s*;\s*$/gm,''); fixes.push('убрал лишние using') }
 if(/^\s*namespace\s/m.test(c)){ c=c.replace(/^\s*namespace\s+[\w.]+\s*;\s*$/gm,''); fixes.push('убрал namespace') }
 const cm=c.match(/^\s*(?:public\s+)?(?:partial\s+)?class\s+AppForm\b[^{]*\{\s*\n([\s\S]*)\n\s*\}\s*$/); if(cm){ c=cm[1]; fixes.push('убрал обёртку class AppForm — её пишет студия') }
 if(/\bvoid\s+Refresh\s*\(\s*\)/.test(c)){ c=c.replace(/\bRefresh\s*\(\s*\)/g,'Refresh_()'); fixes.push('Refresh() → Refresh_() (имя занято у Form)') }
 c=c.replace(/^\n+/,''); if(truncated){ const b=balance(c); if(b.cut){ c=b.code; fixes.push('ответ ИИ оборвался — отрезал недописанный метод') } else if(b.close>0){ c+='\n'+'}'.repeat(b.close); fixes.push('закрыл '+b.close+' скобок') } }
 return {code:c,fixes,truncated,ok:/\bvoid\s+Start\s*\(\s*\)/.test(c)} }
const RU=[[/CS0103: The name '(.+?)' does not exist/i,m=>`неизвестное имя «${m[1]}» — такой переменной или метода нет`],[/CS1002: ; expected/i,()=>'не хватает «;» в конце строки'],[/CS1513: } expected/i,()=>'не хватает «}»'],[/CS1514: \{ expected/i,()=>'не хватает «{»'],[/CS1026: \) expected/i,()=>'не хватает «)»'],
 [/CS0029: Cannot implicitly convert type '(.+?)' to '(.+?)'/i,m=>`не тот тип: ${m[1]} нельзя положить в ${m[2]}`],[/CS1503: Argument \d+: cannot convert from '(.+?)' to '(.+?)'/i,m=>`в вызов передано ${m[1]}, а нужно ${m[2]}`],[/CS0266: Cannot implicitly convert type '(.+?)' to '(.+?)'/i,m=>`нужно явное преобразование: ${m[1]} → ${m[2]}`],
 [/CS0019: Operator '(.+?)' cannot be applied/i,m=>`операцию «${m[1]}» нельзя применить к этим значениям`],[/CS0111|CS0102/i,()=>'одно и то же имя объявлено дважды'],[/CS0161/i,()=>'метод должен вернуть значение (return)'],[/CS1061: '(.+?)' does not contain a definition for '(.+?)'/i,m=>`у ${m[1]} нет «${m[2]}»`],[/CS0117: '(.+?)' does not contain a definition for '(.+?)'/i,m=>`у ${m[1]} нет «${m[2]}»`],[/CS0246: The type or namespace name '(.+?)'/i,m=>`неизвестный тип «${m[1]}»`],[/CS0165: Use of unassigned local variable '(.+?)'/i,m=>`переменной «${m[1]}» не задано значение`],[/CS0108|CS0114/i,()=>'имя совпадает с уже существующим у Form — переименуйте']];
function ru(msg){ for(const [re,f] of RU){ const m=String(msg).match(re); if(m) return f(m) } return String(msg) }
function parseErrors(out){ const res=[], seen=new Set(); const re=/^\s*(.+?\.cs)\((\d+),(\d+)\):\s*error\s+(CS\d+):\s*(.+?)(?:\s+\[.*\])?\s*$/gm; let m; const L0=bodyLine0();
 while((m=re.exec(String(out)))){ const k=m[1]+m[2]+m[3]+m[4]; if(seen.has(k)) continue; seen.add(k); const file=m[1].split(/[\\/]/).pop(); const inAI=file===APP_FILE; const msg=m[4]+': '+m[5]; res.push({file,line:inAI?+m[2]-L0+1:+m[2],col:+m[3],msg,ru:ru(msg),inAI}) } return res }
function fmtErrors(errs){ return errs.map(e=>(e.inAI?'строка '+e.line:e.file+', строка '+e.line)+': '+e.ru+(e.ru!==e.msg?' ('+e.msg.slice(0,110)+')':'')) }
function envProblem(out){ const t=String(out||''); if(/NETSDK1045|does not support targeting \.NET 8|requires .NET SDK/i.test(t)) return 'нужен .NET SDK 8 или новее'; if(/NU1101|NU1301|Unable to load the service index|Failed to download package|No such host/i.test(t)) return '.NET не смог скачать нужные части (нет интернета?)'; if(/dotnet.*(not found|не является)/i.test(t)) return 'не найден .NET SDK'; if(/There is not enough space|No space left/i.test(t)) return 'не хватает места на диске'; return null }
const api={MARK,SYS,EXAMPLE,project,appCs,body,APP_FILE,bodyLine0,firstPrompt,fixPrompt,changePrompt,parseAnswer,balance,parseErrors,fmtErrors,envProblem,ru,DEFAULT_BODY,numbered};
if(typeof module!=='undefined') module.exports=api; else root.CsApp=api;
})(typeof window!=='undefined'?window:globalThis);
