// ============================================================
// أنت المدرب | شجرة الأدوار الإقصائية (Knockout Bracket Visualizer)
// ============================================================

import React from 'react';
import { CoachTournamentRoundItem } from '../../types/coachGameTypes';
import { Trophy, Shield, Award, ChevronLeft } from 'lucide-react';

interface KnockoutBracketVisualizerProps {
  rounds: CoachTournamentRoundItem[];
  userTeamId: string;
  tournamentNameAr: string;
  championTeamNameAr?: string;
}

export const KnockoutBracketVisualizer: React.FC<KnockoutBracketVisualizerProps> = ({
  rounds,
  userTeamId,
  tournamentNameAr,
  championTeamNameAr
}) => {
  return (
    <div className="bg-zinc-900/90 border border-zinc-800 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-6">
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div>
          <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            شجرة الأدوار الإقصائية — {tournamentNameAr}
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            خروج المغلوب مباشرة: الفائز يعبر للدور القادم والخاسر يودع البطولة
          </p>
        </div>

        {championTeamNameAr && (
          <div className="px-3 py-1 bg-amber-500/20 border border-amber-400/40 rounded-xl flex items-center gap-2 text-amber-300 font-black text-xs">
            <Award className="w-4 h-4 text-amber-400" />
            <span>البطل المتوج: {championTeamNameAr}</span>
          </div>
        )}
      </div>

      {/* Rounds Horizontal Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {rounds.map((round, rIdx) => (
          <div key={round.roundName} className="space-y-3">
            <div className="text-center pb-2 border-b border-zinc-800/80">
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider">
                {round.roundNameAr}
              </span>
            </div>

            <div className="space-y-3">
              {round.matches.map((m, mIdx) => {
                const isUserMatch = m.homeTeamId === userTeamId || m.awayTeamId === userTeamId;
                const homeWon = m.played && m.homeScore > m.awayScore;
                const awayWon = m.played && m.awayScore > m.homeScore;

                return (
                  <div
                    key={`bracket_match_${rIdx}_${mIdx}`}
                    className={`p-3 rounded-2xl border transition-all ${
                      isUserMatch
                        ? 'bg-amber-500/10 border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
                        : 'bg-zinc-950/80 border-zinc-800'
                    }`}
                  >
                    {/* Home team */}
                    <div className="flex items-center justify-between py-1">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center font-black text-[9px] text-amber-400">
                          {m.homeTeamName.substring(0, 2).toUpperCase()}
                        </div>
                        <span
                          className={`text-xs font-black ${
                            m.homeTeamId === userTeamId ? 'text-amber-400' : 'text-zinc-200'
                          } ${homeWon ? 'underline decoration-amber-400 decoration-2' : ''}`}
                        >
                          {m.homeTeamNameAr}
                        </span>
                      </div>
                      <span className="font-mono font-black text-xs text-white">
                        {m.played ? m.homeScore : '-'}
                      </span>
                    </div>

                    {/* Away team */}
                    <div className="flex items-center justify-between py-1 border-t border-zinc-800/60 mt-1">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded bg-zinc-800 flex items-center justify-center font-black text-[9px] text-blue-400">
                          {m.awayTeamName.substring(0, 2).toUpperCase()}
                        </div>
                        <span
                          className={`text-xs font-black ${
                            m.awayTeamId === userTeamId ? 'text-amber-400' : 'text-zinc-200'
                          } ${awayWon ? 'underline decoration-amber-400 decoration-2' : ''}`}
                        >
                          {m.awayTeamNameAr}
                        </span>
                      </div>
                      <span className="font-mono font-black text-xs text-white">
                        {m.played ? m.awayScore : '-'}
                      </span>
                    </div>

                    {m.penaltyScore && (
                      <div className="text-[10px] text-center text-amber-400/80 font-mono mt-1 pt-1 border-t border-zinc-800/40">
                        ركلات ترجيح: ({m.penaltyScore[0]} - {m.penaltyScore[1]})
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
