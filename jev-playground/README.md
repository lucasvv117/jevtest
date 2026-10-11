# Banc d’essai Jev

Petite app Next.js pour tester **Jev** (TypeSafe AI, `typesafe-ai/jev`) via Vercel AI Gateway sur des cas de classification.

- **Un texte** : on colle un texte, Jev répond à chaque question (choice / score / boolean) avec la distribution de probabilités et la confiance.
- **Un lot** : on colle jusqu’à 300 lignes depuis un tableur (`texte` + `libellé attendu`), on obtient précision, taux de classement auto selon un seuil, latence p50/p95, coût, et un export CSV.
- Les cas d’usage sont dans `lib/use-cases.ts` (2 exemples fournis). Les questions sont aussi éditables à la volée dans l’interface.

Les appels partent avec Zero Data Retention + No Training activés.

## Déployer

```bash
# 1. Pousser sur GitHub (repo privé recommandé)
git init && git add . && git commit -m "Jev playground"
gh repo create jev-playground --private --source=. --push
# ou : créer le repo sur github.com puis
# git remote add origin git@github.com:<vous>/jev-playground.git && git push -u origin main
```

2. Sur vercel.com : **Add New → Project → Import** le repo. Aucun réglage de build à changer.
3. **Settings → Environment Variables** : ajouter `APP_PASSWORD` (sinon l’URL est publique et consomme vos crédits), puis redéployer.
4. AI Gateway doit être disponible sur le compte (onglet **AI Gateway** du dashboard). Sur Vercel, l’authentification passe par le token OIDC automatique : pas de clé à configurer.

À l’ouverture, le navigateur demande un identifiant (n’importe lequel) et le mot de passe `APP_PASSWORD`.

## En local

```bash
npm install
cp .env.example .env.local   # renseigner AI_GATEWAY_API_KEY (dashboard Vercel → AI Gateway → API Keys)
npm run dev                  # http://localhost:3000
```

Alternative : `vercel link && vercel env pull` (token OIDC valable 12 h).

## Ajouter un cas d’usage

Dans `lib/use-cases.ts`, copier un bloc et adapter :

| type      | criteria                                              | réponse                         |
| --------- | ----------------------------------------------------- | ------------------------------- |
| `choice`  | `{ cle: 'description' }`, 2 à 255 options             | option choisie + probabilités   |
| `score`   | `['niveau bas', …, 'niveau haut']`, 2 à 10 niveaux    | moyenne pondérée + probabilités |
| `boolean` | optionnel `{ true: '…', false: '…' }`                 | P(vrai)                         |

Bonnes pratiques Vercel : questions atomiques, options décrites plutôt que juste nommées, seuils choisis à partir de données annotées.

## Stack

Next.js 16 (App Router), AI SDK 7 (`experimental_evaluate`), aucune base de données. Tarif Jev : 0,042 $ / 1M tokens d’entrée, sortie gratuite.
