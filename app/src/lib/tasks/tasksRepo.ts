// Phase 36: what the task list reads and writes.
//   - reads plan, own tasks, findings, tick-offs and stored AI orders from local storage,
//     so the list comes up without a network                                  (TASK-04)
//   - a tick-off, an own task and an AI order are synced rows; the partner sees a
//     tick-off within seconds                                        (TASK-05, TASK-06)
//   - the forecast comes from the weather function and is kept for when there is no
//     network                                                                 (TASK-07)
//   - the AI is asked for an order at most once per day, budget and list      (TASK-09)

import {
  AI_RETRYABLE,
  type AiCode,
  type EntityName,
  type GardenTaskRow,
  type PhotoFindingRow,
  type PlanElementRow,
  type TaskDoneRow,
  type TaskSortRow,
} from '@spatenstich/shared';
import { storage } from '../../storage';
import { useAuthStore } from '../../stores/authStore';
import { callAi } from '../ai/aiClient';
import { newElementId } from '../editor/elementFactory';
import { OutboxEnqueueError } from '../errors';
import { supabase } from '../supabase';
import { bumpDataVersion } from '../sync/dataVersion';
import { scheduleWriteDebounced } from '../sync/SyncTriggers';
import { isDay, monthOf } from './dates';
import { findSort, hideUntilFor, listHash } from './list';
import type { Forecast, ForecastDay, Task } from './rules';

export interface TaskData {
  elements: PlanElementRow[];
  ownTasks: GardenTaskRow[];
  findings: PhotoFindingRow[];
  done: TaskDoneRow[];
  sorts: TaskSortRow[];
}

function session(): { gardenId: string; userId: string } | null {
  const { mode, activeGardenId, userId } = useAuthStore.getState();
  return mode === 'account' && activeGardenId && userId ? { gardenId: activeGardenId, userId } : null;
}

async function write<T extends GardenTaskRow | TaskDoneRow | TaskSortRow>(entity: EntityName, row: T): Promise<void> {
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
  bumpDataVersion(entity);
  scheduleWriteDebounced();
}

/** Everything the rules need, from local storage. */
export async function loadTaskData(gardenId: string): Promise<TaskData> {
  const [elements, ownTasks, findings, done, sorts] = await Promise.all([
    storage.getRowsByGarden<PlanElementRow>('plan_elements', gardenId),
    storage.getRowsByGarden<GardenTaskRow>('garden_tasks', gardenId),
    storage.getRowsByGarden<PhotoFindingRow>('photo_findings', gardenId),
    storage.getRowsByGarden<TaskDoneRow>('task_done', gardenId),
    storage.getRowsByGarden<TaskSortRow>('task_sorts', gardenId),
  ]);
  return { elements, ownTasks, findings, done, sorts };
}

// ── Ticking off ──────────────────────────────────────────────────────────────

/** Ticks a task off for today. It stays off the list until it is due again. */
export async function checkTask(task: Task, today: string): Promise<TaskDoneRow | null> {
  const who = session();
  if (!who) return null;
  const now = new Date().toISOString();
  const row: TaskDoneRow = {
    id: newElementId(),
    gardenId: who.gardenId,
    taskKey: task.key,
    doneOn: today,
    hideUntil: hideUntilFor(task, today),
    doneByUserId: who.userId,
    createdAt: now,
    updatedAt: now,
    updatedByUserId: who.userId,
    deletedAt: null,
  };
  await write('task_done', row);
  return row;
}

/** Takes a tick back. */
export async function uncheckTask(done: TaskDoneRow): Promise<boolean> {
  const who = session();
  if (!who) return false;
  const now = new Date().toISOString();
  await write('task_done', { ...done, deletedAt: now, updatedAt: now, updatedByUserId: who.userId });
  return true;
}

// ── Own tasks ────────────────────────────────────────────────────────────────

export interface OwnTaskDraft {
  id?: string;
  title: string;
  whereText: string | null;
  durationMin: number;
  intervalDays: number | null;
  dueOn: string;
}

