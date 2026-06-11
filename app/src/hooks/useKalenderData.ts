// Phase 10 Plan 02: useKalenderData hook — data layer for the Aussaatkalender.
// Loads plan elements via gardenPlanRepo.loadAcceptedElements (NOT editorStore).
// Combines usePlants + profileStore.klimazone + plan elements to provide:
//   wochenAktionen, meinePflanzenslugs, aktuelleKw, hasBeetImPlan, addPlantToPlan, refresh.
// CAL-04: bed-membership context via findBeeteForPlant.
// CAL-05: addPlantToPlan writes a PlanElementRow via writePlanElement (account-guarded).
// Fallstrick 2: klimazone null → empty wochenAktionen (no NaN).
// Fallstrick 3: elements without provenance.plantSlug are excluded from meinePflanzenslugs.
// Fallstrick 5: addPlantToPlan guards hasBeetImPlan + dimensions before writing.
// Plan 10-08 WR-06: addPlantToPlan platziert Pflanze IM Beet (Beet-Center + parentBedId).
// Plan 10-08 IN-04: expliziter mode !== 'account'-Guard vor dem Write statt mode!-Assertion.

import * as React from 'react';
import { usePlants } from './usePlants';
import { useProfileStore } from '../stores/profileStore';
import { useAuthStore } from '../stores/authStore';
import {
  loadAcceptedElements,
  loadDimensions,
  writePlanElement,
} from '../lib/gardenPlanRepo';
import { getPlantSlug } from '../lib/kalenderBeete';
import {
  getFensterFuerPflanze,
  filterAktiveAktionen,
  getAktuelleKw,
} from '@spatenstich/shared';
import type { PlantRow, PlanElementRow, GardenDimensionsRow } from '@spatenstich/shared';

export interface WochenAktion {
  plant: PlantRow;
  fenster: ReturnType<typeof filterAktiveAktionen>[number];
}

export interface UseKalenderDataOptions {
  /** Filter to plants actually placed in the active garden. Default: true when plan has slugs. */
  nurMeinePflanzen?: boolean;
}

export interface UseKalenderDataResult {
  /** Aktionen (Pflanze + Fenster) die in der aktuellen Kalenderwoche aktiv sind. */
  wochenAktionen: WochenAktion[];
  /** Set der plantSlugs aller nicht-gelöschten Pflanze-Elemente im aktiven Garten. */
  meinePflanzenslugs: Set<string>;
  /** Aktuelle ISO-Kalenderwoche (gecacht für die gesamte Render-Session). */
  aktuelleKw: number;
  /** Klimazone des Users aus dem profileStore (null wenn noch nicht konfiguriert). */
  klimazone: import('@spatenstich/shared').Klimazone | null;
  /** Alle nicht-gelöschten akzeptierten Elemente des aktiven Gartens. */
  elements: PlanElementRow[];
  /** Garten-Abmessungen (null wenn noch nicht geladen oder kein aktiver Garten). */
  dimensions: GardenDimensionsRow | null;
  /** True wenn mindestens ein nicht-gelöschtes Beet-Element vorhanden ist (Fallstrick 5). */
  hasBeetImPlan: boolean;
  /** Initialer Lade-State — false sobald loadAcceptedElements abgeschlossen hat. */
  loading: boolean;
  /**
   * Pflanze zum aktiven Gartenplan hinzufügen (CAL-05).
   * Schreibt ein PlanElementRow (elementType='Pflanze', layer='seasonal', provenance.plantSlug=slug)
   * via writePlanElement und refresht danach die lokale Elements-Liste.
   * @throws wenn kein Beet vorhanden, keine Dimensions geladen, oder kein activeGardenId.
   */
  addPlantToPlan: (plant: PlantRow) => Promise<PlanElementRow>;
  /** Elemente und Dimensions neu aus dem Repository laden. */
  refresh: () => Promise<void>;
}

