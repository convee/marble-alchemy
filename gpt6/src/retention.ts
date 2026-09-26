const STORAGE_KEY = 'marble-alchemy:retention:v1';

interface RetentionState {
  streak: number;
  lastCompleted: string;
  lastChallenge?: string;
}

export interface DailyProgress {
  streak: number;
  completedToday: boolean;
}

function dayKey(now = new Date()) {
  return now.toISOString().slice(0, 10);
}

function previousDay(key: string) {
  const date = new Date(`${key}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() - 1);
  return dayKey(date);
}

function read(): RetentionState | undefined {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as RetentionState | null;
    if (!value || typeof value.lastCompleted !== 'string') return undefined;
    return value;
  } catch {
    return undefined;
  }
}

export function dailyProgress(now = new Date()): DailyProgress {
  const today = dayKey(now);
  const state = read();
  if (!state) return { streak: 0, completedToday: false };
  if (state.lastCompleted === today) return { streak: state.streak, completedToday: true };
  if (state.lastCompleted === previousDay(today))
    return { streak: state.streak, completedToday: false };
  return { streak: 0, completedToday: false };
}

export function completeDailyChallenge(challengeId: string, now = new Date()): DailyProgress {
  const today = dayKey(now);
  const current = dailyProgress(now);
  const next: RetentionState = {
    streak: current.completedToday ? current.streak : current.streak + 1,
    lastCompleted: today,
    lastChallenge: challengeId,
  };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // A blocked storage provider should never stop the game.
  }
  return { streak: next.streak, completedToday: true };
}
