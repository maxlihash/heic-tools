#!/bin/bash
# Replace placeholder domain with real domain + email
# Usage: ./set-domain.sh https://example.com hello@example.com
set -e

DOMAIN="${1:?Usage: ./set-domain.sh https://example.com hello@example.com}"
EMAIL="${2:-hello@example.com}"

echo "→ Setting domain to $DOMAIN, email to $EMAIL"

find . -type f \( -name '*.html' -o -name '*.xml' -o -name '*.json' -o -name '*.md' -o -name '*.txt' \) \
  -exec sed -i '' \
    -e "s|https://example\.com|${DOMAIN}|g" \
    -e "s|hello@example\.com|${EMAIL}|g" \
    {} +

echo "✓ Done — verify with: grep -r 'example.com' ."
