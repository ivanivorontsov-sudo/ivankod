interface Фигура { double площадь(); }
enum Цвет { КРАСНЫЙ, ЗЕЛЁНЫЙ }
class ОшибкаВвода extends Exception {
  ОшибкаВвода(String t) { super(t); }
}
class Основа implements Фигура {
  static int создано = 0;
  private int тайна = 7;
  String имя;
  Основа(String имя) { super(); this.имя = имя; создано++; }
  static int сколько() { return создано; }
  public double площадь() { return 0; }
  int секрет() { return тайна; }
}
class Квадрат extends Основа {
  int сторона;
  Квадрат(int сторона) { super("квадрат"); this.сторона = сторона; }
  public double площадь() { return сторона * сторона; }
}
public class Demo {
  static int fact(int n) {
    if (n <= 1) return 1;
    return n * fact(n - 1);
  }
  public static void main(String[] args) {
    int s = 0;
    for (int i = 0; i < 5; i++) s += i;
    System.out.println(s);
    int k = 0;
    do { k += 2; } while (k < 5);
    System.out.println(k);
    switch (k) {
      case 6: System.out.println("шесть"); break;
      default: System.out.println("другое");
    }
    System.out.println(6 & 3);
    System.out.println(6 | 1);
    System.out.println(6 ^ 3);
    System.out.println(1 << 4);
    System.out.println(256 >> 2);
    System.out.println(~0);
    System.out.println(7 / 2);
    int x = 5;
    x <<= 1;
    x |= 1;
    System.out.println(x);
    Квадрат кв = new Квадрат(3);
    System.out.println(кв.площадь());
    System.out.println(Основа.сколько());
    System.out.println(кв instanceof Основа);
    String t = "Привет";
    System.out.println(t.toUpperCase());
    System.out.println(t.substring(0, 3));
    System.out.println(t.charAt(1));
    System.out.println(t.length());
    System.out.println(t.contains("ри"));
    java.util.ArrayList<Integer> xs = new java.util.ArrayList<Integer>();
    xs.add(10); xs.add(20);
    System.out.println(xs.size());
    System.out.println(xs.get(1));
    System.out.println(xs.contains(10));
    java.util.HashMap<String,Integer> m = new java.util.HashMap<String,Integer>();
    m.put("a", 1);
    System.out.println(m.get("a"));
    System.out.println(m.containsKey("a"));
    try {
      if (x < 0) throw new ОшибкаВвода("отрицательное");
      System.out.println("ок");
    } catch (ОшибкаВвода e) {
      System.out.println("ввод");
    } catch (Exception e) {
      System.out.println("ошибка");
    } finally {
      System.out.println("конец");
    }
    System.err.println("в поток ошибок");
    int[] arr = new int[]{1, 2, 3};
    int sum = 0;
    for (int v : arr) sum += v;
    System.out.println(sum);
    assert x > 0 : "должно быть";
    Цвет c = Цвет.КРАСНЫЙ;
    switch (c) {
      case КРАСНЫЙ: System.out.println("красн"); break;
      default: System.out.println("др");
    }
    System.out.println(fact(5));
    System.out.println(String.format("число %d", 9));
  }
}
