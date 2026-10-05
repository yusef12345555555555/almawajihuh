// ============================================================
// أنت المدرب | الشاشة الرئيسية لإدارة الفريق (Manager Overview Hub)
// ============================================================

import React from 'react';
import {
  CoachTeam,
  CoachScheduleMatch,
  LeagueStandingRow,
  CoachSquadPlayer,
  CoachCalendarFixture
} from '../types/coachGameTypes';
import {
  Trophy,
  Shield,
  Activity,
  Flame,
  AlertTriangle,
  Play,
  Sliders,
  Calendar,
  Award,
  Users,
  TrendingUp,
  Coins,
  ArrowRightLeft,
  ChevronLeft
} from 'lucide-react';

interface ManagerOverviewTabProps {
  userTeam: CoachTeam;
  currentMatchday: number;
  totalMatchdays: number;
  competitionTitleAr: string;
  managerPoints?: number;
  upcomingCalendarFixtures?: CoachCalendarFixture[];
  nextMatch?: CoachScheduleMatch;
  nextOpponentTeam?: CoachTeam;
  standings?: LeagueStandingRow[];
  boardConfidence: number;
  fanConfidence: number;
  onOpenPreMatch: () => void;
  onOpenTactics: () => void;
  onOpenTraining: () => void;
  onOpenTransfers: () => void;
  onOpenTable: () => void;
  onOpenTrophyRoom: () => void;
}

