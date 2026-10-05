// ============================================================
// أنت المدرب | زر ومودال الكؤوس — عرض ولعب مباريات الكأس المحلية
// ============================================================

import React from 'react';
import { CoachCalendarFixture } from '../../types/coachGameTypes';
import { Trophy, Calendar, Lock, PlayCircle, CheckCircle2, X } from 'lucide-react';

type CupFixture = CoachCalendarFixture & { triggerAfterMatchday: number };

interface CoachCupFixturesModalProps {
  fixtures: CupFixture[];
  currentMatchday: number;
  userTeamId: string;
  onPlayFixture: (fixtureId: string) => void;
  onClose: () => void;
}

export const CoachCupFixturesModal: React.FC<CoachCupFixturesModalProps> = ({
  fixtures,
  currentMatchday,
  userTeamId,
  onPlayFixture,
  onClose
}) => {
  const grouped: Record<string, CupFixture[]> = {};
  fixtures.forEach((f) => {
    if (!grouped[f.competitionNameAr]) grouped[f.competitionNameAr] = [];
    grouped[f.competitionNameAr].push(f);
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-zinc-950 border border-amber-500/30 rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-5 shadow-2xl my-6">
        <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-400" />
            <h3 className="text-base sm:text-lg font-black text-white">كؤوس الموسم</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {Object.keys(grouped).length === 0 && (
          <p className="text-sm text-zinc-500 text-center py-8">لا توجد بطولات كأسية مرتبطة بده الدوري ده الموسم.</p>
        )}

        {Object.entries(grouped).map(([compName, list]) => (
          <div key={compName} className="space-y-2">
            <h4 className="text-sm font-black text-amber-300 flex items-center gap-2">
              <span>{list[0].competitionIcon}</span>
              {compName}
            </h4>
            <div className="space-y-1.5">
              {list
                .sort((a, b) => a.triggerAfterMatchday - b.triggerAfterMatchday)
                .map((f) => {
                  const isUserInvolved = f.homeTeamId === userTeamId || f.awayTeamId === userTeamId;
                  const isDue = f.triggerAfterMatchday <= currentMatchday - 1;
                  const canPlay = isUserInvolved && !f.played && isDue;
                  return (
                    <div
                      key={f.id}
                      className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-xs ${
                        f.played
                          ? 'bg-zinc-900/40 border-zinc-800'
                          : canPlay
                          ? 'bg-amber-500/10 border-amber-500/40'
                          : 'bg-zinc-950/60 border-zinc-800'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-white font-bold truncate">
                          {f.homeTeamNameAr} <span className="text-zinc-500">ضد</span> {f.awayTeamNameAr}
                        </div>
                        <div className="text-[10px] text-zinc-500 flex items-center gap-2 mt-0.5">
                          <span>{f.stageNameAr}</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> {f.dateStr}
                          </span>
                        </div>
                      </div>
                      <div className="shrink-0">
                        {f.played ? (
                          <span className="flex items-center gap-1 text-emerald-400 font-black">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {f.homeScore} - {f.awayScore}
                          </span>
                        ) : canPlay ? (
                          <button
                            onClick={() => onPlayFixture(f.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black cursor-pointer"
                          >
                            <PlayCircle className="w-3.5 h-3.5" />
                            العب دلوقتي
                          </button>
                        ) : isUserInvolved ? (
                          <span className="flex items-center gap-1 text-zinc-500 font-bold">
                            <Lock className="w-3.5 h-3.5" /> بعد الجولة {f.triggerAfterMatchday}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </div>
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
