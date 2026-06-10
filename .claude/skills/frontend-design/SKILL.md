---
name: frontend-design
description: Wird automatisch aktiviert, wenn der User Benutzeroberflächen, Landingpages, Komponenten, CSS/Tailwind oder visuelle Layouts erstellen oder überarbeiten möchte. Zwingt das Modell zu extremem, bewusstem und hochwertigem Design mit React, Vite, TypeScript und Tailwind CSS im Positron-Frontend.
version: 1.0.0
triggers:
  - "baue eine landingpage"
  - "erstelle eine komponente"
  - "schreibe css"
  - "design anpassen"
  - "ui/ux optimieren"
---

# Frontend Design Skill Richtlinien

## 1. Technischer Stack & Frameworks
- **Framework:** React 18 mit Vite 5 und TypeScript im `apps/web`-Frontend.
- **Styling:** Tailwind CSS 3.4 als Primärsystem, ergänzt um gezielte CSS-Variablen und Custom CSS in `apps/web/src/index.css`.
- **Code-Stil:** Halte dich strikt an saubere Komponenten-Trennung, semantisches HTML und DRY-Prinzipien. Nutze funktionale Komponenten, klare Props und kleine, gut isolierte UI-Bausteine.

## 2. Design-Philosophie & "Anti-AI-Slop"
- Verbiete Standard-Entscheidungen. Wähle pro UI-Element eine klare visuelle Identität (z. B. hochwertiger Minimalismus, brutalistischer Editorial-Stil oder Tech-Retro). Vermeide generische lila-blaue Verläufe, austauschbare Card-Layouts und sterile Dashboard-Raster ohne Hierarchie.
- Keine Standard-Schriftarten (kein Arial, kein Standard-Inter). Nutze stattdessen charakterstarke Font-Paarungen wie `Space Grotesk` oder `Fraunces` für Headings, `IBM Plex Sans` für Fließtext und `IBM Plex Mono` für Code.

## 3. Design Tokens (Strikte Einhaltung)
- **Farbpalette:** Definiere Farben immer über zentrale CSS-Variablen oder Tailwind-Klassen.
  - Primar: `#0f172a`
  - Sekundar: `#111827`
  - Akzent: `#38bdf8`
- **Abstände & Grid:** Nutze ein striktes 4px- oder 8px-Rastersystem. Keine zufälligen `padding`- oder `margin`-Werte.

## 4. Motion & Interaktion
- Nutze durchdachte, aufeinander abgestimmte CSS-Animationen (z. B. gestaffelte Page-Loads mit `animation-delay`).
- Hover-Effekte müssen sich "snappy" und wertig anfühlen (nutze präzise Easing-Kurven wie `cubic-bezier(0.16, 1, 0.3, 1)`).

## 5. Workflow-Anweisung für die KI
Wenn dieser Skill getriggert wird:
1. Analysiere das Ziel der UI-Komponente.
2. Lege zuerst intern die Design-Richtung fest.
3. Schreibe erst dann den Code und implementiere sofort barrierefreie Attribute (ARIA, Tastaturbedienbarkeit).
