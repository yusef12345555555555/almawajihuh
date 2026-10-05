// ============================================================
// العبها صح | EL3BHA SA7 - Curated Player Avatars
//
// 15 original football-persona badges (no photos, no third-party
// art) used during onboarding so a player can pick an identity
// without uploading a photo. Each is a gradient + icon + an
// Arabic "persona" name that fits the game's competitive tone.
// ============================================================

import {
  Flame,
  Zap,
  Shield,
  Target,
  Crosshair,
  Crown,
  Swords,
  Trophy,
  Star,
  Rocket,
  Gem,
  Award,
  Sparkles,
  Hexagon,
  Diamond,
  Bot,
  User,
  type LucideIcon
} from 'lucide-react';

export interface AvatarPreset {
  id: string;
  nameAr: string;
  icon: LucideIcon;
  from: string;
  to: string;
}

/** الأيقونة الافتراضية لأي لاعب لم يختر صورة. */
export const DEFAULT_AVATAR_ID = 'av_default';

export const AVATAR_PRESETS: AvatarPreset[] = [
  { id: 'av_default', nameAr: 'لاعب جديد', icon: User, from: '#52525b', to: '#27272a' },
  { id: 'av_flame', nameAr: 'شعلة الهجوم', icon: Flame, from: '#f97316', to: '#dc2626' },
  { id: 'av_zap', nameAr: 'البرق الخاطف', icon: Zap, from: '#facc15', to: '#f59e0b' },
  { id: 'av_shield', nameAr: 'حارس العرين', icon: Shield, from: '#38bdf8', to: '#1d4ed8' },
  { id: 'av_target', nameAr: 'القناص', icon: Target, from: '#a3e635', to: '#16a34a' },
  { id: 'av_crosshair', nameAr: 'صائد الأهداف', icon: Crosshair, from: '#fb7185', to: '#9f1239' },
  { id: 'av_crown', nameAr: 'قائد الفريق', icon: Crown, from: '#fde047', to: '#b45309' },
  { id: 'av_swords', nameAr: 'المحارب', icon: Swords, from: '#94a3b8', to: '#1e293b' },
  { id: 'av_trophy', nameAr: 'بطل البطولات', icon: Trophy, from: '#fbbf24', to: '#92400e' },
  { id: 'av_star', nameAr: 'نجم الوسط', icon: Star, from: '#c084fc', to: '#6d28d9' },
  { id: 'av_rocket', nameAr: 'انطلاقة صاروخية', icon: Rocket, from: '#fb923c', to: '#7c2d12' },
  { id: 'av_gem', nameAr: 'الماسة النادرة', icon: Gem, from: '#22d3ee', to: '#0e7490' },
  { id: 'av_award', nameAr: 'الأسطورة', icon: Award, from: '#f59e0b', to: '#78350f' },
  { id: 'av_sparkles', nameAr: 'ساحر الملعب', icon: Sparkles, from: '#e879f9', to: '#a21caf' },
  { id: 'av_hexagon', nameAr: 'السداسي الذهبي', icon: Hexagon, from: '#fcd34d', to: '#b45309' },
  { id: 'av_diamond', nameAr: 'اللاعب الماسي', icon: Diamond, from: '#60a5fa', to: '#1e40af' },
  // شارة واضحة لأي خصم/لاعب "نظام" — عشان محدش يتلخبط إنه لاعب حقيقي
  { id: 'av_bot', nameAr: 'خصم النظام (AI)', icon: Bot, from: '#64748b', to: '#0f172a' }
];

export function getAvatarPresetById(id: string): AvatarPreset | undefined {
  return AVATAR_PRESETS.find((a) => a.id === id);
}

export function isPresetAvatar(avatar: string | undefined | null): boolean {
  return !!avatar && avatar.startsWith('av_');
}

/** هل القيمة صورة قابلة للعرض (رابط/‏data URL) وليست أيقونة جاهزة؟ */
export function isImageAvatar(avatar: string | undefined | null): boolean {
  return !!avatar && /^(https?:|data:image|blob:|\/)/.test(avatar);
}
