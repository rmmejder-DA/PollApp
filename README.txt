PollApp
=======

PollApp ist eine Webanwendung zum Erstellen, Verwalten und Auswerten von Umfragen.

Funktionen
----------
- Neue Umfragen mit Kategorien, Ablaufdatum und mehreren Fragen erstellen.
- Antwortoptionen pro Frage anlegen und Mehrfachantworten erlauben.
- Laufende und vergangene Umfragen auf der Startseite anzeigen.
- Umfragen beantworten oder ohne Auswahl abschliessen.
- Live-Ergebnisse mit Stimmenanteilen ansehen.
- Responsive Darstellung fuer Desktop, Tablet und Mobilgeraete.

Technik
-------
Die Anwendung basiert auf Angular und verwendet Supabase fuer die Speicherung der Umfragen.

Entwicklung
-----------
Voraussetzungen:
- Node.js 20 oder neuer
- npm 11 oder neuer

Projekt installieren:
  npm install

Entwicklungsserver starten:
  npm start

Die Anwendung ist danach unter diesem Pfad erreichbar:
  http://localhost:4200/angular-project/

Der Entwicklungsserver aktualisiert die Anwendung automatisch nach Aenderungen an den Quelldateien.

Produktions-Build erstellen:
  npm run build