#!/usr/bin/env bash
# Fails CI if a Claude API-Key-Muster im gebauten Web-Bundle gefunden wird.
# Ausführen nach `expo export --platform web` (Output in dist/).
set -euo pipefail
BUNDLE_DIR="${1:-app/dist}"
if [ ! -d "$BUNDLE_DIR" ]; then
  echo "Bundle dir '$BUNDLE_DIR' nicht gefunden" >&2
  exit 2
fi
PATTERNS=(
  "sk-ant-"              # Claude-API-Key-Prefix
  "CLAUDE_API_KEY"       # Env-Var-Name
  "SUPABASE_SERVICE_ROLE_KEY" # Server-Key
)
FOUND=0
for p in "${PATTERNS[@]}"; do
  if grep -r --binary-files=text -l "$p" "$BUNDLE_DIR" >/dev/null; then
    echo "❌ Secret-Muster '$p' im Bundle gefunden" >&2
    grep -r --binary-files=text -n "$p" "$BUNDLE_DIR" | head -5 >&2
    FOUND=1
  fi
done
if [ "$FOUND" -eq 1 ]; then
  exit 1
fi
echo "✓ Keine Secret-Muster im Bundle."
