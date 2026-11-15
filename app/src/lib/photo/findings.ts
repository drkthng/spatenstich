// Phase 35: findings of a photo check, and what accepting one does.
//
// A finding is a proposal. `planAcceptance()` works out what accepting it would change;
// nothing here writes anything (PHOTO-07: no change without confirmation). The writing
// is done by photoRepo.ts, only when the person presses "Annehmen". Pure, no storage.

import {
  PHOTO_ELEMENT_TYPES,
  PHOTO_UNCERTAIN_BELOW,
  type GardenDimensionsRow,
  type GardenPlantRow,
  type PhotoCheckResult,
  type PhotoFindingKind,
  type PhotoFindingResult,
  type PhotoFindingRow,
  type PhotoProposal,
  type PlanElementRow,
  type PlantRow,
} from '@spatenstich/shared';
import { applyElementPatch, bedContaining } from '../editor/bedBinding';
import { DEFAULT_SIZES } from '../editor/elementFactory';
import { nextFreeBedSlot } from '../draftPromotionRepo';
import { findPlantByName, gardenPlantFromProposal } from './gardenPlants';

/** Kinds that change the plan when accepted. */
export const PLAN_KINDS: PhotoFindingKind[] = ['resize', 'move', 'rename', 'remove', 'add_element', 'add_plant'];
/** Kinds that report something to do; accepting notes a task (PHOTO-09). */
export const CARE_KINDS: PhotoFindingKind[] = ['pest', 'disease', 'stage'];

export const isPlanKind = (kind: PhotoFindingKind): boolean => PLAN_KINDS.includes(kind);
export const isCareKind = (kind: PhotoFindingKind): boolean => CARE_KINDS.includes(kind);

/** Uncertain: low confidence, or the check itself asked for a closer look (PHOTO-11). */
export function isUncertain(finding: Pick<PhotoFindingRow, 'confidence' | 'closeupOf' | 'kind'>): boolean {
  return finding.kind === 'unclear' || finding.confidence < PHOTO_UNCERTAIN_BELOW || Boolean(finding.closeupOf);
}

export type ConfidenceBand = 'high' | 'medium' | 'low';

export function confidenceBand(confidence: number): ConfidenceBand {
  if (confidence >= 0.8) return 'high';
  if (confidence >= PHOTO_UNCERTAIN_BELOW) return 'medium';
  return 'low';
}

/** Can this finding be accepted as it stands? (`unclear` can only be followed up or dismissed.) */
export function canAccept(finding: Pick<PhotoFindingRow, 'kind' | 'status'>): boolean {
  return finding.status === 'open' && finding.kind !== 'unclear';
}

function proposalOf(result: PhotoFindingResult): PhotoProposal {
  const proposal: PhotoProposal = {};
  switch (result.kind) {
    case 'resize':
      proposal.widthM = result.widthM;
      proposal.heightM = result.heightM;
      break;
    case 'move':
      proposal.xM = result.xM;
      proposal.yM = result.yM;
      break;
    case 'rename':
      proposal.label = result.label;
      break;
    case 'add_element':
      proposal.elementType = result.elementType;
      proposal.label = result.label;
      proposal.xM = result.xM;
      proposal.yM = result.yM;
      proposal.widthM = result.widthM;
      proposal.heightM = result.heightM;
      break;
    case 'add_plant':
      proposal.plantName = result.plantName;
      proposal.xM = result.xM;
      proposal.yM = result.yM;
      break;
    case 'catalog_plant':
      proposal.catalog = result.catalog;
      proposal.plantName = result.catalog?.nameDe ?? result.plantName;
      break;
    case 'pest':
    case 'disease':
    case 'stage':
      proposal.plantName = result.plantName;
      proposal.action = result.action;
      break;
    default:
      break;
  }
  return proposal;
}

export interface FindingContext {
  gardenId: string;
  userId: string | null;
  checkId: string;
  now: string;
  /** Stand-in references of the request back to element ids. */
  refToId: Map<string, string>;
  newId: () => string;
}

