// "Heute" (Phase 36): how much time do you have, and what is worth doing with it.
//
// The list is worked out on this device from the plan, the calendar, the season and the
// last loaded forecast (TASK-01, TASK-04), so it also comes up without a network. With a
// network the AI puts it in order, at most once per day, time budget and list (TASK-09).
// A tick-off is a synced row: the partner sees it within seconds (TASK-05).

import * as React from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import type { AiCode, GardenTaskRow, TaskDoneRow } from '@spatenstich/shared';
import { useAuthStore } from '@/src/stores/authStore';
import { useProfileStore } from '@/src/stores/profileStore';
import { usePlants } from '@/src/hooks/usePlants';
import { useDataVersion } from '@/src/lib/sync/dataVersion';
import { memberName } from '@/src/components/SyncToastHost';
import { aiMessage } from '@/src/lib/ai/aiMessages';
import { shortDate, todayString } from '@/src/lib/tasks/dates';
import { applySort, BUDGET_CHOICES, planForBudget, splitDone } from '@/src/lib/tasks/list';
import { buildTasks, forecastLine, type Task } from '@/src/lib/tasks/rules';
import {
  checkTask,
  deleteOwnTask,
  loadForecast,
  loadTaskData,
  saveOwnTask,
  sortWithAi,
  storedSort,
  uncheckTask,
  type ForecastState,
  type TaskData,
} from '@/src/lib/tasks/tasksRepo';
import { tokens } from '@/src/theme/tokens';
import { t } from '@/src/lib/i18n';

const REPEATS: { days: number | null; label: string }[] = [
  { days: null, label: 'tasks.own.repeatOnce' },
  { days: 1, label: 'tasks.own.repeatDaily' },
  { days: 7, label: 'tasks.own.repeatWeekly' },
  { days: 14, label: 'tasks.own.repeatTwoWeeks' },
  { days: 30, label: 'tasks.own.repeatMonthly' },
];

const URGENCY_CLASS = { high: 'text-danger', medium: 'text-ink', low: 'text-ink-muted' } as const;

interface Draft {
  title: string;
  where: string;
  duration: string;
  due: string;
  repeat: number | null;
}

function TaskRow({
  task,
  done,
  doneBy,
  busy,
  onToggle,
}: {
  task: Task;
  done: TaskDoneRow | null;
  doneBy?: string;
  busy: boolean;
  onToggle: () => void;
}): React.JSX.Element {
  return (
    <View className="flex-row gap-3 py-3 border-b border-line" testID={`task-${task.key}`}>
      <Pressable
        onPress={onToggle}
        disabled={busy}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done !== null }}
        accessibilityLabel={t(done ? 'tasks.uncheck' : 'tasks.check', { title: task.title })}
        className="items-center justify-center"
        style={{ width: 44, height: 44 }}
        testID={`task-check-${task.key}`}
      >
        <View
          className={`items-center justify-center border ${done ? 'bg-primary border-primary' : 'bg-bg border-ink'}`}
          style={{ width: 26, height: 26 }}
        >
          {done ? <Text className="font-body text-base text-on-primary">✓</Text> : null}
        </View>
      </Pressable>
      <View className="flex-1">
        <Text
          className={`font-body text-base ${done ? 'text-ink-muted line-through' : 'text-ink'}`}
          testID={`task-title-${task.key}`}
        >
          {task.title}
        </Text>
        <Text className="font-body text-sm text-ink-muted" testID={`task-meta-${task.key}`}>
          {task.where} · {t('tasks.duration', { min: task.durationMin })} ·{' '}
          <Text className={`font-body text-sm ${done ? 'text-ink-muted' : URGENCY_CLASS[task.urgency]}`}>
            {t(`tasks.urgency.${task.urgency}`)}
          </Text>
        </Text>
        {done ? (
          doneBy ? <Text className="font-body text-xs text-ink-muted mt-1">{t('tasks.doneBy', { name: doneBy })}</Text> : null
        ) : (
          <Text className="font-body text-sm text-ink mt-1" testID={`task-reason-${task.key}`}>
            {task.reason}
          </Text>
        )}
      </View>
    </View>
  );
}

