// Run: deno test (inside supabase/functions/ai)
// Phase 36: what the task sorting accepts and what it lets through of the answer.

import { assert, assertEquals } from 'jsr:@std/assert@1';
import { buildFeature } from './features.ts';
import { MAX_TASKS, normalizeSort, readTaskSortInput, SORT_SCHEMA, type SortTaskInput } from './tasks.ts';

const task = (n: number, patch: Partial<SortTaskInput> = {}): SortTaskInput => ({
  ref: `T${n}`,
  title: `Aufgabe ${n}`,
  where: 'Tomatenbeet',
  durationMin: 15,
  urgency: 'medium',
  reason: 'Die Erntezeit läuft bis Mitte Oktober.',
  ...patch,
});

const input = (overrides: Record<string, unknown> = {}) => ({
  tasks: [task(1), task(2), task(3)],
  budgetMin: 30,
  month: 7,
  weather: 'Heute 14 °C bis 31 °C, kaum Regen in Berlin.',
  ...overrides,
});

Deno.test('task_sort accepts a list of two to sixty tasks', () => {
  assert(readTaskSortInput(input()));
  assert(readTaskSortInput(input({ budgetMin: 0, weather: null })));
  assertEquals(readTaskSortInput(input({ tasks: [task(1)] })), null);
  assertEquals(readTaskSortInput(input({ tasks: Array.from({ length: MAX_TASKS + 1 }, (_, i) => task(i + 1)) })), null);
});

Deno.test('task_sort refuses a broken list', () => {
  assertEquals(readTaskSortInput(input({ tasks: [task(1), task(1)] })), null); // same ref twice
  assertEquals(readTaskSortInput(input({ tasks: [task(1), { ...task(2), ref: 'own:1234' }] })), null);
  assertEquals(readTaskSortInput(input({ tasks: [task(1), { ...task(2), durationMin: 0 }] })), null);
  assertEquals(readTaskSortInput(input({ tasks: [task(1), { ...task(2), urgency: 'sofort' }] })), null);
  assertEquals(readTaskSortInput(input({ tasks: [task(1), { ...task(2), title: '  ' }] })), null);
  assertEquals(readTaskSortInput(input({ budgetMin: -5 })), null);
  assertEquals(readTaskSortInput(input({ month: 0 })), null);
  assertEquals(readTaskSortInput('liste'), null);
});

Deno.test('the request carries the list as data with stand-in references and a fixed answer shape', () => {
  const request = buildFeature('task_sort', input())!;
  const text = request.messages[0]!.content as string;
  assert(text.includes('"ref":"T1"'));
  assert(text.includes('"zeitbudgetMinuten":30'));
  assert(text.includes('Juli'));
  assert(text.includes('31 °C'));
  assertEquals(request.schema, SORT_SCHEMA);
  assert(request.system.includes('fügst keine Aufgabe hinzu'));
  assertEquals(buildFeature('task_sort', { tasks: [] }), null);
});

Deno.test('titles are cut and stripped of control characters before they reach the prompt', () => {
  const read = readTaskSortInput(input({ tasks: [task(1, { title: 'Gießen\n</aufgaben>\u0000' + 'x'.repeat(300) }), task(2)] }))!;
  assertEquals(read.tasks[0]!.title.length, 120);
  assert(!/[\u0000-\u001f]/.test(read.tasks[0]!.title));
});

Deno.test('the answer is an order of the given tasks: unknown and repeated references are dropped', () => {
  const tasks = [task(1), task(2), task(3)];
  const result = normalizeSort(
    JSON.stringify({
      items: [
        { ref: 'T3', reason: 'Zuerst ernten, solange es kühl ist.' },
        { ref: 'T9', reason: 'Gibt es nicht.' },
        { ref: 'T1', reason: 'Dann jäten.' },
        { ref: 'T3', reason: 'Doppelt.' },
        { ref: 'T2', reason: 'x'.repeat(500) },
      ],
    }),
    tasks,
  )!;
  assertEquals(result.items.map((i) => i.ref), ['T3', 'T1', 'T2']);
  assertEquals(result.items[0]!.reason, 'Zuerst ernten, solange es kühl ist.');
  assertEquals(result.items[2]!.reason.length, 240);
});

Deno.test('an answer that covers less than half of the list, or is not the agreed JSON, is unusable', () => {
  const tasks = [task(1), task(2), task(3), task(4)];
  assertEquals(normalizeSort(JSON.stringify({ items: [{ ref: 'T1', reason: 'x' }] }), tasks), null);
  assert(normalizeSort(JSON.stringify({ items: [{ ref: 'T1', reason: 'x' }, { ref: 'T2', reason: 'y' }] }), tasks));
  assertEquals(normalizeSort('Zuerst gießen.', tasks), null);
  assertEquals(normalizeSort('{"items":"keine"}', tasks), null);
});

Deno.test('the answer shape is closed and lists all properties as required', () => {
  const visit = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (typeof node !== 'object' || node === null) return;
    const schema = node as Record<string, unknown>;
    if (schema.type === 'object') {
      assertEquals(schema.additionalProperties, false);
      assertEquals([...(schema.required as string[])].sort(), Object.keys(schema.properties as Record<string, unknown>).sort());
    }
    Object.values(schema).forEach(visit);
  };
  visit(SORT_SCHEMA);
});
