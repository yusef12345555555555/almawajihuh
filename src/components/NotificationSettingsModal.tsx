// ============================================================
// المواجهة | AL MWAJHA — Notification Preferences
// ============================================================

import React, { useEffect, useState } from 'react';
import {
  X, Bell, Swords, Users, UserPlus, Trophy, UserCog, Megaphone, RefreshCw
} from 'lucide-react';
import { UserProfile, NotificationPreferences } from '../types';
import { NotificationService } from '../services/notificationService';

interface Props {
  user: UserProfile;
  onClose: () => void;
}

const CATEGORIES: { key: keyof Omit<NotificationPreferences, 'masterEnabled'>; icon: React.ElementType; labelAr: string }[] = [
  { key: 'matches', icon: Swords, labelAr: 'إشعارات المباريات' },
  { key: 'matchmaking', icon: Users, labelAr: 'إشعارات العثور على منافس' },
  { key: 'invites', icon: UserPlus, labelAr: 'إشعارات دعوات اللعب' },
  { key: 'friends', icon: Users, labelAr: 'إشعارات الأصدقاء' },
  { key: 'tournaments', icon: Trophy, labelAr: 'إشعارات البطولات' },
  { key: 'coachMode', icon: UserCog, labelAr: 'إشعارات أنت المدرب' },
  { key: 'updates', icon: RefreshCw, labelAr: 'إشعارات التحديثات' },
  { key: 'announcements', icon: Megaphone, labelAr: 'الإعلانات المهمة' }
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-[22px] rounded-full transition-colors shrink-0 ${
        checked ? 'bg-amber-500' : 'bg-zinc-700'
      }`}
    >
      <span
        className={`absolute top-[2px] w-[18px] h-[18px] rounded-full bg-white shadow transition-transform ${
          checked ? 'right-[20px]' : 'right-[2px]'
        }`}
      />
    </button>
  );
}

export const NotificationSettingsModal: React.FC<Props> = ({ user, onClose }) => {
  const [prefs, setPrefs] = useState<NotificationPreferences | null>(null);

  useEffect(() => {
    NotificationService.getPreferences(user.id).then(setPrefs);
  }, [user.id]);

  const update = (patch: Partial<NotificationPreferences>) => {
    setPrefs((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...patch };
      NotificationService.savePreferences(user.id, next);
      return next;
    });
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl border border-amber-500/20 bg-zinc-900/95 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/80">
          <span className="text-sm font-black text-white">إعدادات الإشعارات</span>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!prefs ? (
          <div className="p-8 text-center text-xs text-zinc-500">جاري التحميل...</div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-zinc-800/60 bg-amber-500/[0.04]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                  <Bell className="w-4 h-4" />
                </div>
                <span className="text-xs font-black text-white">السماح بالإشعارات</span>
              </div>
              <Toggle checked={prefs.masterEnabled} onChange={(v) => update({ masterEnabled: v })} />
            </div>

            <div className={`transition-opacity ${prefs.masterEnabled ? '' : 'opacity-40 pointer-events-none'}`}>
              {CATEGORIES.map(({ key, icon: Icon, labelAr }) => (
                <div key={key} className="flex items-center justify-between gap-3 px-5 py-3 border-b border-zinc-900">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-zinc-800 text-zinc-400 flex items-center justify-center">
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-zinc-300">{labelAr}</span>
                  </div>
                  <Toggle checked={prefs[key]} onChange={(v) => update({ [key]: v } as Partial<NotificationPreferences>)} />
                </div>
              ))}
            </div>

            <p className="text-[10px] text-zinc-600 text-center px-5 py-4 leading-relaxed">
              لو مش وصلاك، فعّل الإشعارات من إعدادات جهازك
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
