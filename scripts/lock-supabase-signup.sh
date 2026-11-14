#!/usr/bin/env bash
# Turns OFF public sign-up in Supabase Auth so strangers can't create accounts.
# Needs a Supabase personal access token (supabase.com/dashboard/account/tokens):
#   SUPABASE_ACCESS_TOKEN=sbp_xxxxx bash scripts/lock-supabase-signup.sh
set -euo pipefail
: "${SUPABASE_ACCESS_TOKEN:?Set SUPABASE_ACCESS_TOKEN first}"
REF="${1:-${SUPABASE_PROJECT_REF:-}}"
if [ -z "$REF" ]; then
  REF=$(grep -oE "https://[a-z0-9]+\.supabase\.co" public/js/admin.js 2>/dev/null | head -1 | sed -E 's#https://([a-z0-9]+)\.supabase\.co#\1#')
fi
[ -n "$REF" ] || { echo "Pass the project ref: bash scripts/lock-supabase-signup.sh <ref>"; exit 1; }
API="https://api.supabase.com/v1/projects/$REF/config/auth"
curl -fsS -X PATCH "$API" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" -d '{"disable_signup":true}' >/dev/null
curl -fsS "$API" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" | python3 -c "import sys,json; print('Supabase disable_signup =', json.load(sys.stdin).get('disable_signup'))"
