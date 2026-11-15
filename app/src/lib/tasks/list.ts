// Phase 36: from all tasks that are due to the list a person sees.
//   - what was ticked off stays off until it is due again            (TASK-05)
//   - "I have N minutes": the most valuable tasks that fit, the rest below (TASK-03)
//   - an order from the AI is applied on top, when there is one for exactly
//     this list                                                       (TASK-04, TASK-09)
// Pure functions; storage is in tasksRepo.ts.

import type { TaskDoneRow, TaskSortRow } from '@spatenstich/shared';
import { addDays, daysBetween } from './dates';
import type { Task } from './rules';

// ── Done ─────────────────────────────────────────────────────────────────────

/** Until when a task stays off the list when it is ticked off on `day`. */
export function hideUntilFor(task: Pick<Task, 'repeatDays'>, day: string): string | null {
  return task.repeatDays === null ? null : addDays(day, Math.max(1, task.repeatDays) - 1);
}

/** The tick-off that keeps a task off the list today, if there is one. */
export function activeDone(key: string, done: TaskDoneRow[], today: string): TaskDoneRow | null {
  let found: TaskDoneRow | null = null;
  for (const row of done) {
    if (row.deletedAt !== null || row.taskKey !== key) continue;
    if (daysBetween(row.doneOn, today) < 0) continue; // ticked off "in the future": ignore
    if (row.hideUntil !== null && daysBetween(today, row.hideUntil) < 0) continue; // due again
    if (!found || row.doneOn > found.doneOn) found = row;
  }
  return found;
}

export interface SplitTasks {
  /** Still to do. */
  open: Task[];
  /** Ticked off today: shown crossed out, so the tick can be taken back. */
  doneToday: { task: Task; done: TaskDoneRow }[];
}

export function splitDone(tasks: Task[], done: TaskDoneRow[], today: string): SplitTasks {
  const open: Task[] = [];
  const doneToday: SplitTasks['doneToday'] = [];
  for (const task of tasks) {
    const row = activeDone(task.key, done, today);
    if (!row) open.push(task);
    else if (row.doneOn === today) doneToday.push({ task, done: row });
    // ticked off on an earlier day and not due again yet: not shown at all
  }
  return { open, doneToday };
}

// ── Time budget ──────────────────────────────────────────────────────────────

export const BUDGET_CHOICES = [15, 30, 60, 120] as const;

export interface BudgetPlan {
  /** In the order to do them. */
  fits: Task[];
  totalMin: number;
  /** "If there is time left." */
  rest: Task[];
}

/**
 * Goes through the tasks in their order and takes each one that still fits. Without a
 * budget everything fits.
 */
export function planForBudget(tasks: Task[], budgetMin: number | null): BudgetPlan {
  if (budgetMin === null || !(budgetMin > 0)) {
    return { fits: tasks, totalMin: tasks.reduce((sum, task) => sum + task.durationMin, 0), rest: [] };
  }
  const fits: Task[] = [];
  const rest: Task[] = [];
  let totalMin = 0;
  for (const task of tasks) {
    if (totalMin + task.durationMin <= budgetMin) {
      fits.push(task);
      totalMin += task.durationMin;
    } else {
      rest.push(task);
    }
  }
  return { fits, totalMin, rest };
}

// ── The AI's order ───────────────────────────────────────────────────────────

/**
 * A short fingerprint of the list that is to be sorted (djb2, hex). The weather is not
 * part of it on its own: when it matters, it has already changed a task's urgency or
 * reason, and a forecast that merely moved by a degree is not a new list.
 */
export function listHash(tasks: Task[], budgetMin: number | null): string {
  const text = JSON.stringify([
    budgetMin ?? 0,
    tasks.map((task) => [task.key, task.title, task.where, task.durationMin, task.urgency, task.reason]),
  ]);
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) >>> 0;
  return `${hash.toString(16)}-${text.length.toString(16)}`;
}

/** The stored order for this day, budget and exactly this list; the newest when there are several. */
export function findSort(
  sorts: TaskSortRow[],
  day: string,
  budgetMin: number | null,
  hash: string,
): TaskSortRow | null {
  const matching = sorts.filter(
    (row) => row.deletedAt === null && row.day === day && row.budgetMin === (budgetMin ?? 0) && row.inputHash === hash,
  );
  matching.sort((a, b) => (a.createdAt === b.createdAt ? a.id.localeCompare(b.id) : b.createdAt.localeCompare(a.createdAt)));
  return matching[0] ?? null;
}

/**
 * Puts the tasks in the AI's order and takes over its reasons. A key the list does not
 * have is ignored; a task the AI left out keeps its place behind the sorted ones.
 */
export function applySort(tasks: Task[], items: { key: string; reason: string }[]): Task[] {
  const byKey = new Map(tasks.map((task) => [task.key, task]));
  const sorted: Task[] = [];
  const used = new Set<string>();
  for (const item of items) {
    const task = byKey.get(item.key);
    if (!task || used.has(item.key)) continue;
    used.add(item.key);
    const reason = (item.reason ?? '').trim();
    sorted.push(reason ? { ...task, reason: reason.slice(0, 240) } : task);
  }
  for (const task of tasks) if (!used.has(task.key)) sorted.push(task);
  return sorted;
}
