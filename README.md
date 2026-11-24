# StudyBoard

Un tableau Kanban pour suivre ses devoirs, projets et révisions. Fait en HTML, CSS et JavaScript, sans framework ni backend.

**Démo :** https://jvrlc.github.io/studyboard/

![Capture d'écran](screenshot.png)

## Fonctionnalités

- Tableau en trois colonnes (À faire, En cours, Terminé) avec barre latérale : recherche, matières, priorité, avancement
- Clic sur une carte pour la modifier, bouton « + » pour ajouter directement dans une colonne
- Ajout, modification et suppression de tâches
- Matière, deadline et priorité pour chaque tâche
- Couleur automatique par matière
- Alerte visuelle pour les deadlines proches ou dépassées
- Sauvegarde automatique dans le navigateur (`localStorage`), synchronisée entre onglets
- Drag & drop entre colonnes (les boutons ← → restent disponibles au clavier)
- Filtres par matière et priorité, statistiques d'avancement
- Chronomètre d'étude par tâche (une seule session à la fois) et temps total étudié
- Notes sur chaque tâche, recherche plein texte
- Raccourcis clavier : `n` nouvelle tâche, `/` rechercher
- Export / import JSON
- Thème clair/sombre automatique, avec bascule manuelle

## Lancer le projet

```bash
git clone https://github.com/JVRLC/studyboard.git
cd studyboard
```

Ouvre ensuite `index.html` dans ton navigateur. Aucune installation nécessaire.

## Structure

```
studyboard/
├── index.html
├── css/style.css
└── js/
    ├── storage.js   # lecture et écriture du localStorage
    ├── ui.js        # affichage du tableau et des cartes
    └── app.js       # logique et gestion des événements
```

## Roadmap

- [x] v2 : drag & drop, filtres par matière et priorité, export/import JSON, mode sombre, statistiques
- [ ] v3 : version React ou Vue, backend Node.js, comptes utilisateurs, projets de groupe

## Licence

MIT