/** One result of the check as a row to store. Null when it points at an element the plan does not have. */
export function findingRowFromResult(result: PhotoFindingResult, ctx: FindingContext, id?: string): PhotoFindingRow | null {
  const target = result.ref ? (ctx.refToId.get(result.ref) ?? null) : null;
  // A change to an existing element needs that element.
  if (['resize', 'move', 'rename', 'remove'].includes(result.kind) && !target) return null;
  return {
    id: id ?? ctx.newId(),
    gardenId: ctx.gardenId,
    checkId: ctx.checkId,
    kind: result.kind,
    targetElementId: target,
    title: result.title,
    detail: result.detail,
    proposal: proposalOf(result),
    confidence: Math.min(1, Math.max(0, result.confidence)),
    closeupOf: result.closeupOf,
    status: 'open',
    resolvedAt: null,
    taskRequested: false,
    createdByUserId: ctx.userId,
    createdAt: ctx.now,
    updatedAt: ctx.now,
    updatedByUserId: ctx.userId,
    deletedAt: null,
  };
}

export function findingRowsFromResult(result: PhotoCheckResult, ctx: FindingContext): PhotoFindingRow[] {
  const rows: PhotoFindingRow[] = [];
  for (const entry of result.findings) {
    const row = findingRowFromResult(entry, ctx);
    if (row) rows.push(row);
  }
  return rows;
}

/**
 * What a close-up changes: the first new finding takes the place of the one that asked
 * for it (same id, so the partner sees it change rather than a second one appear); any
 * further ones, such as a catalog proposal, are added.
 */
export function mergeCloseup(
  original: PhotoFindingRow,
  result: PhotoCheckResult,
  ctx: FindingContext,
): { replaced: PhotoFindingRow | null; added: PhotoFindingRow[] } {
  const [first, ...rest] = result.findings;
  if (!first) return { replaced: null, added: [] };
  // The follow-up is about the same thing: keep the element when the answer names none.
  const fresh = findingRowFromResult(first, ctx, original.id);
  const replaced: PhotoFindingRow | null = fresh
    ? {
        ...fresh,
        checkId: original.checkId,
        targetElementId: fresh.targetElementId ?? original.targetElementId,
        createdAt: original.createdAt,
        createdByUserId: original.createdByUserId,
      }
    : null;
  const added: PhotoFindingRow[] = [];
  for (const entry of rest) {
    const row = findingRowFromResult(entry, { ...ctx, checkId: original.checkId });
    if (row) added.push(row);
  }
  return { replaced, added };
}

// ── Accepting ────────────────────────────────────────────────────────────────

export type AcceptProblem =
  | 'not_open'
  | 'needs_closeup' // an unclear finding cannot be accepted
  | 'target_missing' // the element was deleted in the meantime
  | 'incomplete' // the proposal lacks a value
  | 'already_in_catalog';

export interface Acceptance {
  ok: true;
  /** Plan elements to write (changed or new). */
  elements: PlanElementRow[];
  /** A new entry for the garden's catalog. */
  gardenPlant: GardenPlantRow | null;
  /** The finding wants a task (pests, diseases, stage). */
  task: boolean;
}

export interface AcceptRefusal {
  ok: false;
  problem: AcceptProblem;
}

export interface AcceptContext {
  elements: PlanElementRow[];
  dims: GardenDimensionsRow | null;
  /** Shared catalog plus the garden's own entries. */
  plants: PlantRow[];
  userId: string | null;
  now: string;
  newId: () => string;
}

const positive = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0;
const finite = (v: number | null | undefined): v is number => typeof v === 'number' && Number.isFinite(v);
const round2 = (n: number): number => Math.round(n * 100) / 100;

/** Keeps a centre inside the parcel, so an accepted element never lands out of sight. */
function insideParcel(
  pos: { xM: number; yM: number },
  size: { widthM: number; heightM: number },
  dims: GardenDimensionsRow | null,
): { xM: number; yM: number } {
  if (!dims) return pos;
  const clamp = (v: number, half: number, max: number): number =>
    max <= 2 * half ? max / 2 : Math.min(max - half, Math.max(half, v));
  return {
    xM: round2(clamp(pos.xM, size.widthM / 2, dims.widthM)),
    yM: round2(clamp(pos.yM, size.heightM / 2, dims.heightM)),
  };
}

function changedOnly(before: PlanElementRow[], after: PlanElementRow[]): PlanElementRow[] {
  const old = new Map(before.map((e) => [e.id, e]));
  return after.filter((e) => old.get(e.id) !== e);
}

/**
 * Works out what accepting a finding changes. Uses the proposal as stored, which is what
 * the person may have edited. Writes nothing.
 */
