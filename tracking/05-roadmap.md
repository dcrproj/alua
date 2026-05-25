# 05 — Roadmap

> Pas de jalons ni de dates. On avance étape par étape, dans l'ordre.
> Chaque phase est terminée quand elle est terminée.

> **Décision (avril 2026) :** les imports de données (BAN, PCI, DVF, DPE…) et la génération
> MBTiles ne seront PAS exécutés en local. Le Mac ne tient pas (disque ~228 GB, RAM limitée).
> Tout sera fait directement sur le VPS dès qu'il est provisionné (Phase 6.1).
> En local : uniquement le développement des commandes et tests sur 1–2 départements.

## Vue d'ensemble

```
Phase 0 — Cadrage          ██████ Terminée
Phase 1 — Backend          ██████ Terminée
Phase 2 — Frontend         ██████ Terminée (PLU différé Phase 4)
Phase 3 — Enrichissement   ██████ Terminée
Phase 4 — SEO & contenu    ██████ Terminée
Phase 5 — Webdesign        ██████ Terminée
Phase 6 — Mise en prod     ▓▓░░░░ En cours
Phase 7 — SEO croissance   ░░░░░░ À venir
Phase 8 — API B2B          ░░░░░░ À venir
```

**Périmètre géographique :** France métropolitaine (96 départements)

---

## Phase 0 — Cadrage

**Décisions prises :**
- [x] Analyse de la concurrence (concurrent principal : Pappers Immo)
- [x] Choix de la stack technique (Symfony 7 + Next.js 15 + PostGIS)
- [x] Inventaire des sources de données (BAN, PCI, DVF, DPE, PLU, risques, SIRENE, Sitadel, POI…)
- [x] Modèle de données initial (parcelles, adresses, mutations DVF, DPE, communes, stats)
- [x] Décision hébergeur : VPS OVH (ou équivalent), Debian/Ubuntu
- [x] Décision pas de Docker (installation native)
- [x] Décision pas de géométries cadastrales en base (tuiles vectorielles martin)
- [x] Décision périmètre : France métropolitaine (96 départements)
- [x] Décision tuiles vectorielles : martin self-hosted dès le départ (coloration DPE/prix/m² serveur-side)
- [x] Décision protection API : rate limiting nginx (60–120 req/min), pas de proxy
- [x] Décision CDN : Cloudflare offre gratuite
- [x] Décision Alsace-Moselle : carte grisée "Zone non disponible", fiches SEO maintenues
- [x] Décision monétisation Phase 1 : Google AdSense au lancement
- [x] Décision contenu SEO : templates manuels React Server Components (Next.js), pas de LLM
- [x] Décision annonces immobilières : hors scope V1
- [x] Décision structure repos : `alua-backend/` + `alua-frontend/` (deux repos distincts)
- [x] Décision nom de domaine : utiliser le nom de code "alua", domaine définitif hors V1

**Reste à faire :**
- [x] Initialisation des dépôts Git (`alua-backend/` + `alua-frontend/`)
- [x] Installation environnement local (PHP 8.3, PostgreSQL 17 + PostGIS 3.6, Composer, Symfony CLI, Node.js, tippecanoe, martin)

**Livrable :** dossier de suivi complet + dépôts initialisés

---

## Phase 1 — Backend MVP (Mai–Juin 2026)

### 1.1 — Setup projet Symfony

- [x] Initialiser le projet Symfony 7 + API Platform 4 + Doctrine ORM
- [x] Configurer PostgreSQL 17 + PostGIS (natif, sans Docker)
- [x] Configurer Symfony Messenger avec transport Doctrine (pas de Redis en local)

### 1.2 — Import BAN (adresses)

- [x] Téléchargement du fichier BAN complet (CSV IGN)
- [x] Command Symfony d'import BAN (`app:import:ban --department=XX` ou `--all`)
- [x] Entité `Address` + migration
- [x] Indexation PostGIS (GIST sur geometry, B-tree sur ban_id et commune_code)

### 1.3 — Import Cadastre (PCI) + Setup martin

