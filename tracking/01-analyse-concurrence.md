# 01 — Analyse concurrentielle

## Panorama des acteurs

### Pappers Immobilier (lancé 2024) — concurrent principal ⚠️
**URL :** https://immobilier.pappers.fr  
**Modèle :** 100 % gratuit (pas encore de monétisation visible)

**Forces :**
- Données exhaustives : DVF (28M+ transactions), cadastre, DPE, BODACC, permis de construire, ventes de fonds de commerce
- Navigation hiérarchique par zoom : région → département → ville → zone cadastrale (clic = zoom)
- Interface carte interactive intuitive
- Notoriété de la marque Pappers (déjà forte côté juridique/entreprises)
- Croissance rapide grâce au SEO programmatique

**Faiblesses / angles morts :**
- Pas de sélecteur de fonds de carte : impossible de choisir la vue en fonction de ce qu'on cherche
- Pas d'historique versionné des données
- Pas de données PLU / zonage urbanisme
- Pas de données risques (inondation, sismique…)
- Pas d'altimétrie / topographie
- Alsace-Moselle et Mayotte grisés ("Zone non disponible")
- Pas d'API publique (encore)
- Pas de fiches EPCI, pas de fiches par section cadastrale

**Décision UX calquée sur Pappers :** pour l'Alsace-Moselle (67, 68, 57), griser la zone sur la carte avec "Zone non disponible" — cohérent avec l'attente des utilisateurs et évite de créer des attentes non satisfaites. Les fiches communes de ces départements existeront en SEO (elles auront un contenu partiel avec note explicative), mais la carte sera grisée.

---

### Immovrai — non concurrent
**URL :** https://www.immovrai.com  
**Modèle :** gratuit

**Forces :** moteur de recherche DVF très propre, 14M transactions, expérience UX fluide  
**Faiblesses :** pas de carte interactive en vue principale, uniquement des listes et fiches → approche opposée à la nôtre

**Verdict :** pas concurrent sérieux.

---

### Immo Data — non concurrent
**URL :** https://www.immo-data.fr  
**Modèle :** gratuit (lancé 2020)

**Forces :** interface claire, analyse avancée des transactions  
**Faiblesses :** pas de carte interactive en première vue, périmètre limité DVF

**Verdict :** pas concurrent sérieux.

---

### CartoImmo — non évalué
**Modèle :** freemium + export API

Site non trouvé lors de l'analyse.

---

### MeilleursAgents (SeLoger Group) — segment différent
**URL :** https://www.meilleursagents.com  
**Modèle :** lead gen agences + estimations

**Forces :** estimation algorithmique ML, notoriété, données enrichies par réseau d'agences  
**Faiblesses :** données propriétaires (pas open data), estimation = boite noire, payant pour les agences

**Verdict :** segment différent (estimation + mise en relation agences vs consultation de données ouvertes). Pas concurrent direct, mais démontre qu'il y a un marché solide sur l'information immobilière.

---

### DVF Etalab (officiel)
**URL :** https://app.dvf.etalab.gouv.fr  
**Modèle :** service public

**Forces :** données officielles et exhaustives  
**Faiblesses :** UX minimale, pas de croisement de données, pas de fiches SEO

---

## Positionnement différenciant

| Critère | Pappers | Nous |
|---|---|---|
| DVF historique | ✅ | ✅ |
| Cadastre | ✅ | ✅ |
| DPE | ✅ | ✅ |
| PLU / Zonage urbanisme | ❌ | ✅ |
| Risques géographiques | ❌ | ✅ |
| Patrimoine ABF | ❌ | ✅ |
| Historique versionné des données | ❌ | ✅ |
| Fiches par section cadastrale | ❌ | ✅ |
| Fiches EPCI | ❌ | ✅ |
| API publique | ❌ (annoncé) | ✅ Phase 2 |
| Données altimétrie / topographie | ❌ | ✅ |
| Sélecteur de fonds de carte | ❌ | ✅ |
| Annonces immobilières croisées | ❌ | ❌ (hors scope V1) |

**Notre avantage durable :** l'historique versionné + les données réglementaires (PLU, risques, ABF) + le sélecteur de fonds de carte — aucun acteur n'a encore tout ça agrégé.

---

## Décisions actées suite à l'analyse

| Question | Décision |
|---|---|
| Alsace-Moselle sur la carte | Griser + "Zone non disponible" (comme Pappers). Fiches SEO communes maintenues avec note explicative. |
| Annonces immobilières | Hors scope pour la V1. Pas de scraping (risque légal). Partenariats à étudier ultérieurement. |
| Historique versionné comme USP | Oui — à mettre en avant dans le contenu éditorial et les balises méta dès la Phase 3. |
| Sélecteur de fonds de carte | À implémenter dès la Phase 2 (différenciateur direct vs Pappers). |

---

## Synthèse

**Un seul concurrent sérieux : Pappers Immobilier.** C'est une bonne nouvelle : cela confirme qu'il y a un vrai besoin, et que le marché est prenable.

Pappers a une avance sur la notoriété (marque Pappers connue) et le SEO (lancé fin 2024). En revanche, son produit a des angles morts clairs : pas de PLU, pas de risques, pas d'historique versionné, pas de sélecteur de fonds de carte, Alsace-Moselle absente.

Notre stratégie de différenciation repose sur trois axes :
1. **La profondeur de la donnée** : PLU + risques + ABF + altimétrie que personne n'a encore agrégés
2. **L'historique versionné** : un bien peut avoir changé de DPE, de surface cadastrale — on le trace
3. **L'ergonomie cartographique** : sélecteur de fonds de carte (IGN, satellite, cadastre, risques…) pour visualiser selon l'usage

Les autres acteurs (Immovrai, Immo Data, CartoImmo) ne sont pas des concurrents sérieux : pas de carte interactive en vue principale, périmètre de données trop limité.
