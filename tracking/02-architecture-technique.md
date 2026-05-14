# 02 — Architecture technique

## Stack recommandée

### Backend — Symfony 7 + API Platform 3
**Justification :**
- API Platform génère REST + GraphQL automatiquement → idéal pour Phase 2 (API B2B)
- Symfony Messenger pour les jobs d'import asynchrones (queues)
- Doctrine + `jsor/doctrine-postgis` pour les types géospatiaux
- Console Commands pour les importeurs batch
- Écosystème mature, typage fort, performances suffisantes

> **Challenge :** si le volume d'import devient très lourd (100M+ parcelles cadastrales),
> envisager des workers Python/Go pour les ETL d'import uniquement,
> en gardant Symfony pour l'API.

### Frontend — Next.js 15 (App Router)
**Justification :**
- SSG / ISR pour les fiches SEO : chaque fiche adresse peut être pré-rendue statiquement ou regénérée à la demande
- SSR pour la carte interactive (données dynamiques)
- App Router + React Server Components → rendu serveur optimal pour le SEO
- Excellent support TypeScript

### Cartographie — MapLibre GL JS + Tuiles vectorielles
**Justification :**
- Open source, pas de dépendance Mapbox (coût)
- Compatible avec les tuiles vectorielles Etalab (`openmaptiles.geo.data.gouv.fr`)
- Supporte les couches WMS (Géoportail, Géoportail Urbanisme)
- `maplibre-gl` React wrapper disponible

**Stratégie tuiles cadastrales — martin dès le départ :**

martin est un binaire Rust unique, sans Docker, installable via Homebrew (`brew install martin`). Il tourne sur `localhost:3000` et sert des tuiles vectorielles à MapLibre GL JS.

Workflow :
1. Télécharger les GeoJSON PCI Etalab (96 départements)
2. Générer le MBTiles avec tippecanoe (`brew install tippecanoe`) — opération semestrielle
3. martin pointe sur le fichier MBTiles (~15 GB sur disque, hors base PostgreSQL)
4. En attendant le premier build MBTiles : tuiles Etalab en fallback

Avantage : les attributs de nos parcelles (DPE, prix/m²) peuvent être intégrés dans les tuiles → coloration serveur-side, différenciateur direct vs Pappers.

**Principe fondamental :** les géométries polygonales des parcelles **ne sont pas stockées dans PostgreSQL**. Elles vivent dans le MBTiles servi par martin. La base ne contient que les attributs (identifiant, commune, surface, centroïde). Cela réduit le cadastre de ~150 GB à ~3 GB en base.

### Base de données — PostgreSQL 17 + PostGIS
**Justification :**
- PostGIS = référence pour les données géographiques
- Stockage natif des géométries (POLYGON, POINT, MULTIPOLYGON)
- Index GiST pour les requêtes spatiales rapides
- Compatible avec l'ensemble du cadastre (GeoJSON natif)

### Cache — Redis
- Cache des réponses API (TTL par entité)
- File d'attente des jobs de mise à jour (Symfony Messenger + Redis transport)

### Infra
- **Développement local** : sans Docker — PHP + PostgreSQL + Redis installés directement sur la machine
- **Production** : VPS OVH (à configurer ultérieurement)
- Docker uniquement si une dépendance le rend indispensable (ex : service tiers sans package natif macOS)

---

## Schéma d'architecture

```
┌─────────────────────────────────────────────────────────────┐
│  SOURCES EXTERNES                                           │
│  BAN · API Cadastre · ADEME DPE · Géoportail Urbanisme     │
│  DVF (fichiers trimestriels) · Géoportail · Risques        │
└───────────────────────────┬─────────────────────────────────┘
                            │ Import batch + API pull
                ┌───────────▼───────────┐
                │  Symfony Workers      │
                │  (Messenger + Queue)  │
                │  ETL · Normalisation  │
                └───────────┬───────────┘
                            │
                ┌───────────▼───────────┐
                │  PostgreSQL + PostGIS │
                │  + Historique données │
                └───────┬───────┬───────┘
                        │       │
               ┌────────▼─┐  ┌──▼────────┐
               │  Redis   │  │  Symfony  │
               │  Cache   │  │  API      │
               │  (TTL)   │  │  Platform │
               └────────┬─┘  └──┬────────┘
                        │       │
                ┌────────▼───────▼────────┐
                │      Next.js 15         │
                │  ISR fiches SEO         │
                │  SSR carte interactive  │
                │  MapLibre GL JS         │
                └─────────────────────────┘
```

---

## Challenge de l'idée de mise à jour à la demande (TTL)

### Idée initiale
> Charger la France entière en base, puis re-fetcher à la demande si le TTL est expiré.

### Problème identifié : le "Cold Start SEO"
Si on génère des milliers de fiches SEO (pour le crawl Google), les données doivent
**déjà être en base** au moment du rendu. Un système purement à la demande ne fonctionnera
pas : Google indexe des URLs vides ou sans données = pénalité SEO.

### Solution hybride recommandée

