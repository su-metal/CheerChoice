import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ExerciseObligation,
  ExerciseRecord,
  ExerciseSessionEvent,
  RecoveryLedgerEntry,
} from '../types';
import { APP_ID } from '../constants/app';
import { ensureSupabaseAnonymousAuth, getCurrentSupabaseUserId } from './authService';
import { getSupabaseClient } from './supabaseClient';

const OBLIGATIONS_KEY = '@CheerChoice:exerciseObligations';
const SESSION_EVENTS_KEY = '@CheerChoice:exerciseSessionEvents';
const RECOVERY_LEDGER_KEY = '@CheerChoice:recoveryLedger';
const MAX_RECORDS = 500;

function generateId(): string {
  const pattern = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx';
  return pattern.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function getLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekStartLocalDateKey(date: Date): string {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  return getLocalDateKey(start);
}

function getLocalDayEndIso(date: Date): string {
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);
  return dayEnd.toISOString();
}

function getTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

async function readArray<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as T[];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error(`Error reading ${key}:`, error);
    return [];
  }
}

async function writeArray<T>(key: string, items: T[]): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(items.slice(0, MAX_RECORDS)));
}

async function getSupabaseContext(): Promise<{ userId: string; supabase: NonNullable<ReturnType<typeof getSupabaseClient>> } | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }
  const userId = (await getCurrentSupabaseUserId()) ?? (await ensureSupabaseAnonymousAuth());
  if (!userId) {
    return null;
  }
  return { userId, supabase };
}

async function syncObligationsToSupabase(obligations: ExerciseObligation[]): Promise<void> {
  const context = await getSupabaseContext();
  if (!context || obligations.length === 0) {
    return;
  }

  await Promise.all(
    obligations.map(async (item) => {
      const payload = {
        id: item.id,
        app_id: APP_ID,
        user_id: context.userId,
        meal_record_id: item.mealRecordId,
        created_at: item.createdAt,
        due_at: item.dueAt,
        due_local_date: item.dueLocalDate,
        week_start_local: item.weekStartLocal,
        timezone: item.timezone,
        exercise_type: item.exerciseType,
        target_count: item.targetCount,
        completed_count: item.completedCount,
        status: item.status,
        finalized_at: item.finalizedAt ?? null,
      };

      const { error } = await context.supabase
        .from('cc_exercise_obligations')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error(`Error syncing obligation ${item.id}:`, error.message);
      }
    })
  );
}

async function syncLedgerToSupabase(entries: RecoveryLedgerEntry[]): Promise<void> {
  const context = await getSupabaseContext();
  if (!context || entries.length === 0) {
    return;
  }

  await Promise.all(
    entries.map(async (entry) => {
      const payload = {
        id: entry.id,
        app_id: APP_ID,
        user_id: context.userId,
        obligation_id: entry.obligationId,
        week_start_local: entry.weekStartLocal,
        generated_at: entry.generatedAt,
        initial_unmet_count: entry.initialUnmetCount,
        recovered_count: entry.recoveredCount,
        remaining_count: entry.remainingCount,
        status: entry.status,
        reset_at: entry.resetAt ?? null,
      };

      const { error } = await context.supabase
        .from('cc_recovery_ledger')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error(`Error syncing recovery entry ${entry.id}:`, error.message);
      }
    })
  );
}

async function syncSessionEventsToSupabase(events: ExerciseSessionEvent[]): Promise<void> {
  const context = await getSupabaseContext();
  if (!context || events.length === 0) {
    return;
  }

  await Promise.all(
    events.map(async (event) => {
      const payload = {
        id: event.id,
        app_id: APP_ID,
        user_id: context.userId,
        obligation_id: event.obligationId,
        timestamp: event.timestamp,
        event_type: event.eventType,
        count_snapshot: event.countSnapshot,
      };

      const { error } = await context.supabase
        .from('cc_exercise_session_events')
        .upsert(payload, { onConflict: 'id' });

      if (error) {
        console.error(`Error syncing session event ${event.id}:`, error.message);
      }
    })
  );
}

