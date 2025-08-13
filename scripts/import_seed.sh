#!/usr/bin/env bash
set -euo pipefail

# Simple import helper for the large MySQL/MariaDB dump
# Requires: mysql client installed and running server
# Usage:
#   ./scripts/import_seed.sh [user] [password] [host] [port] [db_name]
# Defaults pull from .env if present

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Load .env if present
if [ -f "$ROOT_DIR/.env" ]; then
  # Clean CRLF to avoid bash sourcing errors from Windows line endings
  ENV_CLEAN="$(mktemp)"
  tr -d '\r' < "$ROOT_DIR/.env" > "$ENV_CLEAN"
  # shellcheck disable=SC1091
  set -a; source "$ENV_CLEAN"; set +a
  rm -f "$ENV_CLEAN"
fi

DB_USER_ARG="${1:-${DB_USER:-root}}"
DB_PASS_ARG="${2:-${DB_PASSWORD:-root}}"
DB_HOST_ARG="${3:-${DB_HOST:-127.0.0.1}}"
DB_PORT_ARG="${4:-${DB_PORT:-3306}}"
DB_NAME_ARG="${5:-${DB_NAME:-prep_iq3}}"

# ensure DB exists
mysql -u"$DB_USER_ARG" -p"$DB_PASS_ARG" -h"$DB_HOST_ARG" -P"$DB_PORT_ARG" -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME_ARG\`;"

# import
mysql -u"$DB_USER_ARG" -p"$DB_PASS_ARG" -h"$DB_HOST_ARG" -P"$DB_PORT_ARG" "$DB_NAME_ARG" < "$ROOT_DIR/notes/schema_with_data.sql"

echo "Imported seed into $DB_NAME_ARG on $DB_HOST_ARG:$DB_PORT_ARG as $DB_USER_ARG"
