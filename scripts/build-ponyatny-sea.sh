#!/usr/bin/env bash
set -euo pipefail
OUT="${1:?}"
SRC="${2:?}"
NODE_VER="${NODE_VER:-v20.19.2}"
FUSE=NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
case "$(uname -s)-$(uname -m)" in
  Linux-x86_64) plat=linux-x64 ;;
  Linux-aarch64) plat=linux-arm64 ;;
  Darwin-arm64) plat=darwin-arm64 ;;
  Darwin-x86_64) plat=darwin-x64 ;;
  *) echo "unsupported $(uname -s) $(uname -m)" >&2; exit 1 ;;
esac
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
curl -fsSL "https://nodejs.org/dist/${NODE_VER}/SHASUMS256.txt" -o "$tmp/SHASUMS256.txt"
tarname="node-${NODE_VER}-${plat}.tar.gz"
curl -fsSL "https://nodejs.org/dist/${NODE_VER}/${tarname}" -o "$tmp/$tarname"
if command -v sha256sum >/dev/null 2>&1; then
  (cd "$tmp" && grep " ${tarname}$" SHASUMS256.txt | sha256sum -c -)
else
  (cd "$tmp" && grep " ${tarname}$" SHASUMS256.txt | shasum -a 256 -c -)
fi
tar -xzf "$tmp/$tarname" -C "$tmp"
NODE_DIR="$tmp/node-${NODE_VER}-${plat}"
(cd "$SRC" && node scripts/gen-std.js && node scripts/gen-licenzii.js)
if ! command -v bun >/dev/null 2>&1; then
  curl -fsSL https://bun.sh/install | bash
  export PATH="${HOME}/.bun/bin:${PATH}"
fi
(cd "$SRC" && bun build src/cli.js --target=node --format=cjs --minify-whitespace --minify-syntax --outfile "$tmp/ponyatny-bundle.js")
printf '%s\n' '{"main":"ponyatny-bundle.js","output":"sea.blob","disableExperimentalSEAWarning":true,"useCodeCache":false}' > "$tmp/sea-config.json"
(cd "$tmp" && "$NODE_DIR/bin/node" --experimental-sea-config sea-config.json)
mkdir -p "$(dirname "$OUT")"
cp "$NODE_DIR/bin/node" "$OUT"
if [ "$(uname -s)" = Darwin ]; then
  npx --yes postject@1.0.0-alpha.6 "$OUT" NODE_SEA_BLOB "$tmp/sea.blob" --sentinel-fuse "$FUSE" --macho-segment-name NODE_SEA
else
  npx --yes postject@1.0.0-alpha.6 "$OUT" NODE_SEA_BLOB "$tmp/sea.blob" --sentinel-fuse "$FUSE"
fi
chmod +x "$OUT"
if [ "$(uname -s)" = Darwin ]; then
  codesign --sign - --force "$OUT"
fi
"$OUT" версия
