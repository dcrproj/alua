#!/bin/bash
# Tuning VPS — à exécuter en tant que debian (sudo) UNE SEULE FOIS
# Objectif : éviter les 503 sous charge (PHP-FPM workers + cache Nginx)
#
# Usage : sudo bash scripts/tune-vps-root.sh

set -euo pipefail

echo "=== 1. PHP-FPM — augmenter pm.max_children ==="
# OVH VPS-3 : 8 vCPU, 24 GB RAM → 30 workers confortables (~50-70 MB RAM chacun)
PHP_POOL=/etc/php/8.3/fpm/pool.d/www.conf

if [ ! -f "$PHP_POOL" ]; then
    echo "ERREUR : pool PHP-FPM introuvable à $PHP_POOL"
    exit 1
fi

# Backup
cp "$PHP_POOL" "${PHP_POOL}.bak.$(date +%Y%m%d)"

sed -i 's/^pm\.max_children\s*=.*/pm.max_children = 30/'    "$PHP_POOL"
sed -i 's/^pm\.start_servers\s*=.*/pm.start_servers = 10/'  "$PHP_POOL"
sed -i 's/^pm\.min_spare_servers\s*=.*/pm.min_spare_servers = 5/'  "$PHP_POOL"
sed -i 's/^pm\.max_spare_servers\s*=.*/pm.max_spare_servers = 20/' "$PHP_POOL"
sed -i 's/^;pm\.max_requests\s*=.*/pm.max_requests = 500/'  "$PHP_POOL"

echo "Valeurs appliquées :"
grep -E '^pm\.' "$PHP_POOL"

systemctl reload php8.3-fpm
echo "php8.3-fpm rechargé."

echo ""
echo "=== 2. Nginx — cache FastCGI pour /api/ ==="
# Ajouter le cache FastCGI dans le bloc http (nginx.conf ou conf.d/geocopia-cache.conf)
NGINX_CACHE_CONF=/etc/nginx/conf.d/geocopia-cache.conf

cat > "$NGINX_CACHE_CONF" <<'NGINX'
# Cache FastCGI pour les réponses API Symfony
# Les réponses sont mises en cache 1h côté Nginx — PHP-FPM n'est pas sollicité sur un hit
fastcgi_cache_path /var/cache/nginx/geocopia
    levels=1:2
    keys_zone=geocopia_api:20m
    inactive=2h
    max_size=500m;
NGINX

mkdir -p /var/cache/nginx/geocopia
chown www-data:www-data /var/cache/nginx/geocopia

echo ""
echo "Fichier créé : $NGINX_CACHE_CONF"
echo ""
echo "=== ATTENTION : étapes manuelles restantes ==="
echo ""
echo "Ajoutez les directives suivantes dans votre vhost Nginx (dans le bloc 'server'),"
echo "sur le location ~ \.php\$ qui passe à php-fpm :"
echo ""
cat <<'HINT'
    # Dans le bloc 'server' Nginx (avant les locations)
    fastcgi_cache_key "$scheme$request_method$host$request_uri";

    # Dans le location ~ \.php$ (section php-fpm)
    fastcgi_cache          geocopia_api;
    fastcgi_cache_valid     200 1h;
    fastcgi_cache_valid     404 10m;
    fastcgi_cache_use_stale error timeout updating http_500 http_503;
    fastcgi_cache_background_update on;
    fastcgi_cache_lock      on;
    add_header X-Cache      $upstream_cache_status;

    # Pour bypasser le cache si besoin (debug)
    # fastcgi_cache_bypass $cookie_nocache;
HINT

echo ""
echo "Puis : nginx -t && systemctl reload nginx"
echo ""
echo "=== Vérification du cache ==="
echo "curl -I https://geocopia.fr/api/parcelles/XXXXXX | grep X-Cache"
echo "  HIT  = servi depuis cache Nginx (aucun worker PHP)"
echo "  MISS = premier appel, PHP exécuté et mis en cache"
echo "  EXPIRED = cache expiré, PHP exécuté en background (stale servi)"
