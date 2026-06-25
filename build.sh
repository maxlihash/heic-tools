#!/bin/bash
# Cloudflare Pages build — inject ?v=<commit_sha> into static asset URLs
# Turns styles.css → styles.css?v=abc1234 — browser treats as new resource each deploy
set -e

HASH="${CF_PAGES_COMMIT_SHA:-$(git rev-parse --short HEAD)}"
HASH="${HASH:0:7}"

echo "→ Cache bust with ?v=$HASH"

# macOS sed needs '' backup extension, Linux doesn't
SEDOPTS=(-i)
[ "$(uname)" = "Darwin" ] && SEDOPTS=(-i '')

for f in *.html; do
  [ -f "$f" ] || continue
  sed "${SEDOPTS[@]}" "s|href=\"/assets/\([^\"]*\.css\)\"|href=\"/assets/\1?v=${HASH}\"|g" "$f"
  sed "${SEDOPTS[@]}" "s|src=\"/assets/\([^\"]*\.js\)\"|src=\"/assets/\1?v=${HASH}\"|g" "$f"
  sed "${SEDOPTS[@]}" "s|href=\"/assets/\([^\"]*\.css\) |href=\"/assets/\1?v=${HASH} |g" "$f"
  sed "${SEDOPTS[@]}" "s|href=\"/manifest\.json\"|href=\"/manifest.json?v=${HASH}\"|g" "$f"
done

echo "✓ Done"
