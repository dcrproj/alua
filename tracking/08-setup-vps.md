# 08 — Setup VPS (référence)

> Procédure complète pour reproduire l'environnement de production sur un VPS vierge.
> Serveur cible : OVH VPS-3 — 8 vCPU, 24 GB RAM, 200 GB NVMe, Debian 13
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

## 10e. RGA (Retrait-Gonflement des Argiles)

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

```bash
crontab -e
```

```cron
# Refresh TTL : détecte les entités expirées et dispatche les jobs Messenger
0 3 * * * cd /home/david/www/alua/alua-backend && php8.3 bin/console app:refresh:check >> /var/log/alua-refresh.log 2>&1

# Worker Messenger : traite les jobs de refresh (relancé toutes les heures)
0 * * * * cd /home/david/www/alua/alua-backend && php8.3 bin/console messenger:consume async --time-limit=3300 >> /var/log/alua-messenger.log 2>&1

# Vues matérialisées martin (DVF + DPE) — après le refresh:check
30 3 * * * cd /home/david/www/alua/alua-backend && php8.3 bin/console app:tiles:refresh >> /var/log/alua-tiles.log 2>&1

# Monuments historiques ABF (Mérimée) — mensuel, idempotent
0 4 1 * * cd /home/david/www/alua/alua-backend && php8.3 bin/console app:import:abf >> /var/log/alua-abf.log 2>&1

# BDNB — bâtiments — annuel (juin), nouveau millésime à ajuster manuellement
# 0 2 15 6 * cd /home/david/www/alua/alua-backend && php8.3 bin/console app:import:bdnb --all >> /var/log/alua-bdnb.log 2>&1
```

---

## 13. Mises à jour récurrentes des données

| Source | Commande | Fréquence | Stratégie |
|--------|----------|-----------|-----------|
| BAN | `app:import:ban --all` | ~75 jours | Cron |
| PCI | `bash scripts/build-mbtiles-france.sh` | ~180 jours | Cron |
| DVF | `bash scripts/import-dvf-france.sh` | 1×/an (mai) | Cron |
| DPE | via Messenger (`app:refresh:check`) | 180 jours/dept | TTL Messenger |
| Monuments historiques ABF | `app:import:abf` | Mensuel | Cron (1er du mois) |
| BDNB bâtiments | `app:import:bdnb --all` | ~2×/an | Cron annuel (juin) |
| Risques Géorisques | API temps-réel | Continu | Aucun (cache Next.js 24h) |