export function planAcceptance(finding: PhotoFindingRow, ctx: AcceptContext): Acceptance | AcceptRefusal {
  if (finding.status !== 'open') return { ok: false, problem: 'not_open' };
  if (finding.kind === 'unclear') return { ok: false, problem: 'needs_closeup' };
  const p = finding.proposal ?? {};
  const live = ctx.elements.filter((e) => e.deletedAt === null);
  const target = finding.targetElementId ? live.find((e) => e.id === finding.targetElementId) : undefined;
  const stamp = (el: PlanElementRow): PlanElementRow => ({ ...el, updatedAt: ctx.now, updatedByUserId: ctx.userId });
  const done = (elements: PlanElementRow[]): Acceptance => ({ ok: true, elements, gardenPlant: null, task: false });

  switch (finding.kind) {
    case 'resize': {
      if (!target) return { ok: false, problem: 'target_missing' };
      if (!positive(p.widthM) || !positive(p.heightM)) return { ok: false, problem: 'incomplete' };
      // Through the editor's own rule, so the plants of a bed keep their place in it.
      const next = applyElementPatch(ctx.elements, target.id, { widthM: p.widthM, heightM: p.heightM }, ctx.now);
      return done(changedOnly(ctx.elements, next).map(stamp));
    }
    case 'move': {
      if (!target) return { ok: false, problem: 'target_missing' };
      if (!finite(p.xM) || !finite(p.yM)) return { ok: false, problem: 'incomplete' };
      const pos = insideParcel({ xM: p.xM, yM: p.yM }, target, ctx.dims);
      const next = applyElementPatch(ctx.elements, target.id, pos, ctx.now);
      return done(changedOnly(ctx.elements, next).map(stamp));
    }
    case 'rename': {
      if (!target) return { ok: false, problem: 'target_missing' };
      const label = (p.label ?? '').trim();
      if (!label) return { ok: false, problem: 'incomplete' };
      return done([stamp({ ...target, label: label.slice(0, 80) })]);
    }
    case 'remove': {
      if (!target) return { ok: false, problem: 'target_missing' };
      return done([stamp({ ...target, deletedAt: ctx.now })]);
    }
    case 'add_element': {
      const kind = (PHOTO_ELEMENT_TYPES as readonly string[]).includes(p.elementType ?? '') ? p.elementType! : null;
      if (!kind) return { ok: false, problem: 'incomplete' };
      const fallback = DEFAULT_SIZES[kind] ?? DEFAULT_SIZES.Sonstiges!;
      const size = {
        widthM: positive(p.widthM) ? p.widthM : fallback.widthM,
        heightM: positive(p.heightM) ? p.heightM : fallback.heightM,
      };
      const wanted =
        finite(p.xM) && finite(p.yM)
          ? { xM: p.xM, yM: p.yM }
          : ctx.dims
            ? nextFreeBedSlot(live, ctx.dims, size)
            : { xM: size.widthM / 2 + 1, yM: size.heightM / 2 + 1 };
      const pos = insideParcel(wanted, size, ctx.dims);
      const element: PlanElementRow = {
        id: ctx.newId(),
        gardenId: finding.gardenId,
        elementType: kind,
        label: (p.label ?? '').trim().slice(0, 80) || kind,
        ...pos,
        ...size,
        confidence: null,
        isAccepted: true,
        createdAt: ctx.now,
        updatedAt: ctx.now,
        updatedByUserId: ctx.userId,
        deletedAt: null,
        importedFrom: null,
        provenance: { source: 'photo', findingId: finding.id },
        layer: 'infrastructure',
      };
      return done([element]);
    }
    case 'add_plant': {
      const name = (p.plantName ?? '').trim();
      if (!name) return { ok: false, problem: 'incomplete' };
      const size = DEFAULT_SIZES.Pflanze!;
      const namedBed = target && target.elementType === 'Beet' ? target : undefined;
      const wanted =
        finite(p.xM) && finite(p.yM)
          ? { xM: p.xM, yM: p.yM }
          : namedBed
            ? { xM: namedBed.xM, yM: namedBed.yM }
            : { xM: 1, yM: 1 };
      const pos = insideParcel(wanted, size, ctx.dims);
      // The bed the plant really lies in decides, as when it is placed by hand.
      const bed = bedContaining(live, pos.xM, pos.yM) ?? namedBed;
      const provenance: Record<string, unknown> = { source: 'photo', findingId: finding.id };
      const known = findPlantByName(ctx.plants, name);
      if (known) provenance.plantSlug = known.slug;
      if (bed) provenance.parentBedId = bed.id;
      const element: PlanElementRow = {
        id: ctx.newId(),
        gardenId: finding.gardenId,
        elementType: 'Pflanze',
        label: (known?.nameDe ?? name).slice(0, 80),
        ...pos,
        ...size,
        confidence: null,
        isAccepted: true,
        createdAt: ctx.now,
        updatedAt: ctx.now,
        updatedByUserId: ctx.userId,
        deletedAt: null,
        importedFrom: null,
        provenance,
        layer: 'seasonal',
      };
      return done([element]);
    }
    case 'catalog_plant': {
      const proposal = p.catalog;
      if (!proposal || !proposal.nameDe?.trim()) return { ok: false, problem: 'incomplete' };
      if (findPlantByName(ctx.plants, proposal.nameDe)) return { ok: false, problem: 'already_in_catalog' };
      const gardenPlant = gardenPlantFromProposal(proposal, {
        id: ctx.newId(),
        gardenId: finding.gardenId,
        userId: ctx.userId,
        now: ctx.now,
        takenSlugs: ctx.plants.map((plant) => plant.slug),
      });
      // Plants of that name already on the plan now belong to the new entry.
      const linked = live
        .filter(
          (e) =>
            e.elementType === 'Pflanze' &&
            !(e.provenance as Record<string, unknown> | null)?.plantSlug &&
            e.label.trim().toLowerCase() === gardenPlant.nameDe.toLowerCase(),
        )
        .map((e) => stamp({ ...e, provenance: { ...(e.provenance ?? {}), plantSlug: gardenPlant.slug } }));
      return { ok: true, elements: linked, gardenPlant, task: false };
    }
    case 'pest':
    case 'disease':
    case 'stage':
      return { ok: true, elements: [], gardenPlant: null, task: true };
    default:
      return { ok: false, problem: 'incomplete' };
  }
}

