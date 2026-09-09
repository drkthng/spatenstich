---
phase: quick-260611-jzl
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/src/components/editor/web/WebRotationHandle.tsx
  - app/src/components/editor/RotationHandle.tsx
  - app/src/components/editor/__tests__/WebRotationHandle.test.tsx
  - app/src/components/editor/__tests__/RotationHandle.test.tsx
autonomous: true
requirements: [BUGFIX-ROT-JUMP]
must_haves:
  truths:
    - "Erstes Move-Event nach Drag-Start dreht das Element sanft von seiner aktuellen Lage, nicht in einen festen ~90°/270°-Sprung"
    - "Das Greifen des Rotations-Handles ohne Bewegung lässt rotateDeg unverändert (Start-Offset ist 0-Delta)"
    - "Fix gilt für Web (WebRotationHandle) UND Native/Skia (RotationHandle) — beide nutzen Start-Offset"
    - "Bestehende 15°-Snap-Logik (snapRotation) bleibt erhalten; Shift-Bypass im Web bleibt erhalten"
  artifacts:
    - path: "app/src/components/editor/web/WebRotationHandle.tsx"
      provides: "Web-Rotation mit Start-Offset-Erfassung bei mousedown"
      contains: "rotateDeg"
    - path: "app/src/components/editor/RotationHandle.tsx"
      provides: "Skia-Rotation mit Start-Offset-Erfassung bei onBegin"
      contains: "rotateDeg"
  key_links:
    - from: "WebRotationHandle onMouseDown"
      to: "offsetDeg = pointerAngleAtStart - currentRotateDeg"
      via: "store-read provenance.rotateDeg + atan2 am Greifpunkt"
      pattern: "atan2"
    - from: "RotationHandle onBegin"
      to: "offsetDeg = pointerAngleAtStart - currentRotateDeg"
      via: "store-read provenance.rotateDeg + atan2 am Greifpunkt"
      pattern: "atan2"
---

<objective>
Behebt den Editor-Bug "Erste Rotation springt um ~90°/270°": Beim Greifen des Rotations-Handles springt das selektierte Element sofort in eine feste Lage statt sanft von seiner aktuellen Rotation zu starten.

Purpose: Rotation soll relativ zur aktuellen Element-Lage und zur Greifposition starten, damit kleine Pointer-Bewegungen kleine Rotationsänderungen ergeben.
Output: Start-Offset-Erfassung in beiden Handle-Implementierungen (Web + Native) plus Regressionstests, die den Sprung beim ersten Move-Event abdecken.
</objective>

<root_cause>
Beide Handles berechnen die ABSOLUTE Winkelposition Pointer→Element-Center via `atan2` und weisen sie direkt (nach Snap) als neue `rotateDeg` zu — OHNE Start-Offset.

Das Handle sitzt am Top-Center des Elements (12-Uhr-Position: Web `yPx < centerYPx`, Skia `yM < centerYM`). In Screen-Koordinaten (y-down) ergibt ein Punkt direkt über dem Center `atan2(negativ, 0) = -90°`, was `snapRotation` zu **270°** normalisiert. Genau das ist der "~90°/270°"-Sprung: schon das erste Move-Event (Pointer praktisch noch in Handle-Ruhelage) setzt rotateDeg von z.B. 0° auf 270°.

Es ist KEINE Achsen-Verwechslung — die Render-Schicht nutzt `rotate(deg, cx, cy)` in derselben Screen-Konvention (clockwise, y-down), konsistent mit `atan2`. Fehlend ist allein die Offset-Erfassung beim Drag-Start:
  - Start:  `offsetDeg = atan2(pointerStart - center) - currentRotateDeg`
  - Während: `newDeg = atan2(pointer - center) - offsetDeg`, dann `snapRotation(newDeg, free)`

So liefert das erste Move-Event ~0 Delta und die Rotation startet sanft von der aktuellen Lage. Die 15°-Snap-Logik in `rotationSnap.ts` ist korrekt und bleibt unverändert (Snap auf das Offset-korrigierte Ergebnis ist gewünscht).

