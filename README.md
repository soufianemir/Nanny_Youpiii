# Nanny Youpiii V3

Application mobile-first pour organiser le quotidien des enfants entre plusieurs parents, nounous et baby-sitters.

## Architecture

- Next.js App Router + TypeScript
- Neon Managed Better Auth : email/password, sessions, vérification e-mail, récupération de compte et invitations d'organisation
- PostgreSQL Neon + Drizzle ORM pour le métier
- Multi-tenant natif via `care_space_id`
- Autorisations serveur via `members` + `member_children`
- Vues Parent et Intervenant distinctes
- Prévisualisation `Voir comme` sans impersonation
- Courses → achat → caisse → avance intervenant dans une transaction unique

Chaque espace de garde Nanny Youpiii correspond à une organisation Neon Auth. Neon gère l'identité et l'acceptation sécurisée des invitations ; les rôles métier (`PARENT`, `NANNY`, `BABYSITTER`, etc.) et les enfants visibles restent gérés par Nanny Youpiii.

## Variables d'environnement

Copier `.env.example` vers `.env.local` et renseigner :

- `DATABASE_URL` : chaîne de connexion PostgreSQL Neon ;
- `NEON_AUTH_BASE_URL` : URL Managed Better Auth de la branche Neon ;
- `NEON_AUTH_COOKIE_SECRET` : secret aléatoire d'au moins 32 caractères pour signer le cache de session ;
- `NEXT_PUBLIC_APP_URL` : URL publique de l'application.

Sans ces variables, la production affiche volontairement un écran **backend à configurer** et n'active pas une fausse authentification.

## Initialisation de la base métier

Neon Auth provisionne ses propres tables dans le schéma `neon_auth`. Le modèle métier Nanny Youpiii est appliqué avec Drizzle :

```bash
npm install
npm run db:push
```

Le build de production exécute également `db:push` lorsqu'un `DATABASE_URL` est présent.

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

Lors d'une migration depuis l'ancienne authentification Better Auth locale, les memberships sont réconciliés par adresse e-mail avant les contrôles d'accès afin d'éviter de perdre l'administration d'un espace existant.
