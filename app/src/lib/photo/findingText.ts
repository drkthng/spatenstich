// Phase 35: the words for a finding. What it proposes, how sure it is, what the picture
// of the plan marks, and reading the values a person typed while editing a proposal.
// Pure; the screens only lay the lines out.

import type {
  AiCode,
  PhotoCatalogProposal,
  PhotoFindingRow,
  PhotoProposal,
  PlanElementRow,
  PlantRow,
} from '@spatenstich/shared';
import { t } from '../i18n';
import { confidenceBand, isCareKind, type AcceptProblem, type FindingMark } from './findings';
import { findPlantByName } from './gardenPlants';
import type { PhotoFailure } from './photoRepo';
import { aiMessage } from '../ai/aiMessages';

/** A number as Germans write it: 2,5 (at most two decimals, no trailing zeros). */
export function formatMetres(value: number): string {
  return String(Math.round(value * 100) / 100).replace('.', ',');
}

/** A typed number with comma or point; null when it is not a number. */
export function parseNumber(text: string): number | null {
  const cleaned = text.trim().replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

export function monthName(month: number | null | undefined): string {
  return month && month >= 1 && month <= 12 ? t(`photo.months.${month - 1}`) : '';
}

export function kindLabel(finding: Pick<PhotoFindingRow, 'kind'>): string {
  return t(`photo.findings.kind.${finding.kind}`);
}

export function confidenceLabel(confidence: number): string {
  return t(`photo.findings.confidence.${confidenceBand(confidence)}`, { percent: Math.round(confidence * 100) });
}

function catalogLines(catalog: PhotoCatalogProposal): string[] {
  const lines: string[] = [];
  if (catalog.nameBotanical) lines.push(t('photo.findings.proposal.botanical', { value: catalog.nameBotanical }));
  if (catalog.family) lines.push(t('photo.findings.proposal.family', { value: catalog.family }));
  const window = (key: string, from: number | null, to: number | null): void => {
    if (from && to) lines.push(t(`photo.findings.proposal.${key}`, { from: monthName(from), to: monthName(to) }));
  };
  window('sow', catalog.sowStartMonth, catalog.sowEndMonth);
  window('plant', catalog.plantStartMonth, catalog.plantEndMonth);
  window('harvest', catalog.harvestStartMonth, catalog.harvestEndMonth);
  if (catalog.spacingCm) lines.push(t('photo.findings.proposal.spacing', { value: catalog.spacingCm }));
  return lines;
}

/** What accepting the finding would do, in plain sentences. */
export function proposalLines(finding: PhotoFindingRow, elements: PlanElementRow[], plants: PlantRow[]): string[] {
  const p: PhotoProposal = finding.proposal ?? {};
  const target = finding.targetElementId ? elements.find((e) => e.id === finding.targetElementId) : undefined;
  const m = formatMetres;
  switch (finding.kind) {
    case 'resize':
      if (!target || p.widthM == null || p.heightM == null) return [];
      return [
        t('photo.findings.proposal.resize', {
          width: m(p.widthM),
          height: m(p.heightM),
          oldWidth: m(target.widthM),
          oldHeight: m(target.heightM),
        }),
      ];
    case 'move':
      if (p.xM == null || p.yM == null) return [];
      return [t('photo.findings.proposal.move', { x: m(p.xM), y: m(p.yM) })];
    case 'rename':
      if (!target || !p.label) return [];
      return [t('photo.findings.proposal.rename', { label: p.label, old: target.label })];
    case 'remove':
      return target ? [t('photo.findings.proposal.remove', { label: target.label })] : [];
    case 'add_element':
      if (!p.elementType) return [];
      return [
        t('photo.findings.proposal.add_element', {
          type: p.elementType,
          label: p.label ?? p.elementType,
          width: p.widthM != null ? m(p.widthM) : '?',
          height: p.heightM != null ? m(p.heightM) : '?',
        }),
      ];
    case 'add_plant': {
      if (!p.plantName) return [];
      const lines = [
        target && target.elementType === 'Beet'
          ? t('photo.findings.proposal.add_plant_bed', { plant: p.plantName, bed: target.label })
          : t('photo.findings.proposal.add_plant', { plant: p.plantName }),
      ];
      if (!findPlantByName(plants, p.plantName)) lines.push(t('photo.findings.proposal.notInCatalog'));
      return lines;
    }
    case 'catalog_plant':
      return p.catalog ? catalogLines(p.catalog) : [];
    default:
      if (isCareKind(finding.kind) && p.action) return [t('photo.findings.proposal.action', { action: p.action })];
      return [];
  }
}

/** The label of the button that accepts this kind of finding. */
export function acceptLabel(finding: Pick<PhotoFindingRow, 'kind'>): string {
  if (isCareKind(finding.kind)) return t('photo.findings.acceptTask');
  if (finding.kind === 'catalog_plant') return t('photo.findings.acceptCatalog');
  return t('photo.findings.accept');
}

/** What the picture of the plan shows, for the caption and for screen readers. */
export function markCaption(mark: FindingMark, elements: PlanElementRow[]): string {
  if (mark.type === 'element') {
    const label = elements.find((e) => e.id === mark.elementId)?.label ?? '';
    return t(mark.proposed ? 'photo.findings.mark.proposed' : 'photo.findings.mark.element', { label });
  }
  if (mark.type === 'box') return t('photo.findings.mark.box');
  if (mark.type === 'spot') return t('photo.findings.mark.spot');
  return '';
}

export function problemText(problem: AcceptProblem | 'not_authenticated' | 'failed'): string {
  return t(`photo.findings.problem.${problem}`);
}

const OWN_CODES = ['no_garden', 'no_photos', 'too_many_photos', 'photo_unreadable'];

/** Why a check did not run or did not answer, in the app's own words. */
export function failureText(code: PhotoFailure): string {
  if (OWN_CODES.includes(code)) return t(`photo.error.${code}`);
  return aiMessage(code as AiCode);
}

// ── Editing a proposal before accepting (PHOTO-07) ───────────────────────────

export type CatalogField =
  | 'nameDe'
  | 'nameBotanical'
  | 'family'
  | 'spacingCm'
  | 'sowStartMonth'
  | 'sowEndMonth'
  | 'plantStartMonth'
  | 'plantEndMonth'
  | 'harvestStartMonth'
  | 'harvestEndMonth';

/** The values of a catalog entry a person can edit, in the order of the form. */
export const CATALOG_FIELDS: CatalogField[] = [
  'nameDe',
  'nameBotanical',
  'family',
  'spacingCm',
  'sowStartMonth',
  'sowEndMonth',
  'plantStartMonth',
  'plantEndMonth',
  'harvestStartMonth',
  'harvestEndMonth',
];

const CATALOG_NUMERIC: CatalogField[] = CATALOG_FIELDS.filter((f) => f.endsWith('Month') || f === 'spacingCm');

export type EditField = 'label' | 'widthM' | 'heightM' | 'xM' | 'yM' | 'plantName' | 'action' | CatalogField;

const FIELDS: Record<string, EditField[]> = {
  resize: ['widthM', 'heightM'],
  move: ['xM', 'yM'],
  rename: ['label'],
  add_element: ['label', 'widthM', 'heightM', 'xM', 'yM'],
  add_plant: ['plantName', 'xM', 'yM'],
  catalog_plant: CATALOG_FIELDS,
  pest: ['action'],
  disease: ['action'],
  stage: ['action'],
};

/** The values of a finding a person may change before accepting it. */
export function editableFields(finding: Pick<PhotoFindingRow, 'kind'>): EditField[] {
  return FIELDS[finding.kind] ?? [];
}

const FIELD_LABEL: Record<EditField, string> = {
  label: 'photo.findings.field.label',
  widthM: 'photo.findings.field.width',
  heightM: 'photo.findings.field.height',
  xM: 'photo.findings.field.x',
  yM: 'photo.findings.field.y',
  plantName: 'photo.findings.field.plant',
  action: 'photo.findings.field.action',
  nameDe: 'photo.findings.field.nameDe',
  nameBotanical: 'photo.findings.field.botanical',
  family: 'photo.findings.field.family',
  spacingCm: 'photo.findings.field.spacing',
  sowStartMonth: 'photo.findings.field.sowFrom',
  sowEndMonth: 'photo.findings.field.sowTo',
  plantStartMonth: 'photo.findings.field.plantFrom',
  plantEndMonth: 'photo.findings.field.plantTo',
  harvestStartMonth: 'photo.findings.field.harvestFrom',
  harvestEndMonth: 'photo.findings.field.harvestTo',
};

export const fieldLabel = (field: EditField): string => t(FIELD_LABEL[field]);

const NUMERIC: EditField[] = ['widthM', 'heightM', 'xM', 'yM', ...CATALOG_NUMERIC];
export const isNumericField = (field: EditField): boolean => NUMERIC.includes(field);

/** A catalog entry as text for the form. */
export function catalogFormValues(catalog: PhotoCatalogProposal): Record<string, string> {
  const values: Record<string, string> = {};
  for (const field of CATALOG_FIELDS) {
    const value = catalog[field];
    values[field] = value === null || value === undefined ? '' : String(value);
  }
  return values;
}

/**
 * Reads the catalog form back. Null when a value cannot be used: the name must not be
 * empty, a month lies between 1 and 12, a window has both ends or none, the spacing lies
 * between 1 and 1000 cm.
 */
export function readCatalogForm(values: Record<string, string>, base: PhotoCatalogProposal): PhotoCatalogProposal | null {
  const text = (field: CatalogField): string => (values[field] ?? '').trim();
  const nameDe = text('nameDe');
  if (!nameDe) return null;
  const whole = (field: CatalogField, min: number, max: number): number | null | undefined => {
    const raw = text(field);
    if (raw === '') return null;
    if (!/^[0-9]+$/.test(raw)) return undefined;
    const value = Number(raw);
    return value >= min && value <= max ? value : undefined;
  };
  const months: Partial<Record<CatalogField, number | null>> = {};
  for (const [from, to] of [
    ['sowStartMonth', 'sowEndMonth'],
    ['plantStartMonth', 'plantEndMonth'],
    ['harvestStartMonth', 'harvestEndMonth'],
  ] as [CatalogField, CatalogField][]) {
    const a = whole(from, 1, 12);
    const b = whole(to, 1, 12);
    if (a === undefined || b === undefined || (a === null) !== (b === null)) return null;
    months[from] = a;
    months[to] = b;
  }
  const spacingCm = whole('spacingCm', 1, 1000);
  if (spacingCm === undefined) return null;
  return {
    ...base,
    nameDe: nameDe.slice(0, 80),
    nameBotanical: text('nameBotanical').slice(0, 120) || null,
    family: text('family').slice(0, 80),
    spacingCm,
    sowStartMonth: months.sowStartMonth ?? null,
    sowEndMonth: months.sowEndMonth ?? null,
    plantStartMonth: months.plantStartMonth ?? null,
    plantEndMonth: months.plantEndMonth ?? null,
    harvestStartMonth: months.harvestStartMonth ?? null,
    harvestEndMonth: months.harvestEndMonth ?? null,
  };
}

/** The stored values as text for the form. */
export function editValues(finding: PhotoFindingRow): Record<string, string> {
  if (finding.kind === 'catalog_plant') {
    return finding.proposal?.catalog ? catalogFormValues(finding.proposal.catalog) : {};
  }
  const p = (finding.proposal ?? {}) as Record<string, unknown>;
  const values: Record<string, string> = {};
  for (const field of editableFields(finding)) {
    const value = p[field];
    values[field] = typeof value === 'number' ? formatMetres(value) : typeof value === 'string' ? value : '';
  }
  return values;
}

/**
 * Reads the form back. Null when a value cannot be used: a size has to be a positive
 * number, a place a number (or empty for "wherever there is room"), a name not empty.
 */
export function readEdit(finding: PhotoFindingRow, values: Record<string, string>): PhotoProposal | null {
  if (finding.kind === 'catalog_plant') {
    const base = finding.proposal?.catalog;
    const catalog = base ? readCatalogForm(values, base) : null;
    return catalog ? { catalog, plantName: catalog.nameDe } : null;
  }
  const proposal: Record<string, unknown> = {};
  for (const field of editableFields(finding)) {
    const text = (values[field] ?? '').trim();
    if (field === 'widthM' || field === 'heightM') {
      const value = parseNumber(text);
      if (value === null || value < 0.1 || value > 200) return null;
      proposal[field] = value;
    } else if (field === 'xM' || field === 'yM') {
      if (text === '' && finding.kind !== 'move') {
        proposal[field] = null;
        continue;
      }
      const value = parseNumber(text);
      if (value === null || value < -50 || value > 250) return null;
      proposal[field] = value;
    } else {
      if (!text) return null;
      proposal[field] = text.slice(0, field === 'action' ? 300 : 80);
    }
  }
  // A place needs both values.
  if (('xM' in proposal || 'yM' in proposal) && (proposal.xM === null) !== (proposal.yM === null)) return null;
  return proposal as PhotoProposal;
}
