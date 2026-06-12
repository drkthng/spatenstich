---
status: resolved
trigger: "Bug: kann keine Laube (Infrastruktur) platzieren, weder mit Klick und Ziehen noch mit einfachem Klick in den Plan. Analog Pflanzen — nur Beete lassen sich korrekt über beide Wege platzieren."
created: 2026-06-12
updated: 2026-06-12
---

# Debug: Laube/Pflanze nicht platzierbar im Web-Plan-Editor

## Symptoms

DATA_START
- **Expected:** Palette → Laube (Tab Infrastruktur) oder Pflanze wählen → Klick in den Plan platziert das Element (Klick-Platzierung mit Default-Größe). Beete zusätzlich per Drag aufziehbar.
- **Actual:** Laube und Pflanze werden NICHT platziert — weder per einfachem Klick noch per Klick+Ziehen. Nur Beete funktionieren über beide Wege (Klick UND Drag).
- **Errors:** Keine bekannten Fehlermeldungen (User-Beobachtung im Browser, Konsole nicht geprüft).
- **Timeline:** Regression-Verdacht: nach quick-260611-vk4 (Drag-to-create + Deselect-Fix, Commits 52b5f7e/5a46638/561cd68 vom 2026-06-11). Klick-Platzierung funktionierte zuvor (Phase 7.5).
- **Reproduction:** Web-Editor öffnen → Palette Tab „Infrastruktur" → Laube wählen → in den Plan klicken → nichts passiert. Analog Tab „Pflanzen" → Pflanze wählen → Klick → nichts.
DATA_END

## Context / Prior Analysis (Orchestrator)

- `WebPlanEditor.tsx:552`: vk4 verschob `onClick` (handleSvgClick) + `onMouseDown` (handleCanvasMouseDown) per Spread-Cast `{...({ onClick, onMouseDown } as any)}` auf das react-native-svg `<Svg>`-Element (vorher: onClick am wrappenden `<div>`).
- Statische Analyse: Palette-Wiring (`plan/index.tsx:299-323`), `DEFAULT_SIZES` (alle Kinds inkl. Laube vorhanden) und `handleSvgClick` (placingKind-Branch behandelt alle Kinds) sehen korrekt aus.
- **Haupthypothese:** react-native-svg (Web) reicht `onClick` nicht an das DOM-`<svg>` durch (Props-Filterung) → `handleSvgClick` feuert real nie. Beete „funktionieren", weil sie den separaten `onMouseDown`-Drag-Pfad haben (der evtl. durchgereicht wird oder über window-Listener läuft) — bzw. weil ein „Klick" mit minimaler Mausbewegung den Drag-Pfad triggert. Falls so: auch Deselect-on-background-click wäre real broken (Tests grün nur wegen SVG-Stub, der onClick forwarded).
- Vorsicht: handleCanvasMouseDown liegt ebenfalls am Svg — wenn onMouseDown durchgereicht wird, müsste onClick es eigentlich auch. Alternativ-Hypothesen prüfen: (a) Event-Reihenfolge/preventDefault im Mousedown-Pfad schluckt click, (b) react-native-svg-web normalisiert nur bestimmte Events, (c) Pointer-Events/Responder-System von RN-Web fängt click ab.
- Jest-Tests (WebPlanEditor.dragcreate.test.tsx) nutzen einen SVG-Stub, der onClick/onMouseDown explizit forwarded — sie beweisen NICHT, dass das reale react-native-svg-Web-Element die Handler aufruft.

## Current Focus

hypothesis: react-native-svg-web reicht onClick am <Svg> nicht ans DOM durch — handleSvgClick feuert nie; nur der Beet-only mousedown/window-Listener-Drag-Pfad funktioniert
test: Prüfe react-native-svg Web-Implementierung (node_modules: WebShape/Svg.web) auf Props-Durchreichung von onClick/onMouseDown; alternativ Minimal-Repro im Browser/jsdom mit echtem react-native-svg
expecting: onClick wird gefiltert/nicht attached → Hypothese bestätigt; Fix = Handler zurück auf den wrappenden <div> (mit korrektem getBoundingClientRect-Bezug aufs SVG) oder rnsvg-Web-Event-Props (onPress) nutzen
next_action: react-native-svg Web-Source in node_modules inspizieren (wie werden unbekannte Props/onClick am Svg-Root behandelt?)

## Evidence

- timestamp: 2026-06-12T09:00:00Z
  source: node_modules/react-native-svg/lib/commonjs/web/utils/prepare.js
  finding: >
    `prepare()` destructures `onPress` from props (nicht in `rest`), dann setzt
    `if (onPress !== null) { clean.onClick = props.onPress; }`. Da onPress=undefined
    und `undefined !== null === true`, wird clean.onClick immer mit `undefined`
    überschrieben — auch wenn wir onClick in `...rest` übergeben haben.
    onMouseDown liegt in rest und wird nie überschrieben → Beet-Drag läuft.

- timestamp: 2026-06-12T09:05:00Z
  source: shell
  finding: >
    `node -e "const onPress = undefined; console.log(onPress !== null);"` → true.
    Bestätigt: der Condition-Check feuert immer wenn onPress nicht explizit null ist.

## Eliminated

- onMouseDown-Filterung: onMouseDown wird von prepare() nicht angefasst (kein Override in src), erklärt warum Beet-Drag-to-create funktioniert.
- DEFAULT_SIZES-Lücke: alle Kinds (Laube, Pflanze, etc.) sind vorhanden.
- Palette-Wiring: placingKind wird korrekt übergeben.

## Resolution

root_cause: >
  react-native-svg/web prepare() überschreibt clean.onClick mit undefined wenn onPress
  nicht übergeben wird (undefined !== null → true → clean.onClick = props.onPress = undefined).
  Der onClick-Handler (handleSvgClick) am <Svg> wird damit nie angehängt. Betrifft alle
  Klick-Platzierungen (Laube, Pflanze, etc.) — nur Beet-Drag via onMouseDown blieb funktionsfähig.

fix: >
  onClick vom <Svg>-Element (wo es von prepare() gefiltert wird) auf den wrappenden <div>
  verschoben. Handler in handleDivClick umbenannt + Typ auf React.MouseEvent<HTMLDivElement>
  geändert. Koordinaten über svgWrapperRef (useRef<HTMLDivElement>) statt e.currentTarget.
  onMouseDown bleibt am <Svg> (wird von prepare() nicht überschrieben).

verification: >
  tsc --noEmit: keine Fehler. pnpm exec jest --selectProjects editor --testPathPattern=WebPlanEditor:
  26/26 Tests grün (Tests E+F bestätigen onClick-Bubbling vom <Svg>-Kind zum <div>-Parent).

files_changed:
  - app/src/components/editor/web/WebPlanEditor.tsx