/** Null when a value cannot be used. */
export function checkOwnTask(draft: OwnTaskDraft): OwnTaskDraft | null {
  const title = draft.title.trim();
  if (!title || title.length > 120) return null;
  if (!Number.isInteger(draft.durationMin) || draft.durationMin < 1 || draft.durationMin > 600) return null;
  if (draft.intervalDays !== null && (!Number.isInteger(draft.intervalDays) || draft.intervalDays < 1 || draft.intervalDays > 365)) {
    return null;
  }
  if (!isDay(draft.dueOn)) return null;
  return { ...draft, title, whereText: draft.whereText?.trim().slice(0, 120) || null };
}

export async function saveOwnTask(draft: OwnTaskDraft): Promise<GardenTaskRow | null> {
  const who = session();
  const checked = checkOwnTask(draft);
  if (!who || !checked) return null;
  const now = new Date().toISOString();
  const existing = checked.id ? await storage.getRow<GardenTaskRow>('garden_tasks', checked.id) : null;
  const row: GardenTaskRow = {
    id: existing?.id ?? newElementId(),
    gardenId: who.gardenId,
    title: checked.title,
    whereText: checked.whereText,
    targetElementId: existing?.targetElementId ?? null,
    durationMin: checked.durationMin,
    intervalDays: checked.intervalDays,
    dueOn: checked.dueOn,
    notes: existing?.notes ?? null,
    createdByUserId: existing?.createdByUserId ?? who.userId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    updatedByUserId: who.userId,
    deletedAt: null,
  };
  await write('garden_tasks', row);
  return row;
}

export async function deleteOwnTask(task: GardenTaskRow): Promise<boolean> {
  const who = session();
  if (!who) return false;
  const now = new Date().toISOString();
  await write('garden_tasks', { ...task, deletedAt: now, updatedAt: now, updatedByUserId: who.userId });
  return true;
}

// ── Forecast ─────────────────────────────────────────────────────────────────

export const WEATHER_CACHE_PREFIX = 'weather:';

export type ForecastState =
  | { status: 'fresh' | 'cached'; forecast: Forecast }
  /** `reason` says why there is none: no postcode, postcode unknown, offline, service down. */
  | { status: 'none'; reason: 'no_plz' | 'plz_unknown' | 'offline' | 'unavailable' };

function readDays(value: unknown): ForecastDay[] {
  if (!Array.isArray(value)) return [];
  const days: ForecastDay[] = [];
  for (const entry of value) {
    const d = entry as Partial<ForecastDay> | null;
    if (!d || !isDay(d.date)) continue;
    if (![d.tMin, d.tMax, d.rainMm].every((n) => typeof n === 'number' && Number.isFinite(n))) continue;
    days.push({ date: d.date, tMin: d.tMin!, tMax: d.tMax!, rainMm: d.rainMm! });
  }
  return days;
}

