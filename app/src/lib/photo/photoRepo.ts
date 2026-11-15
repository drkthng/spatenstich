// Phase 35: running a photo check and keeping its findings.
//
// The photos are downscaled on the device, sent once to the edge function and then
// dropped: nothing in here stores a photo, and neither does the server (PHOTO-10).
// What is kept are the findings, as synced rows, so the partner sees the open ones.
// Accepting writes to the plan or the catalog; nothing else does (PHOTO-07).

import {
  AI_RETRYABLE,
  PHOTO_MAX_CLOSEUP_PHOTOS,
  PHOTO_MAX_PHOTOS,
  type AiCode,
  type EntityName,
  type GardenPlantRow,
  type PhotoCheckInput,
  type PhotoCheckResult,
  type PhotoCloseupInput,
  type PhotoFindingRow,
  type PhotoProposal,
  type PlanElementRow,
  type PlantRow,
} from '@spatenstich/shared';
import { storage } from '../../storage';
import { useAuthStore } from '../../stores/authStore';
import { callAi } from '../ai/aiClient';
import { downscaleImage } from '../ai/imageResize';
import { newElementId } from '../editor/elementFactory';
import { OutboxEnqueueError } from '../errors';
import { loadDimensions } from '../gardenPlanRepo';
import { bumpDataVersion } from '../sync/dataVersion';
import { scheduleWriteDebounced } from '../sync/SyncTriggers';
import {
  findingRowsFromResult,
  mergeCloseup,
  planAcceptance,
  resolveFinding,
  type AcceptProblem,
  type FindingContext,
} from './findings';
import { mergeCatalog } from './gardenPlants';
import { buildPlanSummary, catalogNames } from './planSummary';

export type PhotoFailure =
  | AiCode
  | 'no_garden' // no garden size yet: there is nothing to compare with
  | 'no_photos'
  | 'too_many_photos'
  | 'photo_unreadable'; // a file the browser cannot decode as an image

export type PhotoCheckOutcome =
  | { ok: true; checkId: string; findings: PhotoFindingRow[]; summary: string; costUsd: number }
  | { ok: false; code: PhotoFailure; retryable: boolean };

const fail = (code: PhotoFailure): PhotoCheckOutcome => ({
  ok: false,
  code,
  retryable: code in AI_RETRYABLE ? AI_RETRYABLE[code as AiCode] : false,
});

function session(): { gardenId: string; userId: string } | null {
  const { mode, activeGardenId, userId } = useAuthStore.getState();
  return mode === 'account' && activeGardenId && userId ? { gardenId: activeGardenId, userId } : null;
}

async function write<T extends PhotoFindingRow | GardenPlantRow | PlanElementRow>(
  entity: EntityName,
  row: T,
): Promise<void> {
  const stored = await storage.getRow(entity, row.id, { includeDeleted: true });
  try {
    await storage.writeWithOutbox(entity, row, {
      entity,
      rowId: row.id,
      operation: stored ? 'update' : 'insert',
      payload: row as unknown as Record<string, unknown>,
    });
  } catch (cause) {
    throw new OutboxEnqueueError(entity, row.id, cause);
  }
}

function isResult(data: unknown): data is PhotoCheckResult {
  return typeof data === 'object' && data !== null && Array.isArray((data as PhotoCheckResult).findings);
}

/** Downscales the chosen files; null when one of them is not a readable image. */
async function prepare(files: Blob[]): Promise<string[] | null> {
  const photos: string[] = [];
  for (const file of files) {
    try {
      photos.push((await downscaleImage(file)).base64);
    } catch {
      return null;
    }
  }
  return photos;
}

async function loadElements(gardenId: string): Promise<PlanElementRow[]> {
  return storage.getRowsByGarden<PlanElementRow>('plan_elements', gardenId, { includeDeleted: true });
}

export async function loadGardenPlants(gardenId: string): Promise<GardenPlantRow[]> {
  return storage.getRowsByGarden<GardenPlantRow>('garden_plants', gardenId);
}

export { countOpenFindings, loadFindings } from './openFindings';

/**
 * Compares up to six photos with the plan (PHOTO-01..PHOTO-04). The findings are stored
 * as open proposals; the plan is not touched.
 * `catalog` is the shared catalog as the screen has it.
 */
export async function runPhotoCheck(files: Blob[], catalog: PlantRow[]): Promise<PhotoCheckOutcome> {
  const who = session();
  if (!who) return fail('not_authenticated');
  if (files.length === 0) return fail('no_photos');
  if (files.length > PHOTO_MAX_PHOTOS) return fail('too_many_photos');
  const dims = await loadDimensions(who.gardenId);
  if (!dims) return fail('no_garden');

  const photos = await prepare(files);
  if (!photos) return fail('photo_unreadable');

  const plan = buildPlanSummary(await loadElements(who.gardenId));
  const plants = mergeCatalog(catalog, await loadGardenPlants(who.gardenId));
  const input: PhotoCheckInput = {
    photos,
    garden: { widthM: dims.widthM, heightM: dims.heightM },
    elements: plan.elements,
    catalog: catalogNames(plants),
    month: new Date().getMonth() + 1,
  };
  const answer = await callAi('photo_check', input);
  if (!answer.ok) return fail(answer.code);
  if (!isResult(answer.data)) return fail('service_error');

  const checkId = newElementId();
  const ctx: FindingContext = {
    gardenId: who.gardenId,
    userId: who.userId,
    checkId,
    now: new Date().toISOString(),
    refToId: plan.refToId,
    newId: newElementId,
  };
  const findings = findingRowsFromResult(answer.data, ctx);
  for (const finding of findings) await write('photo_findings', finding);
  if (findings.length > 0) {
    bumpDataVersion('photo_findings');
    scheduleWriteDebounced();
  }
  return { ok: true, checkId, findings, summary: answer.data.summary ?? '', costUsd: answer.costUsd };
}

