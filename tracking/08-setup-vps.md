# 08 — Setup VPS (référence)

> Procédure complète pour reproduire l'environnement de production sur un VPS vierge.
> Serveur cible : OVH VPS-3 — 8 vCPU, 24 GB RAM, 200 GB NVMe, Debian 13
> Disque additionnel : OVH 100 Go (`/dev/sdb`) monté sur `/mnt/data` — contient les MBTiles (73 Go)
> Utilisateurs : `debian` (admin sudo) · `david` (applicatif, sans sudo)

---

## 1. Accès & sécurité

```bash
# Depuis le Mac — connexion initiale
ssh debian@<IP_VPS>

# Créer l'utilisateur applicatif
adduser david
# (pas de sudo pour david)

# Copier la clé SSH pour david
mkdir -p /home/david/.ssh
cp /root/.ssh/authorized_keys /home/david/.ssh/
chown -R david:david /home/david/.ssh

# Firewall
apt install -y ufw
ufw allow OpenSSH
ufw enable
# PostgreSQL et martin : NON exposés publiquement (accès tunnel SSH uniquement)
```

---

## 2. Paquets système

```bash
apt update && apt upgrade -y
apt install -y curl git unzip rsync tmux build-essential
```

---

## 3. PHP 8.3

```bash
apt install -y lsb-release apt-transport-https ca-certificates
curl -sSLo /tmp/debsuryorg-archive-keyring.gpg https://packages.sury.org/php/apt.gpg
install -D /tmp/debsuryorg-archive-keyring.gpg /usr/share/keyrings/debsuryorg-archive-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/debsuryorg-archive-keyring.gpg] https://packages.sury.org/php/ $(lsb_release -sc) main" \
  > /etc/apt/sources.list.d/php.list
apt update
apt install -y php8.3 php8.3-fpm php8.3-cli php8.3-pgsql php8.3-intl \
  php8.3-gd php8.3-zip php8.3-mbstring php8.3-xml php8.3-curl php8.3-bcmath
```

---

## 4. PostgreSQL 17 + PostGIS 3

```bash
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc | gpg --dearmor \
  -o /usr/share/keyrings/postgresql-keyring.gpg
echo "deb [signed-by=/usr/share/keyrings/postgresql-keyring.gpg] \
  https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
  > /etc/apt/sources.list.d/pgdg.list
apt update
apt install -y postgresql-17 postgresql-17-postgis-3

# Base + rôle
sudo -u postgres psql <<'SQL'
CREATE USER alua WITH PASSWORD 'XXXXX';
CREATE DATABASE alua OWNER alua;
\c alua
CREATE EXTENSION postgis;
CREATE EXTENSION "uuid-ossp";
SQL

# pg_hba.conf : autoriser connexion TCP locale avec mot de passe
# Ajouter dans /etc/postgresql/17/main/pg_hba.conf :
# host  alua  alua  127.0.0.1/32  scram-sha-256
systemctl restart postgresql
```

---

## 5. tippecanoe + martin

```bash
# tippecanoe (build depuis les sources)
apt install -y libsqlite3-dev zlib1g-dev
git clone https://github.com/felt/tippecanoe.git /tmp/tippecanoe
cd /tmp/tippecanoe && make -j$(nproc) && make install

# martin (tile server)
# Vérifier la dernière version sur https://github.com/maplibre/martin/releases
MARTIN_VERSION=v1.8.2
wget -qO /tmp/martin.tar.gz \
  "https://github.com/maplibre/martin/releases/download/${MARTIN_VERSION}/martin-x86_64-unknown-linux-musl.tar.gz"
tar -xzf /tmp/martin.tar.gz -C /usr/local/bin
chmod +x /usr/local/bin/martin
```

---

## 6. Node.js 22 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs
```

---

## 7. Composer + Symfony CLI

```bash
# Composer
curl -sS https://getcomposer.org/installer | php8.3 -- --install-dir=/usr/local/bin --filename=composer

