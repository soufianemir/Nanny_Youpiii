# Nanny Youpiii

V1 mobile-first de coordination quotidienne entre parents et nounou.

## Démo intégrée

- Parent
- Aurore (nounou)
- Constance (5 ans)

## Philosophie produit

**RAS = tout va bien.** La nounou ne coche pas chaque tâche. Elle signale uniquement les adaptations, exceptions, informations utiles et incidents.

## Fonctionnalités V1 prototype

- vues Parent / Aurore
- briefing quotidien
- début / fin de garde + passation
- Maintenant / Ensuite / À savoir
- repas planifiés en une seule liste
- adaptation d'un repas + ajout automatique aux courses
- sieste / réveil
- sortie + GPS ponctuel optionnel
- tâches par exception
- notes, incidents, moments
- petite caisse + dépenses à rembourser
- liste de courses
- timeline
- historique
- PWA + service worker
- thème sombre via préférence système

## Architecture

Cette première version utilise un store navigateur (`localStorage`) derrière `js/state.js` pour permettre de tester l'UX sans infrastructure payante ni carte bancaire. La couche de persistance est volontairement isolée afin d'être remplacée par PostgreSQL dans l'étape serveur sans refaire l'interface.

## Développement local

Aucune dépendance npm. Servir le dossier avec n'importe quel serveur statique, par exemple :

```bash
python3 -m http.server 3000
```

Puis ouvrir http://localhost:3000.

## Déploiement public

Le dépôt contient un workflow GitHub Pages qui publie automatiquement une version publique gratuite à chaque push sur `main`, en complément du déploiement Vercel.
