import React, { useEffect, useMemo, useState } from 'react';
import { Search, UserRound, X } from 'lucide-react';
import { FriendUser, PlayerSnapshot, UserProfile } from '../types';
import { SocialService } from '../services/socialService';
import { PlayerAvatarBadge } from './PlayerAvatarBadge';

export interface UnifiedPlayerPickerProps {
  userId: string;
  friends?: FriendUser[];
  value?: PlayerSnapshot | null;
  onSelect: (player: PlayerSnapshot) => void;
  onClear?: () => void;
  placeholder?: string;
  label?: string;
  disabledIds?: string[];
  compact?: boolean;
}

export const playerToSnapshot = (p: FriendUser | UserProfile): PlayerSnapshot => ({
  playerId: p.playerId || '',
  id: p.id,
  name: p.username,
  nameAr: p.nameAr,
  avatar: p.avatar,
  rating: p.rating
});

export const UnifiedPlayerPicker: React.FC<UnifiedPlayerPickerProps> = ({
  userId,
  friends,
  value,
  onSelect,
  onClear,
  placeholder = 'ابحث بالاسم أو اللقب أو ID',
  label = 'اختار لاعب',
  disabledIds = [],
  compact = false
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FriendUser[]>([]);
  const [loading, setLoading] = useState(false);
  const friendList = useMemo(() => friends ?? SocialService.getFriends(), [friends]);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const found = await SocialService.searchPlayers(q, userId);
        if (!cancelled) setResults(found.filter(p => !disabledIds.includes(p.id)).slice(0, 8));
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, userId, disabledIds.join('|')]);

  const choose = (p: FriendUser) => {
    if (disabledIds.includes(p.id)) return;
    onSelect(playerToSnapshot(p));
    setQuery('');
    setResults([]);
  };

  if (value) {
    return (
      <div dir="rtl" className="flex items-center gap-2 rounded-2xl border border-emerald-400/50 bg-emerald-500/10 p-2.5">
        <PlayerAvatarBadge avatar={value.avatar} size="sm" />
        <div className="min-w-0 flex-1">
          <div className="text-sm font-black text-white truncate">{value.nameAr || value.name}</div>
          {value.playerId && <div className="text-[10px] text-zinc-400 font-mono">{value.playerId}</div>}
        </div>
        {onClear && <button type="button" onClick={onClear} className="p-1 text-zinc-400 hover:text-white"><X className="w-4 h-4" /></button>}
      </div>
    );
  }

  return (
    <div dir="rtl" className="space-y-2">
      {label && <div className="flex items-center gap-1.5 text-xs font-black text-amber-300"><UserRound className="w-3.5 h-3.5" />{label}</div>}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-2xl border border-zinc-700 bg-zinc-950 text-white outline-none focus:border-amber-400 pr-9 pl-3 font-bold ${compact ? 'py-2.5 text-xs' : 'py-3 text-sm'}`}
        />
      </div>
      <select
        defaultValue=""
        onChange={e => {
          const p = friendList.find(f => f.id === e.target.value);
          if (p) choose(p);
          e.currentTarget.value = '';
        }}
        className={`w-full rounded-2xl border border-zinc-700 bg-zinc-950 text-white outline-none ${compact ? 'py-2.5 text-xs' : 'py-3 text-sm'}`}
      >
        <option value="">أصدقاؤك — اختار صاحب من القائمة</option>
        {friendList.filter(f => !disabledIds.includes(f.id)).map(f => (
          <option key={f.id} value={f.id}>{f.nameAr || f.username} — {f.playerId}</option>
        ))}
      </select>
      {query.trim() && (
        <div className="space-y-1.5 max-h-44 overflow-y-auto">
          {loading && <div className="text-center text-[11px] text-zinc-500 py-2">بندور...</div>}
          {!loading && results.length === 0 && <div className="text-center text-[11px] text-zinc-500 py-2">مفيش لاعب بالبحث ده</div>}
          {results.map(r => (
            <button key={r.id} type="button" onClick={() => choose(r)} className="w-full flex items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900 p-2 text-right hover:border-amber-400 transition-colors">
              <PlayerAvatarBadge avatar={r.avatar} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="text-xs font-black text-white truncate">{r.nameAr || r.username}</div>
                <div className="text-[10px] text-zinc-500">{r.username} • {r.playerId}</div>
              </div>
              <span className="text-[9px] font-black text-emerald-300">اختار</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
