# Nanny Youpiii — Back-office plateforme

Le back-office est disponible sur `/admin` et reste totalement séparé de l'application Parent / Nounou.

## Autorisation

L'accès est contrôlé uniquement côté serveur par la variable d'environnement :

`PLATFORM_ADMIN_EMAILS`

Sa valeur contient une ou plusieurs adresses e-mail séparées par des virgules. Si la variable est absente ou vide, `/admin` renvoie 404 pour tout le monde.

## Fonctions support

- rechercher un compte Neon Auth ;
- voir ses familles et rôles ;
- modifier rôle, statut, libellé, enfants accessibles et permissions ;
- suspendre les accès d'un utilisateur ;
- retirer un membership sans historique ;
- supprimer définitivement un compte Auth uniquement lorsqu'il n'a plus aucun membership et après confirmation explicite ;
- ajouter un compte existant à une famille ;
- inviter un utilisateur par e-mail ;
- corriger le nom/fuseau d'une famille ;
- corriger les informations d'un enfant ;
- consulter les actions support récentes.

## Garde-fous

- impossible de suspendre ou supprimer son propre compte depuis le back-office ;
- impossible de retirer/suspendre le dernier Parent Admin actif d'une famille ;
- un membership ayant déjà un historique de garde, journal, transmission ou financier ne peut pas être supprimé : il doit être suspendu ;
- la suppression définitive nécessite de taper `SUPPRIMER` et n'est possible qu'après retrait de tous les memberships ;
- les mutations liées à une famille sont enregistrées dans `activity_logs`.
