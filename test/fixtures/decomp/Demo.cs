interface IФигура { double Площадь(); }
enum Цвет { Красный, Зелёный = 5 }
class ОшибкаВвода : Exception {
  public ОшибкаВвода(string t) : base(t) { }
}
class Основа : IФигура {
  public static int Создано = 0;
  private int тайна = 7;
  public string Имя;
  public Основа(string имя) { Имя = имя; Создано++; }
  public static int Сколько() { return Создано; }
  public virtual double Площадь() { return 0; }
  public int Секрет() { return тайна; }
}
class Квадрат : Основа {
  public int Сторона;
  public Квадрат(int сторона) : base("квадрат") { Сторона = сторона; }
  public override double Площадь() { return Сторона * Сторона; }
}
class Demo {
  static int Fact(int n) {
    if (n <= 1) return 1;
    return n * Fact(n - 1);
  }
  static void Main() {
    int s = 0;
    for (int i = 0; i < 5; i++) s += i;
    System.Console.WriteLine(s);
    int k = 0;
    do { k += 2; } while (k < 5);
    Console.WriteLine(k);
    switch (k) {
      case 6: Console.WriteLine("шесть"); break;
      default: Console.WriteLine("другое");
    }
    Console.WriteLine(6 & 3);
    Console.WriteLine(6 | 1);
    Console.WriteLine(6 ^ 3);
    Console.WriteLine(1 << 4);
    Console.WriteLine(256 >> 2);
    Console.WriteLine(~0);
    Console.WriteLine(7 / 2);
    int x = 5;
    x <<= 1;
    x |= 1;
    Console.WriteLine(x);
    var кв = new Квадрат(3);
    Console.WriteLine(кв.Площадь());
    Console.WriteLine(Основа.Сколько());
    Console.WriteLine(кв is Основа);
    string t = "Привет";
    Console.WriteLine(t.ToUpper());
    Console.WriteLine(t.Substring(0, 3));
    Console.WriteLine(t[1]);
    Console.WriteLine(t.Length);
    Console.WriteLine(t.Contains("ри"));
    var xs = new System.Collections.Generic.List<int>();
    xs.Add(10); xs.Add(20);
    Console.WriteLine(xs.Count);
    Console.WriteLine(xs[1]);
    Console.WriteLine(xs.Contains(10));
    var m = new System.Collections.Generic.Dictionary<string,int>();
    m["a"] = 1;
    Console.WriteLine(m["a"]);
    Console.WriteLine(m.ContainsKey("a"));
    try {
      if (x < 0) throw new ОшибкаВвода("отрицательное");
      Console.WriteLine("ок");
    } catch (ОшибкаВвода e) {
      Console.WriteLine("ввод");
    } catch {
      Console.WriteLine("ошибка");
    } finally {
      Console.WriteLine("конец");
    }
    Console.Error.WriteLine("в поток ошибок");
    int[] arr = new int[]{1, 2, 3};
    int sum = 0;
    foreach (int v in arr) sum += v;
    Console.WriteLine(sum);
    Цвет c = Цвет.Красный;
    switch (c) {
      case Цвет.Красный: Console.WriteLine("красн"); break;
      default: Console.WriteLine("др");
    }
    Console.WriteLine(Fact(5));
    string имя = "Иван";
    Console.WriteLine($"привет {имя}");
  }
}
