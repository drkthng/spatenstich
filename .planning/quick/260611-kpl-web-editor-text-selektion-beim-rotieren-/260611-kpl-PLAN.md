---
phase: quick-260611-kpl
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/src/components/editor/web/WebRotationHandle.tsx
  - app/src/components/editor/web/WebResizeHandle.tsx
  - app/src/components/editor/web/WebPlanEditor.tsx
  - app/src/components/editor/__tests__/WebRotationHandle.test.tsx
  - app/src/components/editor/__tests__/WebResizeHandle.test.tsx
autonomous: true
requirements: []
must_haves:
  truths:
    - "Beim Rotieren eines Elements im Web-Editor wird kein Feld-/Element-Text mehr vom Browser markiert"
    - "Beim Resizen (alle 4 Ecken) wird kein Text markiert"
    - "Beim Verschieben eines Elements (Move-Drag) wird kein Text markiert"
    - "Der quick-260611-jzl Rotations-Offset-Fix bleibt intakt (first-move-Regression-Test bleibt grün)"
  artifacts:
    - path: "app/src/components/editor/web/WebRotationHandle.tsx"
      provides: "preventDefault im mousedown verhindert native Text-Selektion beim Rotieren"
    - path: "app/src/components/editor/web/WebResizeHandle.tsx"
      provides: "preventDefault im mousedown verhindert native Text-Selektion beim Resizen"
    - path: "app/src/components/editor/web/WebPlanEditor.tsx"
      provides: "preventDefault im Element-mousedown + userSelect:none auf Canvas-Container"
  key_links:
    - from: "WebRotationHandle.onMouseDown"
      to: "e.preventDefault()"
      via: "optionaler Aufruf vor stopPropagation"
      pattern: "preventDefault"
    - from: "WebPlanEditor canvas <div>"
      to: "userSelect: 'none'"
      via: "cursorStyle / Container-Style"
      pattern: "userSelect"
---

<objective>
Web-Editor: Browser-Text-Selektion während aller Drag-Gesten (Rotieren, Resizen, Verschieben) unterbinden. Beim Drag interpretiert der Browser die gehaltene Maus aktuell als Text-Selektion und highlightet Feld-/Element-Text — das stört die Bedienung massiv (UAT-Beobachtung 2026-06-11, Web).

Purpose: Saubere Drag-Bedienung im Desktop-Web-Editor ohne ungewollte Text-Markierung. Schließt den Pending-Todo `2026-06-11-textauswahl-beim-rotieren-drag.md`.

Output: `e.preventDefault()` in allen drei Web-Drag-mousedown-Handlern + defensives `userSelect: 'none'` auf dem Canvas-Container. Kleine preventDefault-Assertions in den bestehenden Handle-Tests. Der frische Rotations-Offset-Fix (quick-260611-jzl) bleibt unangetastet.
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@./CLAUDE.md
@.planning/todos/pending/2026-06-11-textauswahl-beim-rotieren-drag.md

# Drei Web-Drag-Pfade (alle haben aktuell e.stopPropagation() aber KEIN e.preventDefault()):
@app/src/components/editor/web/WebRotationHandle.tsx
@app/src/components/editor/web/WebResizeHandle.tsx
@app/src/components/editor/web/WebPlanEditor.tsx

# Bestehende Tests (Mock-Event-Pattern beachten — Events sind Teil-Mocks ohne preventDefault):
@app/src/components/editor/__tests__/WebRotationHandle.test.tsx
@app/src/components/editor/__tests__/WebResizeHandle.test.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: preventDefault in allen drei Web-Drag-mousedown-Handlern + userSelect:none auf Canvas-Container</name>
  <files>app/src/components/editor/web/WebRotationHandle.tsx, app/src/components/editor/web/WebResizeHandle.tsx, app/src/components/editor/web/WebPlanEditor.tsx</files>
  <action>
Drei Stellen patchen — jeweils im `onMouseDown`-Handler, direkt nach `e.stopPropagation()`:

1. `WebRotationHandle.tsx` `onMouseDown` (ca. Zeile 87): Nach `e.stopPropagation();` einfügen: `e.preventDefault?.();`. WICHTIG: Optionaler Aufruf mit `?.()`, weil die bestehenden Tests Teil-Mock-Events ohne `preventDefault`-Methode übergeben (z. B. `{ stopPropagation: jest.fn(), clientX, clientY }`). Den gesamten quick-260611-jzl Start-Offset-Block (offsetDegRef, pointerStartDeg, setCenterScreen) NICHT anfassen — nur die eine preventDefault-Zeile direkt nach stopPropagation ergänzen.

2. `WebResizeHandle.tsx` `onMouseDown` (ca. Zeile 139): Nach `e.stopPropagation();` einfügen: `e.preventDefault?.();`. Den rotated-resize computeResize-Pfad nicht berühren.

3. `WebPlanEditor.tsx` `handleElementMouseDown` (ca. Zeile 251): Nach `e.stopPropagation();` einfügen: `e.preventDefault?.();`. Das ist der Element-Move-Drag-Pfad (pendingDragRef-Threshold). Die MOUSE_DRAG_THRESHOLD_PX-Logik und pendingDragRef NICHT ändern — nur preventDefault ergänzen. Hinweis: dieser Pfad wird auch beim Klick zum Selektieren ausgelöst; preventDefault verhindert hier nur die native Text-Selektion, blockiert aber NICHT die spätere dblclick-Erkennung (preventDefault auf mousedown unterbindet kein dblclick) — die T-09.1-DBLCLICK-RACE-Mitigation (passiver mousedown bis 5px-Threshold) bleibt unberührt.

