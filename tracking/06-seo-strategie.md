# 06 — Stratégie SEO

## Enjeu

Le SEO programmatique est le principal levier de croissance de la Phase 1.
L'objectif est de générer des milliers de pages indexables à partir des données,
chacune ciblant des requêtes longue traîne.

**Estimation du volume de pages générables :**
- ~35 000 communes → 35 000 fiches
- ~1 200 EPCIs → 1 200 fiches
- ~100 départements → 100 fiches
- ~25M d'adresses → 25M de fiches (indexation progressive)
- ~60M de parcelles → trop nombreuses pour toutes indexer, sélection partielle

---

## Architecture des URLs

```
/                                   → Page d'accueil + carte
/carte                              → Carte interactive

/commune/{slug-commune}             → Fiche commune (ex: /commune/toulouse)
/commune/{slug-commune}/marche      → Analyse marché de la commune
/commune/{slug-commune}/cadastre    → Carte cadastrale de la commune

/departement/{slug-dep}             → Fiche département (ex: /departement/haute-garonne)
/epci/{slug-epci}                   → Fiche EPCI

/adresse/{numero}-{rue}-{commune}   → Fiche adresse (ex: /adresse/12-rue-de-la-paix-paris)
/parcelle/{id_parcelle}             → Fiche parcelle (ex: /parcelle/31506000AB0042)

/api/v1/...                         → API publique Phase 2
```

---

## Template de fiche commune

**URL :** `/commune/toulouse`  
**Title :** `Prix immobilier à Toulouse — DVF, DPE, Cadastre | ALUA`  
**H1 :** `Données immobilières à Toulouse (31000)`

**Contenu dynamique :**
1. Prix médian au m² (appartements / maisons) — issu du DVF
2. Évolution sur 12 mois et 5 ans
3. Répartition des DPE (graphique circulaire)
4. Carte miniature centrée sur la commune avec les dernières transactions
5. Tableau des dernières transactions (5 dernières)
6. Liens vers les communes voisines
7. Données urbanistiques (nb de zones PLU)

**JSON-LD Schema.org :**
```json
{
  "@context": "https://schema.org",
  "@type": "Place",
  "name": "Toulouse",
  "address": {
    "@type": "PostalAddress",
    "postalCode": "31000",
    "addressRegion": "Occitanie"
  }
}
```

---

## Template de fiche adresse

**URL :** `/adresse/12-rue-de-la-paix-75002-paris`  
**Title :** `12 Rue de la Paix, Paris — Cadastre, DPE, Transactions | ALUA`

**Contenu dynamique :**
1. Carte centrée sur l'adresse avec la parcelle mise en évidence
2. Référence cadastrale de la parcelle
3. Surface cadastrale
4. Dernières transactions DVF sur cette parcelle
5. DPE du ou des logements à cette adresse
6. Zonage PLU
7. Risques géographiques
8. Proximité ABF (si secteur protégé)
9. Historique des modifications connues

**Enjeu :** ces fiches sont les plus longue-traîne et les plus précieuses.
Un utilisateur cherchant "12 rue de la Paix Paris cadastre" ou "DPE 12 rue de la Paix Paris"
doit tomber sur nous.

---

## Stratégie d'indexation

**Principe : indexer tout.** Chaque fiche a du contenu généré dynamiquement,
même si les données enrichies (DVF, DPE) sont absentes.

### Contenu minimum garanti sur chaque fiche

**Fiche adresse sans DVF ni DPE :**
> *"Le [numéro] [rue] se situe dans la commune de [X] (code INSEE [Y]),
> département [Z]. Cette adresse est rattachée à la parcelle cadastrale [ref].
> Aucune transaction n'est enregistrée dans la base DVF pour cette parcelle.
> Découvrez les [N] autres adresses de la [rue] et le marché immobilier de [commune]."*

Le maillage interne (liens vers commune, rue, adresses voisines, parcelle)
fait le travail SEO sur les pages les plus légères.

**Le seul cas `noindex` :** une fiche générée mais dont la source de données est corrompue
ou introuvable (cas technique, pas cas "pas de données enrichies").

**Cas particulier Alsace-Moselle (67/68/57) :** les fiches communes et adresses de ces départements
sont indexées normalement. Un encart spécifique remplace les sections manquantes :
> *"La carte cadastrale et les données de transactions ne sont pas disponibles pour ce département
> (régime du Livre Foncier Alsace-Moselle). Les données DPE, PLU et risques restent accessibles."*
Les autres données (DPE, PLU, risques, BAN) sont disponibles et constituent un contenu suffisant.

### Indexation par vagues du sitemap (raison technique, pas SEO)

Google a un crawl budget limité par site. Soumettre 25M d'URLs d'un coup ralentit l'indexation de tout le site. On segmente le sitemap pour contrôler le rythme d'indexation :

1. **Vague 1** : communes (35K) + EPCIs (1 200) + départements (100) → soumettre au lancement
2. **Vague 2** : adresses des grandes villes (top 50 communes par population)
3. **Vague 3** : reste des adresses, au fur et à mesure

**Sitemap segmenté :**
```
/sitemap.xml                → index des sitemaps
/sitemap-communes.xml       → 35 000 URLs
/sitemap-epcis.xml          → 1 200 URLs
/sitemap-adresses-75.xml    → adresses de Paris
/sitemap-adresses-31.xml    → adresses de Haute-Garonne
...
```

---

## Core Web Vitals

Les fiches SEO doivent avoir un LCP < 2.5s et un CLS proche de 0.
- Utiliser l'ISR Next.js : les fiches sont pré-rendues statiquement, servies par CDN
- Les cartes miniatures sont chargées en lazy (pas de MapLibre sur les fiches statiques)
- Pour la carte miniature sur les fiches : image statique générée depuis les tuiles Etalab
  (pas de Mapbox Static API — payant). Alternative : `staticmap` open source ou simple image PNG
  depuis un endpoint WMS IGN Géoplateforme (gratuit).

---

## Maillage interne

Chaque fiche doit pointer vers :
- La commune parente
- L'EPCI parent
- Les adresses voisines (dans un rayon de 50m)
- Les transactions récentes sur la parcelle

Ce maillage interne fort amplifie l'indexation des pages profondes.

---

## Requêtes cibles (exemples)

| Requête | Volume estimé | Page cible |
|---|---|---|
| "prix immobilier toulouse" | Élevé | Fiche commune |
| "cadastre 31506000AB0042" | Faible | Fiche parcelle |
| "dpe 12 rue de la paix paris" | Faible | Fiche adresse |
| "zone plu nantes" | Moyen | Fiche commune/carte |
| "ventes immobilières bordeaux 2024" | Moyen | Fiche commune |
| "parcelle cadastrale lyon 6ème" | Faible | Fiche commune |
| "risques inondation toulouse" | Moyen | Fiche commune |
