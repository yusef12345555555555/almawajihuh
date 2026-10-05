// حفظ الماتش الجاري محلياً — عشان لو الصفحة اتقفلت أو النت فصل نرجّع نفس الصناديق ونفس اللاعبين.
import { PlayerSnapshot } from '../types';
import { DndAction, DndMode, DndSide } from '../types/dealOrNoDealTypes';

const KEY = 'dnd_active_match_v3';

export interface DndSavedMatch {
  v: 3;
  mode: DndMode;
  matchId: string | null; // PVP فقط
  seed: number;
  mySide: DndSide;
  opponent: PlayerSnapshot;
  /** وضع الحكم: اللاعبين الاتنين (A و B) */
  players?: [PlayerSnapshot, PlayerSnapshot];
  actions: DndAction[];
  turnSeconds?: number | null;
  kickoff: boolean; // اللاعب ضغط "مين هيكسب؟"
  savedAt: number;
}

export function saveDndMatch(m: DndSavedMatch): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...m, savedAt: Date.now() }));
  } catch {
    /* ignore */
  }
}

export function loadDndMatch(): DndSavedMatch | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const m = JSON.parse(raw) as DndSavedMatch;
    if (m.v !== 3 || Date.now() - m.savedAt > 1000 * 60 * 60 * 6) return null;
    return m;
  } catch {
    return null;
  }
}

export function clearDndMatch(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