- [x] Téléchargement des GeoJSON Etalab (par département, 96 départements métropolitains)
- [x] Command Symfony d'import parcelles (attributs uniquement, pas de géométrie polygone)
- [x] Entité `Parcelle` + migration + historique
- [x] Jointure parcelle ↔ adresse via KNN PostGIS à l'import (centroïde → adresse la plus proche BAN)
- [x] Peuplement table `parcelles_addresses`
- [x] Installer tippecanoe (`brew install tippecanoe`) et martin (`brew install martin`)
- [x] Générer le fichier MBTiles depuis les GeoJSON PCI (validé sur dept 32, 868K parcelles)
- [x] Valider le service martin local (`localhost:3000`) avec MapLibre GL JS
- [x] Build MBTiles France entière → fait sur le VPS (`/home/david/data/alua_tiles/france-parcelles.mbtiles`, 73 GB)

### 1.4 — Import DVF

- [x] Téléchargement des CSV DGFiP (tout l'historique depuis 2014, par département)
- [x] Command Symfony d'import DVF
- [x] Entités `MutationDvf` + `MutationDvfLot` + migrations
- [x] Liaison lot DVF ↔ Parcelle (via `id_parcelle` dans le CSV) — 16 022 133 liaisons
- [x] Liaison lot DVF ↔ Adresse (via BAN geocoding sur l'adresse DVF) — 22 807 liaisons KNN

### 1.5 — Import DPE

- [x] Import initial via API ADEME (pagination)
- [x] Entité `Dpe` + migration
- [x] Liaison DPE ↔ Adresse

### 1.6 — API REST (API Platform)

- [x] Endpoint `/api/parcelles/{id}` avec données agrégées
- [x] Endpoint `/api/addresses/{id}` avec données agrégées
- [x] Endpoint `/api/communes/{code}` avec statistiques
- [x] Endpoint `/api/transactions` (filtres géographiques)
- [x] Pagination et filtres API Platform

### 1.7 — Mécanisme TTL + refresh

- [x] Service `EntityRefresher` (`app:refresh:check` — dispatch jobs selon TTL)
- [x] Job `RefreshDpe` (API ADEME via Symfony Messenger, transport Doctrine)
- [ ] Job `RefreshPlu` (API GPU — différé à Phase 4)
- [x] Stale-while-revalidate dans les controllers (CommuneStateProvider)

**Livrable :** API fonctionnelle avec données France entière (BAN + Cadastre + DVF + DPE)

---

## Phase 2 — Frontend MVP (Juillet 2026)

### 2.1 — Setup Next.js

- [x] Initialiser le projet Next.js 16 (App Router)
- [x] Setup Tailwind CSS + shadcn/ui
- [x] Setup MapLibre GL JS
- [x] Configuration des variables d'environnement
- [x] Connexion à l'API Symfony

### 2.2 — Page Carte

- [x] Carte de base (martin self-hosted — tuiles servies depuis MBTiles généré en Phase 1)
- [x] Couche parcelles cadastrales (zoom > 15)
- [x] Couche transactions DVF (points colorés par prix/m²)
- [x] Couche DPE (points colorés par étiquette)
- [x] Sélecteur de fonds de carte (IGN, OpenStreetMap, Satellite, Cadastre) — différenciateur vs Pappers
- [x] Sélecteur de couches de données
- [x] Panneau latéral d'info au clic sur une parcelle (lazy-loading, updatedAt par section)
- [ ] Couche PLU (zones colorées) — différé Phase 4
- [x] Zone Alsace-Moselle (57/67/68) grisée — décision : pas de données disponibles, grisé à tous les niveaux

### 2.2b — Découpage administratif (drill-down)

> Ajout identifié comme étape manquante : navigation spatiale par niveaux administratifs.
> Source : `geo.api.gouv.fr` (GeoJSON officiel Etalab, simplifié).

- [x] Tables PostGIS `regions`, `departements`, `communes` (migration + import `app:import:admin`)
- [x] Couche Régions cliquable (zoom 4–7) → zoom vers département
- [x] Couche Départements cliquable (zoom 7–10) → zoom vers commune
- [x] Couche Communes cliquable (zoom 10–14) → zoom vers parcelles
- [x] Alsace-Moselle (57/67/68) grisée à tous les niveaux admin
- [x] Toggle "Limites admin." dans le sélecteur de couches

### 2.3 — Fiches

- [x] Fiche Parcelle (`/parcelle/{id_parcelle}`) — mini-carte, transactions DVF, DPE, comparaison commune
- [x] Lien "Voir la fiche" dans l'InfoPanel
- [x] Fiche Adresse (`/adresse/{ban_id}`)
- [x] Fiche Commune (`/commune/{code_insee}`)
- [x] Composants réutilisables : carte miniature, tableau transactions, badge DPE

### 2.4 — Recherche

- [x] Barre de recherche adresse (autocomplétion BAN)
- [x] Redirect vers fiche appropriée après sélection

**Livrable :** application consultable publiquement (sans SEO optimisé)

---

## Phase 3 — Enrichissement données

- [x] Import données risques (Géorisques API)
- [x] Import secteurs ABF (Patrimoine — monuments historiques Mérimée)
- [x] Import BDNB (bâtiments)
- [x] Import RNIC (copropriétés)
- [x] Import Sitadel (permis de construire)
- [x] Import SIRENE (entreprises à l'adresse — croiser avec parcelles)
- [ ] Import locaux et parcelles des personnes morales DGFiP (propriétaires entreprises/collectivités)
- [ ] Couches carto supplémentaires (altimétrie, géologie) — différé post-V1
- [ ] Intégration orthophotos historiques IGN — différé post-V1
- [x] POI à proximité (via Overpass API OpenStreetMap)

**Livrable :** la plateforme la plus exhaustive du marché

---

## Phase 4 — SEO & Contenu

### 4.1 — ISR pour les fiches (priorité 1)

- [x] Configurer l'ISR Next.js par type de fiche
- [x] Balises méta dynamiques (title, description, Open Graph)
- [x] Données structurées JSON-LD (Schema.org : `Place`, `City`, `BreadcrumbList`)
- [x] Breadcrumbs structurés (JSON-LD)

### 4.2 — Génération des URLs et sitemaps (priorité 2)

- [x] Définir l'arborescence d'URLs SEO (communes + parcelles avec transactions)
- [x] Générer sitemap XML par type d'entité (communes ~35k + parcelles ~5-8M par batches de 50k)

### 4.3 — Contenu enrichi (priorité 3)

- [x] Templates de texte dans les React Server Components Next.js (résumé parcelle + commune : prix médian, tendance, DPE)
- [x] Graphiques d'évolution des prix (SVG custom — Recharts non nécessaire)
- [x] Historique de la parcelle affiché dans la fiche (timeline transactions + DPE + permis)

**Livrable :** site crawlable par Google avec contenu structuré

---

## Phase 5 — Webdesign & Identité

### 5.1 — Nom & domaine
- [x] Trouver le nom définitif du produit : **Geocopia**
- [x] Commander le nom de domaine : `geocopia.fr` réservé
- [x] Réserver `geocopia.com` (défensif) — commandé mai 2026

### 5.2 — Charte graphique (Claude Design)
- [x] Définir l'identité visuelle (palette, typographie, logo) via Claude Design
- [x] Valider la charte sur une maquette — design exporté et sauvegardé (`src/styles/geocopia-uikit.css`)

### 5.3 — Redesign application
- [x] Implémenter le design system (globals.css — tokens Geocopia : slate + amber + DPE)
- [x] Mise à jour layout.tsx : Syne + Inter + JetBrains Mono, Geocopia → layout.tsx
- [x] Appliquer la charte graphique à la page Carte + InfoPanel (380px, chip PARCELLE, stats grid, CTA)
- [x] Fiche parcelle : dark hero (slate-900), mini-carte satellite IGN interactive, section icons colorées, layout éditorial 2 colonnes
- [x] Header partagé GeocopiaHeader (logo gauche, barre de recherche centrée, nav droite)
- [x] Favicon : picto G (slate-900 + amber) via next/og
- [x] Carte : couleurs accent amber sur les aires admin (au lieu du bleu)
- [x] TOC fiche parcelle : navigation fluide avec scrollIntoView client-side
- [x] Dates de mise à jour per-source dans le breadcrumb (DVF · DPE)
- [x] Recherche fiche parcelle : redirige vers la parcelle associée à l'adresse
- [x] Appliquer la charte aux fiches commune et adresse

**Livrable :** application avec une identité visuelle cohérente et professionnelle

---

## Phase 6 — Mise en production

### 6.1 — Serveur VPS + imports initiaux

> **Changement de stratégie :** les imports de données France entière se font directement
> sur le VPS, pas en local. Le Mac sert uniquement au développement (tests sur 1–2 depts).
> Raisons : disque local insuffisant (~120 GB pour BAN + PCI + MBTiles), RAM limitée.
> Un VPS datacenter télécharge data.gouv.fr beaucoup plus vite qu'une connexion domicile.

**Infrastructure — décision :**
> **OVH VPS-3** — 8 vCPU, 24 GB RAM, 200 GB NVMe, **16,99€ HT/mois (~20,39€ TTC)**
> OS : **Debian 13** (version obtenue à la commande)
> Scaleway éliminé (block storage à 0,87€/GB/mois). Hetzner écarté (hébergeur allemand).
> Users : `debian` (admin sudo), `david` (applicatif, sans sudo)
> Tunnel SSH : `ssh -i ~/.ssh/alua -L 5432:localhost:5432 david@54.37.39.140 -N`

- [x] Commander le VPS OVH VPS-3 sous Debian 13
- [x] Configurer l'accès SSH (clé publique pour tunnel, mot de passe conservé pour admin)
- [x] Installer PHP 8.3 + extensions (intl, pgsql, gd, zip, mbstring…)
- [x] Installer PostgreSQL 17 + PostGIS 3 (via dépôts PGDG)
- [x] Installer tippecanoe + martin
- [x] Installer Node.js 22 LTS, Composer, Symfony CLI
- [x] Configurer le firewall UFW (PostgreSQL et martin non exposés sur l'IP publique)
- [x] Créer la base `alua` + rôle `alua` + extensions PostGIS
- [x] Tunnel SSH Mac ↔ VPS opérationnel (port 5432)
- [x] Import BAN France entière (25 142 300 adresses)
- [x] Import PCI France entière (62 026 029 parcelles + liaisons KNN + MBTiles 73 GB)
- [x] Import DVF France entière (liaisons parcelle : 16 022 133 · liaisons adresse KNN : 22 807)
- [x] Import DPE France entière (via API ADEME, dept par dept)

**Accès PostgreSQL depuis le Mac pour le développement :**

Ne pas ouvrir le port 5432 publiquement. Deux options :

- **Option A — Tunnel SSH** (zéro config serveur, recommandé pour démarrer) :
  ```bash
  # À lancer dans un terminal dédié avant de dev
  ssh -L 5432:localhost:5432 user@vps -N
  ```
  Puis dans `.env.local` : `DATABASE_URL="postgresql://alua_user@127.0.0.1:5432/alua?serverVersion=17&charset=utf8"`

- **Option B — Tailscale** (plus confortable, IP fixe stable même si IP domicile change) :
  ```bash
  brew install tailscale   # Mac
  apt install tailscale    # VPS (puis tailscale up sur les deux)
  ```
  Puis dans `.env.local` : `DATABASE_URL="postgresql://alua_user@100.x.x.x:5432/alua?serverVersion=17&charset=utf8"`

  PostgreSQL autorise l'IP Tailscale dans `pg_hba.conf` uniquement.

**Imports initiaux (dans cet ordre) :**
```bash
# 1. Migrations Doctrine
php bin/console doctrine:migrations:migrate --no-interaction

# 2. BAN — adresses France entière (~1h, ~30 GB en base)
php bin/console app:import:ban --all

# 3. PCI — parcelles France entière + liaison KNN (~3h, ~80 GB en base)
bash scripts/build-mbtiles-france.sh
# (le script fait : import PCI --all + tippecanoe par dept + tile-join + linking)

# 4. DVF, DPE — après Phase 1.4 et 1.5
php bin/console app:import:dvf --all
php bin/console app:import:dpe
```

**Dimensionnement disque VPS (estimé d'après imports réels sur dept 32) :**
| Données | Taille estimée |
|---------|---------------|
| PostgreSQL BAN (24M adresses) | ~7 GB |
| PostgreSQL PCI (62M parcelles + index + liens) | ~13 GB |
| PostgreSQL DVF + DPE | ~15 GB |
| MBTiles France (zoom 14–18) | ~55 GB |
| OS + Symfony + Next.js + logs | ~10 GB |
| **Total** | **~100 GB** |

→ Le VPS-3 (200 GB NVMe) couvre les besoins avec **~100 GB de marge** pour la croissance.

### 6.2 — Déploiement applicatif
- [x] Soumettre le sitemap à Google Search Console — `/sitemap.xml` index (1 communes + 161 parcelles batches) soumis le 24/05/2026
- [x] Page mentions légales (`/mentions-legales`) — éditeur, hébergeur, RGPD, sources
- [x] Déploiement frontend sur VPS (rsync + npm ci + npm run build)
- [x] PM2 : `geocopia-front` port 3001, martin via systemd port 3000
- [x] nginx : rate limiting 60 req/min, proxy Next.js / Symfony / martin — `tracking/nginx-geocopia.conf`
- [x] SSL Let's Encrypt — cert geocopia.fr + www, renouvellement auto Certbot
- [x] Ancienne config `alua` (URL VPS temporaire) désactivée
- **Décision :** `/api` reste public (nécessaire pour appels client-side) — protégé rate limiting nginx + Cloudflare Phase 6.3
- [x] CI/CD GitHub Actions (déploiement automatique sur push main) — `.github/workflows/deploy.yml`
- [x] Script de déploiement Symfony (cache warmup, migrations auto) — `scripts/deploy-backend.sh`
- [x] Script de déploiement Next.js (build + redémarrage PM2) — `scripts/deploy-frontend.sh`
- [x] Variables d'environnement de production sécurisées — `.env.local` créé sur VPS (APP_SECRET + DATABASE_URL)

**GitHub Secrets à configurer** (`Settings → Secrets and variables → Actions`) :
| Secret | Valeur |
|--------|--------|
| `VPS_HOST` | `54.37.39.140` |
| `VPS_USER` | `david` |
| `VPS_SSH_KEY` | clé privée ED25519 dédiée CI/CD (à générer) |

**Génération de la clé CI/CD** (à faire une seule fois) :
```bash
ssh-keygen -t ed25519 -C "github-actions-geocopia" -f ~/.ssh/geocopia_deploy -N ""
# Ajouter la clé publique sur le VPS :
ssh-copy-id -i ~/.ssh/geocopia_deploy.pub david@54.37.39.140
# Copier la clé privée dans le secret GitHub VPS_SSH_KEY :
cat ~/.ssh/geocopia_deploy
```

**Variables d'environnement backend VPS** (`/home/david/www/alua/alua-backend/.env.local`) :
```dotenv
APP_SECRET=<32-char-random>
DATABASE_URL="postgresql://alua:<password>@127.0.0.1:5432/alua?serverVersion=17&charset=utf8"
```

### 6.3 — Cloudflare
- [x] Pointer le domaine geocopia.fr sur Cloudflare (changer les NS)
- [x] SSL/TLS Full (strict)
- [x] Activer le CDN et les règles de cache (tiles : 1 day, api : bypass)
- [x] **Bot Fight Mode + rate limiting strict sur `/api/*`** (20 req/10s par IP — protection scraping)
- [x] Créer la boîte mail contact@geocopia.fr (Email Routing → dcrbernard@gmail.com)

### 6.4 — Publicité
- [x] Intégration Google AdSense — script `ca-pub-4247463955296045` dans `layout.tsx`, propriété validée
- [x] CMP Google (consentement RGPD EEE) — message 2 choix configuré
- [ ] Site en cours d'examen Google (1–7 jours) — attendre approbation avant de placer les encarts
- [ ] Positionnement des encarts pub (sans dégrader le Core Web Vitals)

### 6.5 — Mises à jour récurrentes (post go-live)

Les commandes d'import sont idempotentes (`ON CONFLICT DO UPDATE`) — on les relance
directement sur le VPS selon les TTL.

| Source | Commande VPS | Fréquence |
|--------|-------------|-----------|
| BAN | `app:import:ban --all` | ~tous les 75 jours |
| PCI | `bash scripts/build-mbtiles-france.sh` | ~tous les 180 jours |
| DVF | `app:import:dvf --all` | 1×/an (publication DGFiP, généralement mai) |
| DPE | `app:import:dpe` | selon TTL Phase 1.7 |

- [x] Configurer les cronjobs de refresh (voir Phase 1.7) — `scripts/refresh-ban.sh`, `refresh-dvf.sh`, `refresh-pci.sh` + crontab dans `tracking/08-setup-vps.md §13`

**Livrable :** site en ligne, déploiements automatisés, données France entière en base

---

## Phase 7 — SEO Croissance

> Objectif : passer de l'indexation initiale (communes + parcelles) à une croissance organique
> durable via les leviers techniques et éditoriaux identifiés dans `06-seo-strategie.md`.

### 7.1 — URL slugs communes (priorité 1)

> Actuellement `/commune/31000`, le doc stratégie prévoit `/commune/toulouse`.
> Le slug dans l'URL est un signal SEO direct pour les requêtes "prix immobilier toulouse".

- [x] Ajouter un champ `slug` sur la table `communes` — migration `Version20260525000000` (+ `departements`, `regions`)
- [x] Générer les slugs à l'import (`app:import:admin` — translitération PHP intl + résolution conflits SQL)
- [x] Mettre à jour les routes Next.js : `[code]` → `[slug]`
- [x] Redirections 301 : `/commune/31000` → `/commune/toulouse` (via `permanentRedirect` dans le RSC)
- [x] Mettre à jour le SitemapController (retourne les slugs)
- [ ] Mettre à jour le maillage interne (InfoPanel, breadcrumbs, liens communes voisines)

### 7.2 — Hiérarchie manquante : départements + régions

> Ces pages sont des hubs d'autorité. Google remonte le jus de crawl vers les fiches
> communes et parcelles. Actuellement absentes du site.

- [x] Fiche département (`/departement/haute-garonne`) : stats agrégées DVF, nb communes, carte
- [x] Fiche région (`/region/occitanie`) : idem + liste des départements
- [x] Breadcrumb mis à jour : Région > Département > Commune (JSON-LD + visuel)
- [x] Ajouter fiche département + région au sitemap (`sitemap/admin.xml`)
- [x] Schema.org `AdministrativeArea` sur ces pages

### 7.3 — Maillage interne (priorité 2)

> Chaque page doit pointer vers ses voisines. Actuellement le maillage commune ↔ parcelle
> existe, mais les liens horizontaux (communes voisines, autres adresses de la même rue) manquent.

- [x] Communes voisines sur la fiche commune (8 communes limitrophes, via PostGIS ST_DWithin 100m sur geometry MultiPolygon)
- [ ] Page rue (`/commune/toulouse/rue/rue-de-la-paix`) : liste des adresses, dernières transactions
- [ ] "Autres adresses au même numéro de rue" sur la fiche adresse
- [ ] "Parcelles adjacentes" sur la fiche parcelle (ST_Touches)
- [x] Footer commune sur fiche adresse et parcelle (lien vers la fiche commune parente) — adresse : bloc sidebar ; parcelle : déjà présent via "Comparaison commune" + breadcrumb

### 7.4 — Enrichissement Schema.org

> Les rich snippets améliorent le CTR dans les SERPs. Les transactions DVF sont des données
> structurées parfaites pour `RealEstateListing`.

- [x] `RealEstateListing` + `Offer` pour chaque transaction DVF sur les fiches (prix, date, surface) — fiche parcelle (10 tx) + fiche commune (20 tx)
- [x] `GeoCoordinates` sur les fiches adresse et parcelle (lat/lng depuis PostGIS)
- [x] `FAQPage` sur les fiches commune — 3 Q&R générées dynamiquement (prix médian, nb ventes, DPE)
- [x] `Dataset` en JSON-LD sur la page d'accueil (référence les sources ouvertes utilisées)

### 7.5 — Performance & Stabilité (anti-503)

> TTFB trop lent sur les fiches à froid = risque Core Web Vitals = pénalité ranking.
> Noté en mémoire projet depuis Phase 6.2.

- [x] Timeouts agressifs sur les appels API externes (Géorisques 5s, Overpass 10s) — évite l'épuisement workers PHP-FPM
- [x] Index Doctrine `CONCURRENTLY` (sans bloquer les tables) — migration `Version20260525100000`
- [x] Script `tune-vps-root.sh` : PHP-FPM `pm.max_children = 30` → monter à 50 sur VPS
- [x] Symfony HttpCache en prod (`index.php`) + `ApiCacheControlSubscriber` (TTL par endpoint) — cache hits ~5ms
- [x] `DatabaseTimeoutSubscriber` : `SET statement_timeout = 15000` — libère les workers PHP-FPM en 15s max
- [x] `generateStaticParams` sur régions (13) et départements (96) — élimine l'ISR cold sur ces pages
- [x] Fiche parcelle : 5 endpoints lents (risques, entreprises, POI, copropriétés, permis) déplacés en client-side pour libérer les workers PHP-FPM pendant le SSR
- [x] `prefetch={false}` sur tous les `<Link>` des fiches (parcelle, commune, département, région) — stoppe la tempête de RSC prefetches qui épuisait le pool PHP-FPM en cascade
- [x] Augmenter PHP-FPM `pm.max_children = 50` sur le VPS (24 GB RAM → très confortable)
- [x] Script de warm-up post-deploy : GET sur les 500 fiches les plus consultées — `scripts/warmup.sh`, lancé en background par `deploy-frontend.sh`, log dans `/tmp/warmup.log`
- [ ] `EXPLAIN ANALYZE` sur les requêtes PostGIS lentes (fiche parcelle : ST_DWithin KNN)

### 7.5b — Récupération SEO (suite déplacement client-side)

> Les 5 sections déplacées en client-side (risques, entreprises, POI, copropriétés, permis)
> sont indexées par Google mais avec un délai (second wave JS rendering). À terme, les
> remettre en SSR sans sacrifier la stabilité.

- [x] **Stocker résultats Géorisques en PostgreSQL** avec TTL 30 jours (`risques_cache`) — `poi_cache` (Overpass) existait déjà. Premier hit → Géorisques ~2s + store, suivants → DB <10ms
- [x] **Remettre les 5 sections en SSR via Suspense streaming** — `ParcelleServerSections.tsx` (async Server Components), `<Suspense>` dans `page.tsx`, `ParcelleClientSections.tsx` supprimé. Contenu dans le HTML initial, indexable par Google sans JS.
- [ ] Vérifier l'indexation de ces sections dans Google Search Console (Coverage + Rich Results)

### 7.6 — Sitemaps adresses (vague 2)

> 25M d'URLs d'adresses non soumises. Crawl budget à ménager : soumettre par vague,
> grandes villes d'abord (trafic longue traîne le plus fort).

- [x] SitemapController : endpoints `/api/sitemap/adresses/counts` + `/api/sitemap/adresses/{dept}/{batch}` (50 000 adresses/batch, filtré par `commune_code LIKE '{dept}%'`)
- [x] Route Next.js `sitemap/adresses-{dept}-{batch}.xml` (même pattern que parcelles, priority 0.5)
- [ ] Vague 2 : déployer + soumettre les 10 départements les plus peuplés dans Google Search Console (75, 69, 13, 33, 31, 06, 67, 76, 44, 34)
- [ ] Vague 3 : soumettre le reste progressivement (1 dept/semaine via cron)

### 7.7 — Contenu éditorial (longue traîne + backlinks)

> Les fiches programmatiques captent la longue traîne transactionnelle.
> Le contenu éditorial capte les requêtes informationnelles et génère des backlinks.

- [ ] ~~Guides éditoriaux~~ — **différé post-V1** : nécessite une expertise rédactionnelle métier (DPE, cadastre, DVF) que l'équipe n'a pas encore
- [ ] Référencement sur `data.gouv.fr` (réutilisateurs des données BAN/DVF/DPE) — lien dans /open-data
- [x] Page `/open-data` : crédits sources + liens retour vers data.gouv.fr (backlinks institutionnels) — 9 sources, Schema.org DataCatalog, CTA réutilisateurs

---

## Phase 8 — API B2B

### 8.1 — Conception API publique
- [ ] Définir le périmètre de l'API (endpoints, niveaux d'accès, quotas)
- [ ] Authentification par clé API (header `X-Api-Key`)
- [ ] Rate limiting par clé (ex. 1 000 req/jour gratuit, paliers payants)

### 8.2 — Documentation et portail développeur
- [ ] Documentation OpenAPI / Swagger auto-générée
- [ ] Page `/developers` avec exemples d'intégration
- [ ] Portail self-service : création de compte, génération de clé, suivi quota

### 8.3 — Monétisation API
- [ ] Intégration Stripe (abonnements mensuels par palier)
- [ ] Webhooks Stripe → activation/désactivation clés
- [ ] Dashboard client (consommation, factures)

### 8.4 — Distribution
- [ ] Référencement sur api.gouv.fr (données immobilières)
- [ ] Partenariats ciblés (notaires, agents immobiliers, banques, proptech)

**Livrable :** API B2B documentée, monétisée et accessible en self-service