async function readObligations(): Promise<ExerciseObligation[]> {
  const context = await getSupabaseContext();
  if (!context) {
    return readArray<ExerciseObligation>(OBLIGATIONS_KEY);
  }

  const { data, error } = await context.supabase
    .from('cc_exercise_obligations')
    .select(
      [
        'id',
        'meal_record_id',
        'created_at',
        'due_at',
        'due_local_date',
        'week_start_local',
        'timezone',
        'exercise_type',
        'target_count',
        'completed_count',
        'status',
        'finalized_at',
      ].join(', ')
    )
    .eq('app_id', APP_ID)
    .eq('user_id', context.userId)
    .order('created_at', { ascending: false })
    .limit(MAX_RECORDS);

  if (error) {
    console.error('Error reading obligations from Supabase:', error.message);
    return readArray<ExerciseObligation>(OBLIGATIONS_KEY);
  }

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
  const mapped = rows.map((row) => ({
    id: String(row.id),
    mealRecordId: String(row.meal_record_id),
    createdAt: String(row.created_at),
    dueAt: String(row.due_at),
    dueLocalDate: String(row.due_local_date),
    weekStartLocal: String(row.week_start_local),
    timezone: String(row.timezone),
    exerciseType: row.exercise_type as ExerciseRecord['exerciseType'],
    targetCount: Number(row.target_count) || 0,
    completedCount: Number(row.completed_count) || 0,
    status: row.status as ExerciseObligation['status'],
    finalizedAt: row.finalized_at ? String(row.finalized_at) : undefined,
  }));

  await writeArray(OBLIGATIONS_KEY, mapped);
  return mapped;
}

async function readSessionEvents(): Promise<ExerciseSessionEvent[]> {
  const context = await getSupabaseContext();
  if (!context) {
    return readArray<ExerciseSessionEvent>(SESSION_EVENTS_KEY);
  }

  const { data, error } = await context.supabase
    .from('cc_exercise_session_events')
    .select('id, obligation_id, timestamp, event_type, count_snapshot')
    .eq('app_id', APP_ID)
    .eq('user_id', context.userId)
    .order('timestamp', { ascending: false })
    .limit(MAX_RECORDS);

  if (error) {
    console.error('Error reading session events from Supabase:', error.message);
    return readArray<ExerciseSessionEvent>(SESSION_EVENTS_KEY);
  }

  const mapped = (data || []).map((row) => ({
    id: row.id as string,
    obligationId: row.obligation_id as string,
    timestamp: row.timestamp as string,
    eventType: row.event_type as ExerciseSessionEvent['eventType'],
    countSnapshot: Number(row.count_snapshot) || 0,
  }));

  await writeArray(SESSION_EVENTS_KEY, mapped);
  return mapped;
}

async function readRecoveryLedger(): Promise<RecoveryLedgerEntry[]> {
  const context = await getSupabaseContext();
  if (!context) {
    return readArray<RecoveryLedgerEntry>(RECOVERY_LEDGER_KEY);
  }

  const { data, error } = await context.supabase
    .from('cc_recovery_ledger')
    .select(
      [
        'id',
        'obligation_id',
        'week_start_local',
        'generated_at',
        'initial_unmet_count',
        'recovered_count',
        'remaining_count',
        'status',
        'reset_at',
      ].join(', ')
    )
    .eq('app_id', APP_ID)
    .eq('user_id', context.userId)
    .order('generated_at', { ascending: false })
    .limit(MAX_RECORDS);

  if (error) {
    console.error('Error reading recovery ledger from Supabase:', error.message);
    return readArray<RecoveryLedgerEntry>(RECOVERY_LEDGER_KEY);
  }

  const rows = (data ?? []) as unknown as Array<Record<string, unknown>>;
  const mapped = rows.map((row) => ({
    id: String(row.id),
    obligationId: String(row.obligation_id),
    weekStartLocal: String(row.week_start_local),
    generatedAt: String(row.generated_at),
    initialUnmetCount: Number(row.initial_unmet_count) || 0,
    recoveredCount: Number(row.recovered_count) || 0,
    remainingCount: Number(row.remaining_count) || 0,
    status: row.status as RecoveryLedgerEntry['status'],
    resetAt: row.reset_at ? String(row.reset_at) : undefined,
  }));

  await writeArray(RECOVERY_LEDGER_KEY, mapped);
  return mapped;
}

async function persistObligations(obligations: ExerciseObligation[]): Promise<void> {
  await writeArray(OBLIGATIONS_KEY, obligations);
  await syncObligationsToSupabase(obligations);
}

async function persistSessionEvents(events: ExerciseSessionEvent[]): Promise<void> {
  await writeArray(SESSION_EVENTS_KEY, events);
  await syncSessionEventsToSupabase(events);
}

async function persistRecoveryLedger(entries: RecoveryLedgerEntry[]): Promise<void> {
  await writeArray(RECOVERY_LEDGER_KEY, entries);
  await syncLedgerToSupabase(entries);
}

function sortByGeneratedAtDesc<T extends { generatedAt: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
  );
}