export const ManagerOverviewTab: React.FC<ManagerOverviewTabProps> = ({
  userTeam,
  currentMatchday,
  totalMatchdays,
  competitionTitleAr,
  managerPoints = 500,
  upcomingCalendarFixtures = [],
  nextMatch,
  nextOpponentTeam,
  standings,
  boardConfidence,
  fanConfidence,
  onOpenPreMatch,
  onOpenTactics,
  onOpenTraining,
  onOpenTransfers,
  onOpenTable,
  onOpenTrophyRoom
}) => {
  // Stats
  const starters = userTeam.squad.filter((p) => userTeam.startingXI.includes(p.id));
  const avgFitness = Math.round(
    userTeam.squad.reduce((sum, p) => sum + p.fitness, 0) / (userTeam.squad.length || 1)
  );

  const injuredPlayers = userTeam.squad.filter(
    (p) => p.injuryStatus && p.injuryStatus.weeksRemaining > 0
  );
  const suspendedPlayers = userTeam.squad.filter(
    (p) => p.suspensionStatus && p.suspensionStatus.matchesRemaining > 0
  );

  // Top scorer & top assister
  const topScorer = [...userTeam.squad].sort((a, b) => b.goals - a.goals)[0];
  const topAssister = [...userTeam.squad].sort((a, b) => b.assists - a.assists)[0];

  // User rank in standings
  const userRankIndex = standings?.findIndex((s) => s.teamId === userTeam.id) ?? -1;
  const userRank = userRankIndex >= 0 ? userRankIndex + 1 : 1;
  const userRow = userRankIndex >= 0 && standings ? standings[userRankIndex] : null;

  const isHomeNext = nextMatch ? nextMatch.homeTeamId === userTeam.id : true;

  return (
    <div className="space-y-6 animate-fadeIn pb-10">
      {/* Club Identity & Matchday Banner */}
      <div
        className="rounded-3xl p-6 md:p-8 border border-slate-700/80 shadow-2xl relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${userTeam.primaryColor}25 0%, #0b1329 60%, ${userTeam.secondaryColor}15 100%)`
        }}
      >
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 md:w-20 md:h-20 rounded-2xl flex items-center justify-center font-black text-2xl shadow-xl border-2"
              style={{
                backgroundColor: userTeam.primaryColor,
                color: userTeam.secondaryColor,
                borderColor: `${userTeam.secondaryColor}55`
              }}
            >
              {userTeam.shortName}
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-black text-white">{userTeam.nameAr}</h1>
                <span className="text-xs px-2.5 py-1 rounded-full bg-slate-800/90 text-amber-400 font-bold border border-slate-700">
                  الجولة {currentMatchday} من {totalMatchdays}
                </span>
              </div>
              <p className="text-xs text-slate-300 flex items-center gap-2">
                <span>{competitionTitleAr}</span>
                <span>•</span>
                <span>ملعب {userTeam.stadiumName}</span>
              </p>
            </div>
          </div>

          {/* Quick Confidence & Stature */}
          <div className="flex items-center gap-3 self-stretch md:self-auto justify-between bg-slate-900/80 p-3 rounded-2xl border border-slate-700/60 backdrop-blur-sm">
            <div className="text-center px-3">
              <div className="text-[11px] text-slate-400">المركز الحالي</div>
              <div className="text-xl font-black text-amber-400">
                {userRank} <span className="text-xs font-normal text-slate-400">({userRow?.points || 0} ن)</span>
              </div>
            </div>

            <div className="w-px h-8 bg-slate-700" />

            <div className="text-center px-3">
              <div className="text-[11px] text-slate-400">ثقة الإدارة</div>
              <div className="text-xl font-black text-emerald-400">{boardConfidence}%</div>
            </div>

            <div className="w-px h-8 bg-slate-700" />

            <div className="text-center px-3">
              <div className="text-[11px] text-slate-400">ثقة الجماهير</div>
              <div className="text-xl font-black text-blue-400">{fanConfidence}%</div>
            </div>

            <div className="w-px h-8 bg-slate-700" />

            <div className="text-center px-3">
              <div className="text-[11px] text-slate-400">نقاط المدرب</div>
              <div className="text-xl font-black text-amber-400 flex items-center justify-center gap-1">
                <span>🌟</span>
                <span>{managerPoints}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Next Match Highlight Card */}
      {nextOpponentTeam && (
        <div className="bg-gradient-to-r from-slate-900 via-slate-800/95 to-slate-900 rounded-3xl p-6 md:p-7 border-2 border-emerald-500/40 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-400 uppercase tracking-wide">
              <Flame className="w-4 h-4 text-emerald-400" />
              <span>المباراة القادمة الحاسمة (Next Fixture)</span>
            </div>
            <span className="text-xs text-slate-400">
              {isHomeNext ? 'داخل الديار (أرضنا)' : `خارج الديار (${nextOpponentTeam.stadiumName})`}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-2">
            {/* User */}
            <div className="flex items-center gap-3 text-right">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base shadow"
                style={{
                  backgroundColor: userTeam.primaryColor,
                  color: userTeam.secondaryColor
                }}
              >
                {userTeam.shortName}
              </div>
              <div>
                <div className="text-base font-black text-white">{userTeam.nameAr}</div>
                <div className="text-xs text-slate-400">تقييم: {userTeam.overallRating}</div>
              </div>
            </div>

            {/* VS Badge */}
            <div className="text-center px-4 py-1.5 rounded-full bg-slate-950/80 border border-slate-700 text-amber-400 font-black text-sm">
              VS
            </div>

            {/* Opponent */}
            <div className="flex items-center gap-3 text-left flex-row-reverse">
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-base shadow"
                style={{
                  backgroundColor: nextOpponentTeam.primaryColor,
                  color: nextOpponentTeam.secondaryColor
                }}
              >
                {nextOpponentTeam.shortName}
              </div>
              <div>
                <div className="text-base font-black text-white">{nextOpponentTeam.nameAr}</div>
                <div className="text-xs text-slate-400">تقييم: {nextOpponentTeam.overallRating}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-700/60">
            <div className="text-xs text-slate-300">
              أسلوب الخصم: <span className="text-amber-300 font-bold">{nextOpponentTeam.playingStyle}</span> • خطة: <span className="text-white font-bold">{nextOpponentTeam.formation}</span>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                onClick={onOpenTactics}
                className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition flex items-center justify-center gap-1.5"
              >
                <Sliders className="w-3.5 h-3.5 text-amber-400" />
                <span>التشكيل</span>
              </button>

              <button
                onClick={onOpenPreMatch}
                className="flex-1 sm:flex-initial px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-xs font-black shadow-lg shadow-emerald-900/30 transition flex items-center justify-center gap-2 hover:scale-[1.02]"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>الاستكشاف والانطلاق (Kickoff)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid of Key Management Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 1. Squad Physical Condition & Medical Report */}
        <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>اللياقة والتقرير الطبي</span>
            </div>
            <span className="text-xs font-bold text-emerald-400">{avgFitness}% متوسط</span>
          </div>

          <div className="space-y-3">
            {/* Fitness gauge */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>جاهزية التشكيل الأساسي</span>
                <span className="text-white font-bold">{avgFitness}%</span>
              </div>
              <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  style={{ width: `${avgFitness}%` }}
                  className={`h-full rounded-full transition-all ${
                    avgFitness >= 88 ? 'bg-emerald-500' : avgFitness >= 80 ? 'bg-amber-500' : 'bg-red-500'
                  }`}
                />
              </div>
            </div>

            {/* Medical & Suspension Alerts */}
            <div className="space-y-2 text-xs pt-1">
              <div className="flex items-center justify-between bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
                <span className="text-slate-400">الإصابات الحالية:</span>
                <span className={injuredPlayers.length > 0 ? 'text-red-400 font-bold' : 'text-emerald-400 font-semibold'}>
                  {injuredPlayers.length === 0 ? 'لا توجد إصابات' : `${injuredPlayers.length} لاعبين في العيادة`}
                </span>
              </div>

              <div className="flex items-center justify-between bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
                <span className="text-slate-400">الإيقافات الانضباطية:</span>
                <span className={suspendedPlayers.length > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
                  {suspendedPlayers.length === 0 ? 'الكل متاح للمشاركة' : `${suspendedPlayers.length} لاعبين موقوفين`}
                </span>
              </div>
            </div>

            <button
              onClick={onOpenTraining}
              className="w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-bold text-emerald-300 border border-emerald-500/20 transition flex items-center justify-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5" />
              <span>إدارة الحصص التدريبية والاستشفاء</span>
            </button>
          </div>
        </div>

        {/* 2. Board Objectives & Confidence */}
        <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Award className="w-4 h-4 text-amber-400" />
              <span>أهداف الإدارة والتقييم</span>
            </div>
            <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-bold">
              {boardConfidence >= 75 ? 'راضية تماماً' : boardConfidence >= 50 ? 'مستقرة' : 'تحت الضغط'}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/50 space-y-1">
              <div className="text-slate-400">الهدف المسطر للموسم:</div>
              <div className="font-bold text-white">
                {userTeam.boardExpectations?.leagueObjectiveAr || 'المنافسة على اللقب'}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>مؤشر رضا الإدارة:</span>
                <span className="font-bold text-emerald-400">{boardConfidence}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  style={{ width: `${boardConfidence}%` }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>

              <div className="flex justify-between text-slate-400 pt-1">
                <span>مؤشر حماس الجماهير:</span>
                <span className="font-bold text-blue-400">{fanConfidence}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  style={{ width: `${fanConfidence}%` }}
                  className="h-full bg-blue-500 rounded-full"
                />
              </div>
            </div>

            <button
              onClick={onOpenTable}
              className="w-full py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-bold text-blue-300 border border-blue-500/20 transition flex items-center justify-center gap-1.5 mt-2"
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>عرض جدول الترتيب العام والمنافسة</span>
            </button>
          </div>
        </div>

        {/* 3. Top Stars & Financial Power */}
        <div className="bg-slate-900/90 rounded-2xl p-5 border border-slate-800 space-y-4 shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Trophy className="w-4 h-4 text-purple-400" />
              <span>الأبرز وسوق الانتقالات</span>
            </div>
            {!userTeam.isNationalTeam && (
              <span className="text-xs text-emerald-400 font-bold">
                €{userTeam.budget?.transfer || 0}M رصيد
              </span>
            )}
          </div>

          <div className="space-y-2.5 text-xs">
            {topScorer && (
              <div className="flex items-center justify-between bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
                <div>
                  <div className="text-slate-400 text-[10px]">هداف الفريق:</div>
                  <div className="font-bold text-white">{topScorer.nameAr}</div>
                </div>
                <div className="text-right">
                  <span className="font-black text-amber-400 text-sm">{topScorer.goals}</span>
                  <span className="text-[10px] text-slate-400 mr-1">أهداف</span>
                </div>
              </div>
            )}

            {topAssister && (
              <div className="flex items-center justify-between bg-slate-800/60 p-2.5 rounded-xl border border-slate-700/50">
                <div>
                  <div className="text-slate-400 text-[10px]">الأكثر صناعة:</div>
                  <div className="font-bold text-white">{topAssister.nameAr}</div>
                </div>
                <div className="text-right">
                  <span className="font-black text-blue-400 text-sm">{topAssister.assists}</span>
                  <span className="text-[10px] text-slate-400 mr-1">تمريرات</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                onClick={onOpenTransfers}
                className="py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-bold text-amber-300 border border-amber-500/20 transition flex items-center justify-center gap-1"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>{userTeam.isNationalTeam ? 'الاستدعاءات' : 'سوق الصفقات'}</span>
              </button>

              <button
                onClick={onOpenTrophyRoom}
                className="py-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-xs font-bold text-purple-300 border border-purple-500/20 transition flex items-center justify-center gap-1"
              >
                <Award className="w-3.5 h-3.5" />
                <span>خزانة الكؤوس</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