Verifiziert gegen:
- app/src/components/editor/web/WebRotationHandle.tsx:51-59 (onMove: absolute atan2 ohne Offset)
- app/src/components/editor/RotationHandle.tsx:74-82 (onChange: absolute atan2 ohne Offset)
- app/src/components/editor/web/WebPlanEditor.tsx:363,427 (Render: rotate(deg,cx,cy) — Screen-clockwise, konsistent)
- app/src/lib/editor/rotationSnap.ts (Snap korrekt; normalisiert -90→270 → erklärt den 270°-Sprung)
</root_cause>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
</execution_context>

<context>
@.planning/STATE.md
@app/src/components/editor/web/WebRotationHandle.tsx
@app/src/components/editor/RotationHandle.tsx
@app/src/lib/editor/rotationSnap.ts
@app/src/components/editor/__tests__/WebRotationHandle.test.tsx
@app/src/components/editor/__tests__/RotationHandle.test.tsx
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Web-Handle Start-Offset erfassen (WebRotationHandle)</name>
  <files>app/src/components/editor/web/WebRotationHandle.tsx, app/src/components/editor/__tests__/WebRotationHandle.test.tsx</files>
  <behavior>
    - Bei mousedown: aktuelle Rotation aus dem Store lesen (`provenance.rotateDeg`, mit `typeof === 'number' && Number.isFinite` Guard, sonst 0) und den Greifpunkt-Winkel am Handle-Punkt relativ zum Element-Center via atan2 berechnen; `offsetDeg = pointerStartDeg - currentRotateDeg` in einem Ref ablegen.
    - Bei mousemove: `rawDeg = atan2(...) - offsetDeg`, dann `snapRotation(rawDeg, isShiftDown)` als neue rotateDeg schreiben.
    - Regressionstest: Element mit `rotateDeg: 0`, mousedown am Handle-Punkt (direkt über Center → atan2 ≈ -90°), dann mousemove mit minimaler Bewegung in Handle-Nähe ⇒ erwartete neue rotateDeg liegt nahe 0° (innerhalb eines 15°-Snap-Buckets), NICHT 270°/90°. Der Test MUSS bei der alten (offset-losen) Logik fehlschlagen (RED) und nach dem Fix bestehen (GREEN).
    - Bestehende Tests (render, Shift-Guard Pitfall 7, setGestureActive-Disziplin) bleiben grün.
  </behavior>
  <action>Erfasse beim Drag-Start einen Winkel-Offset zwischen Greifpunkt-Winkel und aktueller Element-Rotation. Lies in `onMouseDown` die aktuelle `provenance.rotateDeg` des Elements aus dem editorStore (gleicher numeric/finite-Guard wie in WebPlanEditor.tsx:353-354, Fallback 0). Berechne den Pointer-Startwinkel mit demselben atan2(clientY-centerScreen.y, clientX-centerScreen.x)-Schema wie onMove und speichere `offsetDeg = pointerStartDeg - currentRotateDeg` in einem useRef (z.B. `offsetDegRef`). Setze den Offset gemeinsam mit `centerScreen` — ist `centerScreen` null, wird der mousemove-Effekt ohnehin nicht aktiv. In `onMove` ziehe den Offset ab: `const newDeg = snapRotation(rawDeg - offsetDegRef.current, isShiftDown)`. Pattern S2 (provenance-Spread vor rotateDeg) und die Shift-Bypass-Logik bleiben unverändert. Snap bleibt aktiv ab erstem Move — durch den Offset ist der erste Wert nun nahe der Ausgangslage, kein Sprung mehr (Solution-Hypothese "Snap erst ab Schwelle" ist NICHT nötig, da der Offset die Ursache adressiert).</action>
  <verify>
    <automated>pnpm --filter app exec jest --testPathPattern=WebRotationHandle</automated>
  </verify>
  <done>WebRotationHandle.test.tsx enthält einen Regressionstest, der ohne Fix fehlschlägt und mit Fix besteht; erste Mausbewegung nahe Handle-Ruhelage ergibt rotateDeg nahe Ausgangs-0° statt 270°/90°; alle bestehenden WebRotationHandle-Tests grün.</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Skia-Handle Start-Offset erfassen (RotationHandle)</name>
  <files>app/src/components/editor/RotationHandle.tsx, app/src/components/editor/__tests__/RotationHandle.test.tsx</files>
  <behavior>
    - Bei onBegin: aktuelle Rotation aus dem Store lesen (`provenance.rotateDeg`, numeric/finite-Guard, sonst 0); Greifpunkt-Winkel relativ zum Center via atan2 berechnen; `offsetDeg = pointerStartDeg - currentRotateDeg` in einem SharedValue ablegen.
    - Bei onChange: `rawDeg = atan2(...) - offsetDeg`, dann `snapRotation(rawDeg, false)` in snappedDeg.
    - Regressionstest: Element mit `rotateDeg: 0`; `_onBegin` am Handle-Punkt (direkt über Center), dann `_onChange` mit minimaler Bewegung in Handle-Nähe ⇒ snapRotation wird mit einem Wert nahe 0 aufgerufen (nicht ~270°). Bestätigt, dass der Offset abgezogen wird. Test schlägt ohne Fix fehl (RED), besteht nach Fix (GREEN).
    - Bestehender Test "invokes snapRotation(rawDeg, false) during onChange" bleibt grün (zweites Argument weiterhin `false`).
  </behavior>
  <action>Spiegele Task 1 auf der Skia-Seite. Lege ein neues `offsetDeg = useSharedValue(0)` an. In `.onBegin((e) => { 'worklet'; ... })` zusätzlich zu startX/startY: lies die aktuelle Rotation per `runOnJS`-Helper ODER — da der Worklet keinen Store-Zugriff hat — übergib die aktuelle rotateDeg über einen JS-Helper, der `useEditorStore.getState().elements.find(...).provenance.rotateDeg` (numeric/finite-Guard, Fallback 0) liest und in `offsetDeg.value` schreibt; berechne den Pointer-Startwinkel mit demselben atan2-Schema wie onChange (currentX/currentY aus e.x/e.y, scale, centerXM/centerYM) und setze `offsetDeg.value = pointerStartDeg - currentRotateDeg`. In `.onChange` ändere die Zeile zu `snappedDeg.value = snapRotation(rawDeg - offsetDeg.value, false)`. Beachte Pattern S3 (setGestureActive bleibt) und Pitfall 8 (try/finally in commitRotationAbsolute bleibt). commitRotationAbsolute schreibt weiterhin den absoluten snappedDeg — durch den Offset ist dieser nun korrekt relativ zur Ausgangslage. Da onBegin ein Worklet ist und `useEditorStore.getState()` JS ist, kapsele die Offset-Berechnung sauber: entweder komplett in einem `runOnJS(initOffset)(e.x, e.y)`-Helper (der den Store liest, atan2 rechnet und offsetDeg via Closure/SharedValue setzt) — bevorzugt, da Store-Zugriff JS-seitig sein muss (Pattern 9: kein Store im Worklet).</action>
  <verify>
    <automated>pnpm --filter app exec jest --testPathPattern=RotationHandle</automated>
  </verify>
  <done>RotationHandle.test.tsx enthält einen Regressionstest, der den Offset-Abzug nachweist (erste Bewegung nahe Handle-Ruhelage ⇒ snapRotation-Argument nahe 0, nicht ~270); bestehender onChange-snapRotation-Test grün; setGestureActive/Pitfall-8-Disziplin unverändert.</done>