| Source | Stratégie import | TTL mise à jour |
|---|---|---|
| DVF | Import complet trimestriel (fichiers DGFiP) | 90 jours (publication trimestrielle) |
| Cadastre (PCI) | Import complet semestriel (fichiers Etalab) | 180 jours |
| DPE | Import complet initial + API ADEME à la demande | 30 jours |
| BAN (adresses) | Import complet + sync 2x/semaine (BAN publie 2x/sem) | 7 jours |
| PLU Urbanisme | API Géoportail Urbanisme à la demande | 60 jours |
| Risques | Import initial GASPAR + rare mise à jour | 365 jours |
| ABF Patrimoine | Import initial + rarement modifié | 365 jours |

**Principe :** import complet pour les données "structurantes" (DVF, cadastre, adresses),
TTL + API pull pour les données "enrichissantes" (DPE, PLU, risques).

### Volume estimé en base (après décision "pas de géométries parcelles")

| Source | Taille estimée PostgreSQL |
|---|---|
| BAN (26M adresses, avec point GPS) | ~8 GB |
| DVF (depuis 2014, ~50M lignes) | ~20 GB |
| DPE (10M diagnostics) | ~5 GB |
| Cadastre (attributs seuls, sans polygones) | ~3 GB |
| Communes / EPCIs / stats agrégées | < 1 GB |
| **Total estimé** | **~37 GB** |

Un VPS OVH à ~20€/mois (320 GB SSD, 16 GB RAM) est **confortablement suffisant** pour ce volume.
Le fichier MBTiles du cadastre (pour martin, si besoin) vivra séparément sur disque (~15 GB).

---

## Points techniques actés

### Tuiles vectorielles

| | Etalab (gratuit) | Self-hosted (martin) |
|---|---|---|
| Coût | Gratuit | ~15 GB disque + CPU build MBTiles |
| Maintenance | Zéro | Regénérer MBTiles à chaque import cadastre (semestriel) |
| Personnalisation | Aucune | Attributs custom dans les tuiles (coloration DPE, prix/m²) |
| Dépendance externe | Oui | Non |

**Décision :** martin dès le départ. Les tuiles colorées serveur-side (DPE, prix/m²) sont un différenciateur direct vs Pappers et justifient la complexité supplémentaire. Etalab en fallback pendant la génération du premier MBTiles.

---

### Stratégie de protection de l'API par phase

**Phase 1 — Modèle publicitaire :**
Le problème est différent de ce qu'on pensait. Des Route Handlers Next.js qui proxifient Symfony ne changent rien : ces endpoints proxifiés sont tout aussi appelables par `curl`. CORS n'aide pas (protection navigateur uniquement).

Mais pour le modèle publicitaire, **le problème n'est pas critique** — si des développeurs appellent nos endpoints JSON directement, ils n'impactent pas le revenu publicitaire. Le seul risque réel est le scraping massif de la base.

**Décision Phase 1 : rate limiting par IP dans nginx.**
- 60–120 requêtes/minute par IP (couverture largement suffisante pour un usage normal)
- Bloque les scrapers sans complexité applicative
- Symfony écoute sur `127.0.0.1` — son URL interne reste invisible, mais les endpoints `/api/...` de Next.js sont publics et c'est normal

**Phase 2 — API B2B :**
Là c'est un vrai problème : quelqu'un pourrait utiliser l'API payante sans payer.

**Décision Phase 2 : clé API obligatoire sur chaque requête.**
- Pas de clé = HTTP 401
- Rate limiting par plan (Starter / Pro / Enterprise)
- Symfony expose l'API publiquement mais refuse toute requête sans clé valide
- Standard du marché (Stripe, Google Maps, Pappers entreprises)

**Pas de proxy.** Le backend Symfony est directement accessible sur internet. La protection est assurée par le rate limiting nginx — pas par une architecture de proxy.

---

### CDN — Cloudflare offre gratuite

**Décision : Cloudflare free suffit pour le MVP et au-delà.**

Ce que couvre le free tier :
- CDN mondial (assets JS/CSS Next.js, images)
- SSL automatique
- Protection DDoS basique
- Cache HTTP via headers `Cache-Control` (Next.js/Symfony pilotent le TTL)

Limite notable : seulement 3 Cache Rules personnalisées. Contournable via les headers HTTP standard.

Passage à Pro (20$/mois) envisageable après 100K utilisateurs/mois ou pour des règles de cache fines.

---

### Monitoring

Hors scope pour le moment. À reconsidérer quand le site est en production.

## Décisions actées

| Décision | Choix | Date |
|---|---|---|
| Hébergeur | VPS OVH (prod) / natif local (dev) | Avr 2026 |
| Docker | Pas de Docker sauf nécessité absolue | Avr 2026 |
| Structure repos | 2 repos dans `/alua/` : `alua-backend/` + `alua-frontend/` | Avr 2026 |
| Alsace-Moselle | Carte grisée "Zone non disponible" (comme Pappers) — fiches SEO maintenues | Avr 2026 |
| Priorité démarrage | Backend + import données en premier | Avr 2026 |
| Tuiles vectorielles | martin self-hosted dès le départ (tuiles colorées DPE/prix/m²) | Avr 2026 |
| Protection API Phase 1 | Rate limiting par IP nginx (60–120 req/min) | Avr 2026 |
| Protection API Phase 2 | Clé API obligatoire (HTTP 401 sans clé valide) | Avr 2026 |
| CDN | Cloudflare offre gratuite | Avr 2026 |
| Monitoring | Hors scope Phase 1 | Avr 2026 |
