#!/bin/bash
# Deploy clinics landing page and sitemap to production server
# Run from medsoft-platform root: bash deploy-clinics.sh

SERVER="root@109.123.249.224"
LANDING_DIR="/var/www/aivita-landing"

echo "=== Deploying landing files to $SERVER ==="

scp apps/landing/clinics.html  "$SERVER:$LANDING_DIR/"
scp apps/landing/index.html    "$SERVER:$LANDING_DIR/"
scp apps/landing/get-app.html  "$SERVER:$LANDING_DIR/"
scp apps/landing/about.html    "$SERVER:$LANDING_DIR/"
scp apps/landing/pricing.html  "$SERVER:$LANDING_DIR/"
scp apps/landing/privacy.html  "$SERVER:$LANDING_DIR/"
scp apps/landing/terms.html    "$SERVER:$LANDING_DIR/"
scp apps/landing/sitemap.xml   "$SERVER:$LANDING_DIR/"

echo "=== Landing files deployed ==="
echo ""
echo "Next steps:"
echo "  1. Restart API to apply new routes and DB migration:"
echo "     ssh $SERVER 'cd /opt/medsoft && docker compose restart api'"
echo "  2. Verify: curl https://aivita.uz/clinics.html | head -5"
echo "  3. Set TELEGRAM_BOT_TOKEN and TELEGRAM_ADMIN_CHAT_ID env vars for notifications"
