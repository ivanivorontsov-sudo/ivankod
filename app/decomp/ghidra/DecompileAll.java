// ИванКод: скрипт для Ghidra (headless) — выгружает псевдокод C всех функций в файл. Программа не запускается, только анализируется.
import ghidra.app.script.GhidraScript;
import ghidra.app.decompiler.*;
import ghidra.program.model.listing.*;
import java.io.*;
public class DecompileAll extends GhidraScript {
  @Override public void run() throws Exception {
    String[] a = getScriptArgs();
    File out = new File(a.length > 0 ? a[0] : "decompiled.c");
    int max = a.length > 1 ? Integer.parseInt(a[1]) : 400;
    DecompInterface d = new DecompInterface();
    d.openProgram(currentProgram);
    try (PrintWriter w = new PrintWriter(new OutputStreamWriter(new FileOutputStream(out), "UTF-8"))) {
      int n = 0;
      for (Function f : currentProgram.getFunctionManager().getFunctions(true)) {
        if (monitor.isCancelled() || n >= max) break;
        if (f.isExternal() || f.isThunk()) continue;
        DecompileResults r = d.decompileFunction(f, 30, monitor);
        if (r != null && r.decompileCompleted()) { w.println(r.getDecompiledFunction().getC()); n++; }
      }
    }
    d.dispose();
  }
}
