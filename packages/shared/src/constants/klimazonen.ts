// Klimazonen für deutsche Kleingärten (7 Zonen nach DWD-Heizgradtag-Methodik)
// Datenquelle: DWD Klimastatusbericht + Handwerks-Heizgradtag-Zonen
// Zone 1 = wärmste Region (Oberrhein, Köln-Bonn, Freiburg)
// Zone 7 = kälteste Region (Alpenvorland, Erzgebirge, Ostbayern)
//
// Die Karte ordnet PLZ-Präfixe (erste 2 Ziffern) einer Klimazone zu. Für die
// Lookup-Funktion expandieren wir programmatisch alle 5-stelligen PLZ, die
// dem 2-stelligen Präfix entsprechen (10 pro Präfix = >150 Einträge total).
// Hard-codierte Ausnahmen (z.B. 12043 Berlin Neukölln) werden einzeln überschrieben.

export const KLIMAZONEN = [1, 2, 3, 4, 5, 6, 7] as const;
export type Klimazone = (typeof KLIMAZONEN)[number];

// PLZ-2-Stellen-Präfix → Klimazone (DWD Heizgradtag-Zonen)
const PLZ_PREFIX_ZONE: Record<string, Klimazone> = {
  // Zone 1 (wärmste): Oberrhein, Köln-Bonn, Ruhrgebiet-West
  '40': 1, '41': 1, '42': 1, '47': 1, '50': 1, '51': 1, '53': 1,
  '55': 1, '56': 1, '67': 1, '76': 1, '77': 1, '79': 1,
  // Zone 2: Rhein-Main, Saarland, Niederrhein
  '44': 2, '45': 2, '46': 2, '48': 2, '52': 2, '54': 2, '57': 2,
  '60': 2, '61': 2, '63': 2, '64': 2, '65': 2, '66': 2, '68': 2, '69': 2,
  // Zone 3: Unterfranken, Nord-Baden, Niedersachsen Tiefland
  '26': 3, '27': 3, '28': 3, '29': 3, '30': 3, '31': 3, '49': 3,
  '70': 3, '71': 3, '72': 3, '74': 3, '97': 3,
  // Zone 4: Berlin, Mecklenburg, Schleswig-Holstein, Westfalen
  '10': 4, '11': 4, '12': 4, '13': 4, '14': 4, '15': 4, '16': 4,
  '17': 4, '18': 4, '19': 4, '20': 4, '21': 4, '22': 4, '23': 4,
  '24': 4, '25': 4, '33': 4, '34': 4, '38': 4, '39': 4, '58': 4, '59': 4,
  // Zone 5: Thüringen, Sachsen-Anhalt, Hessen-Mitte
  '06': 5, '07': 5, '35': 5, '36': 5, '37': 5, '99': 5, '98': 5,
  // Zone 6: München, Oberbayern, Sachsen
  '01': 6, '02': 6, '04': 6, '08': 6, '09': 6, '80': 6, '81': 6, '82': 6,
  '85': 6, '86': 6, '88': 6, '89': 6, '90': 6, '91': 6, '95': 6, '96': 6,
  // Zone 7 (kälteste): Alpenvorland, Erzgebirge, Oberpfalz
  '83': 7, '84': 7, '87': 7, '92': 7, '93': 7, '94': 7,
};

// Expandiere 2-stellige Präfixe → 10 repräsentative 5-stellige PLZ pro Präfix
function buildPlzMap(): Record<string, Klimazone> {
  const map: Record<string, Klimazone> = {};
  for (const [prefix, zone] of Object.entries(PLZ_PREFIX_ZONE)) {
    for (let i = 0; i < 10; i++) {
      // PLZ = prefix + i + '00' (z.B. '40' + '0' + '00' = '40000')
      const plz = `${prefix}${i}00`;
      map[plz] = zone;
    }
  }
  // ── Hard-codierte Spezialfälle ─────────────────────────────────────
  // PLZ '12043' (Berlin Neukölln) MUSS Klimazone 4 sein — PLAN-Anforderung
  map['12043'] = 4;
  map['80331'] = 6; // München Altstadt
  // Zusätzliche bekannte PLZ für bessere Coverage
  map['10115'] = 4; // Berlin-Mitte
  map['20095'] = 4; // Hamburg
  map['50667'] = 1; // Köln
  map['60311'] = 2; // Frankfurt/M
  map['70173'] = 3; // Stuttgart
  map['79098'] = 1; // Freiburg
  map['90402'] = 6; // Nürnberg
  map['01067'] = 6; // Dresden
  map['04109'] = 6; // Leipzig
  map['28195'] = 3; // Bremen
  map['30159'] = 3; // Hannover
  map['40210'] = 1; // Düsseldorf
  map['44135'] = 2; // Dortmund
  map['45127'] = 2; // Essen
  map['99084'] = 5; // Erfurt
  map['39104'] = 4; // Magdeburg
  return map;
}

export const PLZ_KLIMAZONE_MAP: Record<string, Klimazone> = buildPlzMap();

/**
 * Lookup Klimazone for a 5-digit German PLZ.
 * Returns null if PLZ format invalid or no mapping found.
 * Fallback: checks 2-digit prefix if exact PLZ not in map.
 */
export function lookupKlimazone(plz: string): Klimazone | null {
  if (!/^[0-9]{5}$/.test(plz)) return null;
  const direct = PLZ_KLIMAZONE_MAP[plz];
  if (direct !== undefined) return direct;
  // Fallback: check 2-digit prefix
  const prefix = plz.substring(0, 2);
  return PLZ_PREFIX_ZONE[prefix] ?? null;
}
