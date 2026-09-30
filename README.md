# Cocon 🌷

Web app installable (PWA) pour suivre une routine préconception : compléments, plantes, eau, marche, sport (hebdo) et repas plaisir (hebdo), avec un compte « soutien » qui suit la progression et envoie des encouragements.

## Principes de motivation intégrés

| Principe | Dans l'app |
|---|---|
| Friction minimale | Items groupés par moment (matin/midi/soir), bouton « Tout pris », verres d'eau tapables |
| Ancrage aux habitudes existantes | Chaque prise est rattachée à un moment de la journée + rappel à heure fixe |
| Pas de culpabilité | Série douce : ne casse qu'après **2 jours** manqués d'affilée ; messages bienveillants après un jour off |
| Objectifs hebdo quand c'est plus pertinent | Sport 3×/semaine, repas plaisir ≤ 1/semaine |
| Célébrer les progrès | Anneau du jour, confettis à 100 %, paliers (3, 7, 14, 21, 30, 66, 100 jours), bilan de semaine positif |
| Soutien du partenaire | Compte soutien en lecture + mots d'encouragement (notification push) |
| Rattrapage facile | On peut remplir les 6 jours précédents (flèches à côté de la date) |

## Essayer en local (sans backend)

```bash
npm install
npm run demo
```

→ http://localhost:5199 (données dans le navigateur ; réinitialiser : `localStorage.removeItem('cocon-demo')`).

## Mise en ligne

### 1. Supabase

1. Nouveau projet (ou existant) → **SQL Editor** → coller `supabase/schema.sql` → *Run*.
2. **Authentication → Providers → Email** : laisser activé. Optionnel : désactiver *Confirm email* pour éviter l'étape de confirmation.
3. **Project Settings → API** : noter `Project URL` et la clé `anon public`.

### 2. Clés de notifications (VAPID)

```bash
npx web-push generate-vapid-keys
```

Garder la clé publique (va dans l'app) et la clé privée (reste côté Supabase uniquement).

### 3. Fonction de rappels

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
npx supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:ton@email CRON_SECRET=<une-chaine-aleatoire>
npx supabase functions deploy push
```

Puis **Database → Extensions** : activer `pg_cron` et `pg_net`, et exécuter `supabase/cron.sql` (après avoir remplacé les `<...>`).

### 4. GitHub Pages

1. Créer un repo sur ton GitHub perso (ex. `cocon`), puis :
   ```bash
   git remote add origin git@github.com:<toi>/cocon.git
   git push -u origin main
   ```
2. Repo → **Settings → Pages → Source : GitHub Actions**.
3. Repo → **Settings → Secrets and variables → Actions → Variables** : ajouter `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_VAPID_PUBLIC_KEY`.
4. Relancer le workflow (onglet *Actions*). L'app est servie sur `https://<toi>.github.io/cocon/`.
5. Supabase → **Authentication → URL Configuration** : mettre cette URL en *Site URL*.

> La clé `anon` et la clé VAPID publique sont faites pour être publiques (la sécurité repose sur les règles RLS du schéma). Ne jamais mettre la `service_role` key ni la clé VAPID privée dans le repo.

### 5. Sur le téléphone

- **iPhone** : ouvrir l'URL dans Safari → Partager → *Sur l'écran d'accueil*. Ouvrir depuis l'icône, puis Routine → *Activer les rappels* (iOS 16.4+).
- **Android** : Chrome propose *Installer l'application*.
- Le partenaire crée son compte, choisit *La soutenir* et entre le code affiché dans Routine → Mon soutien.

## Structure

```
src/
  lib/        supabase, dates, types, data (hooks + mutations optimistes), motivation, push, demo
  screens/    Today, Week, Routine, Supporter, Setup, Auth
  components/ Ring, Sheet, Burst
public/       manifest, service worker (cache + push), icônes
supabase/     schema.sql, cron.sql, functions/push
```
