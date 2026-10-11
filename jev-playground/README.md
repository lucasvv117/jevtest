# Banc d’essai Jev

Petite app Next.js pour tester **Jev** (TypeSafe AI, `jev-latest`) en appelant directement l’API TypeSafe sur des cas de classification.

- **Un texte** : on colle un texte, Jev répond à chaque question (choice / score / boolean) avec la distribution de probabilités et la confiance.
- **Un lot** : on colle jusqu’à 300 lignes depuis un tableur (`texte` + `libellé attendu`), on obtient précision, taux de classement auto selon un seuil, latence p50/p95, coût, et un export CSV.
- Les cas d’usage sont dans `lib/use-cases.ts` (3 fournis, dont « Agent tool calling » qui affiche le schéma du FRA Agent avec, pour chaque tool, le verdict de Jev en vert/rouge). Les questions sont éditables dans l’interface via un éditeur visuel (ajout/suppression de questions, d’options, de niveaux, avec explication de chaque type) ou en JSON. L’interface est en anglais.

Les appels partent directement vers `https://api.typesafe.ai/v1` avec votre clé TypeSafe (pas de passage par Vercel AI Gateway).

## Déployer

```bash
# 1. Pousser sur GitHub (repo privé recommandé)
git init && git add . && git commit -m "Jev playground"
gh repo create jev-playground --private --source=. --push
# ou : créer le repo sur github.com puis
# git remote add origin git@github.com:<vous>/jev-playground.git && git push -u origin main
```

2. Sur vercel.com : **Add New → Project → Import** le repo. Aucun réglage de build à changer.
3. **Settings → Environment Variables** : ajouter `TYPESAFE_AI_API_KEY` (créée sur [console.typesafe.ai/keys](https://console.typesafe.ai/keys)) et `APP_PASSWORD` (sinon l’URL est publique et consomme vos crédits), puis redéployer.

À l’ouverture, le navigateur demande un identifiant (n’importe lequel) et le mot de passe `APP_PASSWORD`.

## En local

```bash
npm install
echo "TYPESAFE_AI_API_KEY=..." > .env.local   # clé depuis console.typesafe.ai/keys
npm run dev                                  # http://localhost:3000
```

## Ajouter un cas d’usage

Dans `lib/use-cases.ts`, copier un bloc et adapter :

| type      | criteria                                              | réponse                         |
| --------- | ----------------------------------------------------- | ------------------------------- |
| `choice`  | `{ cle: 'description' }`, 2 à 255 options             | option choisie + probabilités   |
| `score`   | `['niveau bas', …, 'niveau haut']`, 2 à 10 niveaux    | moyenne pondérée + probabilités |
| `boolean` | optionnel `{ true: '…', false: '…' }`                 | P(vrai)                         |

Bonnes pratiques Vercel : questions atomiques, options décrites plutôt que juste nommées, seuils choisis à partir de données annotées.

## Stack

Next.js 16 (App Router), AI SDK 7 (`experimental_decide` + `@ai-sdk/typesafe-ai`), aucune base de données. Tarif Jev : 0,042 $ / 1M tokens d’entrée, sortie gratuite.
