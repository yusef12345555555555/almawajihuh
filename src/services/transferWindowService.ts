// ============================================================
// أنت المدرب | نظام نوافذ الانتقالات (صيفي/شتوي فقط - 14 يوم لكل نافذة)
//
// The transfer market must NOT be permanently open. Exactly two
// windows per job/season:
//   - Summer window: opens the moment the job starts, stays open
//     for 14 real days, then closes automatically.
//   - Winter window: opens automatically the first time the season
//     crosses its halfway point (by matchday), stays open for 14
//     real days, then closes automatically.
// Both are anchored to real persisted timestamps (not just React
// state), so the countdown survives refresh/restart.
// ============================================================

import { CoachSeasonState } from '../types/coachGameTypes';

const WINDOW_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

interface TransferWindowRecord {
  jobId: string;
  summerOpenedAt: string; // ISO
  winterOpenedAt: string | null; // ISO, set once season crosses halfway
}

const STORAGE_KEY = 'coach_transfer_windows_v1';

type WindowState = 'CLOSED' | 'SUMMER_OPEN' | 'WINTER_OPEN';

export interface TransferWindowStatus {
  state: WindowState;
  labelAr: string;
  isOpen: boolean;
  daysRemaining: number;
  closesAt: string | null;
}

function readAll(): Record<string, TransferWindowRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(data: Record<string, TransferWindowRecord>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

/** Ensures a transfer-window record exists for this job, opening the summer window on first call. */
function ensureRecord(jobId: string): TransferWindowRecord {
  const all = readAll();
  if (all[jobId]) return all[jobId];
  const record: TransferWindowRecord = {
    jobId,
    summerOpenedAt: new Date().toISOString(),
    winterOpenedAt: null
  };
  all[jobId] = record;
  writeAll(all);
  return record;
}

/** Call every time the dashboard renders with an active career — detects the season's halfway point to auto-open the winter window exactly once. */
export function getTransferWindowStatus(jobId: string, career: CoachSeasonState): TransferWindowStatus {
  const record = ensureRecord(jobId);
  const now = Date.now();

  const summerOpenedAt = new Date(record.summerOpenedAt).getTime();
  const summerClosesAt = summerOpenedAt + WINDOW_DAYS * DAY_MS;
  const summerOpen = now < summerClosesAt;

  if (summerOpen) {
    return {
      state: 'SUMMER_OPEN',
      labelAr: 'سوق الانتقالات الصيفي',
      isOpen: true,
      daysRemaining: Math.max(0, Math.ceil((summerClosesAt - now) / DAY_MS)),
      closesAt: new Date(summerClosesAt).toISOString()
    };
  }

  // Auto-open winter window once the season crosses its halfway point.
  const halfway = Math.ceil((career.totalMatchdays || 1) / 2);
  const crossedHalfway = career.currentMatchday >= halfway;

  let winterOpenedAt = record.winterOpenedAt;
  if (crossedHalfway && !winterOpenedAt) {
    winterOpenedAt = new Date().toISOString();
    const all = readAll();
    all[jobId] = { ...record, winterOpenedAt };
    writeAll(all);
  }

  if (winterOpenedAt) {
    const openedAt = new Date(winterOpenedAt).getTime();
    const closesAt = openedAt + WINDOW_DAYS * DAY_MS;
    if (now < closesAt) {
      return {
        state: 'WINTER_OPEN',
        labelAr: 'سوق الانتقالات الشتوي',
        isOpen: true,
        daysRemaining: Math.max(0, Math.ceil((closesAt - now) / DAY_MS)),
        closesAt: new Date(closesAt).toISOString()
      };
    }
  }

  return {
    state: 'CLOSED',
    labelAr: 'سوق الانتقالات مغلق دلوقتي',
    isOpen: false,
    daysRemaining: 0,
    closesAt: null
  };
}

/** Clears the window record for a job (call on resignation so a brand-new job gets a fresh summer window). */
export function clearTransferWindow(jobId: string) {
  const all = readAll();
  delete all[jobId];
  writeAll(all);
}