export function TodayTasks(): React.JSX.Element | null {
  const router = useRouter();
  const mode = useAuthStore((s) => s.mode);
  const gardenId = useAuthStore((s) => s.activeGardenId);
  const klimazone = useProfileStore((s) => s.klimazone);
  const { data: plants = [] } = usePlants();
  const version = useDataVersion('plan_elements', 'garden_tasks', 'task_done', 'task_sorts', 'photo_findings', 'gardens');

  const [today, setToday] = React.useState(() => todayString());
  const [data, setData] = React.useState<TaskData | null>(null);
  const [weather, setWeather] = React.useState<ForecastState | null>(null);
  const [budget, setBudget] = React.useState<number | null>(null);
  const [shown, setShown] = React.useState(false);
  const [busyKey, setBusyKey] = React.useState<string | null>(null);
  const [names, setNames] = React.useState<Record<string, string>>({});
  const [sorting, setSorting] = React.useState(false);
  const [sortError, setSortError] = React.useState<AiCode | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [formOpen, setFormOpen] = React.useState(false);
  const [ownOpen, setOwnOpen] = React.useState(false);
  const [draft, setDraft] = React.useState<Draft>({ title: '', where: '', duration: '15', due: today, repeat: null });
  const [formNote, setFormNote] = React.useState<{ text: string; tone: 'ok' | 'warn' } | null>(null);
  /** Lists the AI was already asked about in this session, so a failure is not retried in a loop. */
  const asked = React.useRef(new Set<string>());

  // A new day begins while the app is open.
  React.useEffect(() => {
    const timer = setInterval(() => {
      const now = todayString();
      setToday((current) => (current === now ? current : now));
    }, 60_000);
    return () => clearInterval(timer);
  }, []);

  React.useEffect(() => {
    let alive = true;
    if (mode !== 'account' || !gardenId) return;
    loadTaskData(gardenId)
      .then((loaded) => {
        if (alive) setData(loaded);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [mode, gardenId, version]);

  React.useEffect(() => {
    let alive = true;
    if (mode !== 'account' || !gardenId) return;
    void loadForecast(gardenId).then((state) => {
      if (alive) setWeather(state);
    });
    return () => {
      alive = false;
    };
  }, [mode, gardenId, today]);

  const forecast = weather && weather.status !== 'none' ? weather.forecast : null;
  const weatherLine = React.useMemo(() => forecastLine(forecast, today), [forecast, today]);

  // Everything that is due today, in the order of the base list.
  const due = React.useMemo(
    () =>
      data
        ? buildTasks({
            today,
            klimazone,
            elements: data.elements,
            plants,
            ownTasks: data.ownTasks,
            findings: data.findings,
            forecast,
          })
        : [],
    [data, today, klimazone, plants, forecast],
  );

  // The stored order belongs to the whole list of the day, so ticking something off
  // does not make it a different list.
  const sort = React.useMemo(
    () => (data ? storedSort(data.sorts, due, today, budget) : null),
    [data, due, today, budget],
  );
  const ordered = React.useMemo(() => (sort ? applySort(due, sort.items) : due), [due, sort]);
  const split = React.useMemo(() => splitDone(ordered, data?.done ?? [], today), [ordered, data, today]);
  const plan = React.useMemo(() => planForBudget(split.open, budget), [split.open, budget]);

  // With a network, the AI is asked once for this day, budget and list.
  const online = typeof navigator === 'undefined' || navigator.onLine !== false;
  React.useEffect(() => {
    if (!shown || !data || sort || sorting || due.length < 2 || !online) return;
    const id = `${today}|${budget ?? 0}|${due.map((task) => task.key).join(',')}`;
    if (asked.current.has(id)) return;
    asked.current.add(id);
    setSorting(true);
    setSortError(null);
    void sortWithAi(due, today, budget, weatherLine)
      .then((outcome) => {
        if (!outcome.ok && outcome.code !== 'too_few') setSortError(outcome.code);
      })
      .catch(() => setSortError('service_error'))
      .finally(() => setSorting(false));
    // weatherLine goes along as information; a new forecast alone is not a new list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shown, data, sort, sorting, due, today, budget, online]);

  // Names of those who ticked something off today.
  React.useEffect(() => {
    let alive = true;
    const ids = new Set(split.doneToday.map((entry) => entry.done.doneByUserId).filter(Boolean) as string[]);
    void (async () => {
      const found: Record<string, string> = {};
      for (const id of ids) found[id] = await memberName(id);
      if (alive) setNames(found);
    })();
    return () => {
      alive = false;
    };
  }, [split.doneToday]);

  if (mode !== 'account' || !gardenId) return null;

  const toggle = async (task: Task, done: TaskDoneRow | null): Promise<void> => {
    setBusyKey(task.key);
    setFailed(false);
    try {
      if (done) await uncheckTask(done);
      else await checkTask(task, today);
    } catch {
      setFailed(true);
    }
    setBusyKey(null);
  };

  const submit = async (): Promise<void> => {
    const duration = Number(draft.duration.trim());
    try {
      const saved = await saveOwnTask({
        title: draft.title,
        whereText: draft.where || null,
        durationMin: /^\d+$/.test(draft.duration.trim()) ? duration : NaN,
        intervalDays: draft.repeat,
        dueOn: draft.due,
      });
      if (!saved) {
        setFormNote({ text: t('tasks.own.invalid'), tone: 'warn' });
        return;
      }
      setDraft({ title: '', where: '', duration: '15', due: today, repeat: null });
      setFormOpen(false);
      setFormNote({ text: t('tasks.own.saved'), tone: 'ok' });
      setShown(true);
    } catch {
      setFormNote({ text: t('tasks.failed'), tone: 'warn' });
    }
  };

  const remove = async (task: GardenTaskRow): Promise<void> => {
    try {
      await deleteOwnTask(task);
      setFormNote({ text: t('tasks.own.deleted'), tone: 'ok' });
    } catch {
      setFormNote({ text: t('tasks.failed'), tone: 'warn' });
    }
  };

  const ownTasks = (data?.ownTasks ?? []).filter((task) => task.deletedAt === null);
  const shortest = split.open.reduce((min, task) => Math.min(min, task.durationMin), Infinity);
  const chip = (active: boolean): string =>
    `min-h-[44px] px-4 items-center justify-center border ${active ? 'bg-primary border-primary' : 'border-line bg-bg'}`;
  const chipText = (active: boolean): string => `font-body text-base ${active ? 'text-on-primary' : 'text-ink'}`;

  return (
    <View className="self-stretch mb-4" testID="today-tasks">
      <Text className="font-display text-2xl text-ink">{t('tasks.heading')}</Text>
      {weatherLine ? (
        <Text className="font-body text-sm text-ink-muted mt-1" testID="today-weather">
          {weatherLine}
        </Text>
      ) : weather?.status === 'none' && weather.reason === 'no_plz' ? (
        <Pressable
          onPress={() => router.push('/(app)/profile/plz' as never)}
          accessibilityRole="button"
          className="min-h-[44px] justify-center"
          testID="today-weather-noplz"
        >
          <Text className="font-body text-sm text-ink-muted">
            {t('tasks.weather.noPlz')} <Text className="underline text-ink">{t('tasks.weather.setPlz')}</Text>
          </Text>
        </Pressable>
      ) : weather ? (
        <Text className="font-body text-sm text-ink-muted mt-1" testID="today-weather-none">
          {t('tasks.weather.none')}
        </Text>
      ) : null}

      <Text className="font-body text-sm text-ink mt-4 mb-2">{t('tasks.budget.label')}</Text>
      <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
        {BUDGET_CHOICES.map((minutes) => (
          <Pressable
            key={minutes}
            onPress={() => {
              setBudget(minutes);
              setShown(true);
            }}
            accessibilityRole="radio"
            accessibilityState={{ selected: budget === minutes }}
            className={chip(budget === minutes)}
            testID={`today-budget-${minutes}`}
          >
            <Text className={chipText(budget === minutes)}>{t('tasks.budget.minutes', { n: minutes })}</Text>
          </Pressable>
        ))}
        <Pressable
          onPress={() => {
            setBudget(null);
            setShown(true);
          }}
          accessibilityRole="radio"
          accessibilityState={{ selected: shown && budget === null }}
          className={chip(shown && budget === null)}
          testID="today-budget-none"
        >
          <Text className={chipText(shown && budget === null)}>{t('tasks.budget.none')}</Text>
        </Pressable>
      </View>

      {!shown ? (
        <Pressable
          onPress={() => setShown(true)}
          accessibilityRole="button"
          className="mt-3 min-h-[48px] px-4 items-center justify-center bg-primary"
          testID="today-show"
        >
          <Text className="font-body text-base text-on-primary">{t('tasks.show')}</Text>
        </Pressable>
      ) : null}

      {shown && !data ? (
        <View className="mt-4 items-start">
          <ActivityIndicator color={tokens.color.primary} />
        </View>
      ) : null}

      {shown && data ? (
        <View className="mt-4" testID="today-list">
          <View className="flex-row flex-wrap items-center gap-2">
            <Text
              className="font-body text-xs text-ink px-2 py-[2px] border border-line bg-surface-2"
              testID={sort ? 'today-ai-sorted' : 'today-ai-base'}
            >
              {sort ? t('tasks.ai.sorted') : t('tasks.ai.base')}
            </Text>
            {sorting ? (
              <Text className="font-body text-xs text-ink-muted" testID="today-ai-running">
                {t('tasks.ai.running')}
              </Text>
            ) : null}
            {!sort && !sorting && !online ? (
              <Text className="font-body text-xs text-ink-muted" testID="today-ai-offline">
                {t('tasks.ai.offline')}
              </Text>
            ) : null}
          </View>
          {!sort && !sorting && sortError ? (
            <Text className="font-body text-xs text-ink-muted mt-1" testID={`today-ai-error-${sortError}`}>
              {aiMessage(sortError)}
            </Text>
          ) : null}

          {split.open.length === 0 ? (
            <Text className="font-body text-base text-ink mt-3" testID="today-empty">
              {split.doneToday.length > 0 ? t('tasks.allDone') : t('tasks.empty')}
            </Text>
          ) : null}

          {budget !== null && split.open.length > 0 ? (
            <Text className="font-body text-sm text-ink mt-3" testID="today-sum">
              {plan.fits.length === 0
                ? t('tasks.budget.nothingFits', { min: budget, shortest })
                : plan.fits.length === 1
                  ? t('tasks.budget.sumOne', { min: plan.totalMin })
                  : t('tasks.budget.sumMany', { n: plan.fits.length, min: plan.totalMin })}
            </Text>
          ) : null}

          <View testID="today-fits">
            {plan.fits.map((task) => (
              <TaskRow key={task.key} task={task} done={null} busy={busyKey === task.key} onToggle={() => void toggle(task, null)} />
            ))}
          </View>

          {plan.rest.length > 0 ? (
            <View className="mt-4" testID="today-rest">
              <Text className="font-display text-lg text-ink">{t('tasks.rest')}</Text>
              {plan.rest.map((task) => (
                <TaskRow key={task.key} task={task} done={null} busy={busyKey === task.key} onToggle={() => void toggle(task, null)} />
              ))}
            </View>
          ) : null}

          {split.doneToday.length > 0 ? (
            <View className="mt-4" testID="today-done">
              <Text className="font-display text-lg text-ink">{t('tasks.doneToday')}</Text>
              {split.doneToday.map(({ task, done }) => (
                <TaskRow
                  key={task.key}
                  task={task}
                  done={done}
                  doneBy={done.doneByUserId ? names[done.doneByUserId] : undefined}
                  busy={busyKey === task.key}
                  onToggle={() => void toggle(task, done)}
                />
              ))}
            </View>
          ) : null}

          {failed ? (
            <Text className="font-body text-sm text-danger mt-2" testID="today-failed">
              {t('tasks.failed')}
            </Text>
          ) : null}
        </View>
      ) : null}

      {formNote ? (
        <Text
          className={`font-body text-sm mt-3 ${formNote.tone === 'ok' ? 'text-ink' : 'text-danger'}`}
          testID="today-own-note"
          accessibilityLiveRegion="polite"
        >
          {formNote.text}
        </Text>
      ) : null}

      {formOpen ? (
        <View className="mt-4 p-3 border border-line bg-surface" testID="today-own-form">
          <Text className="font-display text-lg text-ink">{t('tasks.own.heading')}</Text>
          <Text className="font-body text-xs text-ink-muted mt-2 mb-1">{t('tasks.own.title')}</Text>
          <TextInput
            value={draft.title}
            onChangeText={(text) => setDraft({ ...draft, title: text })}
            accessibilityLabel={t('tasks.own.title')}
            maxLength={120}
            className="min-h-[44px] px-3 py-2 border border-line bg-bg font-body text-base text-ink"
            testID="today-own-title"
          />
          <Text className="font-body text-xs text-ink-muted mt-2 mb-1">{t('tasks.own.where')}</Text>
          <TextInput
            value={draft.where}
            onChangeText={(text) => setDraft({ ...draft, where: text })}
            accessibilityLabel={t('tasks.own.where')}
            maxLength={120}
            className="min-h-[44px] px-3 py-2 border border-line bg-bg font-body text-base text-ink"
            testID="today-own-where"
          />
          <View className="flex-row flex-wrap gap-3">
            <View>
              <Text className="font-body text-xs text-ink-muted mt-2 mb-1">{t('tasks.own.duration')}</Text>
              <TextInput
                value={draft.duration}
                onChangeText={(text) => setDraft({ ...draft, duration: text })}
                inputMode="numeric"
                accessibilityLabel={t('tasks.own.duration')}
                className="min-h-[44px] w-28 px-3 py-2 border border-line bg-bg font-body text-base text-ink"
                testID="today-own-duration"
              />
            </View>
            <View>
              <Text className="font-body text-xs text-ink-muted mt-2 mb-1">{t('tasks.own.due')}</Text>
              <input
                type="date"
                value={draft.due}
                aria-label={t('tasks.own.due')}
                data-testid="today-own-due"
                onChange={(e) => setDraft({ ...draft, due: e.currentTarget.value })}
                style={{
                  minHeight: 44,
                  padding: '6px 10px',
                  border: `1px solid ${tokens.color.line}`,
                  background: tokens.color.bg,
                  color: tokens.color.ink,
                  fontFamily: tokens.font.body,
                  fontSize: 16,
                  boxSizing: 'border-box',
                }}
              />
            </View>
          </View>
          <Text className="font-body text-xs text-ink-muted mt-2 mb-1">{t('tasks.own.repeat')}</Text>
          <View className="flex-row flex-wrap gap-2" accessibilityRole="radiogroup">
            {REPEATS.map((option) => (
              <Pressable
                key={String(option.days)}
                onPress={() => setDraft({ ...draft, repeat: option.days })}
                accessibilityRole="radio"
                accessibilityState={{ selected: draft.repeat === option.days }}
                className={chip(draft.repeat === option.days)}
                testID={`today-own-repeat-${option.days ?? 'once'}`}
              >
                <Text className={chipText(draft.repeat === option.days)}>{t(option.label)}</Text>
              </Pressable>
            ))}
          </View>
          <View className="flex-row flex-wrap gap-2 mt-4">
            <Pressable
              onPress={() => void submit()}
              accessibilityRole="button"
              className="min-h-[44px] px-4 items-center justify-center bg-primary"
              testID="today-own-save"
            >
              <Text className="font-body text-base text-on-primary">{t('tasks.own.save')}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setFormOpen(false);
                setFormNote(null);
              }}
              accessibilityRole="button"
              className="min-h-[44px] px-4 items-center justify-center border border-line"
              testID="today-own-cancel"
            >
              <Text className="font-body text-base text-ink">{t('tasks.own.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <View className="flex-row flex-wrap gap-2 mt-3">
          <Pressable
            onPress={() => {
              setFormOpen(true);
              setFormNote(null);
              setDraft((current) => ({ ...current, due: today }));
            }}
            accessibilityRole="button"
            className="min-h-[44px] px-4 items-center justify-center border border-line"
            testID="today-own-add"
          >
            <Text className="font-body text-base text-ink">{t('tasks.own.add')}</Text>
          </Pressable>
          {ownTasks.length > 0 ? (
            <Pressable
              onPress={() => setOwnOpen((open) => !open)}
              accessibilityRole="button"
              accessibilityState={{ expanded: ownOpen }}
              className="min-h-[44px] px-4 items-center justify-center border border-line"
              testID="today-own-toggle"
            >
              <Text className="font-body text-base text-ink">
                {t('tasks.own.listHeading')} ({ownTasks.length})
              </Text>
            </Pressable>
          ) : null}
        </View>
      )}

      {ownOpen && ownTasks.length > 0 ? (
        <View className="mt-2" testID="today-own-list">
          {ownTasks.map((task) => (
            <View key={task.id} className="flex-row items-center gap-3 py-2 border-b border-line" testID={`own-task-${task.id}`}>
              <View className="flex-1">
                <Text className="font-body text-base text-ink">{task.title}</Text>
                <Text className="font-body text-xs text-ink-muted">
                  {task.intervalDays !== null
                    ? t('tasks.own.summaryRepeat', { n: task.intervalDays, min: task.durationMin })
                    : t('tasks.own.summaryOnce', { day: shortDate(task.dueOn), min: task.durationMin })}
                </Text>
              </View>
              <Pressable
                onPress={() => void remove(task)}
                accessibilityRole="button"
                accessibilityLabel={t('tasks.own.deleteLabel', { title: task.title })}
                className="min-h-[44px] px-3 items-center justify-center border border-line"
                testID={`own-task-delete-${task.id}`}
              >
                <Text className="font-body text-sm text-ink">{t('tasks.own.delete')}</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}
