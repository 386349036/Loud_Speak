#!/usr/bin/env bash
set -euo pipefail
archive=${1:?archive path required}
commit=${2:?full commit required}
expected=${3:?archive sha256 required}
[[ "$commit" =~ ^[0-9a-f]{40}$ ]] || exit 2
[[ "$expected" =~ ^[0-9a-f]{64}$ ]] || exit 2
echo "$expected  $archive" | sha256sum -c -
base=/opt/loud
release="$base/releases/$commit"
if ! id loud >/dev/null 2>&1; then useradd --system --home /var/lib/loud --shell /usr/sbin/nologin loud; fi
install -d -o loud -g loud /var/lib/loud /var/lib/loud/data /var/cache/loud
install -d "$base/releases"
if [[ ! -d "$release" ]]; then
 install -d -o loud -g loud "$release"
 tar -xzf "$archive" -C "$release" --no-same-owner
 chown -R loud:loud "$release"
 runuser -u loud -- env HOME=/var/lib/loud PATH=/usr/local/bin:/usr/bin:/bin npm ci --omit=dev --cache /var/cache/loud --prefix "$release"
 printf '{"commit":"%s"}\n' "$commit" > "$release/public/deployment.json"
 # Rebuild lossless, versioned transport images before switching releases.
 if [[ -f /opt/loud/operations/build-game-delivery.cjs ]]; then
  (cd "$release" && /usr/local/bin/node /opt/loud/operations/build-game-delivery.cjs "$release/public/games/veggie-adventure/assets" "/opt/loud/operations/delivery-$commit.json")
 fi
 chown -R root:root "$release"
fi
cat > /etc/systemd/system/loud-speak.service <<'SERVICE'
[Unit]
Description=Loud Speak web and arcade
After=network-online.target
Wants=network-online.target
[Service]
Type=simple
User=loud
Group=loud
WorkingDirectory=/opt/loud/current
Environment=NODE_ENV=production
Environment=HOST=127.0.0.1
Environment=PORT=3210
Environment=TRUST_PROXY=loopback
Environment=DATA_DIR=/var/lib/loud/data
ExecStart=/usr/local/bin/node /opt/loud/current/server.cjs
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/loud
[Install]
WantedBy=multi-user.target
SERVICE
# Preserve the certificate and HTTP-01 locations installed by HTTPS setup.
if [[ ! -f /etc/nginx/sites-available/loud-speak ]] || ! grep -q 'ssl_certificate ' /etc/nginx/sites-available/loud-speak; then
cat > /etc/nginx/sites-available/loud-speak <<'NGINX'
server {
 listen 80 default_server;
 listen [::]:80 default_server;
 server_name _;
 client_max_body_size 21m;
 location = /admin { return 403; }
 location ^~ /api/admin/ { return 403; }
 location / {
  proxy_pass http://127.0.0.1:3210;
  proxy_http_version 1.1;
  proxy_set_header Host $http_host;
  proxy_set_header X-Forwarded-For $remote_addr;
  proxy_set_header X-Forwarded-Proto $scheme;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_read_timeout 3600;
 }
}
NGINX
fi
ln -sfn /etc/nginx/sites-available/loud-speak /etc/nginx/sites-enabled/loud-speak
if [[ -L /etc/nginx/sites-enabled/default ]]; then unlink /etc/nginx/sites-enabled/default; fi
nginx -t
previous=$(readlink -f "$base/current" || true)
ln -sfn "$release" "$base/current"
systemctl daemon-reload
systemctl enable loud-speak nginx
systemctl restart loud-speak
healthy=false
for attempt in $(seq 1 20); do if curl -fsS http://127.0.0.1:3210/api/health >/dev/null; then healthy=true; break; fi; sleep 1; done
if [[ "$healthy" != true ]]; then
 if [[ -n "$previous" && -d "$previous" ]]; then ln -sfn "$previous" "$base/current"; systemctl restart loud-speak; fi
 journalctl -u loud-speak -n 30 --no-pager
 exit 1
fi
systemctl reload nginx
for attempt in $(seq 1 10); do
   if curl -fsSL http://127.0.0.1/deployment.json | grep -q "$commit"; then break; fi
 sleep 1
done
curl -fsSL http://127.0.0.1/deployment.json | grep "$commit"
echo
echo "DEPLOYED $commit"
