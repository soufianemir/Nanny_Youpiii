# Nanny Youpiii — Back-office plateforme

Le back-office `/admin` est séparé de l'application Parent / Nounou et sert uniquement au support et à la correction d'incidents utilisateurs.

## Autorisation

L'accès est contrôlé côté serveur par `PLATFORM_ADMIN_EMAILS` (une ou plusieurs adresses séparées par des virgules). Si la variable est absente ou vide, `/admin` reste inaccessible.

## Fonctions support

- rechercher un compte Neon Auth ;
- voir ses familles, rôles et statuts ;
- modifier rôle, statut, libellé, enfants accessibles et permissions ;
- suspendre tous les accès d'un utilisateur ;
- retirer un membership sans historique ;
- supprimer définitivement un compte Auth uniquement lorsqu'il n'a plus aucun membership et après confirmation explicite ;
- ajouter un compte existant à une famille ;
- inviter un utilisateur par e-mail ;
- corriger le nom / fuseau d'une famille ;
- corriger les informations d'un enfant ;
- consulter les actions support récentes.

## Garde-fous

- impossible de suspendre, retirer ou supprimer son propre compte ;
- impossible de retirer, suspendre ou rétrograder le dernier Parent Admin actif d'une famille ;
- impossible de créer directement un nouveau Parent Admin : une promotion doit partir d'un membre existant ;
- un membership avec historique de garde, journal, transmission ou financier doit être suspendu plutôt que supprimé ;
- la suppression Auth nécessite de taper `SUPPRIMER` et exige zéro membership ;
- les mutations liées à une famille sont journalisées dans `activity_logs`.
