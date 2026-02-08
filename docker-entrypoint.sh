#!/bin/sh
set -e
TEMPLATE=/usr/share/nginx/html/config-template.js
TARGET=/usr/share/nginx/html/config.js

: "${ORG_NAME:=OrgA}"
: "${API_BASE_URL:=http://dapm3:8081}"  # change per service at runtime

echo "Rendering runtime /config.js"
envsubst < "$TEMPLATE" > "$TARGET"
