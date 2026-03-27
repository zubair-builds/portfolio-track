#!/usr/bin/env sh
set -eu

# Scans staged changes for common secret patterns. Intended for local pre-commit hooks.

if ! command -v rg >/dev/null 2>&1; then
  echo "rg (ripgrep) is required for secret scanning. Install ripgrep or skip hooks with:"
  echo "  git commit --no-verify"
  exit 1
fi

FILES="$(git diff --cached --name-only --diff-filter=ACM)"
if [ -z "$FILES" ]; then
  exit 0
fi

FOUND=0
MATCH_FILE="$(mktemp -t secret-scan.XXXXXX)"

printf '%s\n' "$FILES" | while IFS= read -r file; do
  [ -z "$file" ] && continue
  [ ! -f "$file" ] && continue
  [ "$file" = "scripts/secret-scan.sh" ] && continue
  [ "$file" = ".env.example" ] && continue
  if rg -n --no-heading --color never \
    -e 'mongodb(\+srv)?://[^[:space:]]+:[^[:space:]]+@' \
    -e 'postgres://[^[:space:]]+:[^[:space:]]+@' \
    -e 'mysql://[^[:space:]]+:[^[:space:]]+@' \
    -e 'redis://[^[:space:]]+:[^[:space:]]+@' \
    -e '-----BEGIN[[:space:]].*PRIVATE[[:space:]]KEY-----' \
    -e 'AKIA[0-9A-Z]{16}' \
    -e 'sk_live_[0-9a-zA-Z]+' \
    -e 'xox[baprs]-[0-9A-Za-z-]+' \
    -e 'ghp_[0-9A-Za-z]{36,}' \
    -e 'github_pat_[0-9A-Za-z_]+' \
    -e 'AIza[0-9A-Za-z_-]{35}' \
    "$file" >>"$MATCH_FILE" 2>/dev/null; then
    FOUND=1
  fi
done

# 'while ... |' runs in a subshell in POSIX sh; derive FOUND from match file.
if [ -s "$MATCH_FILE" ]; then
  FOUND=1
fi

if [ "$FOUND" -ne 0 ]; then
  echo "Secret scan failed: possible secret material detected in staged files."
  cat "$MATCH_FILE"
  rm -f "$MATCH_FILE"
  exit 1
fi

rm -f "$MATCH_FILE"
exit 0
