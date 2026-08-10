# Back-office plateforme

Le back-office `/admin` est séparé des rôles familiaux Parent/Nounou.

## Accès

- Identifiant par défaut : `Admin`
- Mot de passe : variable serveur `PLATFORM_ADMIN_PASSWORD`
- Secret de session optionnel : `PLATFORM_ADMIN_SESSION_SECRET`

Le mot de passe ne doit jamais être commité dans GitHub. Il doit être configuré dans Vercel pour les environnements souhaités.

## Sécurité

- cookie HTTP-only ;
- `SameSite=Strict` ;
- session limitée à 8 heures ;
- comparaison constante des identifiants ;
- back-office fermé si le secret n'est pas configuré ;
- mutations revérifiées côté serveur ;
- dernier Parent Admin d'une famille protégé ;
- suppression d'un membership refusée lorsque l'historique financier doit être conservé ;
- actions support journalisées dans `activity_logs`.
