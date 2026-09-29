#!/usr/bin/env bash
# Downloads the vendored font files from @fontsource (pinned versions).
set -euo pipefail
cd "$(dirname "$0")/../src/fonts"

FIGTREE=https://cdn.jsdelivr.net/npm/@fontsource/figtree@5.3.0
MAPLE=https://cdn.jsdelivr.net/npm/@fontsource/maple-mono@5.3.0

for subset in latin latin-ext; do
  for w in 400-normal 500-normal 600-normal 700-normal 400-italic; do
    curl -fsSLO "$FIGTREE/files/figtree-$subset-$w.woff2"
  done
done
for w in 400-normal 500-normal 400-italic; do
  curl -fsSLO "$MAPLE/files/maple-mono-latin-$w.woff2"
done

curl -fsSL "$FIGTREE/LICENSE" -o OFL-figtree.txt
curl -fsSL "$MAPLE/LICENSE" -o OFL-maple-mono.txt
