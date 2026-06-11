// TDD RED — tests for kalenderEngine
// Expectations per 10-01-PLAN.md Task 1 <behavior>
// CAL-02 (klimazonen offset), CAL-03 (Aktionstypen), CAL-06 (Fruchtfolge)
import {
  getFensterFuerPflanze,
  getAktuelleKw,
  filterAktiveAktionen,
  pruefeEinfacheFruchtfolge,
  type AktionsTyp,
  type KalenderFenster,
} from '../kalenderEngine';

// Mock PlantRow für Tests — Tomate-ähnlich (Zone 4 baseline)
// sowIndoorDoyStart=60 → KW 9, plantDoyStart=130 → KW 19, harvestDoyStart=200 → KW 29
const tomateMock = {
  sowIndoorDoyStart: 60,
  sowIndoorDoyEnd: 90,
  sowOutdoorDoyStart: null,
  sowOutdoorDoyEnd: null,
  plantDoyStart: 130,
  plantDoyEnd: 150,
  harvestDoyStart: 200,
  harvestDoyEnd: 270,
  family: 'Solanaceae',
  slug: 'tomate',
};

// Mock für eine Pflanze mit allen vier DOY-Paaren (direktsaat statt vorkultur)
const moehreMock = {
  sowIndoorDoyStart: null,
  sowIndoorDoyEnd: null,
  sowOutdoorDoyStart: 80,
  sowOutdoorDoyEnd: 120,
  plantDoyStart: 100,
  plantDoyEnd: 130,
  harvestDoyStart: 180,
  harvestDoyEnd: 250,
  family: 'Apiaceae',
  slug: 'moehre',
};

// Mock für eine Pflanze mit allen vier DOY-Paaren null
const nullPflanzeMock = {
  sowIndoorDoyStart: null,
  sowIndoorDoyEnd: null,
  sowOutdoorDoyStart: null,
  sowOutdoorDoyEnd: null,
  plantDoyStart: null,
  plantDoyEnd: null,
  harvestDoyStart: null,
  harvestDoyEnd: null,
  family: 'Unbekannt',
  slug: 'unbekannt',
};

