#!/usr/bin/env bash
# Ratchet checks for copy-pasted workarounds ("weeds").
#
# Each rule counts a pattern under src/. The count may go DOWN (lower the
# baseline in this file in the same PR) but never UP. Background:
# docs/weed-audit-and-guardrails.md in the ToolBelt-final repo.
#
# Usage: scripts/weed-ratchet.sh            # check
#        scripts/weed-ratchet.sh --counts   # print current counts only
set -euo pipefail

cd "$(dirname "$0")/.."
SRC="src"
mode="${1:-check}"
failed=0

# count <regex> [exclude-path-regex]
count() {
  local hits
  hits=$(grep -rEo --include='*.ts' --include='*.tsx' "$1" "$SRC" 2>/dev/null || true)
  if [[ -n "${2:-}" ]]; then hits=$(printf '%s\n' "$hits" | grep -Ev "$2" || true); fi
  printf '%s\n' "$hits" | grep -c . || true
}

# rule <max> <name> <regex> [exclude-path-regex] [hint]
rule() {
  local max="$1" name="$2" re="$3" exclude="${4:-}" hint="${5:-}"
  local n
  n=$(count "$re" "$exclude")
  if [[ "$mode" == "--counts" ]]; then
    printf '%5s  %s\n' "$n" "$name"
  elif (( n > max )); then
    printf 'FAIL  %s: %s found, baseline %s. %s\n' "$name" "$n" "$max" "$hint"
    grep -rnE --include='*.ts' --include='*.tsx' "$re" "$SRC" | { if [[ -n "$exclude" ]]; then grep -Ev "$exclude"; else cat; fi; } | head -20
    failed=1
  elif (( n < max )); then
    printf 'ok    %s: %s (baseline %s; lower it in scripts/weed-ratchet.sh)\n' "$name" "$n" "$max"
  else
    printf 'ok    %s: %s\n' "$name" "$n"
  fi
}

# max  name  regex  exclude  hint
rule 0  "hardcoded backend host" \
  'onrender\.com' '^src/config/' \
  "Use API_BASE_URL / BACKEND_ORIGIN from src/config/api.ts."
rule 0  "process.env read outside config" \
  'process\.env\.' '^src/(config/|lib/firebase\.ts)' \
  "Read env in src/config/ only."
rule 0  ".data.data double unwrap" \
  '\.data\??\.data\b' '' \
  "api-client.ts already unwraps {status, data}."
rule 47 "swallowed promise error .catch(() => {}|null)" \
  '\.catch\(\(\) *=> *(\{ *\}|null|undefined)\)' '' \
  "Surface write failures; swallow only true side effects."
rule 0  "empty catch {}" \
  'catch *(\([^)]*\))? *\{ *\}' '' \
  "Handle the error or explain why it is safe to ignore."
rule 9  "local alertFailure copy" \
  'function alertFailure' '' \
  "Share one alertFailure in src/lib/."
rule 11 "hand-rolled optimistic temp id" \
  'optimistic-\$\{' '' \
  "Reuse the store pattern; never send a temp id to the server."
rule 13 "inline Intl.NumberFormat" \
  'new Intl\.NumberFormat' '' \
  "Use one shared money formatter."
rule 12 "hand-built \$ string" \
  '`\$\$\{' '' \
  "Use one shared money formatter (thousands separators, negative sign)."
rule 5  "local initials() copy" \
  'function initials' '' \
  "Use one shared helper in src/lib/name.ts."

if [[ "$mode" != "--counts" && $failed -ne 0 ]]; then
  echo
  echo "A weed count went up. Use the shared helper named above instead of copying the pattern."
  exit 1
fi
