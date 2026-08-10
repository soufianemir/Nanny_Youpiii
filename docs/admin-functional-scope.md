# Périmètre fonctionnel du back-office

Le back-office permet au super-administrateur de support de :

- rechercher les comptes Neon Auth ;
- consulter leurs appartenances aux familles ;
- modifier rôle, statut, libellé, enfants accessibles et permissions ;
- suspendre les accès sans casser l'historique ;
- retirer un membre d'une famille lorsque les contraintes d'intégrité le permettent ;
- corriger le nom/fuseau d'une famille ;
- corriger les informations d'un enfant ;
- ajouter un compte existant à une famille ;
- inviter un nouveau compte avec ses droits ;
- consulter le journal des opérations d'administration.

Les rôles familiaux `PARENT_ADMIN`, `PARENT`, `NANNY`, `BABYSITTER`, `CAREGIVER` ne donnent jamais accès au back-office plateforme.