describe('kalenderEngine', () => {
  // ── CAL-03: Aktionstypen in Zone 4 ──────────────────────────────────────
  describe('getFensterFuerPflanze', () => {
    it('Tomate Zone 4: Vorkultur startet KW 9', () => {
      const result = getFensterFuerPflanze(tomateMock, 4);
      const vorkultur = result.find(f => f.typ === 'Vorkultur');
      expect(vorkultur).toBeDefined();
      expect(vorkultur!.startKw).toBe(9);
    });

    it('Tomate Zone 4: Auspflanzen startet KW 19', () => {
      const result = getFensterFuerPflanze(tomateMock, 4);
      const auspflanzen = result.find(f => f.typ === 'Auspflanzen');
      expect(auspflanzen).toBeDefined();
      expect(auspflanzen!.startKw).toBe(19);
    });

    it('Tomate Zone 4: Ernte startet KW 29', () => {
      const result = getFensterFuerPflanze(tomateMock, 4);
      const ernte = result.find(f => f.typ === 'Ernte');
      expect(ernte).toBeDefined();
      expect(ernte!.startKw).toBe(29);
    });

    it('CAL-03: alle vier AktionsTypen werden unterschieden (Vorkultur, Direktsaat, Auspflanzen, Ernte)', () => {
      // Möhre hat Direktsaat + Auspflanzen + Ernte (kein Vorkultur)
      const result = getFensterFuerPflanze(moehreMock, 4);
      const typen = result.map(f => f.typ);
      expect(typen).toContain('Direktsaat');
      expect(typen).toContain('Auspflanzen');
      expect(typen).toContain('Ernte');
    });

    // ── CAL-02: Klimazonenoffset ──────────────────────────────────────────
    it('CAL-02: Zone 1 Fenster beginnen mindestens 4 KW früher als Zone 7', () => {
      const zone1 = getFensterFuerPflanze(tomateMock, 1);
      const zone7 = getFensterFuerPflanze(tomateMock, 7);
      // Tomate hat Vorkultur als erstes Fenster
      const kw1 = zone1[0]?.startKw ?? 999;
      const kw7 = zone7[0]?.startKw ?? 0;
      const diff = kw7 - kw1;
      expect(diff).toBeGreaterThanOrEqual(4);
    });

    // ── Security guard: ungültige Klimazone ───────────────────────────────
    it('Klimazone 0 wirft nicht und gibt gleiche Fenster wie Zone 4 zurück', () => {
      expect(() => getFensterFuerPflanze(tomateMock, 0)).not.toThrow();
      const zone0 = getFensterFuerPflanze(tomateMock, 0);
      const zone4 = getFensterFuerPflanze(tomateMock, 4);
      expect(zone0.length).toBe(zone4.length);
      expect(zone0[0]?.startKw).toBe(zone4[0]?.startKw);
    });

    it('Klimazone 99 wirft nicht und gibt gleiche Fenster wie Zone 4 zurück', () => {
      expect(() => getFensterFuerPflanze(tomateMock, 99)).not.toThrow();
      const zone99 = getFensterFuerPflanze(tomateMock, 99);
      const zone4 = getFensterFuerPflanze(tomateMock, 4);
      expect(zone99.length).toBe(zone4.length);
      expect(zone99[0]?.startKw).toBe(zone4[0]?.startKw);
    });

    // ── Null-DOY plant ────────────────────────────────────────────────────
    it('Pflanze mit allen null DOY-Feldern gibt leeres KalenderFenster[] zurück', () => {
      const result = getFensterFuerPflanze(nullPflanzeMock, 4);
      expect(result).toEqual([]);
    });
  });

  // ── filterAktiveAktionen ──────────────────────────────────────────────
  describe('filterAktiveAktionen', () => {
    it('gibt nur Fenster zurück deren [startKw,endKw] die aktuelle KW enthält', () => {
      const fenster: KalenderFenster[] = [
        { typ: 'Vorkultur', startDoy: 60, endDoy: 90, startKw: 9, endKw: 13 },
        { typ: 'Auspflanzen', startDoy: 130, endDoy: 150, startKw: 19, endKw: 22 },
        { typ: 'Ernte', startDoy: 200, endDoy: 270, startKw: 29, endKw: 39 },
      ];
      // KW 10 liegt im Vorkultur-Fenster
      const aktiv = filterAktiveAktionen(fenster, 10);
      expect(aktiv).toHaveLength(1);
      expect(aktiv[0]!.typ).toBe('Vorkultur');
    });

    it('gibt leeres Array wenn keine Fenster aktiv sind', () => {
      const fenster: KalenderFenster[] = [
        { typ: 'Vorkultur', startDoy: 60, endDoy: 90, startKw: 9, endKw: 13 },
      ];
      const aktiv = filterAktiveAktionen(fenster, 5);
      expect(aktiv).toHaveLength(0);
    });
  });

  // ── getAktuelleKw ─────────────────────────────────────────────────────
  describe('getAktuelleKw', () => {
    it('gibt eine Zahl zwischen 1 und 53 zurück', () => {
      const kw = getAktuelleKw();
      expect(typeof kw).toBe('number');
      expect(kw).toBeGreaterThanOrEqual(1);
      expect(kw).toBeLessThanOrEqual(53);
    });
  });

  // ── pruefeEinfacheFruchtfolge (CAL-06) ─────────────────────────────────
  describe('pruefeEinfacheFruchtfolge', () => {
    it('CAL-06: gleiche Familie, anderer Slug → warnung: true, grund nicht null', () => {
      const result = pruefeEinfacheFruchtfolge(
        { family: 'Solanaceae', slug: 'tomate' },
        [{ family: 'Solanaceae', slug: 'paprika' }],
      );
      expect(result.warnung).toBe(true);
      expect(result.grund).not.toBeNull();
    });

    it('andere Familie → warnung: false, grund: null', () => {
      const result = pruefeEinfacheFruchtfolge(
        { family: 'Solanaceae', slug: 'tomate' },
        [{ family: 'Apiaceae', slug: 'moehre' }],
      );
      expect(result.warnung).toBe(false);
      expect(result.grund).toBeNull();
    });

    it('gleicher Slug (selbst) → warnung: false (kein Selbst-Konflikt)', () => {
      const result = pruefeEinfacheFruchtfolge(
        { family: 'Solanaceae', slug: 'tomate' },
        [{ family: 'Solanaceae', slug: 'tomate' }],
      );
      expect(result.warnung).toBe(false);
    });

    it('leeres Beet → warnung: false', () => {
      const result = pruefeEinfacheFruchtfolge(
        { family: 'Solanaceae', slug: 'tomate' },
        [],
      );
      expect(result.warnung).toBe(false);
      expect(result.grund).toBeNull();
    });
  });
});