export async function cachedForecast(gardenId: string): Promise<Forecast | null> {
  try {
    const raw = await storage.get(`${WEATHER_CACHE_PREFIX}${gardenId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Forecast>;
    const days = readDays(parsed.days);
    if (typeof parsed.fetchedAt !== 'string' || days.length === 0) return null;
    return { fetchedAt: parsed.fetchedAt, place: typeof parsed.place === 'string' ? parsed.place : null, days };
  } catch {
    return null;
  }
}

/**
 * The forecast for the garden's postcode. Asks the weather function; without a network
 * or when it fails, the last loaded forecast is used (the rules ignore it once it is
 * too old).
 */
export async function loadForecast(gardenId: string): Promise<ForecastState> {
  const cached = await cachedForecast(gardenId);
  const fallback = (reason: 'offline' | 'unavailable'): ForecastState =>
    cached ? { status: 'cached', forecast: cached } : { status: 'none', reason };
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return fallback('offline');
  try {
    const { data, error } = await supabase.functions.invoke('weather', { body: { gardenId } });
    let body: Record<string, unknown> | null = data && typeof data === 'object' ? (data as Record<string, unknown>) : null;
    if (error) {
      // An error status carries its code in the body.
      const context = (error as { context?: { json?: () => Promise<unknown> } }).context;
      try {
        body = context?.json ? ((await context.json()) as Record<string, unknown>) : null;
      } catch {
        body = null;
      }
    }
    if (body?.['ok'] === true) {
      const days = readDays(body['days']);
      if (days.length > 0 && typeof body['fetchedAt'] === 'string') {
        const forecast: Forecast = {
          fetchedAt: body['fetchedAt'],
          place: typeof body['place'] === 'string' ? body['place'] : null,
          days,
        };
        await storage.set(`${WEATHER_CACHE_PREFIX}${gardenId}`, JSON.stringify(forecast)).catch(() => {});
        return { status: 'fresh', forecast };
      }
    }
    const code = body?.['code'];
    if (code === 'no_plz' || code === 'plz_unknown') return { status: 'none', reason: code };
    return fallback('unavailable');
  } catch {
    return fallback('unavailable');
  }
}

// ── The AI's order ───────────────────────────────────────────────────────────

export type SortOutcome =
  | { ok: true; sort: TaskSortRow; fromCache: boolean; costUsd: number }
  | { ok: false; code: AiCode | 'too_few'; retryable: boolean };

/** The order stored for this day, budget and exactly this list. */
export function storedSort(
  sorts: TaskSortRow[],
  tasks: Task[],
  today: string,
  budgetMin: number | null,
): TaskSortRow | null {
  return findSort(sorts, today, budgetMin, listHash(tasks, budgetMin));
}

/**
 * Asks the AI for an order of the list. If an order for this day, budget and exactly
 * this list is already stored (from this device or the partner's), that one is used and
 * nothing is sent.
 */
export async function sortWithAi(
  tasks: Task[],
  today: string,
  budgetMin: number | null,
  weatherLine: string | null,
): Promise<SortOutcome> {
  const who = session();
  if (!who) return { ok: false, code: 'not_authenticated', retryable: false };
  if (tasks.length < 2) return { ok: false, code: 'too_few', retryable: false };
  const hash = listHash(tasks, budgetMin);
  const known = findSort(await storage.getRowsByGarden<TaskSortRow>('task_sorts', who.gardenId), today, budgetMin, hash);
  if (known) return { ok: true, sort: known, fromCache: true, costUsd: 0 };

  // The model sees stand-in references, not the keys (which contain ids).
  const sent = tasks.slice(0, 60);
  const refToKey = new Map(sent.map((task, index) => [`T${index + 1}`, task.key]));
  const answer = await callAi('task_sort', {
    tasks: sent.map((task, index) => ({
      ref: `T${index + 1}`,
      title: task.title,
      where: task.where,
      durationMin: task.durationMin,
      urgency: task.urgency,
      reason: task.reason,
    })),
    budgetMin: budgetMin ?? 0,
    month: monthOf(today),
    weather: weatherLine,
  });
  if (!answer.ok) return { ok: false, code: answer.code, retryable: answer.retryable };
  const raw = (answer.data as { items?: unknown } | undefined)?.items;
  if (!Array.isArray(raw)) return { ok: false, code: 'service_error', retryable: AI_RETRYABLE.service_error };
  const items: { key: string; reason: string }[] = [];
  for (const entry of raw) {
    const item = entry as { ref?: unknown; reason?: unknown } | null;
    const key = item && typeof item.ref === 'string' ? refToKey.get(item.ref) : undefined;
    if (key) items.push({ key, reason: typeof item!.reason === 'string' ? item!.reason : '' });
  }
  if (items.length === 0) return { ok: false, code: 'service_error', retryable: AI_RETRYABLE.service_error };

  const now = new Date().toISOString();
  const sort: TaskSortRow = {
    id: newElementId(),
    gardenId: who.gardenId,
    day: today,
    budgetMin: budgetMin ?? 0,
    inputHash: hash,
    items,
    createdByUserId: who.userId,
    createdAt: now,
    updatedAt: now,
    updatedByUserId: who.userId,
    deletedAt: null,
  };
  await write('task_sorts', sort);
  return { ok: true, sort, fromCache: false, costUsd: answer.costUsd };
}
