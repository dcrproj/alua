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
Phase 2 — Frontend         ░░░░░░ À venir
Phase 3 — SEO & contenu    ░░░░░░ À venir
Phase 4 — Enrichissement   ░░░░░░ À venir
Phase 5 — API B2B          ░░░░░░ À venir
Phase 6 — Mise en prod     ░░░░░░ À venir
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

- [ ] Initialiser le projet Next.js 15 (App Router)
- [ ] Setup Tailwind CSS + shadcn/ui
- [ ] Setup MapLibre GL JS
- [ ] Configuration des variables d'environnement
- [ ] Connexion à l'API Symfony

### 2.2 — Page Carte

- [ ] Carte de base (martin self-hosted — tuiles servies depuis MBTiles généré en Phase 1)
- [ ] Couche parcelles cadastrales (zoom > 15)
- [ ] Couche transactions DVF (points colorés par prix/m²)
- [ ] Couche DPE (points colorés par étiquette)
- [ ] Sélecteur de fonds de carte (IGN, OpenStreetMap, Satellite, Cadastre) — différenciateur vs Pappers
- [ ] Sélecteur de couches de données
- [ ] Panneau latéral d'info au clic sur une parcelle
- [ ] Couche PLU (zones colorées)
- [ ] Zone Alsace-Moselle (67/68/57) grisée avec tooltip "Zone non disponible"

### 2.3 — Fiches

- [ ] Fiche Parcelle (`/parcelle/{id_parcelle}`)
- [ ] Fiche Adresse (`/adresse/{ban_id}`)
- [ ] Fiche Commune (`/commune/{code_insee}`)
- [ ] Composants réutilisables : carte miniature, tableau transactions, badge DPE

### 2.4 — Recherche

- [ ] Barre de recherche adresse (autocomplétion BAN)
- [ ] Redirect vers fiche appropriée après sélection

**Livrable :** application consultable publiquement (sans SEO optimisé)

---

## Phase 3 — SEO & Contenu (Août 2026)

### 3.1 — Génération des URLs et sitemaps

- [ ] Définir l'arborescence d'URLs SEO (voir `06-seo-strategie.md`)
- [ ] Générer sitemap XML par type d'entité (communes, parcelles…)
- [ ] Soumettre à Google Search Console

### 3.2 — ISR pour les fiches

- [ ] Configurer l'ISR Next.js par type de fiche
- [ ] Balises méta dynamiques (title, description, Open Graph)
- [ ] Données structurées JSON-LD (Schema.org : `Place`, `RealEstateListing`)
- [ ] Breadcrumbs structurés

### 3.3 — Contenu enrichi

- [ ] Templates de texte dans les React Server Components Next.js (prix médian, évolution, DPE moyen…)
- [ ] Graphiques d'évolution des prix (Recharts ou Chart.js)
- [ ] Historique de la parcelle affiché dans la fiche

### 3.4 — Publicité

- [ ] Intégration Google AdSense
- [ ] Positionnement des encarts pub (sans dégrader le Core Web Vitals)

**Livrable :** site crawlable par Google avec contenu structuré

---

## Phase 4 — Enrichissement données (T4 2026)

- [ ] Import données risques (Géorisques API)
- [ ] Import secteurs ABF (Patrimoine)
- [ ] Import BDNB (bâtiments)
- [ ] Import RNIC (copropriétés)
- [ ] Import Sitadel (permis de construire)
- [ ] Import SIRENE (entreprises à l'adresse — croiser avec parcelles)
- [ ] Import locaux et parcelles des personnes morales DGFiP (propriétaires entreprises/collectivités)
- [ ] Couches carto supplémentaires (altimétrie, géologie)
- [ ] Intégration orthophotos historiques IGN
- [ ] POI à proximité (via Overpass API OpenStreetMap)

**Livrable :** la plateforme la plus exhaustive du marché

---

## Phase 5 — API B2B (2027)

- [ ] Définir le catalogue de l'API publique
- [ ] Système d'authentification API (clés API, OAuth2)
- [ ] Rate limiting par plan
- [ ] Documentation API (Swagger / Stoplight)
- [ ] Tableau de bord client (usage, factures)
- [ ] Intégration paiement (Stripe)
- [ ] Plans tarifaires : Starter / Pro / Enterprise

**Livrable :** API commercialisable avec documentation et portail développeur

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
- [ ] Configurer nginx avec rate limiting par IP (60–120 req/min)
- [ ] Configurer SSL (Let's Encrypt / Certbot)
- [ ] **Désactiver l'accès public à `/api/*` en production** (front et back sur le même serveur — l'API est appelée en interne via `localhost`, pas exposée publiquement ; bloquer dans nginx avec `allow 127.0.0.1; deny all;` sur la location `/api`)
- [ ] CI/CD GitHub Actions (tests + déploiement automatique sur push main)
- [ ] Script de déploiement Symfony (cache warmup, migrations auto)
- [ ] Script de déploiement Next.js (build + redémarrage PM2 ou équivalent)
- [ ] Variables d'environnement de production sécurisées

### 6.3 — Cloudflare
- [ ] Configurer le domaine sur Cloudflare
- [ ] Activer le CDN et les règles de cache

### 6.4 — Mises à jour récurrentes (post go-live)

Les commandes d'import sont idempotentes (`ON CONFLICT DO UPDATE`) — on les relance
directement sur le VPS selon les TTL.

| Source | Commande VPS | Fréquence |
|--------|-------------|-----------|
| BAN | `app:import:ban --all` | ~tous les 75 jours |
| PCI | `bash scripts/build-mbtiles-france.sh` | ~tous les 180 jours |
| DVF | `app:import:dvf --all` | 1×/an (publication DGFiP, généralement mai) |
| DPE | `app:import:dpe` | selon TTL Phase 1.7 |

- [ ] Configurer les cronjobs de refresh (voir Phase 1.7)

**Livrable :** site en ligne, déploiements automatisés, données France entière en base
