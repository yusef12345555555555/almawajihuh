// ============================================================
// العبها صح | EL3BHA SA7 - Real-Time Tournaments Hub & Management Page
// With "اعمل بطولة", Real Statuses, Strict Game-Level Filtering, Lock, and Bracket Views
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Crown,
  Plus,
  Users,
  User,
  Sparkles,
  Lock,
  Flame,
  CheckCircle2,
  Clock,
  ChevronRight,
  Medal,
  Swords,
  Coins,
  Filter,
  Gavel,
  EyeOff,
  BrainCircuit,
  Globe
} from 'lucide-react';
import { UserProfile } from '../types';
import { TournamentEntity, TournamentMatchSlot, TournamentGameId } from '../types/tournamentTypes';
import { TournamentEngineService } from '../services/tournamentEngineService';
import { CreateTournamentModal } from './CreateTournamentModal';
import { TournamentDetailsBracketView } from './TournamentDetailsBracketView';
import { TournamentMatchArena } from './TournamentMatchArena';
import { audioManager } from '../services/audioManager';

interface TournamentsPageProps {
  user: UserProfile;
  onUpdateUser: (user: UserProfile) => void;
  onBack: () => void;
}

export type TournamentGameFilter = 'ALL' | TournamentGameId;

export const TournamentsPage: React.FC<TournamentsPageProps> = ({
  user,
  onUpdateUser,
  onBack
}) => {
  const [tournaments, setTournaments] = useState<TournamentEntity[]>(() =>
    TournamentEngineService.getAllTournaments()
  );
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedTournament, setSelectedTournament] = useState<TournamentEntity | null>(null);
  const [activeMatchArena, setActiveMatchArena] = useState<{
    tournament: TournamentEntity;
    match: TournamentMatchSlot;
  } | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'FINISHED'>('ALL');
  const [gameFilter, setGameFilter] = useState<TournamentGameFilter>('ALL');

  // Real-time Event Listener for Tournaments
  useEffect(() => {
    const unsub = TournamentEngineService.subscribe(() => {
      setTournaments(TournamentEngineService.getAllTournaments());
      if (selectedTournament) {
        const fresh = TournamentEngineService.getTournamentById(selectedTournament.id);
        if (fresh) setSelectedTournament(fresh);
      }
    });
    return () => unsub();
  }, [selectedTournament]);

  const handleJoinTournament = (t: TournamentEntity) => {
    audioManager.playClick();
    const res = TournamentEngineService.joinTournament(t.id, user);
    if (res.success && res.tournament) {
      setTournaments(TournamentEngineService.getAllTournaments());
      setSelectedTournament(res.tournament);
    } else {
      alert(res.message);
    }
  };

  const handleOpenDetails = (t: TournamentEntity) => {
    audioManager.playClick();
    setSelectedTournament(t);
  };

  const handleMatchComplete = (homeScore: number, awayScore: number) => {
    if (!activeMatchArena) return;
    const { tournament, match } = activeMatchArena;
    TournamentEngineService.recordMatchResultAndAdvance(
      tournament.id,
      match.id,
      homeScore,
      awayScore
    );
    const updated = TournamentEngineService.getTournamentById(tournament.id);
    if (updated) {
      setSelectedTournament(updated);
    }
    setActiveMatchArena(null);
  };

  // If in active fullscreen match arena, render only the arena (No App Navbar)
  if (activeMatchArena) {
    return (
      <TournamentMatchArena
        tournament={activeMatchArena.tournament}
        match={activeMatchArena.match}
        user={user}
        onMatchComplete={handleMatchComplete}
        onExit={() => setActiveMatchArena(null)}
      />
    );
  }

  // If viewing specific tournament details & bracket
  if (selectedTournament) {
    return (
      <TournamentDetailsBracketView
        tournament={selectedTournament}
        user={user}
        onBack={() => setSelectedTournament(null)}
        onEnterMatch={(match) =>
          setActiveMatchArena({ tournament: selectedTournament, match })
        }
        onTournamentUpdated={(updated) => setSelectedTournament(updated)}
      />
    );
  }

  const filteredTournaments = tournaments.filter((t) => {
    // 1. Status Filter
    if (statusFilter === 'OPEN' && !(t.status === 'OPEN' || t.status === 'ALMOST_FULL')) return false;
    if (statusFilter === 'IN_PROGRESS' && !(t.status === 'IN_PROGRESS' || t.status === 'FULL')) return false;
    if (statusFilter === 'FINISHED' && t.status !== 'FINISHED') return false;

    // 2. Game Filter
    if (gameFilter !== 'ALL' && t.gameId !== gameFilter) return false;

    return true;
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-16 text-white select-none">
      {/* Header & "اعمل بطولة" Button */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-950/40 via-zinc-950 to-zinc-950 border-2 border-amber-500/40 p-6 sm:p-8 shadow-[0_0_60px_rgba(245,158,11,0.2)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xs font-black">
            <Trophy className="w-4 h-4" />
            <span>نظام البطولات التنافسية الرسمي</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white">
            ساحة البطولات والكؤوس الكبرى 🏆
          </h1>
          <p className="text-xs sm:text-sm text-zinc-300 max-w-xl leading-relaxed">
            أنشئ بطولتك باللعبة والنمط المفضل عندك، أو انضم لكؤوس المزاد واللاعب الخفي والتحديات التكتيكية المباشرة وتنافس على جوائز الكوينز ورصيد النقاط العالمي!
          </p>
        </div>

        {/* Primary Action Button: اعمل بطولة */}
        <button
          id="create_tournament_btn"
          onClick={() => {
            audioManager.playClick();
            setIsCreateModalOpen(true);
          }}
          className="w-full md:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-amber-400 via-amber-500 to-yellow-500 hover:brightness-110 text-zinc-950 font-black text-base shadow-[0_0_30px_rgba(245,158,11,0.6)] flex items-center justify-center gap-2 transition-all cursor-pointer"
        >
          <Plus className="w-6 h-6 stroke-[3]" />
          <span>اعمل بطولة 🏆</span>
        </button>
      </div>

      {/* Game Filter Bar */}
      <div className="bg-zinc-950/80 border border-zinc-800 p-2.5 rounded-2xl space-y-2">
        <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-zinc-400">
          <Filter className="w-3.5 h-3.5 text-amber-400" />
          <span>تصفية بطولات الكؤوس بحسب اللعبة:</span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'ALL', label: 'كل الألعاب', icon: <Globe className="w-3.5 h-3.5" /> },
            { id: 'AUCTION', label: 'المزاد', icon: <Gavel className="w-3.5 h-3.5" /> },
            { id: 'PLAYER_OR_HIDDEN', label: 'اللاعب الخفي', icon: <EyeOff className="w-3.5 h-3.5" /> },
            { id: 'HOARTAGY_HUNTER', label: 'الحوارتجي والصياد', icon: <Flame className="w-3.5 h-3.5" /> },
            { id: 'SAFI', label: 'صفّي', icon: <Swords className="w-3.5 h-3.5" /> },
            { id: 'DEAL_OR_NO_DEAL', label: 'ديل أو نو ديل', icon: <Gavel className="w-3.5 h-3.5" /> }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                audioManager.playClick();
                setGameFilter(tab.id as any);
              }}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                gameFilter === tab.id
                  ? 'bg-amber-500 text-zinc-950 font-black shadow-[0_0_15px_rgba(245,158,11,0.4)]'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { id: 'ALL', label: 'كل الحالات' },
            { id: 'OPEN', label: 'المفتوحة للتسجيل' },
            { id: 'IN_PROGRESS', label: 'الجارية دلوقتي' },
            { id: 'FINISHED', label: 'البطولات المنتهية' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                audioManager.playClick();
                setStatusFilter(tab.id as any);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                statusFilter === tab.id
                  ? 'bg-amber-400 text-zinc-950 shadow-md'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <span className="text-xs text-zinc-500 font-bold hidden sm:inline-block">
          إجمالي البطولات: {filteredTournaments.length}
        </span>
      </div>

      {/* Tournaments Grid - 2 columns on mobile (grid-cols-2) */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-5">
        {filteredTournaments.map((t) => {
          const isUserParticipant = t.participants.some((p) => p.id === user.id);
          const isFull = t.participants.length >= t.capacity;
          const remainingSlots = t.capacity - t.participants.length;

          return (
            <div
              key={t.id}
              className={`group relative rounded-2xl sm:rounded-3xl border-2 transition-all p-3 sm:p-5 flex flex-col justify-between space-y-2.5 sm:space-y-4 ${
                t.status === 'FINISHED'
                  ? 'bg-zinc-950/70 border-zinc-800'
                  : isUserParticipant
                  ? 'bg-gradient-to-b from-amber-500/10 via-zinc-950 to-zinc-950 border-amber-400/80 ring-1 sm:ring-2 ring-amber-400/30'
                  : 'bg-zinc-950 border-zinc-800 hover:border-amber-500/50'
              }`}
            >
              <div>
                {/* Top Badges */}
                <div className="flex flex-wrap items-center justify-between gap-1 mb-2">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="px-1.5 sm:px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[9px] sm:text-[10px] font-black">
                      {t.type === 'INDIVIDUAL' ? 'فردية' : 'فرق'}
                    </span>
                    <span className="px-1.5 sm:px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 text-[9px] sm:text-[10px] font-bold truncate max-w-[80px] sm:max-w-none">
                      {t.gameNameAr}
                    </span>
                  </div>

                  {/* Status Indicator */}
                  {t.status === 'OPEN' && (
                    <span className="text-emerald-400 text-[9px] sm:text-[11px] font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      باقي {remainingSlots}
                    </span>
                  )}
                  {t.status === 'ALMOST_FULL' && (
                    <span className="text-amber-400 text-[9px] sm:text-[11px] font-black flex items-center gap-0.5">
                      <Flame className="w-3 h-3 text-amber-400" />
                      آخر مكان!
                    </span>
                  )}
                  {t.status === 'FULL' && (
                    <span className="text-red-400 text-[9px] sm:text-[11px] font-black">مكتملة</span>
                  )}
                  {t.status === 'IN_PROGRESS' && (
                    <span className="text-amber-300 text-[9px] sm:text-[11px] font-black animate-pulse">
                      ⚡ جارية
                    </span>
                  )}
                  {t.status === 'FINISHED' && (
                    <span className="text-zinc-500 text-[9px] sm:text-[11px] font-black">🏆 منتهية</span>
                  )}
                </div>

                {/* Tournament Title & Mode */}
                <h3 className="text-xs sm:text-base font-black text-white group-hover:text-amber-400 transition-colors line-clamp-1">
                  {t.name}
                </h3>
                <p className="text-[10px] sm:text-xs text-zinc-400 mt-0.5 truncate">{t.gameModeLabelAr}</p>

                {/* Progress of Participants */}
                <div className="mt-2.5 sm:mt-4 space-y-1">
                  <div className="flex items-center justify-between text-[10px] sm:text-xs font-bold text-zinc-400">
                    <span>المشتركون:</span>
                    <span className="text-amber-400">
                      {t.participants.length} / {t.capacity}
                    </span>
                  </div>
                  <div className="w-full h-1.5 sm:h-2 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-500"
                      style={{ width: `${(t.participants.length / t.capacity) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Champion Tag if finished */}
                {t.status === 'FINISHED' && t.champion && (
                  <div className="mt-2 p-1.5 sm:p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[10px] sm:text-xs font-black text-amber-300 flex items-center gap-1.5">
                    <Crown className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                    <span className="truncate">البطل: {t.champion.name}</span>
                  </div>
                )}
              </div>

              {/* Card Footer Actions */}
              <div className="pt-2 sm:pt-4 border-t border-zinc-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-1.5">
                <div className="text-[10px] sm:text-xs flex items-center justify-between sm:block">
                  <span className="text-zinc-500 text-[9px] sm:text-[10px] block">الجائزة:</span>
                  <span className="font-black text-amber-400">
                    {t.prizePoolCoins.toLocaleString()} 🪙
                  </span>
                </div>

                <div className="flex items-center gap-1 sm:gap-2">
                  <button
                    onClick={() => handleOpenDetails(t)}
                    className="flex-1 sm:flex-none px-2 sm:px-3 py-1.5 rounded-lg sm:rounded-xl bg-zinc-800 hover:bg-zinc-700 text-[10px] sm:text-xs font-bold text-zinc-200 transition-colors cursor-pointer text-center"
                  >
                    عرض
                  </button>

                  {t.status === 'OPEN' || t.status === 'ALMOST_FULL' ? (
                    isUserParticipant ? (
                      <span className="px-2 sm:px-3 py-1.5 rounded-lg sm:rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-[10px] sm:text-xs font-black text-center">
                        مسجل
                      </span>
                    ) : (
                      <button
                        onClick={() => handleJoinTournament(t)}
                        className="flex-1 sm:flex-none px-2 sm:px-3.5 py-1.5 rounded-lg sm:rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-zinc-950 font-black text-[10px] sm:text-xs shadow-md transition-all cursor-pointer text-center"
                      >
                        انضمام
                      </button>
                    )
                  ) : t.status === 'FULL' ? (
                    <span className="px-1.5 sm:px-2 py-1.5 rounded-lg sm:rounded-xl bg-zinc-800 text-zinc-500 text-[9px] sm:text-xs font-black text-center">
                      مكتملة
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal for Creating New Tournament */}
      <CreateTournamentModal
        user={user}
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTournamentCreated={(newTour) => {
          setTournaments(TournamentEngineService.getAllTournaments());
          setSelectedTournament(newTour);
        }}
      />
    </div>
  );
};