4. Defensiv-Schicht in `WebPlanEditor.tsx`: Den Canvas-Container-`<div>` (ca. Zeile 296, der `onClick={handleSvgClick}` hostet und das `<Svg>` umschließt) um `userSelect: 'none'` im Style erweitern. Den bestehenden `cursorStyle` (React.CSSProperties, ca. Zeile 285-287) um die Property ergänzen: zusätzlich zu `cursor` auch `userSelect: 'none'` und das Vendor-Pendant `WebkitUserSelect: 'none'` setzen, sodass beide cursorStyle-Zweige (placing / default) `userSelect: 'none'` tragen. Das ist permanentes user-select:none auf dem Editor-Canvas — ausreichend und einfacher als ein globaler mousedown→mouseup-Toggle; der Canvas enthält nur SVG-Render, keinen vom Nutzer zu markierenden Lauftext.

KEIN fenced code. Nur die genannten minimalen Einfügungen. Keine Logik-Umbauten, keine Umbenennungen, keine neuen Imports nötig.
  </action>
  <verify>
    <automated>pnpm --filter app exec tsc --noEmit -p tsconfig.json</automated>
  </verify>
  <done>Alle drei Web-Drag-mousedown-Handler rufen `e.preventDefault?.()` nach `e.stopPropagation()` auf; der Canvas-Container-Style trägt `userSelect: 'none'` (+ WebkitUserSelect) in beiden cursorStyle-Zweigen. TypeScript kompiliert ohne Fehler. quick-260611-jzl-Offset-Block unverändert.</done>
</task>

<task type="auto">
  <name>Task 2: preventDefault-Spy-Assertions in bestehende Handle-Tests ergänzen</name>
  <files>app/src/components/editor/__tests__/WebRotationHandle.test.tsx, app/src/components/editor/__tests__/WebResizeHandle.test.tsx</files>
  <action>
Pro Datei eine kleine Assertion ergänzen, die beweist, dass der mousedown-Handler `preventDefault` aufruft. KEINE bestehenden Tests umschreiben oder löschen — nur additiv, und die first-move-Regression in WebRotationHandle.test.tsx (Zeile 182-251) MUSS unverändert grün bleiben.

1. `WebRotationHandle.test.tsx`: Nach dem bestehenden Test `setGestureActive(true) called on mousedown` (endet ca. Zeile 180) einen neuen `it(...)` ergänzen: Komponente rendern (gleiche Props wie dort), `UNSAFE_getAllByType('View')`, dann `views[0].props.onMouseDown` mit einem Mock-Event aufrufen, das einen `preventDefault: jest.fn()` UND `stopPropagation: jest.fn()` plus `clientX`/`clientY` trägt (analog zum bestehenden `evt`-Objekt im setGestureActive-Test). Assertion: `expect(evt.preventDefault).toHaveBeenCalled()`. In `act(() => { views[0].props.onMouseDown(evt); })` wrappen.

2. `WebResizeHandle.test.tsx`: Nach dem Test `calls setGestureActive(true) on mousedown and false on mouseup` (endet ca. Zeile 90) einen neuen `it(...)` ergänzen: Komponente rendern (`corner="br"` wie dort), `UNSAFE_getAllByType('View')`, mousedown-Handler mit Mock-Event `{ preventDefault: jest.fn(), stopPropagation: jest.fn(), clientX: 300, clientY: 250 }` aufrufen. Assertion: `expect(evt.preventDefault).toHaveBeenCalled()`. Beachten: WebResizeHandle.onMouseDown returnt früh, wenn das Element nicht gefunden/gelöscht ist — `el-1` existiert im editorState-Mock (`deletedAt: null`), also wird der Handler vollständig durchlaufen; preventDefault sollte dennoch VOR dem early-return-Check stehen — falls nicht: in Task 1 sicherstellen, dass `e.preventDefault?.()` direkt nach `e.stopPropagation()` und VOR dem `if (!el || el.deletedAt !== null) return;` steht.

KEIN fenced code in diesem Plan. Mock-Event-Objekte als POJO im Test-Code, optionaler `?.()`-Aufruf im Production-Code greift auch bei vorhandenem jest.fn().
  </action>
  <verify>
    <automated>pnpm --filter app exec jest --testPathPattern="WebRotationHandle|WebResizeHandle"</automated>
  </verify>
  <done>Beide Handle-Test-Dateien enthalten je einen neuen grünen Test, der `preventDefault`-Aufruf im mousedown nachweist. Alle bestehenden Tests in beiden Dateien — inkl. der first-move-Regression (jzl) und der rotated-resize-Tests (jtf) — bleiben grün.</done>
</task>

</tasks>

<verification>
- TypeScript: `pnpm --filter app exec tsc --noEmit -p tsconfig.json` grün.
- Jest (Web-Handles): `pnpm --filter app exec jest --testPathPattern="WebRotationHandle|WebResizeHandle"` — alle grün, inkl. neuer preventDefault-Tests und bestehender jzl-/jtf-Regressionen.
- Manuell (Dirk, optional im Web): Element selektieren → Rotation-Handle ziehen → kein Text wird markiert; Resize-Ecke ziehen → kein Text; Element verschieben → kein Text.
</verification>

<success_criteria>
- Alle drei Web-Drag-mousedown-Handler (Rotation, Resize, Move) rufen `e.preventDefault?.()` auf.
- Canvas-Container trägt `userSelect: 'none'`.
- quick-260611-jzl Rotations-Offset-Fix unverändert; dessen Regression-Test grün.
- Zwei neue, kleine preventDefault-Assertions grün; gesamte Web-Handle-Test-Suite grün.
</success_criteria>

<output>
Create `.planning/quick/260611-kpl-web-editor-text-selektion-beim-rotieren-/260611-kpl-SUMMARY.md` when done.
</output>
