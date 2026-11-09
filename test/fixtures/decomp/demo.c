#include <stdio.h>
#include <stdlib.h>
#define N 5
struct Точка { int x; int y; };
typedef struct { double r; } Круг;
enum Цвет { КРАСНЫЙ, ЗЕЛЁНЫЙ = 5 };
int fact(int n){ if(n<=1) return 1; return n*fact(n-1); }
int main(void){
  int s = 0;
  int i;
  for(i=0;i<N;i++) s += i;
  printf("%d\n", s);
  int k = 0;
  do { k += 2; } while (k < 5);
  printf("%d\n", k);
  int a[3] = {1, 2, 3};
  switch(k){
    case 6: puts("шесть"); break;
    default: puts("другое");
  }
  printf("%d\n", 6 & 3);
  printf("%d\n", 6 | 1);
  printf("%d\n", 6 ^ 3);
  printf("%d\n", 1 << 4);
  printf("%d\n", 256 >> 2);
  printf("%d\n", ~0);
  printf("%d\n", 7 / 2);
  int x = 5;
  x <<= 1;
  x |= 1;
  printf("%d\n", x);
  struct Точка p;
  p.x = 3; p.y = 4;
  printf("%d\n", p.x + p.y);
  Круг c; c.r = 2;
  printf("%g\n", c.r);
  int col = КРАСНЫЙ;
  switch(col){
    case КРАСНЫЙ: puts("красн"); break;
    case ЗЕЛЁНЫЙ: puts("зел"); break;
  }
  fprintf(stderr, "в поток ошибок\n");
  int sum = 0;
  for(i=0;i<3;i++) sum += a[i];
  printf("%d\n", sum);
  printf("%d\n", fact(5));
  return 0;
}
