// ============================================================
// العبها صح | EL3BHA SA7 — Coach Repository
// Coaches come ONLY from the admin panel (Supabase `coaches` table).
// (The dedicated "أنت المدرب" mode keeps its own separate data.)
// Never throws — degrades to an empty list.
// ============================================================

import { Coach, PlayerRarity } from '../types';
import { getSupabaseClient } from './supabaseClient';

interface AdminCoachRow {
  id: string;
  name: string;
  name_ar: string;
  rating: number | null;
  nationality_ar: string | null;
  photo_url: string;
  rarity: string | null;
}

const STYLES: { style: Coach['style']; styleAr: string }[] = [
  { style: 'Tiki-Taka', styleAr: 'تيكي تاكا' },
  { style: 'High Press', styleAr: 'ضغط عالي' },
  { style: 'Counter Attack', styleAr: 'هجمات مرتدة' },
  { style: 'Park the Bus', styleAr: 'دفاع صلب' },
  { style: 'Direct Play', styleAr: 'لعب مباشر' }
];

const hash = (s: string) => {
  let h = 17;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) >>> 0;
  return h;
};

/** Every coach card gets full, valid numbers derived from its rating — so the games can never crash on missing data. */
function mapRowToCoach(row: AdminCoachRow): Coach {
  const rating = Math.max(40, Math.min(99, row.rating || 75));
  const pick = STYLES[hash(row.id) % STYLES.length];
  const bonus = (offset: number) => Math.max(1, Math.round((rating - 55) / 4) + ((hash(row.id + offset) % 3) - 1));
  return {
    id: `admin_coach_${row.id}`,
    name: row.name,
    nameAr: row.name_ar,
    rating,
    nationality: '',
    nationalityAr: row.nationality_ar || '',
    photoUrl: row.photo_url,
    style: pick.style,
    styleAr: pick.styleAr,
    attackBonus: bonus(1),
    defenseBonus: bonus(2),
    possessionBonus: bonus(3),
    counterBonus: bonus(4),
    pressingBonus: bonus(5),
    chemistryBonus: bonus(6),
    preferredFormations: ['4-3-3', '4-4-2'],
    marketValue: rating,
    rarity: (row.rarity as PlayerRarity) || 'Rare',
    descriptionAr: ''
  };
}

let cachedAdminCoaches: Coach[] | null = null;
let inFlight: Promise<Coach[]> | null = null;

async function fetchAdminCoaches(): Promise<Coach[]> {
  const client = getSupabaseClient();
  if (!client) return [];
  try {
    const { data, error } = await client.from('coaches').select('*').eq('is_published', true);
    if (error || !data) return [];
    return (data as AdminCoachRow[]).map(mapRowToCoach);
  } catch {
    return [];
  }
}

export async function getAllCoaches(forceRefresh = false): Promise<Coach[]> {
  if (cachedAdminCoaches && !forceRefresh) return [...cachedAdminCoaches];
  if (!inFlight || forceRefresh) inFlight = fetchAdminCoaches();
  const list = await inFlight;
  cachedAdminCoaches = list;
  inFlight = null;
  return [...list];
}

/** Synchronous read for engines that can't await. */
export function getCoachesSync(): Coach[] {
  return cachedAdminCoaches ? [...cachedAdminCoaches] : [];
}

export function invalidateCoachCache() {
  void getAllCoaches(true);
}

export function refreshCoachesInBackground() {
  getAllCoaches(true).catch(() => {});
}
