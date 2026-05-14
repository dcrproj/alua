# 07 — Questions ouvertes & arbitrages à trancher

Ce fichier centralise les décisions non encore prises.
À chaque décision prise, déplacer l'item vers le fichier concerné et le marquer résolu.

---

## Décisions techniques

### Q1 — Hébergeur
**Décision :** VPS OVH (ou fournisseur VPS équivalent), OS Debian ou Ubuntu.  
**Statut :** ✅ Décidé

---

### Q2 — Tuiles vectorielles : Etalab vs self-hosted
**Décision :** martin self-hosted dès le départ. Les tuiles colorées serveur-side (DPE, prix/m²) sont un différenciateur direct vs Pappers. Etalab en fallback uniquement pendant la génération du premier MBTiles.  
**Statut :** ✅ Décidé

---

### Q3 — Nom de domaine
**Décision :** utiliser le nom de code "alua" jusqu'au lancement. Choix du domaine définitif hors périmètre V1.  
**Statut :** ✅ Mis de côté (hors V1)

---

### Q4 — Couverture Alsace-Moselle dès le lancement
**Décision :** Aligner sur l'approche Pappers.
- **Carte** : zone grisée avec mention "Zone non disponible" pour les 67, 68, 57. Pas de données cadastrales ni DVF affichées sur la carte pour ces départements.
- **SEO** : les fiches communes des 67/68/57 existent et sont indexables, avec un encart explicatif ("Les données de transactions et la carte cadastrale ne sont pas disponibles pour ce département — régime du Livre Foncier Alsace-Moselle").
- **Impact modèle** : le flag `dvf_available` et `pci_available` sur la table `communes` reste utile pour piloter l'affichage conditionnel (carte vs fiche SEO).

**Statut :** ✅ Décidé

---

### Q5 — Scraping annonces immobilières
**Question :** Croiser avec les annonces SeLoger / LeBonCoin / PAP pour afficher les biens en vente ?  
**Risque :** légal (CGU des sites), technique (anti-scraping)  
**Alternative :** agréger uniquement des sources open data + partenariat futur  
**Recommandation :** ne pas scraper. Peut-être un partenariat futur avec des portails.  
**Statut :** ✅ Décidé — hors scope V1. Partenariat commercial à envisager ultérieurement.

---

### Q6 — Monorepo vs deux dépôts séparés
**Décision :** deux repos distincts — `alua-backend/` (Symfony) et `alua-frontend/` (Next.js). Cycles de déploiement trop différents pour un monorepo.  
**Statut :** ✅ Décidé

---

## Décisions produit

### Q7 — Fiche parcelle vs fiche adresse : laquelle est prioritaire ?
**Décision :** les deux audiences (grand public + investisseurs/professionnels).
Fiche adresse = entrée principale (SEO grand public). Fiche parcelle = entrée secondaire (SEO professionnel).  
**Statut :** ✅ Décidé

---

### Q8 — Afficher les données DVF par adresse ou par parcelle ?
**Décision :** lier via la parcelle. Modèle `mutations_dvf_lots` avec `id_parcelle` + `address_id`.
Afficher les transactions de toutes les parcelles associées à l'adresse demandée.  
**Statut :** ✅ Décidé (modèle mis à jour dans 04)

---

### Q9 — Périmètre des risques Géorisques
**Décision :** afficher tous les risques disponibles via l'API Géorisques — on maximise le contenu.  
**Statut :** ✅ Décidé

---

### Q10 — Historique des données : jusqu'où remonter ?
**Décision :** importer tout l'historique disponible (DVF depuis 2014, BAN depuis disponibilité).
C'est un différenciateur fort.  
**Statut :** ✅ Décidé

---

## Décisions économiques

### Q11 — Régie publicitaire
**Décision :** Google AdSense dès le lancement. Évaluer les régies premium (Criteo, Teads) à partir de 100K pages vues/mois.  
**Statut :** ✅ Décidé

---

### Q12 — Tarification API Phase 2
**Décision :** hors périmètre V1. À traiter en Phase 5.  
**Statut :** ✅ Mis de côté (hors V1)

---

### Q13 — Serveur de tuiles cadastrales : Etalab ou martin self-hosted ?
**Décision :** martin self-hosted dès le départ. Voir Q2 — même décision.  
**Statut :** ✅ Décidé (doublon de Q2)

---

### Q14 — Données cadastrales Alsace-Moselle (Livre Foncier)
**Statut :** ✅ Investigué — voir résultats ci-dessous

**Cadastre (PCI) :** disponible sur `cadastre.data.gouv.fr` pour 67, 68, 57,
**sauf Strasbourg et quelques communes limitrophes** (exception historique post-1918).
→ Traitement à l'import : exclure les communes sans PCI disponible, afficher un message spécifique sur leurs fiches.

**DVF (prix de vente) :** **absent structurellement** pour 67, 68, 57.
La DGFiP ne collecte pas ces transactions — elles sont dans le Livre Foncier (EPELFI),
régime local dérogatoire au droit commun. Décision CADA 2006 : données **non communicables**
en open data. Accès réservé aux personnes avec "intérêt légitime" (notaires, avocats).
Aucun workaround légal possible.
→ Traitement : sur les fiches adresses/communes 67/68/57, section DVF affichée avec mention
*"Les données de transactions immobilières ne sont pas disponibles en open data pour ce département
(régime du Livre Foncier Alsace-Moselle)."*

**Toutes les autres sources** (DPE, BAN, PLU, risques) : couverture nationale normale.

**Impact modèle de données :** ajouter un flag `dvf_available BOOLEAN DEFAULT true` sur la table `communes`
pour gérer proprement l'affichage conditionnel.

---

### Q15 — Licences open data et monétisation API
**Contexte :** DVF (Licence Ouverte), BAN (Licence Ouverte), PCI (Licence Ouverte), DPE (Licence Ouverte).
La Licence Ouverte 2.0 autorise la réutilisation commerciale avec mention de la source.  
**Action :** vérifier les CGU de chaque source avant le lancement de la Phase 5 API.  
**Statut :** ✅ Mis de côté (hors V1 — à traiter en Phase 5)

---

### Q16 — Génération des textes de contenu : template manuel ou LLM ?
**Décision :** templates manuels en Phase 3. Les pages SEO sont rendues par Next.js — les templates sont des composants React Server Components (TypeScript), pas des templates Twig (qui appartient à Symfony/backend). LLM à évaluer uniquement si les templates plafonnent en SEO.  
**Statut :** ✅ Décidé