function randomId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useKalenderData(options: UseKalenderDataOptions = {}): UseKalenderDataResult {
  const { data: plants = [] } = usePlants();
  const klimazone = useProfileStore((s) => s.klimazone);
  const activeGardenId = useAuthStore((s) => s.activeGardenId);
  const mode = useAuthStore((s) => s.mode);

  const [elements, setElements] = React.useState<PlanElementRow[]>([]);
  const [dimensions, setDimensions] = React.useState<GardenDimensionsRow | null>(null);
  const [loading, setLoading] = React.useState(true);

  const loadData = React.useCallback(async (): Promise<void> => {
    if (!activeGardenId) {
      setLoading(false);
      return;
    }
    try {
      const [dims, elems] = await Promise.all([
        loadDimensions(activeGardenId),
        loadAcceptedElements(activeGardenId),
      ]);
      setDimensions(dims);
      setElements(elems);
    } catch (err) {
      console.error('useKalenderData: load failed', err);
    } finally {
      setLoading(false);
    }
  }, [activeGardenId]);

  React.useEffect(() => {
    setLoading(true);
    void loadData();
  }, [loadData]);

  const refresh = React.useCallback(async (): Promise<void> => {
    await loadData();
  }, [loadData]);

  // "Nur meine Pflanzen" filter: set of plantSlugs present in non-deleted Pflanze elements.
  const meinePflanzenslugs = React.useMemo<Set<string>>(() => {
    return new Set(
      elements
        .filter((e) => e.elementType === 'Pflanze' && e.deletedAt === null)
        .map(getPlantSlug)
        .filter((s): s is string => s !== null),
    );
  }, [elements]);

  const aktuelleKw = React.useMemo(() => getAktuelleKw(), []);

  // hasBeetImPlan: guards CAL-04/05 (Fallstrick 5)
  const hasBeetImPlan = React.useMemo(
    () => elements.some((e) => e.elementType === 'Beet' && e.deletedAt === null),
    [elements],
  );

  // Compute wochenAktionen: early-return [] when klimazone is null (Fallstrick 2)
  const wochenAktionen = React.useMemo<WochenAktion[]>(() => {
    if (!plants.length || !klimazone) return [];

    // Determine source plant list based on nurMeinePflanzen option.
    // Default: true when meinePflanzenslugs has at least one slug.
    const useFilter =
      options.nurMeinePflanzen !== undefined
        ? options.nurMeinePflanzen
        : meinePflanzenslugs.size > 0;

    const sourcePlants =
      useFilter && meinePflanzenslugs.size > 0
        ? plants.filter((p) => meinePflanzenslugs.has(p.slug))
        : plants;

    return sourcePlants.flatMap((plant) => {
      const fenster = getFensterFuerPflanze(plant, klimazone);
      return filterAktiveAktionen(fenster, aktuelleKw).map((f) => ({ plant, fenster: f }));
    });
  }, [plants, klimazone, meinePflanzenslugs, aktuelleKw, options.nurMeinePflanzen]);

  // CAL-05: Add a plant to the active garden plan
  const addPlantToPlan = React.useCallback(
    async (plant: PlantRow): Promise<PlanElementRow> => {
      // IN-04: Expliziter mode-Guard VOR dem Write — drückt Vorbedingung aus und
      // liefert klare Fehlerursache statt mode!-Assertion (10-REVIEW IN-04).
      if (mode !== 'account') throw new Error('account_erforderlich');
      if (!hasBeetImPlan) throw new Error('kein_beet_im_plan');
      if (!dimensions) throw new Error('keine_dimensions');
      if (!activeGardenId) throw new Error('kein_aktiver_garten');

      // WR-06: In-Bed-Placement — wähle erstes nicht-gelöschtes Beet.
      // Center-Konvention (Plan 10-06/10-08): xM/yM = bbox center, garantiert
      // innerhalb des Rechteck-Polygons → findBeeteForPlant/findBedForPlant findet die Pflanze.
      // D-03 Fast-Path: parentBedId in provenance → findBedForPlant Fast-Path (Phase 9).
      const targetBeet = elements.find(
        (e) => e.elementType === 'Beet' && e.deletedAt === null,
      );
      if (!targetBeet) throw new Error('kein_beet_im_plan');

      const now = new Date().toISOString();
      const userId = useAuthStore.getState().userId;

      const element: PlanElementRow = {
        id: randomId(),
        gardenId: activeGardenId,
        elementType: 'Pflanze',
        label: plant.nameDe,
        xM: targetBeet.xM,
        yM: targetBeet.yM,
        widthM: 0.3,
        heightM: 0.3,
        confidence: null,
        isAccepted: true,
        importedFrom: null,
        provenance: { plantSlug: plant.slug, parentBedId: targetBeet.id },
        layer: 'seasonal',
        createdAt: now,
        updatedAt: now,
        updatedByUserId: userId,
        deletedAt: null,
      };

      // Defense-in-depth: assertAccount in writePlanElement bleibt zweite Verteidigungslinie.
      await writePlanElement(mode, element);
      await refresh();
      return element;
    },
    [hasBeetImPlan, dimensions, activeGardenId, elements, mode, refresh],
  );

  return {
    wochenAktionen,
    meinePflanzenslugs,
    aktuelleKw,
    klimazone,
    elements,
    dimensions,
    hasBeetImPlan,
    loading,
    addPlantToPlan,
    refresh,
  };
}
