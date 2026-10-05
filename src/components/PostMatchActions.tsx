// ============================================================
// المواجهة | أزرار ما بعد المباراة (مشتركة بين المزاد وديل أور نو ديل والاعب الخفي)
//
// ضد AI:     نشوف لعبة تانية • وريني التشكيلة • إعادة المباراة
// ضد لاعب:   نشوف لعبة تانية • وريني التشكيلة • انتقم • خلينا صحاب
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { Gamepad2, LayoutGrid, RotateCcw, Swords, UserPlus, Check, Loader2, X } from 'lucide-react';
import { FriendUser, PlayerSnapshot, UserProfile } from '../types';
import { MatchmakingService } from '../services/matchmakingService';
import { SocialService } from '../services/socialService';
import { StorageService } from '../services/storageService';
import { audioManager } from '../services/audioManager';

export const LAUNCH_GAME_EVENT = 'mw:launch-game';

/** يطلب من التطبيق فتح لعبة بخصم حقيقي (بيستخدمه الانتقام وقبول الدعوات). */
export function launchGameWithOpponent(gameId: string, opponent: PlayerSnapshot | null) {
  try {
    window.dispatchEvent(new CustomEvent(LAUNCH_GAME_EVENT, { detail: { gameId, opponent } }));
  } catch {
    /* ignore */
  }
}

interface Props {
  /** معرّف اللعبة: AUCTION | DEAL_OR_NO_DEAL | PLAYER_OR_HIDDEN */
  gameId: string;
  /** الخصم الحقيقي. null/undefined = خصم AI */
  opponent?: PlayerSnapshot | null;
  onSeeOtherGame: () => void;
  onShowLineup?: () => void;
  onRematchAi?: () => void;
}

type RevengeState = 'idle' | 'sending' | 'waiting' | 'declined' | 'failed';

const toSnapshot = (u: UserProfile): PlayerSnapshot => ({
  id: u.id,
  playerId: u.playerId || '',
  name: u.username,
  nameAr: u.nameAr || u.username,
  avatar: u.avatar,
  rating: u.rating,
  equippedCosmetics: u.equippedCosmetics
});

const baseBtn =
  'flex items-center justify-center gap-1.5 rounded-2xl px-2 py-3 text-[12px] font-black backdrop-blur-[2px] active:scale-95 transition-transform disabled:opacity-60';

export const PostMatchActions: React.FC<Props> = ({ gameId, opponent, onSeeOtherGame, onShowLineup, onRematchAi }) => {
  const isAi = !opponent;
  const [revenge, setRevenge] = useState<RevengeState>('idle');
  const [friendSent, setFriendSent] = useState(false);
  const [friendMsg, setFriendMsg] = useState<string | null>(null);
  const unsubRef = useRef<null | (() => void)>(null);

  useEffect(() => () => unsubRef.current?.(), []);

  const sendRevenge = async () => {
    if (!opponent || revenge === 'sending' || revenge === 'waiting') return;
    audioManager.playClick();
    setRevenge('sending');
    const me = StorageService.getUserProfile();
    const invite = await MatchmakingService.sendInvite(toSnapshot(me), opponent.id, opponent.playerId, gameId);
    if (!invite) {
      setRevenge('failed');
      return;
    }
    setRevenge('waiting');
    unsubRef.current?.();
    unsubRef.current = MatchmakingService.subscribeToInvite(invite.id, (updated) => {
      if (updated.status === 'ACCEPTED') {
        unsubRef.current?.();
        launchGameWithOpponent(gameId, opponent);
      } else if (updated.status === 'DECLINED') {
        unsubRef.current?.();
        setRevenge('declined');
      }
    });
  };

  const addFriend = () => {
    if (!opponent || friendSent) return;
    audioManager.playClick();
    const target: FriendUser = {
      id: opponent.id,
      playerId: opponent.playerId,
      username: opponent.name,
      nameAr: opponent.nameAr,
      avatar: opponent.avatar,
      rating: opponent.rating ?? 1000,
      rankTier: 'برونزي',
      status: 'ONLINE',
      lastActive: ''
    } as FriendUser;
    const res = SocialService.sendFriendRequest(target);
    setFriendSent(res.success || /موجود|مستني/.test(res.message));
    setFriendMsg(res.message);
  };

  return (
    <div className="w-full space-y-2" dir="rtl">
      {revenge === 'declined' && (
        <div className="flex items-center justify-center gap-1.5 rounded-xl bg-rose-500/25 border border-rose-400/50 px-3 py-2 text-[12px] font-black text-rose-100">
          <X className="w-4 h-4" /> الخصم رفض طلبك — "لا فكك" 😅 ممكن تبقوا صحاب!
        </div>
      )}
      {revenge === 'failed' && (
        <div className="rounded-xl bg-amber-500/20 border border-amber-400/40 px-3 py-2 text-[12px] font-bold text-amber-100 text-center">
          معرفناش نبعت الطلب دلوقتي، اتأكد من النت وجرّب تاني.
        </div>
      )}
      {friendMsg && <div className="text-center text-[11px] font-bold text-emerald-200">{friendMsg}</div>}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            audioManager.playClick();
            onSeeOtherGame();
          }}
          className={`${baseBtn} col-span-2 bg-gradient-to-l from-amber-500 to-yellow-400 text-zinc-950 shadow-[0_0_22px_rgba(245,158,11,.35)]`}
        >
          <Gamepad2 className="w-4 h-4" /> نشوف لعبة تانية
        </button>

        {onShowLineup && (
          <button type="button" onClick={onShowLineup} className={`${baseBtn} border border-white/30 bg-black/45 text-white`}>
            <LayoutGrid className="w-4 h-4" /> وريني التشكيلة
          </button>
        )}

        {isAi ? (
          <button type="button" onClick={onRematchAi} disabled={!onRematchAi} className={`${baseBtn} border border-emerald-300/60 bg-emerald-950/60 text-emerald-100`}>
            <RotateCcw className="w-4 h-4" /> إعادة المباراة
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={() => void sendRevenge()}
              disabled={revenge === 'sending' || revenge === 'waiting'}
              className={`${baseBtn} border border-rose-300/70 bg-gradient-to-l from-rose-700/80 to-orange-600/80 text-white shadow-[0_0_18px_rgba(244,63,94,.35)]`}
            >
              {revenge === 'sending' || revenge === 'waiting' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Swords className="w-4 h-4" />}
              {revenge === 'waiting' ? 'مستني رد الخصم…' : revenge === 'sending' ? 'بنبعت الطلب…' : 'انتقم من الخصم'}
            </button>
            <button
              type="button"
              onClick={addFriend}
              disabled={friendSent}
              className={`${baseBtn} col-span-2 border border-sky-300/60 bg-sky-950/60 text-sky-100`}
            >
              {friendSent ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {friendSent ? 'اتبعت طلب الصداقة' : 'خلينا صحاب'}
            </button>
          </>
        )}
      </div>
    </div>
  );
};
