// ============================================================
// أنت المدرب | جدول الترتيب الرسمي (League Table Standings)
// ============================================================

import React from 'react';
import { LeagueStandingRow } from '../../types/coachGameTypes';
import { Trophy, TrendingUp, Award, Shield } from 'lucide-react';

interface LeagueTableStandingsProps {
  standings: LeagueStandingRow[];
  userTeamId: string;
  leagueTitleAr: string;
  allTeams?: import('../../types/coachGameTypes').CoachTeam[];
}

export const LeagueTableStandings: React.FC<LeagueTableStandingsProps> = ({
  standings,
  userTeamId,
  leagueTitleAr,
  allTeams
}) => {
  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
        <div>
          <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            جدول ترتيب {leagueTitleAr}
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            يتأهل أصحاب المراكز الأولى إلى الأدوار الإقصائية والبطولات القارية الكبرى
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs font-bold">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> دوري أبطال أوروبا
          </span>
          <span className="flex items-center gap-1 text-red-400">
            <span className="w-2 h-2 rounded-full bg-red-400" /> منطقة الخطر
          </span>
        </div>
      </div>

      {/* Standings Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-right text-xs">
          <thead>
            <tr className="border-b border-zinc-800 text-zinc-400 font-bold">
              <th className="py-2.5 px-2 text-center w-8">#</th>
              <th className="py-2.5 px-3">النادي</th>
              <th className="py-2.5 px-2 text-center">لعب</th>
              <th className="py-2.5 px-2 text-center">فوز</th>
              <th className="py-2.5 px-2 text-center">تعادل</th>
              <th className="py-2.5 px-2 text-center">خسارة</th>
              <th className="py-2.5 px-2 text-center">له</th>
              <th className="py-2.5 px-2 text-center">عليه</th>
              <th className="py-2.5 px-2 text-center">الفارق</th>
              <th className="py-2.5 px-3 text-center text-amber-400 font-black">النقاط</th>
              <th className="py-2.5 px-3 text-center">آخر 5</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/60 font-medium">
            {standings.map((row, idx) => {
              const isUserTeam = row.teamId === userTeamId;
              const pos = idx + 1;

              return (
                <tr
                  key={row.teamId}
                  className={`transition-colors ${
                    isUserTeam
                      ? 'bg-amber-500/15 font-bold text-white border-l-4 border-l-amber-400 shadow-sm'
                      : 'hover:bg-zinc-800/40 text-zinc-200'
                  }`}
                >
                  {/* Position */}
                  <td className="py-3 px-2 text-center font-mono">
                    <span
                      className={`inline-flex items-center justify-center w-5 h-5 rounded-md text-[11px] font-black ${
                        pos === 1
                          ? 'bg-amber-400 text-zinc-950 font-black'
                          : pos <= 3
                          ? 'bg-emerald-500/20 text-emerald-400 font-bold'
                          : pos >= standings.length - 1
                          ? 'bg-rose-500/20 text-rose-400 font-bold'
                          : 'text-zinc-400'
                      }`}
                    >
                      {pos}
                    </span>
                  </td>

                  {/* Team Name and Logo */}
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-6 h-6 rounded-md bg-zinc-800 flex items-center justify-center font-black text-amber-400 text-[10px] flex-shrink-0">
                        {row.teamName.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="truncate max-w-[130px] sm:max-w-none">
                        {row.teamNameAr || row.teamName}
                      </span>
                      {(() => {
                        const teamObj = allTeams?.find((t) => t.id === row.teamId);
                        const isHuman = teamObj?.controllerType === 'HUMAN' || isUserTeam;
                        if (isUserTeam) {
                          return (
                            <span className="px-1.5 py-0.5 rounded bg-amber-400 text-zinc-950 text-[9px] font-black mr-1">
                              فريقك 👤
                            </span>
                          );
                        }
                        if (isHuman) {
                          return (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-bold mr-1">
                              بشري 👤
                            </span>
                          );
                        }
                        return (
                          <span className="px-1 py-0.2 rounded bg-zinc-800 text-zinc-400 text-[9px] font-mono mr-1">
                            🤖 AI
                          </span>
                        );
                      })()}
                    </div>
                  </td>

                  {/* Played, Won, Drawn, Lost */}
                  <td className="py-3 px-2 text-center font-mono text-zinc-300">{row.played}</td>
                  <td className="py-3 px-2 text-center font-mono text-emerald-400">{row.won}</td>
                  <td className="py-3 px-2 text-center font-mono text-zinc-400">{row.drawn}</td>
                  <td className="py-3 px-2 text-center font-mono text-rose-400">{row.lost}</td>

                  {/* Goals */}
                  <td className="py-3 px-2 text-center font-mono text-zinc-400">{row.goalsFor}</td>
                  <td className="py-3 px-2 text-center font-mono text-zinc-400">{row.goalsAgainst}</td>
                  <td className="py-3 px-2 text-center font-mono font-bold">
                    <span className={row.goalDifference > 0 ? 'text-emerald-400' : row.goalDifference < 0 ? 'text-rose-400' : 'text-zinc-400'}>
                      {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                    </span>
                  </td>

                  {/* Points */}
                  <td className="py-3 px-3 text-center font-mono text-sm font-black text-amber-400">
                    {row.points}
                  </td>

                  {/* Form Guide */}
                  <td className="py-3 px-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {row.form.length === 0 ? (
                        <span className="text-zinc-600 text-[10px]">-</span>
                      ) : (
                        row.form.map((res, fIdx) => (
                          <span
                            key={fIdx}
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white ${
                              res === 'W'
                                ? 'bg-emerald-500'
                                : res === 'D'
                                ? 'bg-zinc-600'
                                : 'bg-rose-500'
                            }`}
                          >
                            {res === 'W' ? 'ف' : res === 'D' ? 'ت' : 'خ'}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
