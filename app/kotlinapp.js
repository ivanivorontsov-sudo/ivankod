// ИванКод 1.3: простой режим «Kotlin» — настоящее Android-приложение на Kotlin по строгой заготовке.
// ИИ пишет ТОЛЬКО тело класса App (раздел ===KOTLIN===), всё остальное (Gradle, манифест, помощники) — готовое и проверенное.
// Чистые функции: работают и в окне студии, и в Node (тесты).
(function(root){
const AGP='8.7.3', KOTLIN='2.0.21', SDK=35, GRADLE='8.10.2';
const MARK=['//<AI-KOTLIN>','//</AI-KOTLIN>'];
const PKG='ru.ivancode.app';
const IMPORTS=['android.app.*','android.content.*','android.graphics.*','android.os.*','android.text.*','android.view.*','android.widget.*','org.json.*','java.util.*','kotlin.math.*'];
const HEAD=`package ${PKG}\n\n${IMPORTS.map(i=>'import '+i).join('\n')}\n\n// Эту строку и всё, что вне раздела ИИ, студия пишет сама\nclass App(a: MainActivity) : Ui(a) {\n${MARK[0]}\n`;
const TAIL=`\n${MARK[1]}\n}\n`;
const HELPERS=`package ${PKG}

import android.app.*
import android.content.*
import android.graphics.*
import android.graphics.drawable.GradientDrawable
import android.text.InputType
import android.view.*
import android.widget.*
import org.json.JSONArray
import java.text.SimpleDateFormat
import java.util.*

// Готовые помощники студии ИванКод. ИИ ими пользуется, но не меняет этот файл.
open class Ui(val a: MainActivity) {
    val accent = Color.parseColor("#4F6BED")
    fun dp(v: Int): Int = (v * a.resources.displayMetrics.density).toInt()
    private val prefs = a.getSharedPreferences("data", Context.MODE_PRIVATE)

    // в column/row можно передать View, текст (станет подписью) или число (станет отступом в dp) — так меньше ошибок
    fun space(size: Int = 12): View = View(a).apply { minimumHeight = dp(size); minimumWidth = dp(size) }
    fun view(x: Any?): View = when (x) { is View -> x; is Int -> space(x); null -> space(0); else -> label(x.toString()) }
    fun column(vararg v: Any?): LinearLayout = LinearLayout(a).apply { orientation = LinearLayout.VERTICAL; v.forEach { addView(view(it)) } }
    fun row(vararg v: Any?): LinearLayout = LinearLayout(a).apply { orientation = LinearLayout.HORIZONTAL; gravity = Gravity.CENTER_VERTICAL; v.forEach { val w = view(it); if (it is Int) addView(w) else addView(w, LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f).apply { setMargins(dp(4), dp(4), dp(4), dp(4)) }) } }
    fun title(t: String): TextView = TextView(a).apply { text = t; textSize = 22f; setTypeface(typeface, Typeface.BOLD); setPadding(dp(4), dp(8), dp(4), dp(8)) }
    fun label(t: String): TextView = TextView(a).apply { text = t; textSize = 16f; setPadding(dp(4), dp(4), dp(4), dp(4)) }
    fun button(t: String, onClick: () -> Unit): Button = Button(a).apply { text = t; isAllCaps = false; setOnClickListener { try { onClick() } catch (e: Exception) { toast("Ошибка: " + (e.message ?: e.toString())) } } }
    fun input(hint: String, number: Boolean = false): EditText = EditText(a).apply { this.hint = hint; inputType = if (number) InputType.TYPE_CLASS_NUMBER or InputType.TYPE_NUMBER_FLAG_DECIMAL else InputType.TYPE_CLASS_TEXT }
    fun card(vararg v: Any?): LinearLayout = column(*v).apply { setPadding(dp(14), dp(12), dp(14), dp(12)); background = GradientDrawable().apply { cornerRadius = dp(14).toFloat(); setColor(Color.WHITE) }; elevation = dp(2).toFloat(); layoutParams = LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT).apply { setMargins(0, dp(6), 0, dp(6)) } }
    fun list(): LinearLayout = column()
    fun toast(t: String) { Toast.makeText(a, t, Toast.LENGTH_SHORT).show() }
    fun confirm(question: String, onYes: () -> Unit) { AlertDialog.Builder(a).setMessage(question).setPositiveButton("Да") { _, _ -> onYes() }.setNegativeButton("Нет", null).show() }
    fun save(key: String, value: String) { prefs.edit().putString(key, value).apply() }
    fun load(key: String, default: String = ""): String = prefs.getString(key, default) ?: default
    fun saveList(key: String, items: List<String>) { save(key, JSONArray(items).toString()) }
    fun loadList(key: String): MutableList<String> { val out = mutableListOf<String>(); try { val j = JSONArray(load(key, "[]")); for (i in 0 until j.length()) out.add(j.getString(i)) } catch (e: Exception) {}; return out }
    fun money(v: Double): String = String.format(Locale("ru"), "%,.2f ₽", v)
    fun today(): String = SimpleDateFormat("dd.MM.yyyy", Locale("ru")).format(Date())
    fun num(t: String): Double = t.replace(',', '.').trim().toDoubleOrNull() ?: 0.0
}
`;
const MAIN=`package ${PKG}

import android.app.Activity
import android.graphics.Color
import android.os.Bundle
import android.widget.ScrollView
import android.widget.TextView

class MainActivity : Activity() {
    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        val scroll = ScrollView(this)
        scroll.setBackgroundColor(Color.parseColor("#F4F6FB"))
        try {
            val v = App(this).start()
            v.setPadding(32, 32, 32, 32)
            scroll.addView(v)
        } catch (e: Exception) {
            scroll.addView(TextView(this).apply { text = "Ошибка при запуске: " + e; textSize = 16f; setPadding(32, 32, 32, 32) })
        }
        setContentView(scroll)
    }
}
`;
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,"\\'") }
/** файлы проекта Gradle: {путь: текст} */
function project(name,body,o={}){ const vc=o.versionCode||1;
 return {
 'settings.gradle.kts':`pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }\ndependencyResolutionManagement { repositories { google(); mavenCentral() } }\nrootProject.name = "app"\ninclude(":app")\n`,
 'build.gradle.kts':`plugins {\n    id("com.android.application") version "${AGP}" apply false\n    id("org.jetbrains.kotlin.android") version "${KOTLIN}" apply false\n}\n`,
 'gradle.properties':`org.gradle.jvmargs=-Xmx1536m -Dfile.encoding=UTF-8\norg.gradle.daemon=true\norg.gradle.caching=true\norg.gradle.configuration-cache=true\nandroid.useAndroidX=false\nkotlin.incremental=true\nkotlin.daemon.jvmargs=-Xmx1024m\n`,
 'app/build.gradle.kts':`plugins {\n    id("com.android.application")\n    id("org.jetbrains.kotlin.android")\n}\nandroid {\n    namespace = "${PKG}"\n    compileSdk = ${SDK}\n    defaultConfig {\n        applicationId = "${o.appId||PKG}"\n        minSdk = 24\n        targetSdk = ${SDK}\n        versionCode = ${vc}\n        versionName = "1.0"\n    }\n    buildTypes { getByName("debug") { isMinifyEnabled = false } }\n    compileOptions { sourceCompatibility = JavaVersion.VERSION_17; targetCompatibility = JavaVersion.VERSION_17 }\n    kotlinOptions { jvmTarget = "17" }\n    lint { checkReleaseBuilds = false; abortOnError = false }\n}\n`,
 'app/src/main/AndroidManifest.xml':`<?xml version="1.0" encoding="utf-8"?>\n<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n    <application android:label="${esc(name)}" android:icon="${o.icon?'@mipmap/ic_launcher':'@android:drawable/sym_def_app_icon'}" android:theme="@android:style/Theme.Material.Light.DarkActionBar">\n        <activity android:name=".MainActivity" android:exported="true">\n            <intent-filter>\n                <action android:name="android.intent.action.MAIN" />\n                <category android:name="android.intent.category.LAUNCHER" />\n            </intent-filter>\n        </activity>\n    </application>\n</manifest>\n`,
 'app/src/main/java/ru/ivancode/app/MainActivity.kt':MAIN,
 'app/src/main/java/ru/ivancode/app/Ui.kt':HELPERS,
 'app/src/main/java/ru/ivancode/app/App.kt':appKt(body),
 '.gitignore':'.gradle/\nbuild/\napp/build/\nlocal.properties\n' } }