# Symfony CLI
curl -1sLf 'https://dl.cloudsmith.io/public/symfony/stable/setup.deb.sh' | bash
apt install -y symfony-cli
```

---

## 8. Structure des répertoires

```bash
mkdir -p /home/david/www/alua
mkdir -p /home/david/data/alua_tiles
chown -R david:david /home/david/www /home/david/data
```

---

## 8b. Disque additionnel (MBTiles)

Le disque additionnel OVH 100 Go (`/dev/sdb`) stocke les MBTiles (73 Go).
UUID : `77e8aa27-784a-4d74-bec9-e6ad7b451697`

```bash
# Formater (si disque vierge)
mkfs.ext4 /dev/sdb

# Monter
mkdir -p /mnt/data
mount /dev/sdb /mnt/data

# Persistant au reboot
echo "UUID=77e8aa27-784a-4d74-bec9-e6ad7b451697 /mnt/data ext4 defaults,nofail 0 2" >> /etc/fstab

# Permissions
chown david:david /mnt/data
```

Les MBTiles sont stockés dans `/mnt/data/alua_tiles/` et référencés directement dans `martin.yaml` :
```yaml
mbtiles:
  - /mnt/data/alua_tiles/france-parcelles.mbtiles
```

> Note : `/home/david/data/alua_tiles` est un symlink vers `/mnt/data/alua_tiles` (pour compatibilité scripts).
> Martin pointe sur le chemin réel `/mnt/data/` — ne pas utiliser le symlink dans `martin.yaml`.

---

## 9. Déploiement de l'application

```bash
# Depuis le Mac
rsync -avz --exclude='vendor/' --exclude='var/' --exclude='.env.local' \
  -e "ssh -i ~/.ssh/alua" \
  /Users/david/Desktop/git/alua/alua-backend/ \
  david@<IP_VPS>:/home/david/www/alua/alua-backend/

# Sur le VPS (en tant que david)
cd /home/david/www/alua/alua-backend
composer install --no-dev --optimize-autoloader

# Créer .env.local
cat > .env.local <<'EOF'
DATABASE_URL="postgresql://alua:XXXXX@127.0.0.1:5432/alua?serverVersion=17&charset=utf8"
APP_ENV=prod
APP_SECRET=XXXXX
EOF

# Migrations
php8.3 bin/console doctrine:migrations:migrate --no-interaction
```

---

## 10. Migrations Doctrine

```bash
cd /home/david/www/alua/alua-backend
php8.3 bin/console doctrine:migrations:migrate --no-interaction
```

> Les migrations créent toutes les tables (y compris `monuments_historiques` et `rga_zones`).
> Les commandes d'import ne créent plus les tables elles-mêmes — migrations obligatoires en premier.

---

## 10b. Imports de données (ordre obligatoire)

> Les migrations Doctrine créent les tables. Les vues matérialisées pour martin
> sont gérées par `app:tiles:refresh` (voir section 11).

```bash
# Dans un tmux pour chaque import long

# 0. Limites administratives (~5 min, ~34 000 communes)
php8.3 bin/console app:import:admin

# 1. BAN — adresses (~1h)
php8.3 bin/console app:import:ban --all

# 2. PCI — parcelles + liaison KNN (~3h) + MBTiles France entière (~2h)
php8.3 bin/console app:import:pci --all --keep-geojson
bash scripts/build-mbtiles-france.sh

# 3. DVF — transactions 2014–2024 (~4h)
bash scripts/import-dvf-france.sh
# puis liaison adresses :
php8.3 bin/console app:import:dvf --only-link-addresses

# 4. DPE — diagnostics ADEME (~27h, 1 dept/17min)
for dept in 01 02 03 ... 95; do
  php8.3 bin/console app:import:dpe --department=$dept --skip-linking
  sleep 5
