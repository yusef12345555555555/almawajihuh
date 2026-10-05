// ============================================================
// المواجهة | AL MWAJHA — "يلا نولّع الماتش!" Real-Player Flow
//
// One flow, two doors:
//   1) هاتلي منافس  → instant real-player quick match (Supabase queue)
//   2) دور على صاحبك → search by name/nickname/Player ID + send a
//      real invite (+ a shareable challenge link as a bonus)
//
// Requires internet — real matches are live between two devices.
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { Search, Copy, Check, Share2, X, WifiOff, Loader2, Swords, UserPlus } from 'lucide-react';
import { UserProfile } from '../types';
import { PlayerSnapshot, FriendUser } from '../types';
import { UnifiedPlayerPicker } from './UnifiedPlayerPicker';
import { MatchmakingService } from '../services/matchmakingService';
import { SocialService } from '../services/socialService';
import { useOnlineStatus } from '../services/connectivity';
import { VersusAtmosphereScene } from './scenes/VersusAtmosphereScene';
import { PlayerAvatarBadge } from './PlayerAvatarBadge';

type Step = 'CHOICE' | 'SEARCHING' | 'FOUND' | 'FRIEND_SEARCH' | 'INVITE_SENT';

interface Props {
  user: UserProfile;
  gameMode: string;
  gameLabelAr: string;
  onClose: () => void;
  onReady: (opponent: PlayerSnapshot) => void;
}

function toSnapshot(user: UserProfile): PlayerSnapshot {
  return {
    playerId: user.playerId || '',
    id: user.id,
    name: user.username,
    nameAr: user.nameAr,
    avatar: user.avatar,
    rating: user.rating
  };
}

