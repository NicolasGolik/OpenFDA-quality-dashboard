# 0007 : Organisation du code : monorepo avec npm workspaces

- Date : 2026-11-07
- Statut : acceptée

## Contexte

Le projet comporte trois applications TypeScript :

```
apps/worker   ingestion openFDA -> PostgreSQL   (Node)
apps/api      API Express                       (Node)
apps/web      dashboard React                   (navigateur, bundlé par Vite)
```

Elles évoluent ensemble : un changement de schéma touche en même temps le worker (écriture), l'API (lecture) et le front (affichage). Le projet est mené par une seule personne, et la V2 ajoute une CI GitHub Actions et Docker Compose, qui doivent construire et tester les trois applications.

## Décision

- **Un seul dépôt**, avec les **npm workspaces** : le `package.json` racine déclare `"workspaces": ["apps/*"]`.
- **Une seule installation** : un `node_modules` et un `package-lock.json`, à la racine. Chaque application garde son propre `package.json` (nom `@openfda/...`, scripts, dépendances métier).
- **Outillage commun installé à la racine** : `typescript`, `tsx` (exécution en dev), `@types/node`. Les dépendances propres à une application (`pg`, `express`, `react`) restent dans son `package.json`.
- **Configuration TypeScript** :
  - `tsconfig.base.json` à la racine (`strict`, `module`/`moduleResolution` `NodeNext`, `target` `ES2022`), hérité par `apps/worker` et `apps/api` ;
  - `apps/web` garde la configuration générée par Vite (`moduleResolution: bundler`), sans hériter de la base : le front est bundlé par Vite, alors que le worker et l'API sont exécutés directement par Node. Leurs règles de résolution des modules diffèrent.
- **Commandes lancées depuis la racine** avec `-w` : `npm run dev -w apps/worker`, `npm run build --workspaces`.

## Alternatives écartées

| Alternative                          | Avantage                                                     | Raison de l'écart                                                                                                                                     |
| ------------------------------------ | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Un dépôt par application             | Isolation, déploiements et historiques indépendants          | Un changement de schéma devient trois pull requests à synchroniser ; versions d'outils qui divergent ; trois CI à maintenir, pour une seule personne |
| pnpm workspaces                      | Installation plus rapide, dépendances plus strictes          | Un outil de plus à installer et à expliquer ; npm suffit pour trois applications                                                                      |
| Turborepo / Nx                       | Cache de build, orchestration des tâches entre applications  | Utile sur de nombreux paquets ; ici, `npm run build --workspaces` prend quelques secondes                                                             |
| Outillage dupliqué dans chaque app   | Chaque app est autonome                                      | Trois versions de TypeScript à tenir alignées                                                                                                        |

## Version de TypeScript : 6.0 et non 7

La dernière version publiée de TypeScript est la 7.0.2 (réécriture native). Elle a d'abord été installée à la racine, mais :

- le template Vite installe TypeScript `~6.0.3` ;
- `typescript-eslint` (lint du front) exige `typescript >=4.8.4 <6.1.0` ;
- avec la version 7 à la racine, `npm run lint` échouait (`TypeError` dans `ts-api-utils`), alors que le build passait.

**Décision** : une seule version dans tout le dépôt, `typescript ~6.0.3` à la racine. Le `~` n'accepte que les correctifs 6.0.x, pour ne pas passer à une 6.1 refusée par `typescript-eslint`.

Le mode `strict` reste actif partout : explicite dans `tsconfig.base.json`, et activé par défaut par TypeScript 6 pour le front (vérifié : un paramètre sans type déclenche l'erreur TS7006).

## Conséquences

- `npm install` se lance **à la racine**, jamais dans une application ; un `node_modules` ou un `package-lock.json` qui apparaît dans `apps/` signale un conflit de versions à corriger.
- Avec `NodeNext`, les imports relatifs du worker et de l'API se terminent par `.js`, même depuis un fichier `.ts` (`import { x } from "./db.js"`).
- La CI (V2) pourra tout installer en une fois et lancer `--workspaces` pour construire et tester les trois applications.
- Passage à TypeScript 7 : à réévaluer quand `typescript-eslint` le supportera.
- Pas de code partagé pour l'instant. Si des types doivent être partagés entre le worker, l'API et le front (par exemple la forme d'un rappel), ajouter un paquet `packages/shared` et `"packages/*"` dans `workspaces`.
- Déploiement : chaque application sera déployée séparément depuis le même dépôt. À vérifier lors du choix de l'hébergement : la plateforme doit permettre de choisir le dossier de l'application et de lancer l'installation à la racine.
