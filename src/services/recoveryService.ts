import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ExerciseObligation,
  ExerciseRecord,
  ExerciseSessionEvent,
  RecoveryLedgerEntry,
} from '../types';

const OBLIGATIONS_KEY = '@CheerChoice:exerciseObligations';
const SESSION_EVENTS_KEY = '@CheerChoice:exerciseSessionEvents';
const RECOVERY_LEDGER_KEY = '@CheerChoice:recoveryLedger';
const MAX_RECORDS = 500;

function generateId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
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

function sortByGeneratedAtDesc<T extends { generatedAt: string }>(items: T[]): T[] {
  return [...items].sort(
    (a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
  );
}

export async function runRecoveryMaintenance(nowDate: Date = new Date()): Promise<void> {
  const now = nowDate.toISOString();
  const currentWeekStart = getWeekStartLocalDateKey(nowDate);
  const [obligations, ledger] = await Promise.all([
    readArray<ExerciseObligation>(OBLIGATIONS_KEY),
    readArray<RecoveryLedgerEntry>(RECOVERY_LEDGER_KEY),
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
    await writeArray(OBLIGATIONS_KEY, obligations);
  }
  if (hasLedgerChanges) {
    await writeArray(RECOVERY_LEDGER_KEY, sortByGeneratedAtDesc(nextLedger));
  }
}

export async function createExerciseObligation(input: {
  mealRecordId: string;
  exerciseType: ExerciseRecord['exerciseType'];
  targetCount: number;
}): Promise<ExerciseObligation> {
  await runRecoveryMaintenance();
  const obligations = await readArray<ExerciseObligation>(OBLIGATIONS_KEY);
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
  await writeArray(OBLIGATIONS_KEY, [saved, ...obligations]);
  return saved;
}

export async function updateExerciseObligationTarget(
  obligationId: string,
  next: { exerciseType: ExerciseRecord['exerciseType']; targetCount: number }
): Promise<void> {
  await runRecoveryMaintenance();
  const obligations = await readArray<ExerciseObligation>(OBLIGATIONS_KEY);
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
    await writeArray(OBLIGATIONS_KEY, obligations);
  }
}

export async function saveExerciseSessionEvent(
  obligationId: string,
  eventType: ExerciseSessionEvent['eventType'],
  countSnapshot: number
): Promise<void> {
  await runRecoveryMaintenance();
  const events = await readArray<ExerciseSessionEvent>(SESSION_EVENTS_KEY);
  const nextEvent: ExerciseSessionEvent = {
    id: generateId(),
    obligationId,
    timestamp: new Date().toISOString(),
    eventType,
    countSnapshot: Math.max(0, countSnapshot),
  };
  await writeArray(SESSION_EVENTS_KEY, [nextEvent, ...events]);
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
  const events = await readArray<ExerciseSessionEvent>(SESSION_EVENTS_KEY);
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
  const obligations = await readArray<ExerciseObligation>(OBLIGATIONS_KEY);
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
  await writeArray(OBLIGATIONS_KEY, obligations);
  return Math.max(0, count - consumed);
}

export async function applyRecoveryFromExercise(totalCount: number): Promise<void> {
  await runRecoveryMaintenance();
  if (totalCount <= 0) {
    return;
  }

  const now = new Date();
  const currentWeekStart = getWeekStartLocalDateKey(now);
  const ledger = await readArray<RecoveryLedgerEntry>(RECOVERY_LEDGER_KEY);
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
    await writeArray(RECOVERY_LEDGER_KEY, sortByGeneratedAtDesc(ordered));
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
  const ledger = await readArray<RecoveryLedgerEntry>(RECOVERY_LEDGER_KEY);
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
  const obligations = await readArray<ExerciseObligation>(OBLIGATIONS_KEY);
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
  const obligations = await readArray<ExerciseObligation>(OBLIGATIONS_KEY);

  return obligations
    .filter((obligation) => obligation.dueLocalDate === todayKey && obligation.status === 'open')
    .map((obligation) => ({
      ...obligation,
      remainingCount: Math.max(0, obligation.targetCount - obligation.completedCount),
    }))
    .filter((obligation) => obligation.remainingCount > 0)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}
