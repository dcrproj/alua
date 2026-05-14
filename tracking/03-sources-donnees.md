# 03 — Sources de données

## Inventaire et statut

### 1. Adresses — Base Adresse Nationale (BAN)
**Organisme :** IGN / DINUM  
**URL API :** https://data.geopf.fr/geocodage/ (nouvelle URL depuis jan 2026, remplace api-adresse.data.gouv.fr)  
**URL dataset :** https://adresse.data.gouv.fr  
**Format import :** CSV (26M adresses)  
**Fréquence de mise à jour :** 2x par semaine  
**TTL recommandé :** 60–90 jours  
**Données disponibles :** numéro, rue, commune, code postal, coordonnées GPS, code INSEE  
**Statut :** ✅ API disponible + fichier complet

> ⚠️ L'ancienne URL `api-adresse.data.gouv.fr` est décommissionnée fin janvier 2026.
> Utiliser exclusivement `data.geopf.fr/geocodage/`.

---

### 2. Cadastre — Plan Cadastral Informatisé (PCI)
**Organisme :** DGFiP / Etalab  
**URL dataset :** https://cadastre.data.gouv.fr  
**URL API :** https://apicarto.ign.fr/api/cadastre (API Carto module Cadastre)  
**Format import :** GeoJSON (par commune ou département)  
**Fréquence de mise à jour :** 2x par an (mars + octobre)  
**TTL recommandé :** 180 jours  
**Données disponibles :** référence parcellaire (section + numéro), surface, contenance, commune  
**Statut :** ✅ Fichiers GeoJSON disponibles + API Carto

> ⚠️ **Limite connue :** le PCI ne couvre pas le Bas-Rhin, le Haut-Rhin et la Moselle
> (régime foncier alsacien-mosellan). Ces communes utilisent le Livre Foncier.
> Pas de couverture non plus à Mayotte.

> ℹ️ Les données GeoJSON Etalab ne contiennent pas l'adresse de la parcelle.
> Il faut croiser avec la BAN (via les coordonnées GPS) pour obtenir l'adresse.

---