done
php8.3 bin/console app:import:dpe --only-link
```

> **Disque** : vérifier `df -h /dev/sda1` avant chaque étape.
> Supprimer les GeoJSON après tippecanoe, les tuiles dept après tile-join.
>
> **Après chaque re-import DVF ou DPE**, rafraîchir les vues matérialisées :
> ```bash
> php8.3 bin/console app:tiles:refresh
> ```

---

## 10c. Import ABF — Monuments historiques (base Mérimée)

Requis pour afficher les périmètres ABF dans les fiches parcelles.

```bash
# ~5 min, ~43 000 monuments, ~30 MB en base
cd /home/david/www/alua/alua-backend
php8.3 bin/console app:import:abf

# Vérifier
psql -U alua -d alua -c "SELECT COUNT(*), protection FROM monuments_historiques GROUP BY protection;"
```

> Source : data.culture.gouv.fr (base Mérimée) — téléchargement automatique dans la commande.
> Ré-import idempotent (ON CONFLICT DO UPDATE sur la référence Mérimée).

---

## 10d. BDNB — Bâtiments (groupes)

Import des groupes de bâtiments depuis la Base de Données Nationale des Bâtiments (CSTB).
Source : https://bdnb.io/download/ — exports CSV par département (millésime 2025-07-a).

**Fraîcheur :** ~2 millésimes/an. Ré-import annuel recommandé.
**Coût :** ~1-2h pour 96 depts (~20 GB de téléchargement, <1 GB disque temp par dept).

```bash
# Dans un tmux
cd /home/david/www/alua/alua-backend

# Test sur un département
php8.3 bin/console app:import:bdnb --department=32

# France entière (~1-2h)
php8.3 bin/console app:import:bdnb --all

# Vérifier
psql -U alua -d alua -c "SELECT COUNT(*), usage_niveau_1 FROM batiment_bdnb GROUP BY usage_niveau_1 ORDER BY COUNT(*) DESC LIMIT 10;"
```

> Import idempotent (ON CONFLICT DO UPDATE sur parcelle_id + batiment_groupe_id).
> Vérifier que les `parcelle_id` BDNB correspondent bien aux `id_parcelle` de la table `parcelles` :
> ```sql
> SELECT COUNT(*) FROM batiment_bdnb b
> WHERE EXISTS (SELECT 1 FROM parcelles p WHERE p.id_parcelle = b.parcelle_id);
> ```

---

## 10e. RNIC — Copropriétés (data.gouv.fr)

Import des copropriétés depuis le Registre National d'Immatriculation des Copropriétés.
Source : data.gouv.fr — CSV national (~800 MB), mis à jour quotidiennement.
TTL : 3 mois (dispatché via Messenger par `app:refresh:check` dès qu'au moins une ligne expire).

```bash
# Migrations obligatoires en premier
php8.3 bin/console doctrine:migrations:migrate --no-interaction

# Premier import (~15-30 min selon le VPS)
cd /home/david/www/alua/alua-backend
php8.3 bin/console app:import:rnic

# Vérifier
psql -U alua -d alua -c "SELECT COUNT(*) FROM coproprietes;"
psql -U alua -d alua -c "SELECT COUNT(*) FROM coproprietes_parcelles;"
psql -U alua -d alua -c "SELECT type_syndic, COUNT(*) FROM coproprietes GROUP BY type_syndic ORDER BY COUNT(*) DESC LIMIT 5;"
```

> Import idempotent (ON CONFLICT DO UPDATE sur no_immatriculation).
> La table de jonction coproprietes_parcelles est remplacée atomiquement à chaque import (transaction MVCC).
> Le refresh automatique est géré via TTL + Messenger : `app:refresh:check` (cron 3h du matin).

---

## 10f. Sitadel — Autorisations d'urbanisme (SDES / data.gouv.fr)

Import des permis de construire, déclarations préalables, permis d'aménager et de démolir.
Source : 4 CSV SDES via DiDo API — ~6M lignes au total, mis à jour mensuellement.
TTL : 30 jours (dispatché via Messenger par `app:refresh:check`).

```bash
# Migration (crée sitadel_permis + indexes)
php8.3 bin/console doctrine:migrations:migrate --no-interaction

