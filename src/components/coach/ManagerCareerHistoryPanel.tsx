// ============================================================
// أنت المدرب | إحصائيات المسيرة العالمية + السجل التاريخي الدائم
//
// All numbers here are derived from real persisted records
// (careerManagerService) — never hard-coded/fake values.
// ============================================================

import React from 'react';
import { CoachSeasonState } from '../../types/coachGameTypes';
import { computeGlobalStats, getCareerTimeline, CareerJobRecord } from '../../services/careerManagerService';
import { Trophy, TrendingUp, ShieldCheck, Flag, BarChart3 } from 'lucide-react';

interface ManagerCareerHistoryPanelProps {
  liveCareer: CoachSeasonState;
}

const StatBox: React.FC<{ label: string; value: string | number; accent?: string }> = ({ label, value, accent }) => (
  <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-3 text-center">
    <div className={`text-lg font-black ${accent || 'text-white'}`}>{value}</div>
    <div className="text-[10px] text-zinc-500 font-bold mt-0.5">{label}</div>
  </div>
);

const JobRow: React.FC<{ job: CareerJobRecord }> = ({ job }) => {
  const isActive = job.status === 'ACTIVE';
  const winRate = job.matches > 0 ? Math.round((job.wins / job.matches) * 100) : 0;
  return (
    <div className="bg-zinc-950/60 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-white">{job.teamNameAr}</span>
          <span className="text-[10px] text-zinc-500">{job.teamType === 'NATIONAL_TEAM' ? 'منتخب' : 'نادٍ'}</span>
        </div>
        <span
          className={`text-[10px] font-black px-2 py-1 rounded-full border ${
            isActive
              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
              : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
          }`}
        >
          {job.departureReasonAr}
        </span>
      </div>
      <p className="text-[11px] text-zinc-500">{job.competitionTitleAr}</p>
      <div className="grid grid-cols-5 gap-1.5 pt-1">
        <StatBox label="مباريات" value={job.matches} />
        <StatBox label="فوز" value={job.wins} accent="text-emerald-400" />
        <StatBox label="تعادل" value={job.draws} accent="text-amber-400" />
        <StatBox label="خسارة" value={job.losses} accent="text-rose-400" />
        <StatBox label="نسبة الفوز" value={`${winRate}%`} />
      </div>
      <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
        <span>
          الأهداف: <span className="text-white font-bold">{job.goalsFor}</span> —{' '}
          <span className="text-white font-bold">{job.goalsAgainst}</span>
        </span>
        {job.trophies.length > 0 && (
          <span className="flex items-center gap-1 text-amber-400 font-bold">
            <Trophy className="w-3.5 h-3.5" /> {job.trophies.length}
          </span>
        )}
      </div>
    </div>
  );
};

export const ManagerCareerHistoryPanel: React.FC<ManagerCareerHistoryPanelProps> = ({ liveCareer }) => {
  const stats = computeGlobalStats(liveCareer);
  const timeline = [...getCareerTimeline(liveCareer)].reverse(); // most recent first

  return (
    <div className="space-y-6">
      <div>
        <h4 className="text-sm font-black text-white flex items-center gap-2 mb-3">
          <BarChart3 className="w-4 h-4 text-amber-400" />
          إجمالي المسيرة التدريبية
        </h4>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          <StatBox label="أندية دُرِّبت" value={stats.totalClubs} />
          <StatBox label="منتخبات دُرِّبت" value={stats.totalNationalTeams} />
          <StatBox label="إجمالي المباريات" value={stats.totalMatches} />
          <StatBox label="انتصارات" value={stats.totalWins} accent="text-emerald-400" />
          <StatBox label="تعادلات" value={stats.totalDraws} accent="text-amber-400" />
          <StatBox label="هزائم" value={stats.totalLosses} accent="text-rose-400" />
          <StatBox label="أهداف مسجلة" value={stats.totalGoalsFor} />
          <StatBox label="أهداف مستقبلة" value={stats.totalGoalsAgainst} />
          <StatBox label="فارق الأهداف" value={stats.goalDifference} />
          <StatBox label="نسبة الفوز" value={`${stats.winPercentage}%`} accent="text-amber-400" />
          <StatBox label="البطولات" value={stats.totalTrophies} accent="text-amber-400" />
          <StatBox
            label="أكبر فوز (فارق)"
            value={stats.biggestWin ? `+${stats.biggestWin.diff}` : '—'}
            accent="text-emerald-400"
          />
        </div>
      </div>

      <div>
        <h4 className="text-sm font-black text-white flex items-center gap-2 mb-3">
          <Flag className="w-4 h-4 text-amber-400" />
          السيرة الذاتية التدريبية (Career Timeline)
        </h4>
        {timeline.length === 0 ? (
          <p className="text-xs text-zinc-500">لسه معندكش مهام سابقة — دي أول مهمة تدريب ليك.</p>
        ) : (
          <div className="space-y-3">
            {timeline.map((job) => (
              <JobRow key={job.jobId} job={job} />
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-[11px] text-zinc-500 bg-zinc-950/40 border border-zinc-800/60 rounded-xl p-3">
        <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
        <span>السجل ده دائم: لو استقلت من أي مهمة، مش هتتمسح ولا مباراة ولا هدف ولا بطولة من مشوارك.</span>
      </div>
      <div className="flex items-center gap-2 text-[11px] text-zinc-600">
        <TrendingUp className="w-3.5 h-3.5" />
        <span>الأرقام دي محسوبة على طول من نتايج مبارياتك الحقيقية.</span>
      </div>
    </div>
  );
};