### 3. DVF — Demandes de Valeurs Foncières
**Organisme :** DGFiP  
**URL dataset :** https://www.data.gouv.fr/fr/datasets/demandes-de-valeurs-foncieres/  
**URL app officielle :** https://app.dvf.etalab.gouv.fr  
**Format import :** CSV (fichiers trimestriels par département)  
**Fréquence de mise à jour :** trimestrielle (T1 en avril, T2 en juillet, etc.)  
**TTL recommandé :** 90 jours  
**Données disponibles :** prix, date vente, surface, adresse, référence cadastrale, type bien, nb pièces  
**Statut :** ✅ Fichiers CSV disponibles (pas d'API temps réel)

> ⚠️ **Pas d'API temps réel pour DVF.** Les données sont publiées avec ~6 mois de décalage.
> Ex : les ventes de S1 2025 sont publiées en ~octobre 2025.
> Impossible de faire du TTL à la demande ici — import batch trimestriel obligatoire.

---

### 4. DPE — Diagnostics de Performance Énergétique
**Organisme :** ADEME  
**URL API :** https://data.ademe.fr/data-fair/api/v1/datasets/dpe-v2-logements-existants/lines  
**URL dataset :** https://data.ademe.fr/datasets/dpe-v2-logements-existants  
**Format import :** JSON via API paginée ou CSV  
**Fréquence de mise à jour :** continu (nouveaux DPE chaque jour)  
**TTL recommandé :** 30 jours  
**Données disponibles :** étiquette DPE (A→G), étiquette GES, date DPE, date fin validité, type bâtiment, année construction, surface habitable, type énergie  
**Statut :** ✅ API disponible

> ℹ️ Trois datasets distincts : logements existants, logements neufs, DPE France (agrégat).
> L'ADEME expose 151 jeux de données — potentiel d'enrichissement futur important.

---

### 5. PLU — Plan Local d'Urbanisme
**Organisme :** Ministère de la Transition Écologique (GPU)  
**URL API :** https://www.geoportail-urbanisme.gouv.fr/api/feature-info/du  
**URL WMS :** https://data.geopf.fr/wms-v/ows  
**Format :** API JSON à la demande (par coordonnées lat/lon)  
**Fréquence de mise à jour :** variable selon communes (dépôt par les collectivités)  
**TTL recommandé :** 60 jours  
**Données disponibles :** zonage (UA, UB, N, A…), règlement de zone (PDF), identifiant document d'urbanisme  
**Statut :** ✅ API disponible (pull à la demande par coordonnées)

> ℹ️ Flux : appel à `/api/feature-info/du?lon=X&lat=Y` → retourne un ID document
> → appel à `/api/document/{id}/details` pour le détail de la zone
> → appel à `/api/document/{id}/files` pour accéder au règlement PDF

---

### 6. Patrimoine — Secteurs ABF (Architectes des Bâtiments de France)
**Organisme :** Ministère de la Culture  
**URL :** http://atlas.patrimoines.culture.fr (non sécurisé — à surveiller)  
**Format :** WMS / données à récupérer  
**TTL recommandé :** 365 jours  
**Données disponibles :** périmètre des secteurs protégés ABF, type de protection  
**Statut :** ⚠️ Site non sécurisé, stabilité incertaine — prévoir import ponctuel

---

### 7. Géoportail — Altimétrie, topographie, géologie
**Organisme :** IGN  
**URL :** https://geoportail.gouv.fr  
**URL API :** https://data.geopf.fr (Géoplateforme IGN)  
**Format :** WMS / WMTS / API REST  
**Données disponibles :** altimétrie (RGE ALTI), couverture géologique (BRGM), orthophotos, carte topo  
**Statut :** ✅ API Géoplateforme disponible (remplace l'ancienne API Géoportail)

---

### 8. Risques — GASPAR / Géorisques
**Organisme :** MTES / Préfectures  
**URL :** https://www.georisques.gouv.fr  
**URL API :** https://georisques.gouv.fr/api/v1/  
**Données disponibles :** zones inondables (PPRI), zones sismiques, argiles, radon, retrait-gonflement  
**TTL recommandé :** 365 jours  
**Statut :** ✅ API disponible

---

### 9. Copropriétés — RNIC
**Organisme :** ANAH  
**URL :** https://www.registre-coproprietes.gouv.fr  
**Données disponibles :** immatriculation copropriété, nb lots, syndic, date immatriculation  
**Statut :** ⚠️ Accès API à vérifier

---

### 10. Bâtiments — BDNB (Base de Données Nationale des Bâtiments)
**Organisme :** CSTB / ADEME  
**URL :** https://bdnb.io  
**URL dataset :** https://www.data.gouv.fr/fr/datasets/base-de-donnees-nationale-des-batiments/  
**Données disponibles :** date construction, usage, surface, nb logements, DPE estimé  
**Statut :** ✅ Fichiers disponibles (gros volume)

> ℹ️ La BDNB croise déjà plusieurs sources (cadastre, DPE, Sirene…). Peut éviter certains croisements manuels.

---

### 11. Historique — Remonter le temps IGN
**URL :** https://remonterletemps.ign.fr  
**Données disponibles :** orthophotos historiques depuis les années 1940  
**Intégration :** couche WMS dans MapLibre

---

### 12. Entreprises — Base SIRENE (INSEE)
**Organisme :** INSEE  
**URL dataset :** https://www.data.gouv.fr/fr/datasets/base-sirene-des-entreprises-et-de-leurs-etablissements-siren-siret/  
**Format import :** CSV mensuel complet + flux quotidiens de mises à jour  
**Fréquence de mise à jour :** mensuelle (complet) / quotidienne (flux)  
**TTL recommandé :** 30 jours  
**Données disponibles :** SIREN, SIRET, nom entreprise, adresse, code NAF (activité), date création/fermeture, effectifs  
**Intérêt :** identifier les locaux d'activité à une adresse, croiser avec les parcelles pour afficher les entreprises domiciliées  
**Statut :** ✅ Fichiers disponibles — à intégrer Phase 4

---

### 13. Propriétaires personnes morales — DGFiP
**Organisme :** DGFiP  
**URL dataset :** https://www.data.gouv.fr/fr/datasets/fichiers-des-locaux-et-parcelles-des-personnes-morales/  
**Format import :** CSV  
**Fréquence de mise à jour :** annuelle  
**TTL recommandé :** 365 jours  
**Données disponibles :** parcelles et locaux détenus par des personnes morales (entreprises, collectivités), surface, valeur locative  
**Intérêt :** différenciateur fort — savoir qu'une parcelle appartient à une SCI, une commune ou une foncière n'est disponible nulle part en agrégé  
**Statut :** ✅ Fichiers disponibles — à intégrer Phase 4

---

### 14. Permis de construire — Sitadel
**Organisme :** SDES (Ministère de la Transition Écologique)  
**URL dataset :** https://www.data.gouv.fr/fr/datasets/base-des-permis-de-construire-et-autres-autorisations-durbanisme-sitadel/  
**Format import :** CSV mensuel  
**Fréquence de mise à jour :** mensuelle  
**TTL recommandé :** 30 jours  
**Données disponibles :** permis de construire, déclarations préalables, permis de démolir — nature des travaux, adresse, surface, date dépôt, date accord  
**Intérêt :** afficher sur la fiche parcelle/adresse les travaux autorisés et leur statut. Différenciateur vs Pappers (qui a les permis mais sans croisement fin avec les parcelles)  
**Statut :** ✅ Fichiers disponibles — à intégrer Phase 4

---

### 15. Points d'intérêt — OpenStreetMap (Overpass API)
**Organisme :** OpenStreetMap contributors  
**URL API :** https://overpass-api.de/  
**Format :** JSON (requêtes à la demande par coordonnées + rayon)  
**TTL recommandé :** 90 jours  
**Données disponibles :** écoles, hôpitaux, commerces, transports en commun, parcs, restaurants…  
**Intérêt :** section "À proximité" sur les fiches adresse/commune — contenu SEO + valeur utilisateur  
**Statut :** ✅ API gratuite, pas de clé requise — à intégrer Phase 4

---

### Sources écartées

| Source | Raison |
|---|---|
| BODACC | Procédures collectives et ventes judiciaires — hors périmètre immobilier résidentiel |
| Google Street View API | Payant |
| Données Bercail | Paris uniquement — périmètre trop limité |
