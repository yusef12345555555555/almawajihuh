// ============================================================
// المواجهة | AL MWAJHA — "يلا نولّع الماتش!" Universal Start-Match Modal
//
// ADDITION. Replaces the old 4-card METHOD_SELECT step (quick /
// public / private / ai) in GamesDiscoveryView for every game
// EXCEPT "أنت المدرب", which keeps its own dedicated flow untouched.
//
// Reuses the REAL existing services — no new fake data:
//   - SocialService.searchPlayers()      (real search by name/ID)
//   - MatchmakingService.enqueue/sendInvite (real Supabase queue/invites)
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import { Search, Copy, Check, Share2, Bot, Loader2, WifiOff, X } from 'lucide-react';
import { UserProfile, FriendUser, PlayerSnapshot } from '../types';
import { UnifiedPlayerPicker } from './UnifiedPlayerPicker';
import { PlayerAvatarBadge } from './PlayerAvatarBadge';
import { MatchmakingService } from '../services/matchmakingService';
import { SocialService } from '../services/socialService';
import { useOnlineStatus } from '../services/connectivity';
import { audioManager } from '../services/audioManager';

interface Props {
  user: UserProfile;
  gameMode: string;
  gameLabelAr: string;
  onClose: () => void;
  onRealOpponentReady: (opponent: PlayerSnapshot) => void;
  onPlayAi: () => void;
  /** فتح غرفة اللعب مع الصحاب (اختيار خماسي/11 + كروت + لينك + جاهز) */
  onFriendRoom: () => void;
}

function toSnapshot(user: UserProfile): PlayerSnapshot {
  return { playerId: user.playerId || '', id: user.id, name: user.username, nameAr: user.nameAr, avatar: user.avatar, rating: user.rating };
}

