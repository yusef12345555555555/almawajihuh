// ============================================================
// المواجهة | كتالوج السوق — بيتحمّل من لوحة الإدارة (Supabase) ويتخزّن محلياً.
// أي تعديل من الأدمن (سعر/صورة/عنصر جديد) بيظهر عند اللاعبين تلقائياً.
// ============================================================

import { useEffect, useState } from 'react';
import { MarketItem, MarketCategory, EquippedCosmetics } from '../types';
import { getSupabaseClient } from './supabaseClient';

const CACHE_KEY = 'mw_market_catalog_v1';
let items: MarketItem[] = [];
let started = false;
const listeners = new Set<() => void>();

try {
  const raw = localStorage.getItem(CACHE_KEY);
  if (raw) {
    items = JSON.parse(raw) as MarketItem[];
    setTimeout(() => preloadMarketImages(items), 0);
  }
} catch {
  items = [];
}

const emit = () => listeners.forEach((l) => l());

const rowToItem = (r: any): MarketItem => ({
  id: String(r.id),
  category: r.category,
  nameAr: r.name_ar,
  price: r.price ?? 0,
  imageUrl: r.image_url,
  imageUrlAlt: r.image_url_alt || undefined,
  scale: Number(r.scale) > 0 ? Number(r.scale) : 1.3,
  isActive: r.is_active !== false,
  sortOrder: r.sort_order ?? 0
});

const preloaded = new Set<string>();
/** تحميل مسبق هادئ لصور العناصر عشان تظهر فوراً في السوق وداخل الجيم. */
export function preloadMarketImages(list: MarketItem[]): void {
  const urls: string[] = [];
  list.forEach((i) => {
    [i.imageUrl, i.imageUrlAlt].forEach((u) => u && !preloaded.has(u) && urls.push(u));
  });
  const run = () => {
    urls.slice(0, 80).forEach((u) => {
      preloaded.add(u);
      const img = new Image();
      img.decoding = 'async';
      img.src = u;
    });
  };
  const ric = (window as any).requestIdleCallback as undefined | ((cb: () => void) => void);
  if (ric) ric(run);
  else setTimeout(run, 300);
}

export async function refreshMarketCatalog(): Promise<void> {
  const client = getSupabaseClient();
  if (!client) return;
  try {
    const { data, error } = await client
      .from('market_items')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error || !data) return;
    items = data.map(rowToItem);
    preloadMarketImages(items);
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
    emit();
  } catch {
    /* keep cache */
  }
}

export function startMarketCatalog(): void {
  if (started) return;
  started = true;
  void refreshMarketCatalog();
  const client = getSupabaseClient();
  try {
    client
      ?.channel('market-items-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'market_items' }, () => void refreshMarketCatalog())
      .subscribe();
  } catch {
    /* polling below covers it */
  }
  window.setInterval(() => void refreshMarketCatalog(), 60000);
}

export const getMarketItems = (category?: MarketCategory): MarketItem[] =>
  category ? items.filter((i) => i.category === category) : items;

export const getMarketItem = (id?: string): MarketItem | undefined => (id ? items.find((i) => i.id === id) : undefined);

export function useMarketCatalog(): MarketItem[] {
  const [, force] = useState(0);
  useEffect(() => {
    startMarketCatalog();
    const l = () => force((n) => n + 1);
    listeners.add(l);
    return () => {
      listeners.delete(l);
    };
  }, []);
  return items;
}

export const EQUIP_KEY: Record<MarketCategory, keyof EquippedCosmetics> = {
  AVATAR_FRAME: 'avatarFrame',
  NAME_FRAME: 'nameFrame',
  ENTRANCE: 'entrance',
  PITCH_SKIN: 'pitchSkin'
};

export const CATEGORY_LABEL: Record<MarketCategory, string> = {
  AVATAR_FRAME: 'شكل صورتك',
  NAME_FRAME: 'شكل اسمك',
  ENTRANCE: 'شكل دخلتك للجيم',
  PITCH_SKIN: 'شكل تشكيلتك'
};

/** صورة أرضية الملعب المناسبة لعدد اللاعبين (5 أو 11). */
export function pitchSkinUrl(equipped: EquippedCosmetics | undefined, squadSize: 5 | 11): string | undefined {
  const it = getMarketItem(equipped?.pitchSkin);
  if (!it || it.category !== 'PITCH_SKIN') return undefined;
  return squadSize === 5 ? it.imageUrlAlt || it.imageUrl : it.imageUrl;
}