# Premier import (~3-4h, télécharge et parse les 4 fichiers)
cd /home/david/www/alua/alua-backend
php8.3 bin/console app:import:sitadel

# Vérifier
psql -U alua -d alua -c "SELECT type_dau, COUNT(*) FROM sitadel_permis GROUP BY type_dau ORDER BY COUNT(*) DESC;"
psql -U alua -d alua -c "SELECT COUNT(*) FROM sitadel_permis WHERE sec_cadastre1 IS NOT NULL;"
```

> Import idempotent (ON CONFLICT DO UPDATE sur num_dau).
> Le refresh automatique est géré via TTL + Messenger : `app:refresh:check` (cron 3h du matin, TTL 30 jours).
> Les 4 fichiers : logements (PC/DP créant des logements), locaux non résidentiels, permis de démolir, permis d'aménager.

---

## 10g. SIRENE — Établissements actifs (INSEE / data.gouv.fr)

> **Source :** `StockEtablissement_utf8.zip` (~2.6 GB ZIP, ~30M lignes, actifs seulement retenus).
> Filtrés : `etatAdministratifEtablissement = A` ET `identifiantAdresseEtablissement` non vide.
> Lien parcelle via : `sirene_etablissements.ban_id → addresses.ban_id → parcelles_addresses → parcelles`.
> **TTL :** 30 jours, refresh automatique via Messenger (`app:refresh:check`).

```bash
# Migration (à exécuter avant le premier import)
cd /home/david/www/alua/alua-backend
php8.3 bin/console doctrine:migrations:migrate --no-interaction

# Premier import (~30 min–1h selon VPS, filtre actifs+BAN ID seulement)
php8.3 bin/console app:import:sirene

# Vérification
psql -U alua -d alua -c "SELECT COUNT(*) FROM sirene_etablissements;"
psql -U alua -d alua -c "SELECT COUNT(*) FROM sirene_etablissements WHERE est_siege = true;"
# Exemple de recherche par parcelle (test)
# psql -U alua -d alua -c "SELECT se.siret, COALESCE(se.enseigne, se.denomination) AS nom, se.naf_code FROM sirene_etablissements se JOIN addresses a ON a.ban_id = se.ban_id JOIN parcelles_addresses pa ON pa.address_id = a.id JOIN parcelles p ON p.id = pa.parcelle_id WHERE p.id_parcelle = 'XXXXXXXXXXXXXXXXXXXXXXX' LIMIT 10;"
```

> Refresh automatique géré par TTL Messenger — pas de cron dédié.
> Premier import manuel uniquement.

---

## 10h. RGA (Retrait-Gonflement des Argiles)

> **Aucun import nécessaire.** Le niveau d'aléa RGA est récupéré en temps réel via l'API Géorisques :
> `https://georisques.gouv.fr/api/v1/rga?latlon=LON,LAT`
> Retourne `{ codeExposition: "1"–"4", exposition: "..." }` — mapping : 1=Faible, 2=Moyen, 3=Important, 4=Très important.

---

## 11. Config martin (tile server PostGIS + MBTiles)

```bash
# En tant que david — créer le fichier de config
cat > /home/david/martin.yaml <<'EOF'
listen_addresses: "0.0.0.0:3000"

postgres:
  connection_string: "postgresql://alua:XXXXX@127.0.0.1:5432/alua"

mbtiles:
  - /home/david/data/alua_tiles/france-parcelles.mbtiles
EOF
chmod 600 /home/david/martin.yaml

# En tant que root — mettre à jour le service systemd
sed -i 's|ExecStart=.*|ExecStart=/usr/local/bin/martin --config /home/david/martin.yaml|' \
  /etc/systemd/system/martin.service
systemctl daemon-reload && systemctl restart martin

# Vérifier que les 3 sources sont détectées
curl -s http://localhost:3000/catalog | python3 -m json.tool | grep -E '"(france|view_)"'
# Attendu : france-parcelles, view_transactions_tiles, view_dpe_tiles
```

