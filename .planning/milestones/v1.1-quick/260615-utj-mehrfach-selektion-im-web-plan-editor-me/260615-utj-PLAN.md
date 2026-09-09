---
phase: quick-260615-utj
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - app/src/stores/editorStore.ts
  - app/src/components/editor/web/WebPlanEditor.tsx
  - app/src/stores/__tests__/editorStore.multiselect.test.ts
  - app/src/components/editor/__tests__/WebPlanEditor.multiselect.test.tsx
autonomous: true
requirements: [QUICK-260615-utj]
must_haves:
  truths:
    - "Strg/Cmd-Klick auf ein weiteres Element fügt es additiv zur Selektion hinzu (Toggle)"
    - "Aufziehen eines Rechtecks auf freier Fläche (Marquee) selektiert alle berührten Elemente"
    - "Mehrere selektierte Elemente lassen sich gemeinsam per Maus-Drag verschieben"
    - "Mehrere selektierte Elemente lassen sich gemeinsam per Pfeiltasten verschieben"
    - "Bestehende Einzel-Selektion, Drag-Move, Pfeiltasten-Move, Delete, Resize, Rotation funktionieren unverändert weiter"
    - "Jede gemeinsam verschobene Element-Position wird über den Outbox-Pfad persistiert"
  artifacts:
    - path: "app/src/stores/editorStore.ts"
      provides: "selectedIds Multi-Select-State + Actions (toggle/setMany/clear/group-move)"
      contains: "selectedIds"
    - path: "app/src/components/editor/web/WebPlanEditor.tsx"
      provides: "Ctrl/Cmd-Klick additiv, Marquee-Rubber-Band, Gruppen-Drag, Gruppen-Pfeiltasten, Multi-Selektion-Rendering"
      contains: "selectedIds"
    - path: "app/src/stores/__tests__/editorStore.multiselect.test.ts"
      provides: "Store-Tests für Multi-Select-State + Group-Move"
    - path: "app/src/components/editor/__tests__/WebPlanEditor.multiselect.test.tsx"
      provides: "Component-Tests für additive Klick-Selektion, Marquee, Gruppen-Move"
  key_links:
    - from: "WebPlanEditor.tsx"
      to: "editorStore.selectedIds"
      via: "useEditorStore selector + getState actions"
      pattern: "selectedIds"
    - from: "editorStore group-move action"
      to: "scheduleSaveElement → writePlanElement → writeWithOutbox"
      via: "gestureActive flush subscription (already iterates all changed elements by ref)"
      pattern: "updateElement"
---

<objective>
Mehrfach-Selektion im Web-Plan-Editor: mehrere Elemente markieren und gemeinsam verschieben
(Maus-Drag + Pfeiltasten), additive Auswahl per Strg/Cmd-Klick, sowie Rubber-Band/Marquee-Selektion
durch Aufziehen eines Bereichs auf freier Fläche.

Purpose: Schnellere manuelle Gartenplanung — Dirk kann eine Gruppe von Beeten/Pflanzen in einem Zug
umordnen statt jedes Element einzeln. Reine Web/Desktop-Maus-Funktion.

Output: Multi-Select-State im editorStore (additiv, least-breaking), Web-Editor-Wiring (Ctrl/Cmd-Klick,
Marquee, Gruppen-Drag, Gruppen-Pfeiltasten, Gruppen-Delete, Multi-Selektion-Rendering), plus Tests.

Design-Entscheidung (least-breaking, begründet): NEU `selectedIds: string[]` als Quelle der Wahrheit
für Mehrfach-Selektion. `selection: string | null` BLEIBT erhalten als abgeleitetes "primäres / zuletzt
selektiertes" Element. Begründung: ALLE bestehenden Konsumenten von `selection` (Resize-/Rotation-Handles,
ElementEditorModal-Trigger via editingElementId, native EditorCanvas, Single-Element-Pfeiltasten-Fallback,
Selection-Outline) bleiben unverändert und lesen weiter `selection`. `setSelection(id)` hält beide synchron
(`selectedIds = id ? [id] : []`). Gruppen-Verhalten wird additiv obendrauf gebaut; bei `selectedIds.length <= 1`
ist das Verhalten identisch zu heute → keine Regression. Native (Skia) Multi-Select ist BEWUSST DEFERRED;
native Einzel-Selektion bleibt funktionsfähig (User fragte explizit nach Maus/Web).
</objective>