export async function runRecoveryMaintenance(nowDate: Date = new Date()): Promise<void> {
  const now = nowDate.toISOString();
  const currentWeekStart = getWeekStartLocalDateKey(nowDate);
  const [obligations, ledger] = await Promise.all([
    readObligations(),
    readRecoveryLedger(),
  ]);

  let hasObligationChanges = false;
  let hasLedgerChanges = false;
  const nextLedger = [...ledger];

  obligations.forEach((obligation) => {
    if (obligation.status !== 'open') {
      return;
    }
    if (new Date(obligation.dueAt).getTime() > new Date(now).getTime()) {
      return;
    }

    hasObligationChanges = true;
    if (obligation.completedCount >= obligation.targetCount) {
      obligation.status = 'completed';
      obligation.finalizedAt = now;
      return;
    }

    obligation.status = 'unmet';
    obligation.finalizedAt = now;
    const remainingCount = Math.max(0, obligation.targetCount - obligation.completedCount);
    if (remainingCount <= 0) {
      return;
    }

    const existing = nextLedger.find(
      (entry) => entry.obligationId === obligation.id && entry.status !== 'reset'
    );
    if (existing) {
      return;
    }

    hasLedgerChanges = true;
    nextLedger.push({
      id: generateId(),
      obligationId: obligation.id,
      weekStartLocal: obligation.weekStartLocal,
      generatedAt: now,
      initialUnmetCount: remainingCount,
      recoveredCount: 0,
      remainingCount,
      status: 'open',
    });
  });

  nextLedger.forEach((entry) => {
    if (entry.status !== 'open') {
      return;
    }
    if (entry.weekStartLocal >= currentWeekStart) {
      return;
    }
    hasLedgerChanges = true;
    entry.status = 'reset';
    entry.resetAt = now;
    entry.remainingCount = 0;
  });

  if (hasObligationChanges) {
    await persistObligations(obligations);
  }
  if (hasLedgerChanges) {
    await persistRecoveryLedger(sortByGeneratedAtDesc(nextLedger));
  }
}

export async function createExerciseObligation(input: {
  mealRecordId: string;
  exerciseType: ExerciseRecord['exerciseType'];
  targetCount: number;
}): Promise<ExerciseObligation> {
  await runRecoveryMaintenance();
  const obligations = await readObligations();
  const now = new Date();
  const saved: ExerciseObligation = {
    id: generateId(),
    mealRecordId: input.mealRecordId,
    createdAt: now.toISOString(),
    dueAt: getLocalDayEndIso(now),
    dueLocalDate: getLocalDateKey(now),
    weekStartLocal: getWeekStartLocalDateKey(now),
    timezone: getTimezone(),
    exerciseType: input.exerciseType,
    targetCount: Math.max(1, input.targetCount),
    completedCount: 0,
    status: 'open',
  };
  await persistObligations([saved, ...obligations]);
  return saved;
}

export async function updateExerciseObligationTarget(
  obligationId: string,
  next: { exerciseType: ExerciseRecord['exerciseType']; targetCount: number }
): Promise<void> {
  await runRecoveryMaintenance();
  const obligations = await readObligations();
  let changed = false;
  obligations.forEach((obligation) => {
    if (obligation.id !== obligationId || obligation.status !== 'open') {
      return;
    }
    obligation.exerciseType = next.exerciseType;
    obligation.targetCount = Math.max(1, next.targetCount);
    changed = true;
  });
  if (changed) {
    await persistObligations(obligations);
  }
}

export async function saveExerciseSessionEvent(
  obligationId: string,
  eventType: ExerciseSessionEvent['eventType'],
  countSnapshot: number
): Promise<void> {
  await runRecoveryMaintenance();
  const events = await readSessionEvents();
  const nextEvent: ExerciseSessionEvent = {
    id: generateId(),
    obligationId,
    timestamp: new Date().toISOString(),
    eventType,
    countSnapshot: Math.max(0, countSnapshot),
  };
  await persistSessionEvents([nextEvent, ...events]);
}

export type SessionRestoreState = {
  hasEvents: boolean;
  isPaused: boolean;
  countSnapshot: number;
  lastEventType?: ExerciseSessionEvent['eventType'];
};