</task>

</tasks>

<verification>
- `pnpm --filter app exec jest --testPathPattern=RotationHandle` (deckt RotationHandle.test.tsx UND WebRotationHandle.test.tsx ab) grün.
- Manuell (Web-Browser, optional/UAT): Element selektieren → Rotations-Handle greifen und minimal bewegen → Element startet sanft von aktueller Lage, kein ~90°/270°-Sprung mehr.
- Snap-Verhalten unverändert: rotationSnap.test.ts weiterhin grün (keine Änderung an rotationSnap.ts).
</verification>

<success_criteria>
- Beide Handles (Web + Skia) erfassen beim Drag-Start `offsetDeg = pointerStartDeg - currentRotateDeg` und ziehen ihn während des Drags ab.
- Das erste Move-Event nach Handle-Greifen erzeugt eine sanfte, kleine Rotationsänderung statt eines festen ~90°/270°-Sprungs.
- Je ein Regressionstest pro Handle, der den Sprung-Fall abdeckt (RED ohne Fix → GREEN mit Fix), in den bestehenden Testdateien ergänzt.
- Keine Regression: bestehende Rotation-, Snap- und Render-Tests bleiben grün; rotationSnap.ts unverändert.
</success_criteria>

<output>
Create `.planning/quick/260611-jzl-editor-bug-erste-rotation-springt-um-90-/260611-jzl-SUMMARY.md` when done
</output>
