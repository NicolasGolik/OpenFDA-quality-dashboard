# 0008 : Base de données : Neon, `pg` et SQL à la main, Zod, migrations

- Date : 2026-11-07
- Statut : acceptée

## Contexte

Le worker et l'API ont besoin d'une base PostgreSQL commune :

- le worker tourne régulièrement (source openFDA mise à jour chaque semaine, exécution quotidienne idempotente), et le dashboard doit être déployé en fin de V1 : la base doit être joignable en permanence, pas seulement quand l'ordinateur de développement est allumé ;
- le projet doit montrer des compétences SQL : conception du schéma (`CREATE TABLE`, `NOT NULL`, `CHECK`), ingestion idempotente (`ON CONFLICT DO UPDATE`), agrégations (`GROUP BY`, CTE, fonctions de fenêtre), index justifiés avec `EXPLAIN ANALYZE`. Ce SQL doit être lisible dans le dépôt ;
- les données openFDA contiennent des erreurs (voir le contrat de données). TypeScript vérifie les types à la compilation, mais ne contrôle pas ce que l'API renvoie réellement à l'exécution ;
- le schéma évoluera (table de quarantaine, colonnes de qualité, tables d'agrégats) : il faut pouvoir appliquer ces évolutions de façon versionnée et reproductible.

## Décisions

### 1. Hébergement : Neon

PostgreSQL hébergé sur **Neon** (offre gratuite) dès la V1, pour le développement comme pour le déploiement.

Version du serveur : **PostgreSQL 18.6** (relevée le 2026-11-07 avec `SELECT version()` depuis le worker). `pg_dump`, utilisé par dbmate pour générer `db/schema.sql`, doit être de la même version majeure ou plus récent (installé : 18.4, via Homebrew `libpq`).

### 2. Accès : `pg` et SQL écrit à la main

**`pg`** (node-postgres) et **SQL écrit à la main**, en requêtes paramétrées (`$1`, `$2`…), sans ORM ni query builder.

Mode de connexion selon l'application :

| Application | Objet `pg`  | Raison                                                                                                                                                                                                 |
| ----------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Worker      | `pg.Client` | Script batch séquentiel : une seule connexion, ouverte au début (`connect()`) et fermée à la fin (`end()` dans un `finally`). Les transactions passent naturellement par cette connexion unique.          |
| API         | `pg.Pool`   | Serveur qui reçoit des requêtes simultanées pendant des heures : le pool garde plusieurs connexions ouvertes et les réutilise, au lieu d'en ouvrir une par requête.                                    |

Le pool `pg.Pool` (côté application) est distinct du pooler de Neon (côté serveur, PgBouncer) : l'API utilise les deux.

### 3. Validation : Zod

Les enregistrements openFDA sont validés avec **Zod** dans le worker, avant insertion. Les schémas Zod traduisent les règles du contrat de données (rejet, avertissement).

### 4. Configuration : un `.env` par application

Un `.env` dans `apps/worker` et un dans `apps/api` (non commités), chacun accompagné d'un `.env.example`. Le worker écrit, l'API ne fait que lire : leurs accès pourront différer (utilisateur en lecture seule pour l'API).

Les fichiers sont chargés par Node lui-même (`--env-file` en dev, `--env-file-if-exists` au démarrage, car en production les variables sont fournies par l'hébergeur), sans dépendance `dotenv`.

Neon propose deux types de connexion : **directe**, et **poolée** (adresse en `-pooler`, via PgBouncer en mode transaction : une connexion réelle est partagée entre plusieurs clients, et l'état de session n'est pas garanti d'une transaction à l'autre).

| Usage                    | Connexion | Raison                                                                                          |
| ------------------------ | --------- | ----------------------------------------------------------------------------------------------- |
| Migrations (`db/.env`)   | Directe   | Modifications du schéma ; ne doivent pas dépendre des limites du mode transaction                |
| Worker                   | Directe   | Un seul processus, peu de connexions, transactions potentiellement longues (upsert en masse)     |
| API                      | Poolée    | Nombreuses requêtes courtes en lecture ; indispensable en cas de déploiement serverless          |

À l'échelle du projet, les deux types fonctionneraient probablement partout : la répartition suit l'usage prévu de chaque connexion.

### 5. Migrations : dbmate, dans `db/` à la racine

- **Outil : dbmate.** Les migrations sont des fichiers `.sql` purs, écrits à la main, numérotés par horodatage. dbmate les applique dans l'ordre et enregistre celles déjà appliquées dans une table de suivi en base.
- **Emplacement : `db/migrations/` à la racine du dépôt**, hors des applications. La base appartient au système entier : le worker écrit, l'API lit, et le service Python de la V3 la lira aussi.
- **Accès :** les migrations créent et modifient des tables, elles utilisent donc leur propre chaîne de connexion, avec les droits sur le schéma (`db/.env`, non commité, et `db/.env.example`). En V1, les trois `.env` (`db/`, `apps/worker/`, `apps/api/`) peuvent contenir la même chaîne ; la structure permet de séparer les droits plus tard.

## Alternatives écartées

| Sujet         | Alternative                               | Avantage                                                              | Raison de l'écart                                                                                                                  |
| ------------- | ----------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Hébergement   | PostgreSQL installé en local              | Aucune dépendance réseau, aucune limite d'offre                       | L'ordinateur devrait tourner en permanence pour le worker ; une base hébergée serait de toute façon nécessaire au déploiement      |
| Hébergement   | PostgreSQL local dans Docker              | Environnement reproductible, proche de la CI                          | Même problème de disponibilité ; Docker est prévu en V2                                                                            |
| Hébergement   | Supabase                                  | Offre gratuite comparable                                             | Ajoute authentification, stockage, API : inutiles ici. Neon se limite à PostgreSQL, avec une simple chaîne de connexion            |
| Accès         | Drizzle (ORM / query builder)             | Schéma et résultats typés en TypeScript, migrations générées, répandu | Schéma et requêtes écrits en TypeScript : le SQL, objet du projet, devient généré et peu visible dans le dépôt                     |
| Accès         | Prisma                                    | Très répandu, outillage complet                                       | Même raison, avec un langage de schéma propre et encore plus d'abstraction                                                         |
| Accès         | `pg.Pool` dans le worker                  | Requêtes en parallèle ; nouvelle connexion ouverte si l'une est coupée | Inutile pour un traitement séquentiel (l'API openFDA est de toute façon limitée à 240 requêtes par minute) ; impose de réserver un client pour chaque transaction. À reconsidérer si l'ingestion est parallélisée |
| Validation    | Validation écrite à la main               | Aucune dépendance                                                     | Beaucoup de code répétitif, types TypeScript à écrire en double                                                                    |
| Configuration | Un seul `.env` à la racine                | Une seule valeur à maintenir                                          | Chaque application lirait un fichier hors de son dossier et recevrait les mêmes accès ; en production, les variables sont définies par service |
| Migrations    | node-pg-migrate                           | Reste dans l'écosystème npm et `pg`                                   | Pensé d'abord pour des migrations en JavaScript ; lié à Node, alors que le service Python de la V3 partagera la base              |
| Migrations    | Script maison                             | Mécanisme entièrement maîtrisé et explicable                          | Cas limites à gérer soi-même (fichier modifié après application, exécutions simultanées, retour arrière) et code à maintenir       |
| Migrations    | Flyway / Liquibase                        | Standards reconnus en entreprise (pharma, industrie)                  | Lourds pour ce projet (Java ou Docker)                                                                                             |
| Migrations    | Migrations dans `apps/worker`             | Proches du code qui écrit en base                                     | Le schéma est partagé par plusieurs applications ; il n'appartient pas au worker                                                   |

## Conséquences

- **Réseau :** le développement dépend de la connexion. Neon impose une connexion chiffrée (SSL).
- **À vérifier** sur la page des offres de Neon, puis à noter ici :
  - la limite de stockage de l'offre gratuite, comparée au volume réel (environ 59 600 lignes, JSON brut conservé en `JSONB`) ;
  - la mise en veille de la base après inactivité, et le délai de la première requête au réveil.
- **Types :** les types des résultats de requêtes ne sont pas déduits automatiquement ; ils sont écrits à la main.
- **Worker en `pg.Client` :** si la connexion est coupée en cours d'exécution, le run échoue. C'est acceptable car l'ingestion est idempotente : le run suivant reprend sans perte, à condition que l'échec soit tracé dans `ingestion_runs`.
- **Sécurité :** requêtes toujours paramétrées, aucune valeur concaténée dans une chaîne SQL (protection contre l'injection SQL).
- **Qualité des données :** une même règle peut exister à deux niveaux, dans Zod (le worker explique et compte les cas) et en contrainte SQL (la base se protège). C'est voulu, conformément aux principes de qualité des données du projet.
- **Migrations :** dbmate est un outil externe (binaire Go, installable via npm) ; sa syntaxe exacte est à vérifier dans sa documentation à l'installation. Une migration déjà appliquée n'est jamais modifiée : toute correction passe par une nouvelle migration.
- **CI (V2) :** les tests auront probablement besoin d'un PostgreSQL local (Docker) pour ne pas dépendre de Neon. Le SQL reste le même, seule la chaîne de connexion change.