<execution_context>
@$HOME/.claude/gsd-core/workflows/execute-plan.md
@$HOME/.claude/gsd-core/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@CLAUDE.md

@app/src/stores/editorStore.ts
@app/src/components/editor/web/WebPlanEditor.tsx
@app/app/(app)/plan/index.tsx
@app/src/stores/__tests__/editorStore.transform.test.ts
@app/src/components/editor/__tests__/WebPlanEditor.clickSelect.test.tsx
@app/src/components/editor/__tests__/WebPlanEditor.arrowkeys.test.tsx
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: editorStore Multi-Select-State + Actions + Gruppen-Move (mit Tests)</name>
  <files>app/src/stores/editorStore.ts, app/src/stores/__tests__/editorStore.multiselect.test.ts</files>
  <behavior>
    - selectedIds default: [] ; selection default bleibt null
    - setSelection(id): setzt selection=id UND selectedIds = id ? [id] : [] (Backward-Compat-Sync, EIN Element)
    - toggleSelection(id): wenn id in selectedIds → entfernen; sonst hinzufügen. selection wird auf das
      zuletzt hinzugefügte Element gesetzt (primär), bzw. auf das letzte verbleibende / null wenn leer.
    - setSelectedIds(ids): ersetzt selectedIds komplett; selection = letztes Element von ids (oder null wenn leer).
    - clearSelection(): selectedIds=[], selection=null.
    - moveSelectedBy(dxM, dyM): verschiebt JEDES Element in selectedIds (deletedAt===null) um (dxM,dyM) über
      updateElement — keine eigene Persistenz, nutzt bestehenden updateElement-Pfad. Verschiebt nichts wenn
      selectedIds leer. (Clamping NICHT im Store — Store kennt keine dimensions; Clamping bleibt im Web-Editor.)
    - selectedIds/selection bleiben aus zundo partialize ausgeschlossen (kein Eintrag in partialize) — nur
      elements ist undoable; bestätigen dass partialize unverändert nur { elements } liefert.
    - undo/redo-Wrapper: zusätzlich zu selection:null auch selectedIds:[] zurücksetzen (stale-Pointer-Schutz, Open Q 4).
    - Group-Move-Persistenz: moveSelectedBy ruft updateElement N-mal → N neue Element-Referenzen → die
      bestehende auto-save Subscription (bzw. gestureActive-Flush) iteriert alle geänderten Refs und ruft
      scheduleSaveElement pro Element. Test verifiziert: nach setGestureActive(true) → moveSelectedBy →
      setGestureActive(false) wird scheduleSaveElement für JEDES bewegte Element aufgerufen (mode='account').
  </behavior>
  <action>
    Erweitere EditorState-Interface um `selectedIds: string[]` (direkt unter `selection`, mit Kommentar dass
    es wie selection NICHT in zundo partialize ist — Pitfall-3). Ergänze Actions: `toggleSelection: (id: string) => void`,
    `setSelectedIds: (ids: string[]) => void`, `clearSelection: () => void`, `moveSelectedBy: (dxM: number, dyM: number) => void`.

    Implementiere im create()-Initial-State `selectedIds: []`. Passe `setSelection` an, damit es selectedIds
    synchron hält: `set({ selection: id, selectedIds: id ? [id] : [] })`. So bleiben alle bestehenden
    setSelection-Aufrufer (handleElementMouseDown ohne Modifier, Drag-to-create-Auswahl, Delete-Reset,
    native EditorCanvas, Escape) automatisch korrekt — sie setzen genau ein selektiertes Element.

    toggleSelection: lies aktuellen selectedIds; ist id enthalten → herausfiltern, sonst anhängen. Setze
    selection auf das letzte Element des neuen Arrays (oder null bei leer). setSelectedIds analog (selection =
    ids[ids.length-1] ?? null). clearSelection: `set({ selectedIds: [], selection: null })`.

    moveSelectedBy: lies get().selectedIds und get().elements; für jede id in selectedIds, deren Element
    existiert und deletedAt===null, rufe get().updateElement(id, { xM: el.xM + dxM, yM: el.yM + dyM }).
    KEIN Clamping im Store (dimensions unbekannt). KEIN eigener setGestureActive-Aufruf — der Aufrufer
    (Web-Editor) steuert die Gesture-Klammer wie beim Single-Drag.

    Ergänze im undo/redo-Wrapper-IIFE (ab ~Zeile 167) zusätzlich `selectedIds: []` neben `selection: null`
    in beiden setState-Aufrufen.

    Bestätige (kein Code-Change nötig): partialize liefert weiterhin nur { elements }; die auto-save +
    gestureActive-Flush-Subscriptions iterieren bereits `for (const el of state.elements)` und flushen jeden
    geänderten Ref — Gruppen-Moves werden dadurch ohne Zusatzcode persistiert.

    Erstelle die Test-Datei nach dem Muster von editorStore.transform.test.ts (realer Store via useEditorStore.setState
    Reset in beforeEach, scheduleSaveElement/authStore gemockt, makeEl-Helper). Tests:
    T-utj-store-01 setSelection(id) setzt selectedIds=[id]; setSelection(null) leert beide.
    T-utj-store-02 toggleSelection fügt zweites Element additiv hinzu (selectedIds.length===2).
    T-utj-store-03 toggleSelection auf bereits selektiertes entfernt es; selection fällt auf verbleibendes/null.
    T-utj-store-04 setSelectedIds([a,b,c]) setzt selection=c.
    T-utj-store-05 clearSelection leert selectedIds + selection.
    T-utj-store-06 moveSelectedBy(dx,dy) verschiebt alle selektierten Elemente um den Delta-Wert (xM/yM geprüft).
    T-utj-store-07 moveSelectedBy ignoriert deletedAt!==null Elemente und tut nichts bei leerem selectedIds.
    T-utj-store-08 Persistenz: setGestureActive(true) → moveSelectedBy → setGestureActive(false) ruft
      scheduleSaveElement für jedes bewegte Element (mode='account'); prüfe mockSchedule auf N Aufrufe mit den ids.
  </action>
  <verify>
    <automated>pnpm --filter app exec jest --testPathPattern="editorStore.multiselect" --runTestsByPath app/src/stores/__tests__/editorStore.multiselect.test.ts</automated>
  </verify>
  <done>
    selectedIds-State + toggleSelection/setSelectedIds/clearSelection/moveSelectedBy existieren; setSelection
    hält selectedIds synchron; undo/redo leeren beide; alle 8 Store-Tests grün. Bestehende editorStore-Tests
    (transform/undoredo/gestureCommitPersist) weiter grün.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: WebPlanEditor Multi-Select-Wiring — Ctrl/Cmd-Klick, Marquee, Gruppen-Drag/Pfeiltasten/Delete, Rendering (mit Tests)</name>
  <files>app/src/components/editor/web/WebPlanEditor.tsx, app/src/components/editor/__tests__/WebPlanEditor.multiselect.test.tsx</files>
  <behavior>
    - Ctrl/Cmd-Klick auf Element (handleElementMouseDown mit e.ctrlKey||e.metaKey): toggleSelection(id) statt
      setSelection(id); Element wird additiv hinzugefügt/entfernt. Normaler Klick (ohne Modifier) bleibt
      setSelection(id) (Single-Select, unverändert).
    - Drag-Move bei Mehrfach-Selektion: wird ein bereits in selectedIds enthaltenes Element gegriffen und
      die Gruppe hat >1 Element, verschiebt der Drag ALLE selektierten Elemente um denselben Delta via
      moveSelectedBy (statt nur das eine via updateElement). Bei Single-Select bleibt der bestehende
      Einzel-updateElement-Pfad aktiv (keine Regression).
    - Pfeiltasten bei Mehrfach-Selektion: verschieben ALLE selektierten Elemente um den Schritt
      (moveSelectedBy) mit Burst-Gesture-Wrapping wie bisher. Bei Single-Select identisch zu heute.
    - Marquee/Rubber-Band: mousedown auf leerer Fläche bei placingKind===null startet ein Aufzieh-Rechteck;
      während des Ziehens wird ein gestricheltes Auswahl-Rechteck gerendert; bei mouseup werden alle
      sichtbaren Elemente, deren Bounding-Box das Rechteck schneidet, via setSelectedIds selektiert.
      Marquee darf NICHT auslösen wenn placingKind gesetzt ist (kollidiert sonst mit Beet-Drag-to-create).
    - Delete bei Mehrfach-Selektion: löscht alle selektierten Elemente (deleteElement pro id) + clearSelection.
    - Rendering: jedes Element in selectedIds erhält die Auswahl-Outline (gestrichelter Rahmen), nicht nur
      das primäre. Resize-/Rotation-Handles bleiben NUR am primären selectedEl (selection) — kein Multi-Resize.
    - Marquee-Klick-Abgrenzung: ein reiner Klick (unter Threshold) auf leere Fläche deselektiert weiterhin
      (bestehendes Verhalten); nur ein echter Aufzieh-Drag (>5px) löst Marquee-Selektion aus.
  </behavior>
  <action>
    Selektor ergänzen: `const selectedIds = useEditorStore((s) => s.selectedIds);` neben dem bestehenden
    `selection`-Selektor.

    handleElementMouseDown: erweitere Signatur-Nutzung um Modifier-Check. Wenn `e.ctrlKey || e.metaKey`:
    rufe `useEditorStore.getState().toggleSelection(id)` und KEIN pendingDrag setzen (additive Auswahl ohne
    sofortigen Drag). Sonst: bestehender Pfad — ABER wenn id bereits in `useEditorStore.getState().selectedIds`
    enthalten UND selectedIds.length > 1: selection NICHT auf das Einzel-Element zurücksetzen (sonst kollabiert
    die Gruppe); setze stattdessen nur das primäre selection=id ohne selectedIds zu überschreiben
    (nutze direktes useEditorStore.setState({ selection: id }) oder eine Hilfsaktion), damit der folgende
    Gruppen-Drag alle Elemente bewegt. Wenn id NICHT in selectedIds: bestehendes setSelection(id) (Single).
    pendingDragRef wie bisher setzen (für Drag-Promotion). pointerDownOnElementRef=true bleibt.

    Drag-onMove-Effekt: berechne dxM/dyM wie bisher. Lies `const ids = useEditorStore.getState().selectedIds;`
    Wenn ids.length > 1 UND drag.id in ids: berechne Delta gegen den Drag-Start (drag.elStartXM/elStartYM ist
    Start des gegriffenen Elements) und rufe `moveSelectedBy(stepDx, stepDy)` mit dem INKREMENT seit dem letzten
    Frame. WICHTIG: moveSelectedBy ist relativ — führe einen Frame-Delta. Empfehlung: speichere im DragState
    zusätzlich `lastDxM`/`lastDyM` NICHT; einfacher: tracke die letzte angewandte Position pro Frame über einen
    Ref `lastMoveRef` (absolute dxM/dyM seit Start) und wende `moveSelectedBy(dxM - lastDxM, dyM - lastDyM)` an,
    setze danach lastDxM/lastDyM = dxM/dyM. Clamping der Gruppe: clamp den Gruppen-Delta so, dass KEIN selektiertes
    Element die Garten-Grenzen verlässt (min/max über alle selektierten Elemente berechnen, dann Delta beschneiden).
    Bei ids.length <= 1 ODER drag.id nicht in ids: bestehender Einzel-updateElement-Pfad unverändert.
    lastMoveRef wird beim Drag-Start (Promotion in pending-threshold-Effekt) auf {dxM:0,dyM:0} zurückgesetzt.

    Pfeiltasten-Effekt: nach den Fokus-/Selektions-Guards: wenn `useEditorStore.getState().selectedIds.length > 1`,
    berechne Schritt (step / shift) und rufe `moveSelectedBy(stepX, stepY)` (mit Gruppen-Clamping analog Drag:
    Delta so beschneiden, dass kein Element die Grenzen verlässt) statt des Einzel-updateElement. Burst-Gesture-
    Wrapping (arrowBurstActiveRef + setGestureActive + 400ms-Debounce) bleibt identisch und umschließt auch den
    Gruppen-Move. Bei selectedIds.length <= 1: bestehender Single-Element-Pfad (el via currentSelection) unverändert.

    Delete/Backspace-Effekt: wenn selectedIds.length > 0: für jede id deleteElement(id) aufrufen, danach
    clearSelection(); sonst bestehender Single-selection-Pfad. (selection-Guard ersetzen durch selectedIds-Guard;
    da setSelection selectedIds synchron hält, deckt das auch den Single-Fall ab.)

    Marquee: füge Refs + State analog zu createDragRef/createRect hinzu — `marqueeRef` (startClientX/Y, startSvgX/Y)
    und `marqueeRect` State ({x,y,w,h}|null). In handleCanvasMouseDown: NACH dem `pointerDownOnElementRef=false`
    und NUR wenn `placingKind === null`: setze marqueeRef.current = { startClientX/Y, startSvgX/Y } (SVG-lokal via
    getBoundingClientRect wie beim createDrag). Neuer useEffect (window mousemove/mouseup) analog zum Drag-to-create-
    Effekt: onMove zeichnet marqueeRect ab >5px; onUp: wenn unter Threshold → marqueeRef löschen, kein Selektions-
    Change (reiner Klick deselektiert weiter über handleDivClick). Über Threshold: rechne das Rechteck in Meter um
    (x/scale), bestimme alle visibleElements deren AABB [xM±widthM/2, yM±heightM/2] das Marquee-Rechteck schneidet
    (Standard-AABB-Overlap-Test), rufe setSelectedIds(matchingIds). Setze justCreatedRef-ähnliches Flag
    (`justMarqueeRef`) damit der folgende click in handleDivClick die frische Selektion nicht sofort deselektiert
    (gleicher Mechanismus wie justCreatedRef). marqueeRef/marqueeRect am Ende zurücksetzen.

    handleDivClick: am Anfang `if (justMarqueeRef.current) { justMarqueeRef.current = false; return; }` ergänzen
    (vor dem Deselect), analog zur bestehenden justCreatedRef-Behandlung.

    Rendering Selection-Outline: ersetze die `selected = el.id === selection` Bedingung für die OUTLINE durch
    `selected = selectedIds.includes(el.id)` (Outline + dickere Rect-stroke an ALLEN selektierten). Resize-/
    Rotation-Handles bleiben am `selectedEl` (= primäres selection) — KEINE Änderung dort. Marquee-Vorschau-Rect
    rendern (gestrichelt, eigene Farbe/Strichmuster, pointerEvents none), analog zum createRect-Block.

    Test-Datei nach Muster von WebPlanEditor.clickSelect.test.tsx + arrowkeys.test.tsx (gemockter Store via
    Object.assign mit getState; react-native-svg-Mock der onMouseDown/onClick/onDoubleClick forwardet;
    findElementG-Helper; fireArrowKey/window.dispatchEvent für Keys). Der Mock-Store muss die neuen Actions als
    jest.fn() bereitstellen (toggleSelection, setSelectedIds, clearSelection, moveSelectedBy) und selectedIds führen.
    Tests:
    T-utj-web-01 Ctrl-Klick auf zweites Element ruft toggleSelection(id) (nicht setSelection).
    T-utj-web-02 Cmd-Klick (metaKey) verhält sich wie Ctrl-Klick → toggleSelection.
    T-utj-web-03 Normaler Klick (kein Modifier) ruft weiter setSelection(id) (Single, keine Regression).
    T-utj-web-04 Pfeiltaste bei selectedIds.length>1 ruft moveSelectedBy (nicht updateElement-Einzel).
    T-utj-web-05 Pfeiltaste bei selectedIds.length===1 ruft weiter updateElement-Einzelpfad (keine Regression).
    T-utj-web-06 Drag bei Mehrfach-Selektion (mousedown auf Gruppen-Element + mousemove>5px) ruft moveSelectedBy.
    T-utj-web-07 Marquee: mousedown auf SVG-Hintergrund (placingKind=null) + mousemove>5px + mouseup ruft
      setSelectedIds mit den überschnittenen Element-IDs.
    T-utj-web-08 Marquee löst NICHT aus wenn placingKind!==null (kein setSelectedIds; createDrag-Pfad bleibt frei).
    T-utj-web-09 Delete bei selectedIds=[a,b] ruft deleteElement(a)+deleteElement(b)+clearSelection.
    T-utj-web-10 Rendering: alle selectedIds-Elemente erhalten Outline (Anzahl Outline-Rects === selectedIds.length).
    Deutsche UTF-8 Umlaute in allen Test-Beschreibungen/Strings.
  </action>
  <verify>
    <automated>pnpm --filter app exec jest --testPathPattern="WebPlanEditor.multiselect" --runTestsByPath app/src/components/editor/__tests__/WebPlanEditor.multiselect.test.tsx</automated>
  </verify>
  <done>
    Ctrl/Cmd-Klick additiv, Marquee-Selektion, Gruppen-Drag, Gruppen-Pfeiltasten, Gruppen-Delete und
    Multi-Outline-Rendering funktionieren; alle 10 Component-Tests grün. Bestehende Web-Editor-Tests
    (clickSelect, arrowkeys, dragcreate, rotation, dblclick) bleiben grün → keine Regression.
  </done>