> martin sert automatiquement toutes les tables/vues PostGIS avec colonne geometry
> + tous les fichiers MBTiles déclarés dans le fichier de config.

---

## 12. Tunnel SSH (développement Mac → VPS) — optionnel

```bash
# Dans un terminal dédié sur le Mac
ssh -i ~/.ssh/alua -L 5432:localhost:5432 david@<IP_VPS> -N
```

`.env.local` sur le Mac :
```
DATABASE_URL="postgresql://alua:XXXXX@127.0.0.1:5432/alua?serverVersion=17&charset=utf8"
```

---

## 13. Crontabs (utilisateur david)

Créer le répertoire de logs avant d'installer le crontab :
```bash
mkdir -p ~/logs/geocopia
```

```bash
crontab -e
```

```cron
# ── Messenger worker (DPE / RNIC / Sitadel / SIRENE TTL refresh) ─────────────
# Tourne toutes les heures, se coupe au bout de 3300s pour éviter les fuites mémoire
0 * * * * cd /home/david/www/alua/alua-backend && php8.3 bin/console messenger:consume async --time-limit=3300 >> /home/david/logs/geocopia/messenger.log 2>&1

# Dispatch des jobs Messenger (vérification TTL expirés) — quotidien à 3h
0 3 * * * cd /home/david/www/alua/alua-backend && php8.3 bin/console app:refresh:check >> /home/david/logs/geocopia/refresh-check.log 2>&1

# Vues matérialisées martin (DVF + DPE) — après le refresh:check
30 3 * * * cd /home/david/www/alua/alua-backend && php8.3 bin/console app:tiles:refresh >> /home/david/logs/geocopia/tiles-refresh.log 2>&1

# ── Imports bulk (données source, fréquence basse) ────────────────────────────

# BAN (adresses IGN) — ~75 jours (5×/an : janv, mi-mars, début juin, mi-août, début nov)
0 2 15 1 * bash /home/david/www/alua/scripts/refresh-ban.sh
0 2 20 3 * bash /home/david/www/alua/scripts/refresh-ban.sh
0 2  4 6 * bash /home/david/www/alua/scripts/refresh-ban.sh
0 2 19 8 * bash /home/david/www/alua/scripts/refresh-ban.sh
0 2  3 11 * bash /home/david/www/alua/scripts/refresh-ban.sh

# PCI/MBTiles (cadastre) — ~180 jours (2×/an : 15 janv + 15 juil), ~5h
0 1 15 1 * bash /home/david/www/alua/scripts/refresh-pci.sh
0 1 15 7 * bash /home/david/www/alua/scripts/refresh-pci.sh

# DVF (transactions DGFiP) — 1×/an début juin (publication annuelle DGFiP)
0 4 1 6 * bash /home/david/www/alua/scripts/refresh-dvf.sh

# Monuments historiques ABF (Mérimée) — mensuel, idempotent
0 5 1 * * cd /home/david/www/alua/alua-backend && php8.3 bin/console app:import:abf >> /home/david/logs/geocopia/abf.log 2>&1

# BDNB — bâtiments — annuel (juin), idempotent
0 2 15 6 * cd /home/david/www/alua/alua-backend && php8.3 bin/console app:import:bdnb --all >> /home/david/logs/geocopia/bdnb.log 2>&1

# RNIC (copropriétés) : refresh géré par TTL Messenger (app:refresh:check ci-dessus, TTL 3 mois)
# Pas de cron dédié nécessaire — premier import manuel : php8.3 bin/console app:import:rnic

# Sitadel (autorisations d'urbanisme) : refresh géré par TTL Messenger (TTL 30 jours)
# Pas de cron dédié nécessaire — premier import manuel : php8.3 bin/console app:import:sitadel

# SIRENE (établissements actifs) : refresh géré par TTL Messenger (TTL 30 jours)
# Pas de cron dédié nécessaire — premier import manuel : php8.3 bin/console app:import:sirene

# ── Purge disque (maintenance) ────────────────────────────────────────────────

# Next.js fetch-cache > 2j
0 3 * * * find /home/david/www/alua/alua-frontend/.next/cache/fetch-cache -mtime +2 -delete 2>/dev/null

# Next.js images cache > 7j (optimisation d'images, grossit sans limite sinon)
0 3 * * * find /home/david/www/alua/alua-frontend/.next/cache/images -mtime +7 -delete 2>/dev/null

# Symfony http_cache > 3j — quotidien (TTL max POI = 90j mais on borne l'espace disque)
0 4 * * * find /home/david/www/alua/alua-backend/var/http_cache -type f -mtime +3 -delete 2>/dev/null

# Logs backend — tronquer à 50 Mo si dépassement (hebdo)
0 5 * * 0 find /home/david/www/alua/alua-backend/var/log -name "*.log" -size +50M -exec truncate -s 50M {} \;

# Alerte disque > 85%
0 6 * * * df / | awk 'NR==2 {gsub(/%/,"",$5); if($5>85) print "ALERTE disque "$5"% utilisé"}' | mail -s "[geocopia] Disque plein" contact@geocopia.fr 2>/dev/null
```