export async function getSessionRestoreState(
  obligationId: string
): Promise<SessionRestoreState> {
  await runRecoveryMaintenance();
  const events = await readSessionEvents();
  const filtered = events
    .filter((event) => event.obligationId === obligationId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (filtered.length === 0) {
    return {
      hasEvents: false,
      isPaused: false,
      countSnapshot: 0,
    };
  }

  const latest = filtered[0];
  return {
    hasEvents: true,
    isPaused: latest.eventType === 'pause',
    countSnapshot: Math.max(0, latest.countSnapshot),
    lastEventType: latest.eventType,
  };
}

export async function addObligationProgress(
  obligationId: string,
  count: number
): Promise<number> {
  await runRecoveryMaintenance();
  const obligations = await readObligations();
  const obligation = obligations.find((item) => item.id === obligationId);
  if (!obligation || obligation.status !== 'open' || count <= 0) {
    return Math.max(0, count);
  }

  const remainingBefore = Math.max(0, obligation.targetCount - obligation.completedCount);
  const consumed = Math.min(count, remainingBefore);
  obligation.completedCount += consumed;
  if (obligation.completedCount >= obligation.targetCount) {
    obligation.status = 'completed';
    obligation.finalizedAt = new Date().toISOString();
  }
  await persistObligations(obligations);
  return Math.max(0, count - consumed);
}

export async function applyRecoveryFromExercise(totalCount: number): Promise<void> {
  await runRecoveryMaintenance();
  if (totalCount <= 0) {
    return;
  }

  const now = new Date();
  const currentWeekStart = getWeekStartLocalDateKey(now);
  const ledger = await readRecoveryLedger();
  const ordered = [...ledger].sort(
    (a, b) => new Date(a.generatedAt).getTime() - new Date(b.generatedAt).getTime()
  );

  let remaining = totalCount;
  let changed = false;
  for (const entry of ordered) {
    if (remaining <= 0) {
      break;
    }
    if (entry.status !== 'open' || entry.weekStartLocal !== currentWeekStart) {
      continue;
    }
    const consumed = Math.min(remaining, entry.remainingCount);
    if (consumed <= 0) {
      continue;
    }
    remaining -= consumed;
    entry.recoveredCount += consumed;
    entry.remainingCount -= consumed;
    changed = true;
    if (entry.remainingCount <= 0) {
      entry.remainingCount = 0;
      entry.status = 'closed';
    }
  }

  if (changed) {
    await persistRecoveryLedger(sortByGeneratedAtDesc(ordered));
  }
}

export type WeeklyRecoveryStatus = {
  weekStartLocal: string;
  remainingCount: number;
  generatedCount: number;
  resolvedCount: number;
};

export async function getWeeklyRecoveryStatus(nowDate: Date = new Date()): Promise<WeeklyRecoveryStatus> {
  await runRecoveryMaintenance(nowDate);
  const currentWeekStart = getWeekStartLocalDateKey(nowDate);
  const ledger = await readRecoveryLedger();
  const currentWeek = ledger.filter((entry) => entry.weekStartLocal === currentWeekStart);

  return {
    weekStartLocal: currentWeekStart,
    remainingCount: currentWeek.reduce((sum, entry) => sum + entry.remainingCount, 0),
    generatedCount: currentWeek.reduce((sum, entry) => sum + entry.initialUnmetCount, 0),
    resolvedCount: currentWeek.reduce((sum, entry) => sum + entry.recoveredCount, 0),
  };
}

export type TodayObligationStatus = {
  dateKey: string;
  openObligationCount: number;
  remainingCount: number;
};

export async function getTodayObligationStatus(nowDate: Date = new Date()): Promise<TodayObligationStatus> {
  await runRecoveryMaintenance(nowDate);
  const todayKey = getLocalDateKey(nowDate);
  const obligations = await readObligations();
  const todayOpen = obligations.filter(
    (obligation) => obligation.dueLocalDate === todayKey && obligation.status === 'open'
  );

  return {
    dateKey: todayKey,
    openObligationCount: todayOpen.length,
    remainingCount: todayOpen.reduce(
      (sum, obligation) => sum + Math.max(0, obligation.targetCount - obligation.completedCount),
      0
    ),
  };
}

export type TodayOpenObligation = ExerciseObligation & {
  remainingCount: number;
};

export async function getTodayOpenObligations(
  nowDate: Date = new Date()
): Promise<TodayOpenObligation[]> {
  await runRecoveryMaintenance(nowDate);
  const todayKey = getLocalDateKey(nowDate);
  const obligations = await readObligations();

  return obligations
    .filter((obligation) => obligation.dueLocalDate === todayKey && obligation.status === 'open')
    .map((obligation) => ({
      ...obligation,
      remainingCount: Math.max(0, obligation.targetCount - obligation.completedCount),
    }))
    .filter((obligation) => obligation.remainingCount > 0)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}
