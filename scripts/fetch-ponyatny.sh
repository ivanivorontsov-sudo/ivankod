#!/usr/bin/env bash
# Скачивает встроенный компилятор «Понятный» 2.3.0-beta.1 в bin/ (в git не хранится — 170 МБ) и сверяет SHA256
set -euo pipefail; cd "$(dirname "$0")/.."; mkdir -p bin; cd bin
gh release download v2.3.0 -R ivanivorontsov-sudo/ponyatny --clobber -p 'ponyatny*' -p SHA256SUMS.txt
sha256sum -c SHA256SUMS.txt && chmod +x ponyatny-linux