const DEFAULT_BODY=`    fun start(): View {\n        return column(title("Моя программа"), label("Здесь будет программа"))\n    }`;
function appKt(body){ return HEAD+String(body||DEFAULT_BODY).replace(/\s+$/,'')+TAIL }
const APP_FILE='app/src/main/java/ru/ivancode/app/App.kt';
const bodyLine0=()=>HEAD.split('\n').length; // строка файла App.kt, где начинается 1-я строка кода ИИ
function body(appText){ const t=String(appText||''); const i=t.indexOf(MARK[0]), j=t.indexOf(MARK[1]); return i<0||j<0?'':t.slice(i+MARK[0].length+1,j).replace(/\s+$/,'') }

const SYS=`Ты пишешь Android-приложение на Kotlin для студии ИванКод. Пользователь — новичок, поэтому код должен быть простым и понятным, с короткими комментариями на русском.
Студия уже сделала проект: Gradle, манифест, MainActivity и класс-помощник Ui. Ты пишешь ТОЛЬКО тело класса App (он наследует Ui). Не пиши package, import, class App, MainActivity и Gradle — их добавит студия.
Уже подключены: ${IMPORTS.join(', ')}.

Обязательно: функция \`fun start(): View\` — она возвращает весь экран приложения (обычно column(...)).
Готовые помощники (пользуйся ими, НЕ объявляй их заново):
- column(...): LinearLayout — вертикально; row(...): LinearLayout — в строку. В них передавай View; число = отступ в dp (space), текст = подпись
- space(size: Int = 12): View — пустой отступ
- title(t: String): TextView, label(t: String): TextView
- button(t: String) { действие }: Button — ошибки внутри действия ловятся сами
- input(hint: String, number: Boolean = false): EditText
- card(...): LinearLayout — белая карточка; list(): LinearLayout — пустой список для элементов
- toast(t: String), confirm(вопрос: String) { при «Да» }
- save(key, value: String), load(key, default = ""): String, saveList(key, List<String>), loadList(key): MutableList<String> — данные сохраняются между запусками
- money(v: Double): String — ТОЛЬКО для денег (пишет «₽»), для остальных чисел — обычный текст, today(): String, num(t: String): Double (безопасно превращает текст в число, «1,5» → 1.5)
- dp(v: Int): Int, accent: Int (цвет), a: MainActivity (это Activity, Context)

Правила:
- Только стандартный Android (android.widget), никаких AndroidX, Compose, библиотек, XML-разметки, ресурсов R.*, разрешений и интернета.
- Поля класса объявляй как private val/var в теле App. Списки на экране перерисовывай функцией (например refresh()), очищая контейнер removeAllViews().
- Поля-View (label, input, button, list) объявляй в теле класса и используй их; функции, которые меняют экран, вызывают refresh().
- Никаких !! и lateinit. Пиши корректный Kotlin ${KOTLIN}: все скобки закрыты, у всех веток when есть else.
- Текст интерфейса — по-русски.

Формат ответа СТРОГО такой, без пояснений до и после:
===KOTLIN===
(тело класса App)
===КОНЕЦ===`;
const EXAMPLE=`    // Список дел: добавить, отметить, удалить
    private val items = loadList("items")
    private val box = list()
    private val field = input("Новое дело")

    fun start(): View {
        refresh()
        return column(title("Мои дела"), card(row(field, button("Добавить") { add() })), box)
    }

    private fun add() {
        val t = field.text.toString().trim()
        if (t.isEmpty()) { toast("Введите дело"); return }
        items.add(t); saveList("items", items); field.setText(""); refresh()
    }

    private fun refresh() {
        box.removeAllViews()
        if (items.isEmpty()) box.addView(label("Пока пусто"))
        for ((i, t) in items.withIndex()) {
            box.addView(card(row(label(t), button("Удалить") { items.removeAt(i); saveList("items", items); refresh() })))
        }
    }`;
