# alua — Environnement local

## Structure

```
alua/
├── alua-backend/    ← API Symfony 7
├── alua-frontend/   ← Next.js 15
└── tracking/        ← Dossier de suivi projet
```

---

## Démarrer les services

```bash
# PostgreSQL (base de données)
brew services start postgresql@17

# martin (serveur de tuiles vectorielles) — une fois le MBTiles généré
martin /chemin/vers/cadastre.mbtiles
```

## Arrêter les services

```bash
# PostgreSQL
brew services stop postgresql@17

# martin — Ctrl+C dans le terminal où il tourne
```

## Vérifier ce qui tourne

```bash
brew services list
```

---

## Serveurs de développement

Ces commandes sont à lancer dans des terminaux séparés.

```bash
# Backend — depuis alua-backend/
symfony server:start

# Frontend — depuis alua-frontend/
npm run dev
```

## Arrêter les serveurs de développement

`Ctrl+C` dans chaque terminal.

---

## Base de données

```bash
# Se connecter à la base
psql alua

# Sauvegarder
pg_dump alua > backup.sql

# Restaurer
psql alua < backup.sql
```

---

## Versions installées

| Outil | Version |
|---|---|
| PHP | 8.3 |
| PostgreSQL | 17 + PostGIS 3.6 |
| Composer | 2.9 |
| Symfony CLI | 5.17 |
| Node.js | 25 |
| tippecanoe | 2.79 |
| martin | 1.6 |