</task>

</tasks>

<verification>
Gesamt-Suite des betroffenen Editor-/Store-Bereichs ohne Regression:

```
pnpm --filter app exec jest --testPathPattern="editorStore|WebPlanEditor"
```

Erwartung: alle bestehenden Tests (clickSelect, arrowkeys, dragcreate, rotation, dblclick, transform,
undoredo, gestureCommitPersist, gesturePause, dragdrop, editingElement, polygon) PLUS die zwei neuen
Multi-Select-Test-Module grün. Kein bestehender Test rot.

Manuelle Smoke-Checks (Web), falls Dirk verifiziert:
1. Strg-Klick (bzw. Cmd auf Mac) auf mehrere Beete → alle bekommen gestrichelte Outline.
2. Auf freier Fläche ein Rechteck über mehrere Elemente aufziehen → alle berührten werden selektiert.
3. Gruppe per Maus verschieben → alle bewegen sich gemeinsam, keiner verlässt die Garten-Grenze.
4. Gruppe per Pfeiltasten verschieben (Shift = große Schritte) → alle bewegen sich gemeinsam.
5. Entf drückt → alle selektierten verschwinden.
6. Einzel-Klick + Resize/Rotation funktioniert wie zuvor (Handles nur am primären Element).
</verification>

<success_criteria>
- selectedIds Multi-Select-State im editorStore, selection bleibt als primäres Element abgeleitet/synchron.
- Strg/Cmd-Klick additiv (Toggle); Marquee-Rubber-Band auf freier Fläche; Gruppen-Drag + Gruppen-Pfeiltasten;
  Gruppen-Delete; Multi-Selektion-Outline-Rendering — alle Web-only.
- Gruppen-Bewegungen persistieren über den bestehenden Outbox-Pfad (kein neuer Persistenzmechanismus).
- Kein Marquee-Konflikt mit Beet-Drag-to-create (Marquee nur bei placingKind===null).
- Bestehende Einzel-Selektion / Drag / Pfeiltasten / Delete / Resize / Rotation unverändert (alle Alt-Tests grün).
- Native (Skia) Multi-Select bewusst deferred; native Einzel-Selektion ohne Regression.
- Deutsche UTF-8 Umlaute in allen neuen user-facing Strings/Test-Beschreibungen.
</success_criteria>

<output>
Create `.planning/quick/260615-utj-mehrfach-selektion-im-web-plan-editor-me/260615-utj-SUMMARY.md` when done
</output>
