# Nanny Youpiii V3

Application mobile-first pour organiser le quotidien des enfants entre plusieurs parents, nounous et baby-sitters.

## Architecture

- Next.js App Router + TypeScript
- Better Auth : email/password, sessions, vérification e-mail, mot de passe oublié
- PostgreSQL + Drizzle ORM
- Multi-tenant natif via `care_space_id`
- Autorisations serveur via `members` + `member_children`
- Vues Parent et Intervenant distinctes
- Prévisualisation `Voir comme` sans impersonation
- Courses → achat → caisse → avance intervenant dans une transaction unique

## Variables d'environnement

Copier `.env.example` vers `.env.local` et renseigner :

- `DATABASE_URL` : PostgreSQL/Neon
- `BETTER_AUTH_SECRET` : secret aléatoire fort
- `BETTER_AUTH_URL` : URL de l'application
- `RESEND_API_KEY` : e-mails transactionnels
- `EMAIL_FROM` : expéditeur vérifié
- `NEXT_PUBLIC_APP_URL` : URL publique

Sans ces variables, la production affiche volontairement un écran **backend à configurer** et n'active pas une fausse authentification.

## Initialisation de la base

```bash
npm install
npm run db:auth
npm run db:push
```

`db:auth` applique les tables Better Auth et `db:push` applique le modèle métier V3.

## Tests

```bash
npm run typecheck
npm test
npm run build
```

Les tests verrouillent notamment la règle métier :

- caisse 100 € + achat 105 € = caisse 0 €, avance 5 € ;
- rechargement 50 € avec avance 5 € = avance 0 €, caisse 45 € ;
- avances isolées par intervenant.

## Sécurité

Les contrôles ne reposent pas sur l'interface. Chaque action serveur vérifie l'utilisateur, son espace, son rôle et les enfants auxquels il est affecté. Les parents peuvent prévisualiser une vue nounou sans changer d'identité.
