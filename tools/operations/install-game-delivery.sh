#!/usr/bin/env bash
set -euo pipefail
stage=${1:?stage directory required}
expected=${2:?expected main sha256 required}
base=/opt/loud/current
main=$base/public/games/veggie-adventure/js/main.mjs
manifest=$base/public/games/veggie-adventure/assets/manifest.json
site=/etc/nginx/sites-available/loud-speak
maps=/etc/nginx/conf.d/loud-game-delivery-maps.conf
snippet=/etc/nginx/snippets/loud-game-delivery.conf
echo "$expected  $main" | sha256sum -c -
backup=/opt/loud/operations/performance-$(date -u +%Y%m%dT%H%M%SZ)
install -d -m 700 "$backup"
cp "$main" "$backup/main.mjs"
cp "$manifest" "$backup/manifest.json"
cp "$site" "$backup/site.conf"
for file in "$maps" "$snippet"; do if [[ -f "$file" ]]; then cp "$file" "$backup/$(basename "$file").prior"; fi; done
rollback(){
 cp "$backup/main.mjs" "$main"
 cp "$backup/manifest.json" "$manifest"
 cp "$backup/site.conf" "$site"
 for file in "$maps" "$snippet"; do
  if [[ -f "$backup/$(basename "$file").prior" ]]; then cp "$backup/$(basename "$file").prior" "$file";
  elif [[ -f "$file" ]]; then mv "$file" "$backup/$(basename "$file").rejected"; fi
 done
 nginx -t && systemctl reload nginx
}
trap rollback ERR
cd "$base"
node "$stage/build-game-delivery.cjs" "$base/public/games/veggie-adventure/assets" "$backup/images.json"
install -m 644 "$stage/nginx-game-delivery-maps.conf" "$maps"
install -m 644 "$stage/nginx-game-delivery.conf" "$snippet"
python3 - "$site" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1]);s=p.read_text()
s=s.replace('listen 443 ssl default_server;', 'listen 443 ssl http2 default_server;').replace('listen [::]:443 ssl default_server;', 'listen [::]:443 ssl http2 default_server;')
include=' include /etc/nginx/snippets/loud-game-delivery.conf;'
if include not in s:
    marker=' location = /admin { return 403; }'
    if s.count(marker)!=1: raise RuntimeError('Unexpected server structure')
    s=s.replace(marker,include+'\n'+marker)
p.write_text(s)
PY
nginx -t
install -m 644 "$stage/asset-loader.mjs" "$base/public/games/veggie-adventure/js/asset-loader.mjs"
install -m 644 "$stage/cloud-main-performance.mjs" "$main.new"
mv "$main.new" "$main"
systemctl reload nginx
curl -fsS http://127.0.0.1:3210/api/health >/dev/null
curl -fsS https://35.221.134.170/games/veggie-adventure/js/asset-loader.mjs >/dev/null
install -d -m 755 /opt/loud/operations
install -m 644 "$stage/build-game-delivery.cjs" /opt/loud/operations/build-game-delivery.cjs
printf '%s\n' "$backup" > /opt/loud/operations/latest-performance-backup
trap - ERR
printf 'PERFORMANCE_INSTALLED backup=%s\n' "$backup"