function firstPrompt(name,desc){ return `Название приложения: «${name}».\nЧто должно уметь приложение (описание пользователя):\n${desc}\n\nПример правильного ответа (другое приложение, только для формы):\n===KOTLIN===\n${EXAMPLE}\n===КОНЕЦ===\n\nНапиши тело класса App для «${name}» целиком.` }
function fixPrompt(name,cur,errs){ return `Приложение «${name}». Компилятор Kotlin нашёл ошибки в твоём коде (номера строк — внутри тела App):\n${errs.map(e=>'- '+e).join('\n')}\n\nТекущий код (с номерами строк):\n${numbered(cur)}\n\nИсправь ошибки и пришли тело класса App ЦЕЛИКОМ в том же формате ===KOTLIN=== … ===КОНЕЦ===.` }
function changePrompt(name,cur,desc){ return `Приложение «${name}». Текущий код тела App:\n===KOTLIN===\n${cur}\n===КОНЕЦ===\n\nИзмени по просьбе пользователя: ${desc}\nПришли тело класса App ЦЕЛИКОМ в том же формате.` }
function numbered(t){ return String(t).split('\n').map((l,i)=>String(i+1).padStart(3)+'| '+l).join('\n') }
// разбор ответа ИИ: вырезает раздел, убирает лишнее (package/import/class App), чинит обрыв
function parseAnswer(a){ let t=String(a||'').replace(/\r/g,''); const fixes=[]; let truncated=false;
 let m=t.match(/===\s*KOTLIN\s*===\s*\n([\s\S]*?)(?:\n\s*===\s*(?:КОНЕЦ|END)\s*===|$)/i);
 if(!m){ const f=t.match(/```(?:kotlin|kt)?\s*\n([\s\S]*?)(?:```|$)/i); if(f){ m=[0,f[1]]; fixes.push('код был в блоке ``` вместо раздела ===KOTLIN===') } }
 if(!m) return {code:'',fixes,truncated,ok:false};
 let c=m[1].replace(/^\s*```(?:kotlin|kt)?\s*$/gim,'').replace(/\s+$/,'');
 if(!/===\s*(КОНЕЦ|END)\s*===/i.test(t)){ truncated=true }
 if(/\[ответ оборван лимитом длины\]/.test(c)){ c=c.replace(/\n*\[ответ оборван лимитом длины\][\s\S]*$/,''); truncated=true }
 if(/^\s*package\s/m.test(c)){ c=c.replace(/^\s*package\s.*$/gm,''); fixes.push('убрал лишний package') }
 if(/^\s*import\s/m.test(c)){ c=c.replace(/^\s*import\s.*$/gm,''); fixes.push('убрал лишние import (всё уже подключено)') }
 // ИИ прислал «class App(...) : Ui(a) { … }» целиком — беру тело
 const cm=c.match(/^\s*class\s+App\b[^{]*\{\s*\n([\s\S]*)\n\s*\}\s*$/);
 if(cm){ c=cm[1]; fixes.push('убрал обёртку class App — её пишет студия') }
 c=c.replace(/\bpublic\s+override\s+fun\s+start/g,'fun start').replace(/^\n+/,'');
 if(truncated){ const b=balance(c); if(b.cut){ c=b.code; fixes.push('ответ ИИ оборвался — отрезал недописанную функцию') } else if(b.close>0){ c=c+'\n'+'}'.repeat(b.close); fixes.push('закрыл '+b.close+' незакрытых скобок') } }
 return {code:c,fixes,truncated,ok:/\bfun\s+start\s*\(\s*\)\s*:\s*View\b/.test(c)} }
// баланс фигурных скобок без учёта строк и комментариев; при обрыве отрезаю последнюю недописанную функцию верхнего уровня
function balance(code){ let d=0, inS=false, q='', lastTop=-1; const lines=String(code).split('\n'); let pos=0;
 for(const l of lines){ let k=0; while(k<l.length){ const ch=l[k];
   if(inS){ if(ch==='\\'){k+=2;continue} if(ch===q) inS=false; k++; continue }
   if(ch==='/'&&l[k+1]==='/') break; if(ch==='"'||ch==="'"){ inS=true; q=ch; k++; continue }
   if(ch==='{') d++; else if(ch==='}') d--; k++ }
  if(d===0) lastTop=pos+l.length; pos+=l.length+1 }
 if(d<=0) return {close:0,cut:false,code};
 // глубина >0: если до обрыва были законченные функции и есть fun start — отрезаю хвост
 const head=lastTop>0?String(code).slice(0,lastTop):''; if(/\bfun\s+start\s*\(/.test(head)) return {close:0,cut:true,code:head};
 return {close:d,cut:false,code} }
// ошибки компилятора → понятный русский текст с номером строки внутри кода ИИ
const RU=[[/Unresolved reference:?\s*'?([^'\s.]+)'?/i,(m)=>`неизвестное имя «${m[1]}» — такой переменной или функции нет (опечатка или забыли объявить)`],
 [/Type mismatch:?\s*inferred type is (.+?) but (.+?) was expected/i,m=>`не тот тип: получилось ${m[1]}, а нужно ${m[2]}`],
 [/(?:Argument type mismatch|Type mismatch):?.*actual type is '?(.+?)'?, but '?(.+?)'? was expected/i,m=>`не тот тип: получилось ${m[1]}, а нужно ${m[2]}`],
 [/Expecting '(.+?)'/i,m=>`здесь не хватает «${m[1]}»`],[/Expecting (an? .+)/i,m=>`здесь ожидалось: ${m[1]}`],
 [/Conflicting declarations?|Redeclaration|Conflicting overloads/i,()=>'одно и то же имя объявлено дважды'],
 [/Val cannot be reassigned/i,()=>'значение val нельзя менять — объявите его как var'],
 [/'when' expression must be exhaustive/i,()=>'у when не хватает ветки else'],
 [/Only safe \(\?\.\) or non-null asserted/i,()=>'значение может быть пустым (null) — используйте ?. или ?: '],
 [/No value passed for parameter '?(\w+)'?/i,m=>`при вызове не передано значение «${m[1]}»`],
 [/Too many arguments/i,()=>'передано слишком много значений в вызов функции'],
 [/None of the following (?:functions|candidates) can be called/i,()=>'функцию вызвали с неподходящими значениями'],
 [/Missing return|A 'return' expression required/i,()=>'функция должна вернуть значение (return)'],
 [/Unresolved reference/i,()=>'неизвестное имя']];
function ru(msg){ for(const [re,f] of RU){ const m=String(msg).match(re); if(m) return f(m) } return String(msg) }
/** разбор вывода gradle/kotlinc. Возвращает [{line,col,msg,ru,inAI}] */
function parseErrors(out){ const res=[]; const re=/^e:\s+(?:file:\/\/)?(.+?\.kt):(\d+):(\d+)\s+(.+)$/gm; let m; const L0=bodyLine0();
 while((m=re.exec(String(out)))){ const file=m[1].replace(/\\/g,'/'), ln=+m[2]; const inAI=/\/App\.kt$/.test(file); const line=inAI?ln-L0+1:ln; res.push({file:file.split('/').pop(),line,col:+m[3],msg:m[4].trim(),ru:ru(m[4]),inAI}) }
 // старый формат kotlinc: e: C:\...\App.kt: (12, 5): ...
 const re2=/^e:\s+(.+?\.kt):\s*\((\d+),\s*(\d+)\):\s*(.+)$/gm; while((m=re2.exec(String(out)))){ const inAI=/App\.kt$/.test(m[1]); res.push({file:m[1].split(/[\\/]/).pop(),line:inAI?+m[2]-L0+1:+m[2],col:+m[3],msg:m[4].trim(),ru:ru(m[4]),inAI}) }
 return res }
function fmtErrors(errs){ return errs.map(e=>(e.inAI?'строка '+e.line:e.file+', строка '+e.line)+': '+e.ru+(e.ru!==e.msg?' ('+e.msg.slice(0,120)+')':'')) }
// проблема окружения (не программы): отдавать ИИ бессмысленно
function envProblem(out){ const t=String(out||'');
 if(/SDK location not found|ANDROID_HOME|sdk\.dir/i.test(t)) return 'не найден Android SDK';
 if(/JAVA_HOME|Unsupported class file major version|requires Java 1[7-9]|Android Gradle plugin requires Java/i.test(t)) return 'не подходит или не найден JDK 17+';
 if(/Could not resolve|Could not GET|UnknownHostException|Connection refused|Read timed out|No cached version .* offline/i.test(t)) return 'Gradle не смог скачать нужные части (нет интернета?)';
 if(/Failed to install the following|licen[cs]es? .*not .*accepted/i.test(t)) return 'не приняты лицензии Android SDK или не хватает его частей';
 if(/OutOfMemoryError|Java heap space/i.test(t)) return 'Gradle не хватило памяти';
 return null }
const api={AGP,KOTLIN,SDK,GRADLE,MARK,PKG,SYS,EXAMPLE,project,appKt,body,APP_FILE,bodyLine0,firstPrompt,fixPrompt,changePrompt,parseAnswer,balance,parseErrors,fmtErrors,envProblem,ru,DEFAULT_BODY};
if(typeof module!=='undefined') module.exports=api; else root.KtApp=api;
})(typeof window!=='undefined'?window:globalThis);