/**
 * Sends the close-up a finding asked for (PHOTO-06). The answer takes the finding's
 * place; a catalog proposal that comes with it is added.
 */
export async function runCloseup(
  finding: PhotoFindingRow,
  files: Blob[],
  catalog: PlantRow[],
): Promise<PhotoCheckOutcome> {
  const who = session();
  if (!who) return fail('not_authenticated');
  if (files.length === 0) return fail('no_photos');
  if (files.length > PHOTO_MAX_CLOSEUP_PHOTOS) return fail('too_many_photos');

  const photos = await prepare(files);
  if (!photos) return fail('photo_unreadable');

  const plan = buildPlanSummary(await loadElements(who.gardenId));
  const plants = mergeCatalog(catalog, await loadGardenPlants(who.gardenId));
  const input: PhotoCloseupInput = {
    photos,
    finding: {
      kind: finding.kind,
      title: finding.title,
      detail: finding.detail,
      closeupOf: finding.closeupOf ?? finding.title,
      ref: finding.targetElementId ? (plan.idToRef.get(finding.targetElementId) ?? null) : null,
    },
    elements: plan.elements,
    catalog: catalogNames(plants),
    month: new Date().getMonth() + 1,
  };
  const answer = await callAi('photo_closeup', input);
  if (!answer.ok) return fail(answer.code);
  if (!isResult(answer.data)) return fail('service_error');

  const ctx: FindingContext = {
    gardenId: who.gardenId,
    userId: who.userId,
    checkId: finding.checkId,
    now: new Date().toISOString(),
    refToId: plan.refToId,
    newId: newElementId,
  };
  const merged = mergeCloseup(finding, answer.data, ctx);
  if (!merged.replaced) return fail('service_error');
  const findings = [merged.replaced, ...merged.added];
  for (const row of findings) await write('photo_findings', row);
  bumpDataVersion('photo_findings');
  scheduleWriteDebounced();
  return { ok: true, checkId: finding.checkId, findings, summary: answer.data.summary ?? '', costUsd: answer.costUsd };
}

export type AcceptOutcome =
  | { ok: true; changedElements: number; gardenPlant: GardenPlantRow | null; task: boolean }
  | { ok: false; problem: AcceptProblem | 'not_authenticated' };

/**
 * Accepts one finding: writes what it proposes to the plan or the catalog and marks it
 * accepted. This is the only place a finding changes anything (PHOTO-07).
 */
export async function acceptFinding(finding: PhotoFindingRow, catalog: PlantRow[]): Promise<AcceptOutcome> {
  const who = session();
  if (!who) return { ok: false, problem: 'not_authenticated' };
  // The stored state decides, not what a screen still shows.
  const current = (await storage.getRow<PhotoFindingRow>('photo_findings', finding.id)) ?? finding;
  const now = new Date().toISOString();
  const elements = await loadElements(who.gardenId);
  const plants = mergeCatalog(catalog, await loadGardenPlants(who.gardenId));
  const plan = planAcceptance(current, {
    elements,
    dims: await loadDimensions(who.gardenId),
    plants,
    userId: who.userId,
    now,
    newId: newElementId,
  });
  if (!plan.ok) return plan;

  if (plan.gardenPlant) await write('garden_plants', plan.gardenPlant);
  for (const element of plan.elements) await write('plan_elements', element);
  await write('photo_findings', resolveFinding(current, 'accepted', { now, userId: who.userId, task: plan.task }));

  if (plan.gardenPlant) bumpDataVersion('garden_plants');
  if (plan.elements.length > 0) bumpDataVersion('plan_elements');
  bumpDataVersion('photo_findings');
  scheduleWriteDebounced();
  return { ok: true, changedElements: plan.elements.length, gardenPlant: plan.gardenPlant, task: plan.task };
}

/** Dismisses a finding. Nothing else changes. */
export async function dismissFinding(finding: PhotoFindingRow): Promise<boolean> {
  const who = session();
  if (!who) return false;
  const current = (await storage.getRow<PhotoFindingRow>('photo_findings', finding.id)) ?? finding;
  if (current.status !== 'open') return true;
  await write('photo_findings', resolveFinding(current, 'dismissed', { now: new Date().toISOString(), userId: who.userId }));
  bumpDataVersion('photo_findings');
  scheduleWriteDebounced();
  return true;
}

/** Stores an edited proposal (PHOTO-07: edit before accepting). The finding stays open. */
export async function updateProposal(finding: PhotoFindingRow, proposal: PhotoProposal): Promise<PhotoFindingRow | null> {
  const who = session();
  if (!who) return null;
  const current = (await storage.getRow<PhotoFindingRow>('photo_findings', finding.id)) ?? finding;
  if (current.status !== 'open') return current;
  const next: PhotoFindingRow = {
    ...current,
    proposal: { ...current.proposal, ...proposal },
    updatedAt: new Date().toISOString(),
    updatedByUserId: who.userId,
  };
  await write('photo_findings', next);
  bumpDataVersion('photo_findings');
  scheduleWriteDebounced();
  return next;
}

/** Saves a changed entry of the garden's own catalog (PHOTO-05: it can be edited). */
export async function saveGardenPlant(row: GardenPlantRow): Promise<GardenPlantRow | null> {
  const who = session();
  if (!who) return null;
  const next: GardenPlantRow = { ...row, updatedAt: new Date().toISOString(), updatedByUserId: who.userId };
  await write('garden_plants', next);
  bumpDataVersion('garden_plants');
  scheduleWriteDebounced();
  return next;
}