/** The finding as it is stored once it was accepted or dismissed. */
export function resolveFinding(
  finding: PhotoFindingRow,
  status: 'accepted' | 'dismissed',
  ctx: { now: string; userId: string | null; task?: boolean },
): PhotoFindingRow {
  return {
    ...finding,
    status,
    resolvedAt: ctx.now,
    taskRequested: status === 'accepted' && Boolean(ctx.task),
    updatedAt: ctx.now,
    updatedByUserId: ctx.userId,
  };
}

/** Where a finding points on the plan: an element, a proposed box, a spot, or nothing (PHOTO-08). */
export type FindingMark =
  | { type: 'element'; elementId: string; proposed: { xM: number; yM: number; widthM: number; heightM: number } | null }
  | { type: 'box'; xM: number; yM: number; widthM: number; heightM: number }
  | { type: 'spot'; xM: number; yM: number }
  | { type: 'none' };

export function findingMark(finding: PhotoFindingRow, elements: PlanElementRow[]): FindingMark {
  const p = finding.proposal ?? {};
  const target = finding.targetElementId
    ? elements.find((e) => e.id === finding.targetElementId && e.deletedAt === null)
    : undefined;
  if (target && finding.kind !== 'add_plant') {
    let proposed: { xM: number; yM: number; widthM: number; heightM: number } | null = null;
    if (finding.kind === 'resize' && positive(p.widthM) && positive(p.heightM)) {
      proposed = { xM: target.xM, yM: target.yM, widthM: p.widthM, heightM: p.heightM };
    } else if (finding.kind === 'move' && finite(p.xM) && finite(p.yM)) {
      proposed = { xM: p.xM, yM: p.yM, widthM: target.widthM, heightM: target.heightM };
    }
    return { type: 'element', elementId: target.id, proposed };
  }
  if (finding.kind === 'add_element' && finite(p.xM) && finite(p.yM)) {
    const fallback = DEFAULT_SIZES[p.elementType ?? ''] ?? DEFAULT_SIZES.Sonstiges!;
    return {
      type: 'box',
      xM: p.xM,
      yM: p.yM,
      widthM: positive(p.widthM) ? p.widthM : fallback.widthM,
      heightM: positive(p.heightM) ? p.heightM : fallback.heightM,
    };
  }
  if (finding.kind === 'add_plant') {
    if (finite(p.xM) && finite(p.yM)) return { type: 'spot', xM: p.xM, yM: p.yM };
    if (target) return { type: 'element', elementId: target.id, proposed: null };
  }
  return { type: 'none' };
}
