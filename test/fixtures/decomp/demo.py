class ОшибкаВвода(Exception):
    def __init__(self, text):
        super().__init__(text)

def fact(n):
    if n <= 1:
        return 1
    return n * fact(n - 1)

s = 0
for i in range(5):
    s += i
print(s)
k = 0
while True:
    k += 2
    if not (k < 5):
        break
print(k)
print(6 & 3, 6 | 1, 6 ^ 3, 1 << 4, 256 >> 2, ~0, 7 // 2)
x = 5
x <<= 1
x |= 1
print(x)
print(fact(5))
print("в поток ошибок")
import sys
print("в поток ошибок", file=sys.stderr)
