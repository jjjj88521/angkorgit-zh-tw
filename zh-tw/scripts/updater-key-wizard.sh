#!/usr/bin/env bash
# Creates the updater signing key for zh-TW releases. Run it once, yourself:
#
#   bash zh-tw/scripts/updater-key-wizard.sh
#
# The private key and its password go straight into repository secrets and a local backup
# under ~/.tauri; only the public key is written into the repository.
set -euo pipefail

REPO="jjjj88521/angkorgit-zh-tw"
KEY="$HOME/.tauri/angkorgit-zh-tw.key"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CONFIG="$ROOT/zh-tw/release/tauri.zh-tw.conf.json"

step() { printf '\n\033[1m%s\033[0m\n' "$1"; }

if [ -e "$KEY" ]; then
  echo "$KEY already exists. Releases signed with another key cannot update apps that trust this one,"
  echo "so the wizard never replaces it. Move it away first if you really want a new key."
  exit 1
fi
gh auth status > /dev/null || { echo "Sign in with: gh auth login"; exit 1; }

step "1/3 Generate the key"
mkdir -p "$(dirname "$KEY")"
chmod 700 "$(dirname "$KEY")"
password="$(openssl rand -base64 32)"
(cd "$ROOT" && pnpm --filter @angkorgit/desktop exec tauri signer generate --ci -p "$password" -w "$KEY" > /dev/null)
printf '%s' "$password" > "$KEY.password"
chmod 600 "$KEY" "$KEY.password"
echo "Saved $KEY, $KEY.pub and $KEY.password."

step "2/3 Store the private key and password as repository secrets"
gh secret set ZHTW_UPDATER_KEY --repo "$REPO" < "$KEY"
gh secret set ZHTW_UPDATER_KEY_PASSWORD --repo "$REPO" < "$KEY.password"

step "3/3 Write the public key into the release config"
PUBKEY="$(cat "$KEY.pub")" node -e '
  const fs = require("fs");
  const file = process.argv[1];
  const config = JSON.parse(fs.readFileSync(file, "utf8"));
  config.plugins.updater.pubkey = process.env.PUBKEY;
  fs.writeFileSync(file, JSON.stringify(config, null, 2) + "\n");
' "$CONFIG"

cat <<EOF

Done. Next:
  - Back up $KEY and $KEY.password somewhere safe, such as a password manager.
    Losing them means installed apps can no longer update.
  - Commit zh-tw/release/tauri.zh-tw.conf.json (it now holds the public key).
EOF