---

## 13b. Tuning performance — anti-503 (une seule fois, en tant que debian)

> Contexte : la fiche parcelle fait 11 appels API simultanés côté Next.js (ISR cold).
> Les endpoints `/risques` (5 appels Géorisques en parallèle) et `/poi` (Overpass) bloquaient
> des workers PHP-FPM 20-30s faute de timeout. Le défaut PHP-FPM (5 workers) s'épuisait en 1 requête.

```bash
# Sur le VPS en tant que debian (sudo)
sudo bash /home/david/www/alua/scripts/tune-vps-root.sh
```

Le script :
1. Passe `pm.max_children = 30` (était 5 par défaut — VPS 24 GB supporte 50+)
2. Crée `/etc/nginx/conf.d/geocopia-cache.conf` avec la directive `fastcgi_cache_path`
3. Affiche les directives à ajouter manuellement dans le vhost Nginx (`fastcgi_cache`, `fastcgi_cache_valid`, etc.)

Après le script, ajouter dans le vhost Nginx (section `server`) et recharger :
```nginx
fastcgi_cache_key "$scheme$request_method$host$request_uri";

# Dans location ~ \.php$ :
fastcgi_cache          geocopia_api;
fastcgi_cache_valid     200 1h;
fastcgi_cache_valid     404 10m;
fastcgi_cache_use_stale error timeout updating http_500 http_503;
fastcgi_cache_background_update on;
fastcgi_cache_lock      on;
add_header X-Cache      $upstream_cache_status;
```

```bash
nginx -t && systemctl reload nginx
# Vérifier : curl -I https://geocopia.fr/api/parcelles/XXXXXX | grep X-Cache
# HIT = servi par Nginx sans PHP, MISS = premier appel
```

---

## 13. Mises à jour récurrentes des données

| Source | Commande | Fréquence | Stratégie |
|--------|----------|-----------|-----------|
| BAN | `app:import:ban --all` | ~75 jours | Cron |
| PCI | `bash scripts/build-mbtiles-france.sh` | ~180 jours | Cron |
| DVF | `bash scripts/refresh-dvf.sh` | 1×/an (juin) | Cron |
| DPE | via Messenger (`app:refresh:check`) | 180 jours/dept | TTL Messenger |
| Monuments historiques ABF | `app:import:abf` | Mensuel | Cron (1er du mois) |
| BDNB bâtiments | `app:import:bdnb --all` | ~2×/an | Cron annuel (juin) |
| RNIC copropriétés | via Messenger (`app:refresh:check`) | 3 mois | TTL Messenger |
| Sitadel permis de construire | via Messenger (`app:refresh:check`) | 30 jours | TTL Messenger |
| SIRENE établissements | via Messenger (`app:refresh:check`) | 30 jours | TTL Messenger |
| Risques Géorisques | API temps-réel | Continu | Aucun (cache Next.js 24h) |
