# 04 — Modèle de données

## Principes directeurs

1. **Historique complet** : toute modification d'une entité est tracée avec date et source
2. **TTL par entité** : chaque enregistrement sait quand il doit être re-synchronisé
3. **Source tracée** : chaque donnée porte sa provenance (DVF, BAN, ADEME…)
4. **Géographie native** : PostGIS pour tous les objets spatiaux

---

## Entités principales

### `parcelles`
Cœur du modèle : la parcelle cadastrale est l'objet de référence autour duquel tout s'agrège.

> **Décision architecturale :** les géométries polygonales des parcelles ne sont **pas** stockées
> en base. Elles vivent dans les tuiles vectorielles (Etalab ou martin/MBTiles).
> On stocke uniquement les attributs. Cela réduit le cadastre de ~150 GB à ~3 GB.
> La jointure parcelle ↔ adresse est calculée **une fois à l'import** via l'API Carto IGN
> et le résultat est persisté dans `parcelles_addresses`.

```sql
CREATE TABLE parcelles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_parcelle     VARCHAR(14) NOT NULL UNIQUE,  -- ex: 31506000AB0042
    commune_code    VARCHAR(5) NOT NULL,
    section         VARCHAR(2) NOT NULL,
    numero          VARCHAR(4) NOT NULL,
    contenance      INTEGER,                       -- surface cadastrale en m²
    centroid        GEOMETRY(Point, 4326),         -- centroïde uniquement (léger)
    source          VARCHAR(50) DEFAULT 'PCI_ETALAB',
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ttl_expires_at  TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_parcelles_centroid ON parcelles USING GIST(centroid);
CREATE INDEX idx_parcelles_commune ON parcelles(commune_code);
CREATE INDEX idx_parcelles_id_parcelle ON parcelles(id_parcelle);
```