export const StartMatchModal: React.FC<Props> = ({ user, gameMode, gameLabelAr, onClose, onRealOpponentReady, onPlayAi, onFriendRoom }) => {
  const online = useOnlineStatus();
  const [searching, setSearching] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [found, setFound] = useState<PlayerSnapshot | null>(null);
  const [copied, setCopied] = useState(false);
  const [friends] = useState<FriendUser[]>(() => SocialService.getFriends());
  const [inviteSentTo, setInviteSentTo] = useState<FriendUser | null>(null);
  const unsubRef = useRef<() => void>(() => {});

  useEffect(() => () => unsubRef.current(), []);

  useEffect(() => {
    if (!searching) return;
    setElapsed(0);
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [searching]);


  const handleQuickMatch = async () => {
    if (!online) return;
    audioManager.playClick();
    setSearching(true);
    const ticket = await MatchmakingService.enqueue(toSnapshot(user), gameMode);
    if (!ticket) {
      setSearching(false);
      return;
    }
    setTicketId(ticket.id);
    if (ticket.status === 'MATCHED' && ticket.opponentSnapshot) {
      setFound(ticket.opponentSnapshot);
      setSearching(false);
      return;
    }
    unsubRef.current = MatchmakingService.subscribeToTicket(ticket.id, (updated) => {
      if (updated.status === 'MATCHED' && updated.opponentSnapshot) {
        setFound(updated.opponentSnapshot);
        setSearching(false);
      }
    });
  };

  const handleCancelSearch = async () => {
    if (ticketId) await MatchmakingService.cancel(ticketId);
    unsubRef.current();
    setSearching(false);
  };

  const handleCopyId = async () => {
    try {
      await navigator.clipboard.writeText(user.playerId || '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const handleInviteFriend = async (friend: FriendUser) => {
    if (!friend) return;
    if (!online) return;
    const invite = await MatchmakingService.sendInvite(toSnapshot(user), friend.id, friend.playerId, gameMode);
    if (!invite) return;
    setInviteSentTo(friend);
    unsubRef.current = MatchmakingService.subscribeToInvite(invite.id, (updated) => {
      if (updated.status === 'ACCEPTED') {
        setFound({ playerId: friend.playerId, id: friend.id, name: friend.username, nameAr: friend.nameAr, avatar: friend.avatar });
      }
    });
  };

  const handleShareChallenge = async () => {
    const text = `يلا اتحدّاني في ${gameLabelAr} على المواجهة! الكود بتاعي: ${user.playerId}`;
    try {
      if (navigator.share) await navigator.share({ text, title: 'تحدي المواجهة' });
      else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch {
      /* user cancelled share sheet */
    }
  };

  useEffect(() => {
    if (found) {
      const t = setTimeout(() => onRealOpponentReady(found), 1200);
      return () => clearTimeout(t);
    }
  }, [found, onRealOpponentReady]);


  return (
    <div dir="rtl" className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/35 px-3 pb-[calc(env(safe-area-inset-bottom)+12px)]">
      <div className="relative w-full max-w-sm max-h-[88vh] overflow-y-auto rounded-3xl bg-zinc-950/55 border border-white/10 backdrop-blur-[3px] drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
        <div className="relative px-4 py-4">
          <button onClick={onClose} className="absolute top-4 left-4 p-1.5 rounded-full bg-black/30 text-white/80 hover:text-white">
            <X className="w-4 h-4" />
          </button>

          {!found && (
            <>
              <h2 className="text-lg font-black text-transparent bg-clip-text bg-gradient-to-l from-amber-300 via-yellow-100 to-emerald-300 text-center mb-0.5 tracking-wide">يلا نولّع الماتش!</h2>
              <p className="text-[11px] text-white/80 text-center mb-3">{gameLabelAr}</p>

              {!online && (
                <div className="flex items-center gap-2 bg-black/40 border border-amber-400/30 rounded-2xl px-4 py-3 mb-4 text-amber-200 text-xs font-bold">
                  <WifiOff className="w-4 h-4 shrink-0" />
                  لازم نت عشان تلعب حقيقي
                </div>
              )}
              {searching ? (
                <div className="text-center py-4">
                  <div className="w-20 h-20 mx-auto mb-5 rounded-full border-4 border-white/20 border-t-white flex items-center justify-center animate-spin">
                    <Search className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-base font-black text-white mb-1">بندور على منافس...</h3>
                  <p className="text-xs text-white/60 mb-6">{elapsed} ثانية</p>
                  <button onClick={handleCancelSearch} className="px-6 py-2.5 rounded-full bg-black/40 hover:bg-black/55 text-white/90 text-xs font-bold">
                    إلغاء البحث
                  </button>
                </div>
              ) : inviteSentTo ? (
                <div className="text-center py-6">
                  <Loader2 className="w-9 h-9 text-white mx-auto mb-4 animate-spin" />
                  <h3 className="text-sm font-black text-white mb-1">بعتنا الدعوة لـ {inviteSentTo.nameAr || inviteSentTo.username}</h3>
                  <p className="text-xs text-white/60">مستنيينه يوافق...</p>
                </div>
              ) : (
                <>
                  <button
                    onClick={handleQuickMatch}
                    disabled={!online}
                    className="w-full flex items-center gap-2.5 bg-black/40 hover:bg-black/50 disabled:opacity-40 disabled:cursor-not-allowed border border-white/25 rounded-full px-4 py-2.5 mb-3 transition-colors"
                  >
                    <Search className="w-5 h-5 text-white shrink-0" />
                    <span className="text-white font-black text-sm">هاتلي منافس!</span>
                  </button>

                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1 h-px bg-white/20" />
                    <span className="text-white/60 text-xs font-bold">أو</span>
                    <div className="flex-1 h-px bg-white/20" />
                  </div>

                  <div className="flex items-center justify-center gap-2 mb-3">
                    <button onClick={handleCopyId} className="p-1 text-white/70 hover:text-white">
                      {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    <span className="text-white/70 text-xs">اسمك في الملعب: </span>
                    <span className="text-white font-black text-sm font-mono tracking-wide">{user.playerId}</span>
                  </div>

                  <button
                    onClick={() => {
                      audioManager.playClick();
                      onFriendRoom();
                    }}
                    disabled={!online}
                    className="w-full flex items-center justify-center gap-2 bg-white text-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed font-black text-sm py-3 rounded-full mb-2 active:scale-95 transition-transform"
                  >
                    🤝 العب مع صحبك
                  </button>

                </>
              )}
            </>
          )}

          {found && (
            <div className="text-center py-4">
              <p className="text-sm font-black text-white mb-6">لقينا منافس!</p>
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <PlayerAvatarBadge avatar={found.avatar} size="lg" />
                  <div className="text-white text-xs font-black mt-2">{found.nameAr || found.name}</div>
                </div>
                <span className="text-xl font-black text-amber-300">VS</span>
                <div className="text-center">
                  <PlayerAvatarBadge avatar={user.avatar} size="lg" />
                  <div className="text-white text-xs font-black mt-2">{user.nameAr || user.username}</div>
                </div>
              </div>
              <p className="text-xs text-white/60 mt-6">داخلين الماتش...</p>
            </div>
          )}

          {!found && !searching && !inviteSentTo && (
            <button
              onClick={() => {
                audioManager.playClick();
                onPlayAi();
              }}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-l from-emerald-600 to-emerald-400 text-zinc-950 font-black text-xs py-2.5 rounded-full mt-1"
            >
              <Bot className="w-4 h-4" />
              تحدّي الـ AI
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
