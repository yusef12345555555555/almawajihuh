// ============================================================
// أنت المدرب | أفضل المدربين في الدوري حتى دلوقتي
//
// Purely derived from the ACTUAL current-season standings —
// never hard-coded famous managers. Distinguishes current-season
// performance from the manager's all-time career reputation.
// ============================================================

import React from 'react';
import { CoachTeam, LeagueStandingRow } from '../../types/coachGameTypes';
import { Crown, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ManagerLeagueRankingPanelProps {
  standings: LeagueStandingRow[];
  allTeams: CoachTeam[];
  userTeamId: string;
}

function formIndicator(form: ('W' | 'D' | 'L')[] = []) {
  const lastFive = form.slice(-5);
  const wins = lastFive.filter((f) => f === 'W').length;
  const losses = lastFive.filter((f) => f === 'L').length;
  if (wins >= 3) return { icon: TrendingUp, color: 'text-emerald-400' };
  if (losses >= 3) return { icon: TrendingDown, color: 'text-rose-400' };
  return { icon: Minus, color: 'text-zinc-400' };
}

export const ManagerLeagueRankingPanel: React.FC<ManagerLeagueRankingPanelProps> = ({
  standings,
  allTeams,
  userTeamId
}) => {
  // Rank managers by the same current-season criteria as the league table
  // itself (points, then goal difference, then goals scored) — this is
  // "so far this season", not all-time career reputation.
  const ranked = [...standings].sort(
    (a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor
  );

  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Crown className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-black text-white">أفضل المدربين في الدوري حتى دلوقتي</h3>
      </div>
      <p className="text-[11px] text-zinc-500 -mt-2">
        ترتيب حسب أداء الموسم الحالي فقط (النقاط، فارق الأهداف، الأهداف المسجلة) — لا علاقة له بسمعة المدرب طويلة المدى.
      </p>
      <div className="space-y-1.5">
        {ranked.map((row, idx) => {
          const team = allTeams.find((t) => t.id === row.teamId);
          const managerName = team?.manager?.nameAr || team?.currentManager?.nameAr || team?.manager?.name || 'مدرب غير معروف';
          const isUser = row.teamId === userTeamId;
          const Indicator = formIndicator(row.form).icon;
          return (
            <div
              key={row.teamId}
              className={`flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs ${
                isUser
                  ? 'bg-amber-500/10 border-amber-500/40'
                  : 'bg-zinc-950/50 border-zinc-800'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className={`w-5 text-center font-black ${idx < 3 ? 'text-amber-400' : 'text-zinc-500'}`}>
                  {idx + 1}
                </span>
                <div className="min-w-0">
                  <div className={`font-bold truncate ${isUser ? 'text-amber-300' : 'text-white'}`}>
                    {managerName} {isUser && '(أنت)'}
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate">{row.teamNameAr}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Indicator className={`w-3.5 h-3.5 ${formIndicator(row.form).color}`} />
                <span className="text-zinc-400">{row.played} م</span>
                <span className="font-black text-white">{row.points} ن</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