### `parcelles_addresses`
Relation many-to-many entre parcelles et adresses (une parcelle peut avoir plusieurs entrées,
une adresse peut couvrir plusieurs parcelles — ex : immeuble d'angle).

```sql
CREATE TABLE parcelles_addresses (
    parcelle_id  UUID NOT NULL REFERENCES parcelles(id) ON DELETE CASCADE,
    address_id   UUID NOT NULL REFERENCES addresses(id) ON DELETE CASCADE,
    PRIMARY KEY (parcelle_id, address_id)
);
```

### `parcelles_history`
Log immuable de toutes les modifications.

```sql
CREATE TABLE parcelles_history (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parcelle_id     UUID NOT NULL REFERENCES parcelles(id),
    changed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    changed_fields  JSONB NOT NULL,   -- {contenance: {old: 120, new: 135}}
    source          VARCHAR(50) NOT NULL,
    import_batch_id UUID              -- lien vers le batch d'import
);
```

---

### `addresses`
Toutes les adresses de France (BAN).

```sql
CREATE TABLE addresses (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ban_id          VARCHAR(20) NOT NULL UNIQUE,  -- identifiant BAN
    numero          VARCHAR(10),
    voie            VARCHAR(255),
    code_postal     VARCHAR(5),
    commune         VARCHAR(255),
    commune_code    VARCHAR(5),
    geometry        GEOMETRY(Point, 4326) NOT NULL,
    source          VARCHAR(20) DEFAULT 'BAN',
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ttl_expires_at  TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_addresses_geometry ON addresses USING GIST(geometry);
CREATE INDEX idx_addresses_ban_id ON addresses(ban_id);
CREATE INDEX idx_addresses_commune ON addresses(commune_code);
```

---

### `mutations_dvf`
Une mutation = une vente. Immutable par design (les ventes ne changent pas).

> **Correction modèle :** une mutation DVF peut concerner plusieurs parcelles (ex : terrain + maison
> vendus ensemble). Le fichier DVF contient plusieurs lignes avec le même `id_mutation`.
> On sépare donc la mutation de ses lots, via `mutations_dvf_parcelles`.

```sql
CREATE TABLE mutations_dvf (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_mutation         VARCHAR(20) NOT NULL UNIQUE,
    date_mutation       DATE NOT NULL,
    valeur_fonciere     NUMERIC(15, 2) NOT NULL,
    source_trimestre    VARCHAR(10) NOT NULL,  -- ex: "2025-T3"
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE mutations_dvf_lots (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    mutation_id         UUID NOT NULL REFERENCES mutations_dvf(id),
    id_parcelle         VARCHAR(14),
    address_id          UUID REFERENCES addresses(id),
    type_local          VARCHAR(50),
    surface_reelle_bati NUMERIC(8, 2),
    nb_pieces           INTEGER,
    surface_terrain     NUMERIC(10, 2)
);

CREATE INDEX idx_dvf_lots_parcelle ON mutations_dvf_lots(id_parcelle);
CREATE INDEX idx_dvf_mutation_date ON mutations_dvf(date_mutation);
```

---

### `dpe`
DPE lié à une adresse (ou à une parcelle).

```sql
CREATE TABLE dpe (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_dpe          VARCHAR(20) NOT NULL UNIQUE,
    address_id          UUID REFERENCES addresses(id),
    date_etablissement  DATE NOT NULL,
    date_fin_validite   DATE,
    etiquette_dpe       CHAR(1),       -- A à G
    etiquette_ges       CHAR(1),       -- A à G
    type_batiment       VARCHAR(50),
    annee_construction  INTEGER,
    surface_habitable   NUMERIC(8, 2),
    type_energie_ch     VARCHAR(50),
    type_energie_ecs    VARCHAR(50),
    source              VARCHAR(20) DEFAULT 'ADEME',
    last_updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ttl_expires_at      TIMESTAMPTZ NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### `zonages_plu`
Données PLU par géométrie de zone.

```sql
CREATE TABLE zonages_plu (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    libelle_zone        VARCHAR(20),   -- UA, UB, N, A, AU…
    type_zone           VARCHAR(50),
    document_id         VARCHAR(64),   -- ID du document GPU
    commune_code        VARCHAR(5),
    geometry            GEOMETRY(MultiPolygon, 4326) NOT NULL,
    reglement_url       TEXT,
    source              VARCHAR(30) DEFAULT 'GPU',
    last_updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ttl_expires_at      TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_plu_geometry ON zonages_plu USING GIST(geometry);
```

---

### `communes` et `epcis`
Pour les fiches SEO et les agrégations.

> **Corrections modèle :**
> - Pas de `code_postal` VARCHAR(5) — une commune peut avoir plusieurs codes postaux.
>   Table dédiée `communes_codes_postaux`.
> - Les agrégats statistiques sont dans une table séparée `communes_stats` avec `computed_at`,
>   pour éviter d'invalider la ligne commune à chaque recalcul DVF.
> - Les géométries de contour des communes restent stockées (beaucoup plus légères que le cadastre :
>   ~35 000 polygones simples ≈ 200 MB).

```sql
CREATE TABLE communes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_insee          VARCHAR(5) NOT NULL UNIQUE,
    nom                 VARCHAR(255) NOT NULL,
    departement         VARCHAR(3),
    region              VARCHAR(5),
    population          INTEGER,
    geometry            GEOMETRY(MultiPolygon, 4326),
    epci_id             UUID REFERENCES epcis(id),
    -- Flags de disponibilité des données (exceptions légales/techniques)
    dvf_available       BOOLEAN NOT NULL DEFAULT true,   -- false pour 67, 68, 57
    pci_available       BOOLEAN NOT NULL DEFAULT true    -- false pour Strasbourg + communes limitrophes
);

CREATE TABLE communes_codes_postaux (
    commune_id  UUID NOT NULL REFERENCES communes(id),
    code_postal VARCHAR(5) NOT NULL,
    PRIMARY KEY (commune_id, code_postal)
);

CREATE TABLE communes_stats (
    commune_id          UUID PRIMARY KEY REFERENCES communes(id),
    prix_m2_median_appt NUMERIC(10, 2),
    prix_m2_median_maison NUMERIC(10, 2),
    nb_transactions_12m INTEGER,
    prix_m2_evolution_1an NUMERIC(5, 2),  -- % sur 12 mois
    prix_m2_evolution_5ans NUMERIC(5, 2), -- % sur 5 ans
    dpe_repartition     JSONB,            -- {A: 5, B: 12, C: 30, ...}
    computed_at         TIMESTAMPTZ NOT NULL
);

CREATE TABLE epcis (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code_siren          VARCHAR(9) NOT NULL UNIQUE,
    nom                 VARCHAR(255) NOT NULL,
    type                VARCHAR(50),   -- CA, CC, CU, ME...
    geometry            GEOMETRY(MultiPolygon, 4326),
    population          INTEGER,
    nb_communes         INTEGER
);

CREATE INDEX idx_communes_geometry ON communes USING GIST(geometry);
```

---

### `import_batches`
Traçabilité des imports.

```sql
CREATE TABLE import_batches (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source          VARCHAR(50) NOT NULL,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at     TIMESTAMPTZ,
    status          VARCHAR(20) DEFAULT 'running',  -- running, success, failed
    records_count   INTEGER,
    error_message   TEXT
);
```

---

---

## Entités Phase 4 (Enrichissement)

### `etablissements_sirene`
Locaux d'activité et entreprises domiciliées à une adresse (source INSEE).

```sql
CREATE TABLE etablissements_sirene (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    siret            VARCHAR(14) NOT NULL UNIQUE,
    siren            VARCHAR(9) NOT NULL,
    nom_entreprise   VARCHAR(255),
    code_naf         VARCHAR(6),
    libelle_naf      VARCHAR(255),
    address_id       UUID REFERENCES addresses(id),
    date_creation    DATE,
    date_fermeture   DATE,
    tranche_effectif VARCHAR(2),
    source           VARCHAR(20) DEFAULT 'SIRENE',
    last_updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ttl_expires_at   TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_sirene_address ON etablissements_sirene(address_id);
CREATE INDEX idx_sirene_siren ON etablissements_sirene(siren);
```

---

### `proprietes_personnes_morales`
Parcelles et locaux détenus par des personnes morales (entreprises, collectivités) — source DGFiP.

```sql
CREATE TABLE proprietes_personnes_morales (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_parcelle      VARCHAR(14),           -- référence vers parcelles(id_parcelle)
    siren            VARCHAR(9),            -- lien vers etablissements_sirene
    nom_proprietaire VARCHAR(255),
    forme_juridique  VARCHAR(50),
    surface_totale   NUMERIC(10, 2),
    valeur_locative  NUMERIC(12, 2),
    source           VARCHAR(30) DEFAULT 'DGFiP',
    last_updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ppm_parcelle ON proprietes_personnes_morales(id_parcelle);
CREATE INDEX idx_ppm_siren ON proprietes_personnes_morales(siren);
```

---

### `permis_construire`
Autorisations d'urbanisme (source Sitadel / SDES). Immutable par design.

```sql
CREATE TABLE permis_construire (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    numero_permis     VARCHAR(20) NOT NULL UNIQUE,
    address_id        UUID REFERENCES addresses(id),
    commune_code      VARCHAR(5),
    type_autorisation VARCHAR(10),   -- PC, DP, PD (permis de construire, décl. préalable, permis démolir)
    nature_travaux    VARCHAR(100),
    surface_plancher  NUMERIC(10, 2),
    date_depot        DATE,
    date_decision     DATE,
    decision          VARCHAR(20),   -- accorde, refuse, sans_suite
    source            VARCHAR(20) DEFAULT 'SITADEL',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pc_address ON permis_construire(address_id);
CREATE INDEX idx_pc_commune ON permis_construire(commune_code);
CREATE INDEX idx_pc_date ON permis_construire(date_decision);
```

---

### `points_interet`
Points d'intérêt à proximité — écoles, hôpitaux, commerces, transports (source OpenStreetMap).

```sql
CREATE TABLE points_interet (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    osm_id       BIGINT NOT NULL UNIQUE,
    osm_type     VARCHAR(10),       -- node, way, relation
    nom          VARCHAR(255),
    categorie    VARCHAR(50),       -- ecole, hopital, commerce, transport, parc...
    sous_categorie VARCHAR(50),
    geometry     GEOMETRY(Point, 4326) NOT NULL,
    commune_code VARCHAR(5),
    source       VARCHAR(20) DEFAULT 'OSM',
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_poi_geometry ON points_interet USING GIST(geometry);
CREATE INDEX idx_poi_categorie ON points_interet(categorie);
```

---

## Mécanisme de versioning

Approche : **audit table légère** (pas d'event sourcing complet pour garder la simplicité).

Pour chaque table principale, un trigger PostgreSQL insère une ligne dans la table `*_history`
correspondante lorsqu'une colonne métier change.

```sql
-- Exemple trigger sur parcelles
CREATE OR REPLACE FUNCTION log_parcelle_changes() RETURNS TRIGGER AS $$
BEGIN
    IF OLD.contenance IS DISTINCT FROM NEW.contenance
    OR OLD.section IS DISTINCT FROM NEW.section
    OR OLD.commune_code IS DISTINCT FROM NEW.commune_code THEN
        INSERT INTO parcelles_history (parcelle_id, changed_fields, source)
        VALUES (
            NEW.id,
            jsonb_build_object(
                'contenance', jsonb_build_object('old', OLD.contenance, 'new', NEW.contenance),
                'section', jsonb_build_object('old', OLD.section, 'new', NEW.section)
            ),
            NEW.source
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## TTL et mise à jour à la demande

Chaque service Symfony vérifie `ttl_expires_at` avant de servir la donnée :

```
GET /api/parcelles/{id_parcelle}
  → Symfony récupère la parcelle en BDD
  → Si NOW() > ttl_expires_at :
      → Dispatch job "RefreshParcelle" dans la queue
      → Retourne la donnée actuelle immédiatement (stale-while-revalidate)
  → Sinon retourne la donnée directement
```

**Stale-while-revalidate** : on ne bloque jamais le client — on sert les données existantes
et on met à jour en arrière-plan. Idéal pour l'UX et le SEO.