export const RealPlayerMatchmakingModal: React.FC<Props> = ({ user, gameMode, gameLabelAr, onClose, onReady }) => {
  const online = useOnlineStatus();
  const [step, setStep] = useState<Step>('CHOICE');
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<PlayerSnapshot | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [copied, setCopied] = useState(false);

  const [friends] = useState<FriendUser[]>(() => SocialService.getFriends());
  const [searching, setSearching] = useState(false);
  const unsubRef = useRef<() => void>(() => {});

  useEffect(() => () => unsubRef.current(), []);

  useEffect(() => {
    if (step !== 'SEARCHING') return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [step]);


  const handleQuickMatch = async () => {
    if (!online) return;
    setStep('SEARCHING');
    const ticket = await MatchmakingService.enqueue(toSnapshot(user), gameMode);
    if (!ticket) {
      setStep('CHOICE');
      return;
    }
    setTicketId(ticket.id);

    if (ticket.status === 'MATCHED' && ticket.opponentSnapshot) {
      setOpponent(ticket.opponentSnapshot);
      setStep('FOUND');
      return;
    }

    unsubRef.current = MatchmakingService.subscribeToTicket(ticket.id, (updated) => {
      if (updated.status === 'MATCHED' && updated.opponentSnapshot) {
        setOpponent(updated.opponentSnapshot);
        setStep('FOUND');
      }
    });
  };

  const handleCancelSearch = async () => {
    if (ticketId) await MatchmakingService.cancel(ticketId);
    unsubRef.current();
    setStep('CHOICE');
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(user.playerId || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
    }
  };

  const handleShareChallenge = async () => {
    const text = `يلا اتحدّاني في ${gameLabelAr} على المواجهة! الكود بتاعي: ${user.playerId}`;
    try {
      if (navigator.share) {
        await navigator.share({ text, title: 'تحدي المواجهة' });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      // user cancelled share sheet — fine
    }
  };

  const handleInviteFriend = async (friend: FriendUser) => {
    if (!online) return;
    const invite = await MatchmakingService.sendInvite(toSnapshot(user), friend.id, friend.playerId, gameMode);
    if (!invite) return;
    setStep('INVITE_SENT');
    unsubRef.current = MatchmakingService.subscribeToInvite(invite.id, (updated) => {
      if (updated.status === 'ACCEPTED') {
        setOpponent({ playerId: friend.playerId, id: friend.id, name: friend.username, nameAr: friend.nameAr, avatar: friend.avatar });
        setStep('FOUND');
      }
    });
  };

  useEffect(() => {
    if (step === 'FOUND' && opponent) {
      const t = setTimeout(() => onReady(opponent), 1400);
      return () => clearTimeout(t);
    }
  }, [step, opponent, onReady]);

  return (
    <div dir="rtl" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 backdrop-blur-md px-4">
      <div className="relative w-full max-w-sm rounded-[28px] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.65)] border border-white/10">
        {/* Diagonal confrontation gradient backdrop — red (you) to blue (rival) */}
        <div className="absolute inset-0 bg-gradient-to-br from-rose-700 via-fuchsia-900 to-blue-900" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_10%,rgba(255,255,255,0.15),transparent_50%)]" />
        {step === 'FOUND' && <VersusAtmosphereScene />}

        <div className="relative px-6 py-7">
          <button onClick={onClose} className="absolute top-4 left-4 p-1.5 rounded-full bg-black/30 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>

          {step === 'CHOICE' && (
            <>
              <h2 className="text-2xl font-black text-white text-center mb-1">يلا نولّع الماتش! ⚡</h2>
              <p className="text-xs text-white/70 text-center mb-6">{gameLabelAr}</p>

              {!online && (
                <div className="flex items-center gap-2 bg-black/40 border border-amber-400/30 rounded-2xl px-4 py-3 mb-4 text-amber-200 text-xs font-bold">
                  <WifiOff className="w-4 h-4 shrink-0" />
                  لازم تكون متصل بالنت عشان تلعب مع لاعب حقيقي
                </div>
              )}

              <button
                onClick={handleQuickMatch}
                disabled={!online}
                className="w-full flex items-center gap-3 bg-black/35 hover:bg-black/45 disabled:opacity-40 disabled:cursor-not-allowed border border-white/20 rounded-full px-5 py-4 mb-5 transition-colors"
              >
                <Search className="w-5 h-5 text-white shrink-0" />
                <span className="text-white font-black text-base">هاتلي منافس!</span>
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 h-px bg-white/20" />
                <span className="text-white/60 text-xs font-bold">أو</span>
                <div className="flex-1 h-px bg-white/20" />
              </div>

              <div className="flex items-center justify-center gap-2 mb-4">
                <button onClick={handleCopyId} className="p-1 text-white/70 hover:text-white">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <span className="text-white/70 text-xs">كودك في الملعب: </span>
                <span className="text-white font-black text-sm font-mono tracking-wide">{user.playerId}</span>
              </div>

              <button
                onClick={() => setStep('FRIEND_SEARCH')}
                disabled={!online}
                className="w-full flex items-center justify-center gap-2 bg-white text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed font-black text-sm py-3.5 rounded-full mb-3"
              >
                <UserPlus className="w-4 h-4" />
                دور على صاحبك
              </button>

              <button
                onClick={handleShareChallenge}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-l from-emerald-500 to-teal-500 text-white font-black text-sm py-3.5 rounded-full"
              >
                <Share2 className="w-4 h-4" />
                يلا اتحدى صاحبك وشير معاه اللينك
              </button>
            </>
          )}

          {step === 'SEARCHING' && (
            <div className="text-center py-6">
              <div className="w-20 h-20 mx-auto mb-5 rounded-full border-4 border-white/20 border-t-white flex items-center justify-center animate-spin">
                <Swords className="w-7 h-7 text-white -rotate-45" />
              </div>
              <h2 className="text-lg font-black text-white mb-1">بندورلك على منافس...</h2>
              <p className="text-xs text-white/60 mb-6">{elapsed} ثانية</p>
              <button
                onClick={handleCancelSearch}
                className="px-6 py-2.5 rounded-full bg-black/40 hover:bg-black/55 text-white/90 text-xs font-bold"
              >
                إلغاء البحث
              </button>
            </div>
          )}

          {step === 'FRIEND_SEARCH' && (
            <>
              <h2 className="text-lg font-black text-white text-center mb-4">دور على صاحبك</h2>
              <UnifiedPlayerPicker
                userId={user.id}
                friends={friends}
                label="صاحبك"
                placeholder="ابحث بالاسم أو اللقب أو ID"
                onSelect={(player) => {
                  const friend = friends.find(f => f.id === player.id);
                  if (friend) handleInviteFriend(friend);
                }}
              />
            </>
          )}

          {step === 'INVITE_SENT' && (
            <div className="text-center py-8">
              <Loader2 className="w-10 h-10 text-white mx-auto mb-4 animate-spin" />
              <h2 className="text-base font-black text-white mb-1">بعتنالك الدعوة</h2>
              <p className="text-xs text-white/60">مستنيين يوافق على المواجهة...</p>
            </div>
          )}

          {step === 'FOUND' && opponent && (
            <div className="text-center py-4">
              <p className="text-sm font-black text-white mb-6">تم العثور على منافس!</p>
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <PlayerAvatarBadge avatar={user.avatar} size="lg" />
                  <div className="text-white text-xs font-black mt-2">{user.nameAr}</div>
                </div>
                <span className="text-xl font-black text-amber-300">VS</span>
                <div className="text-center">
                  <PlayerAvatarBadge avatar={opponent.avatar} size="lg" />
                  <div className="text-white text-xs font-black mt-2">{opponent.nameAr}</div>
                </div>
              </div>
              <p className="text-xs text-white/60 mt-6">جاري الدخول للمباراة...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
