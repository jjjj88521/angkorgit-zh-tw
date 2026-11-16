#!/usr/bin/env bash
# Creates the updater signing key for zh-TW releases. Run it yourself:
#
#   bash zh-tw/scripts/updater-key-wizard.sh            set up, or finish an interrupted setup
#   bash zh-tw/scripts/updater-key-wizard.sh --rotate   replace a key that is already configured
#
# The private key and its password go straight into repository secrets and a local backup
# under ~/.tauri; only the public key is written into the repository.
# Installed apps trust one public key, so a rotated key cuts every existing install off from updates.
set -euo pipefail

REPO="jjjj88521/angkorgit-zh-tw"
KEY="$HOME/.tauri/angkorgit-zh-tw.key"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CONFIG="$ROOT/zh-tw/release/tauri.zh-tw.conf.json"
ROTATE=false
[ "${1:-}" = "--rotate" ] && ROTATE=true

step() { printf '\n\033[1m%s\033[0m\n' "$1"; }

gh auth status > /dev/null || { echo "Sign in with: gh auth login"; exit 1; }

configured="$(node -p "require('$CONFIG').plugins.updater.pubkey")"
case "$configured" in RUN*) configured="" ;; esac
local_key=false
[ -f "$KEY" ] && [ -f "$KEY.pub" ] && [ -f "$KEY.password" ] && local_key=true

if [ "$ROTATE" = false ] && [ "$local_key" = true ] && { [ -z "$configured" ] || [ "$configured" = "$(cat "$KEY.pub")" ]; }; then
  echo "Using the existing key in $KEY to finish the setup."
elif [ -n "$configured" ] && [ "$ROTATE" = false ]; then
  echo "The release config already holds a public key, and this machine does not have its private key."
  echo "Generating a new one would stop every installed app from updating."
  echo "Restore $KEY, $KEY.pub and $KEY.password from your backup and run again, or pass --rotate."
  exit 1
elif [ -e "$KEY" ] && [ "$ROTATE" = false ]; then
  echo "$KEY exists but $KEY.pub or $KEY.password is missing. Restore them from your backup, or pass --rotate."
  exit 1
else
  if [ "$ROTATE" = true ]; then
    read -r -p "Type ROTATE to replace the updater key. Installed apps will stop receiving updates: " answer
    [ "$answer" = "ROTATE" ] || { echo "Cancelled."; exit 1; }
    # The old pair stays usable for anything it already signed, so keep all three files together.
    stamp="$(date +%Y%m%d%H%M%S)"
    for file in "$KEY" "$KEY.pub" "$KEY.password"; do
      [ -e "$file" ] && mv "$file" "$file.replaced-$stamp"
    done
  fi
  step "Generate the key"
  mkdir -p "$(dirname "$KEY")"
  chmod 700 "$(dirname "$KEY")"
  password="$(openssl rand -base64 32)"
  (cd "$ROOT" && pnpm --filter @angkorgit/desktop exec tauri signer generate --ci -p "$password" -w "$KEY" > /dev/null)
  printf '%s' "$password" > "$KEY.password"
  chmod 600 "$KEY" "$KEY.password"
  echo "Saved $KEY, $KEY.pub and $KEY.password."
fi

step "Store the private key and password as repository secrets"
gh secret set ZHTW_UPDATER_KEY --repo "$REPO" < "$KEY"
gh secret set ZHTW_UPDATER_KEY_PASSWORD --repo "$REPO" < "$KEY.password"

step "Write the public key into the release config"
PUBKEY="$(cat "$KEY.pub")" node -e '
  const fs = require("fs");
  const file = process.argv[1];
  const config = JSON.parse(fs.readFileSync(file, "utf8"));
  config.plugins.updater.pubkey = process.env.PUBKEY;
  fs.writeFileSync(file, JSON.stringify(config, null, 2) + "\n");
' "$CONFIG"

cat <<EOF

Done. Next:
  - Back up $KEY, $KEY.pub and $KEY.password somewhere safe, such as a password manager.
    Losing them means installed apps can no longer update.
  - Commit zh-tw/release/tauri.zh-tw.conf.json if it changed.
EOF
