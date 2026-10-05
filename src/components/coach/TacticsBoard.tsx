// ============================================================
// أنت المدرب | التكتيك وتشكيلة الفريق (Tactics Board & Pitch)
// ============================================================

import React, { useState } from 'react';
import { CoachTeam, CoachSquadPlayer, UserTacticalSettings } from '../../types/coachGameTypes';
import {
  COACH_FORMATIONS,
  COACH_PLAYING_STYLES,
  COACH_TACTICAL_ROLES,
  calculatePositionPenalty,
  calculateTacticalCohesion,
  getTacticalChangeFeedback,
  pickAutomaticBestXI
} from '../../data/coachFormationsAndStyles';
import { CoachSimulationEngine } from '../../services/coachSimulationEngine';
import {
  Shield,
  Zap,
  Activity,
  ArrowRightLeft,
  ChevronDown,
  Info,
  Sliders,
  Check,
  AlertCircle,
  Users,
  Target,
  Gauge,
  Compass,
  Layers,
  Sparkles,
  X
} from 'lucide-react';

interface TacticsBoardProps {
  team: CoachTeam;
  tactics: UserTacticalSettings;
  onUpdateTeam: (updatedTeam: CoachTeam) => void;
  onUpdateTactics: (updatedTactics: UserTacticalSettings) => void;
}

export const TacticsBoard: React.FC<TacticsBoardProps> = ({
  team,
  tactics,
  onUpdateTeam,
  onUpdateTactics
}) => {
  const [selectedSlotIndex, setSelectedSlotIndex] = useState<number | null>(null);
  const [selectedBenchPlayerId, setSelectedBenchPlayerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'PITCH' | 'INSTRUCTIONS' | 'COHESION'>('PITCH');
  const [showRoleModalForPlayer, setShowRoleModalForPlayer] = useState<CoachSquadPlayer | null>(null);

  const currentFormation = COACH_FORMATIONS.find((f) => f.id === team.formation) || COACH_FORMATIONS[0];
  const currentStyle = COACH_PLAYING_STYLES.find(
    (s) => s.name === team.playingStyle || s.id === team.playingStyle
  ) || COACH_PLAYING_STYLES[0];

  const strength = CoachSimulationEngine.calculateStartingStrength(team, tactics);
  const cohesion = calculateTacticalCohesion(team, tactics);
  const synergy = CoachSimulationEngine.getTacticalSynergy(team.formation, team.playingStyle);

  // Starters and Bench lists
  const starterPlayers = team.startingXI
    .map((id) => team.squad.find((p) => p.id === id))
    .filter(Boolean) as CoachSquadPlayer[];
  const benchPlayers = team.bench
    .map((id) => team.squad.find((p) => p.id === id))
    .filter(Boolean) as CoachSquadPlayer[];

  // Handle swapping a starter on the pitch with another starter or bench player
  const handleSlotClick = (slotIdx: number) => {
    if (selectedBenchPlayerId) {
      // Swap bench player with this starter slot
      const starterIdToReplace = team.startingXI[slotIdx];
      const newStartingXI = [...team.startingXI];
      const newBench = [...team.bench];

      const benchIdx = newBench.indexOf(selectedBenchPlayerId);
      if (benchIdx !== -1 && starterIdToReplace) {
        newStartingXI[slotIdx] = selectedBenchPlayerId;
        newBench[benchIdx] = starterIdToReplace;

        onUpdateTeam({
          ...team,
          startingXI: newStartingXI,
          bench: newBench
        });
      }
      setSelectedBenchPlayerId(null);
      setSelectedSlotIndex(null);
      return;
    }

    if (selectedSlotIndex === null) {
      setSelectedSlotIndex(slotIdx);
    } else if (selectedSlotIndex === slotIdx) {
      // Clicked same slot again: open role assignment modal
      const player = starterPlayers[slotIdx];
      if (player) {
        setShowRoleModalForPlayer(player);
      }
    } else {
      // Swap two starters positions
      const newStartingXI = [...team.startingXI];
      const temp = newStartingXI[selectedSlotIndex];
      newStartingXI[selectedSlotIndex] = newStartingXI[slotIdx];
      newStartingXI[slotIdx] = temp;

      onUpdateTeam({
        ...team,
        startingXI: newStartingXI
      });
      setSelectedSlotIndex(null);
    }
  };

  const handleBenchPlayerClick = (playerId: string) => {
    if (selectedSlotIndex !== null) {
      const starterIdToReplace = team.startingXI[selectedSlotIndex];
      const newStartingXI = [...team.startingXI];
      const newBench = [...team.bench];

      const benchIdx = newBench.indexOf(playerId);
      if (benchIdx !== -1 && starterIdToReplace) {
        newStartingXI[selectedSlotIndex] = playerId;
        newBench[benchIdx] = starterIdToReplace;

        onUpdateTeam({
          ...team,
          startingXI: newStartingXI,
          bench: newBench
        });
      }
      setSelectedSlotIndex(null);
      setSelectedBenchPlayerId(null);
    } else {
      setSelectedBenchPlayerId(selectedBenchPlayerId === playerId ? null : playerId);
    }
  };

  const handleFormationChange = (formationId: string) => {
    onUpdateTeam({
      ...team,
      formation: formationId
    });
    onUpdateTactics({
      ...tactics,
      formation: formationId
    });
  };

  // "اختيار التشكيلة تلقائيًا" — chooses the best XI for the CURRENT
  // formation considering natural/secondary position fit, fitness,
  // form, morale, injuries and suspensions. Never just the 11 highest
  // overall ratings.
  const handleAutoSelectBestXI = () => {
    const targetFormation = COACH_FORMATIONS.find((f) => f.id === team.formation) || currentFormation;
    const { startingXI, bench } = pickAutomaticBestXI(team, targetFormation);
    onUpdateTeam({
      ...team,
      startingXI,
      bench
    });
    setSelectedSlotIndex(null);
    setSelectedBenchPlayerId(null);
  };

  const handleStyleChange = (styleName: string) => {
    onUpdateTeam({
      ...team,
      playingStyle: styleName
    });
    onUpdateTactics({
      ...tactics,
      playingStyle: styleName
    });
  };

  const updateTacticalSlider = (field: keyof UserTacticalSettings, value: any) => {
    onUpdateTactics({
      ...tactics,
      [field]: value
    });
  };

  const assignPlayerRole = (playerId: string, roleId: string) => {
    const updatedRoles = {
      ...(tactics.playerRoles || {}),
      [playerId]: roleId
    };
    onUpdateTactics({
      ...tactics,
      playerRoles: updatedRoles
    });
    setShowRoleModalForPlayer(null);
  };

  return (
    <div className="space-y-4">
      {/* 1. Tactical Power Header & Stat Bars */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-base shadow-md"
              style={{ backgroundColor: team.primaryColor || '#f59e0b' }}
            >
              {team.shortName}
            </div>
            <div>
              <h3 className="text-sm font-black text-white">{team.nameAr}</h3>
              <p className="text-xs text-zinc-400">
                الخطة: <span className="text-amber-400 font-bold">{team.formation}</span> • الأسلوب:{' '}
                <span className="text-emerald-400 font-bold">{currentStyle.nameAr}</span>
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="text-center px-3 py-1 bg-zinc-950 rounded-xl border border-zinc-800">
              <div className="text-[10px] text-zinc-400 font-bold">الهجوم</div>
              <div className="text-xs sm:text-sm font-black text-rose-400">{strength.attack}</div>
            </div>
            <div className="text-center px-3 py-1 bg-zinc-950 rounded-xl border border-zinc-800">
              <div className="text-[10px] text-zinc-400 font-bold">الوسط</div>
              <div className="text-xs sm:text-sm font-black text-amber-400">{strength.midfield}</div>
            </div>
            <div className="text-center px-3 py-1 bg-zinc-950 rounded-xl border border-zinc-800">
              <div className="text-[10px] text-zinc-400 font-bold">الدفاع</div>
              <div className="text-xs sm:text-sm font-black text-blue-400">{strength.defense}</div>
            </div>
            <div className="text-center px-3 py-1 bg-zinc-950 rounded-xl border border-amber-500/30">
              <div className="text-[10px] text-amber-400 font-bold">القوة الإجمالية</div>
              <div className="text-xs sm:text-sm font-black text-white">{strength.overall}</div>
            </div>
          </div>
        </div>

        {/* Tactical Compatibility & Cohesion Badge */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-zinc-400">التناغم التكتيكي للخطة:</span>
            {synergy > 3 ? (
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-black flex items-center gap-1 border border-emerald-500/30">
                <Check className="w-3 h-3" /> متوافق بنسبة 100% (+{synergy} نقاط قوة)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-bold flex items-center gap-1 border border-amber-500/30">
                <Info className="w-3 h-3" /> توافق عادي (+{synergy})
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5" style={{ color: cohesion.color }}>
              <Sparkles className="w-3.5 h-3.5" />
              <span className="font-bold">
                الانسجام: {cohesion.score}% ({cohesion.levelAr})
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400">
              <Activity className="w-3.5 h-3.5 text-emerald-400" />
              <span>متوسط اللياقة: {strength.fitnessAvg}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-zinc-800 pb-2">
        <button
          onClick={() => setActiveTab('PITCH')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'PITCH'
              ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
              : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>تشكيلة الملعب والتبديلات</span>
        </button>

        <button
          onClick={() => setActiveTab('INSTRUCTIONS')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'INSTRUCTIONS'
              ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
              : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>التعليمات والأسلوب المتقدم</span>
        </button>

        <button
          onClick={() => setActiveTab('COHESION')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeTab === 'COHESION'
              ? 'bg-amber-500 text-zinc-950 shadow-md shadow-amber-500/20'
              : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Gauge className="w-4 h-4" />
          <span>تحليل الانسجام والتناغم</span>
        </button>
      </div>

      {/* TAB 1: PITCH & LINEUP */}
      {activeTab === 'PITCH' && (
        <>
          {/* Automatic Best XI */}
          <button
            onClick={handleAutoSelectBestXI}
            title="يختار أفضل 11 أساسي حسب الخطة الحالية، اللياقة، الفورمة، الإصابات والإيقافات — وليس فقط أعلى تقييم"
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs sm:text-sm font-black shadow-lg shadow-emerald-900/30 transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>اختيار التشكيلة تلقائيًا</span>
          </button>

          {/* Controls: Formations & Playing Styles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Formation Dropdown */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
              <label className="text-xs font-bold text-zinc-300 mb-1.5 block flex items-center justify-between">
                <span>اختار التشكيلة (10 خطط تكتيكية):</span>
                <span className="text-[10px] text-amber-400 font-mono font-bold">{currentFormation.name}</span>
              </label>
              <div className="relative">
                <select
                  value={team.formation}
                  onChange={(e) => handleFormationChange(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg px-3 py-2 text-xs font-bold appearance-none cursor-pointer focus:border-amber-400 outline-none"
                >
                  {COACH_FORMATIONS.map((f) => (
                    <option key={f.id} value={f.id} className="bg-zinc-900 text-white">
                      {f.name} — {f.nameAr}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-zinc-400 absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
              <p className="text-[10px] text-zinc-400 mt-1.5 leading-relaxed">{currentFormation.descriptionAr}</p>
            </div>

            {/* Playing Style Dropdown */}
            <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-3">
              <label className="text-xs font-bold text-zinc-300 mb-1.5 block flex items-center justify-between">
                <span>أسلوب اللعب (10 فلسفات كروية):</span>
                <span className="text-[10px] text-emerald-400 font-bold">{currentStyle.nameAr}</span>
              </label>
              <div className="relative">
                <select
                  value={team.playingStyle}
                  onChange={(e) => handleStyleChange(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-700 text-white rounded-lg px-3 py-2 text-xs font-bold appearance-none cursor-pointer focus:border-emerald-400 outline-none"
                >
                  {COACH_PLAYING_STYLES.map((s) => (
                    <option key={s.id} value={s.name} className="bg-zinc-900 text-white">
                      {s.nameAr}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-zinc-400 absolute left-2.5 top-2.5 pointer-events-none" />
              </div>
              <p className="text-[10px] text-zinc-400 mt-1.5 leading-relaxed">{currentStyle.keyStrengthAr}</p>
            </div>
          </div>

          {/* Instructions Banner */}
          <div className="bg-amber-500/10 border border-amber-400/30 rounded-xl px-3 py-2 text-xs text-amber-300 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 flex-shrink-0 text-amber-400" />
              <span>
                <strong>للتبديل:</strong> اضغط على لاعب في الملعب ثم لاعب آخر للتبديل. اضغط مرتين لتحديد دور تكتيكي خاص (كالصانع المتأخر أو المهاجم القناص).
              </span>
            </div>
            {selectedSlotIndex !== null && (
              <button
                onClick={() => {
                  const p = starterPlayers[selectedSlotIndex];
                  if (p) setShowRoleModalForPlayer(p);
                }}
                className="px-2.5 py-1 rounded-lg bg-amber-500 text-zinc-950 text-[10px] font-black hover:bg-amber-400 transition-colors cursor-pointer"
              >
                تحديد الدور التكتيكي
              </button>
            )}
          </div>

          {/* The Interactive Tactical Pitch */}
          <div className="relative w-full aspect-[4/5] sm:aspect-[4/3] max-h-[560px] bg-gradient-to-b from-[#134e1e] via-[#155d24] to-[#10431b] rounded-2xl border-2 border-emerald-500/40 p-3 shadow-2xl overflow-hidden select-none">
            {/* Pitch Lines & Circles */}
            <div className="absolute inset-2 border-2 border-white/25 rounded-xl pointer-events-none" />
            <div className="absolute top-1/2 left-2 right-2 border-t-2 border-white/25 pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 border-2 border-white/25 rounded-full pointer-events-none" />
            {/* Penalty boxes */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-48 h-24 border-2 border-t-0 border-white/25 pointer-events-none" />
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-48 h-24 border-2 border-b-0 border-white/25 pointer-events-none" />

            {/* Players on Pitch */}
            {currentFormation.slots.map((slot, idx) => {
              const player = starterPlayers[idx];
              const isSelected = selectedSlotIndex === idx;
              const penaltyInfo = player ? calculatePositionPenalty(player.position, slot.position) : null;
              const penaltyValue = penaltyInfo ? Math.abs(penaltyInfo.penalty) : 0;
              const roleId = player ? tactics.playerRoles?.[player.id] : undefined;
              const roleDef = roleId ? COACH_TACTICAL_ROLES.find((r) => r.id === roleId) : undefined;

              return (
                <div
                  key={`pitch_slot_${idx}`}
                  onClick={() => handleSlotClick(idx)}
                  style={{
                    left: `${slot.x}%`,
                    top: `${slot.y}%`
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group transition-all duration-200 z-10 ${
                    isSelected ? 'scale-115 ring-4 ring-amber-400 z-30' : 'hover:scale-105'
                  }`}
                >
                  <div
                    className={`flex flex-col items-center justify-center p-1.5 sm:p-2 rounded-xl backdrop-blur-md transition-colors ${
                      isSelected
                        ? 'bg-amber-400 text-zinc-950 shadow-[0_0_20px_rgba(251,191,36,0.8)]'
                        : penaltyValue > 0
                        ? 'bg-zinc-950/90 border border-rose-500/60 text-white'
                        : 'bg-zinc-950/85 border border-zinc-700 text-white hover:border-amber-400'
                    }`}
                    style={{ width: '88px' }}
                  >
                    {/* Position and Rating Badge */}
                    <div className="flex items-center justify-between w-full text-[9px] font-black pb-0.5">
                      <span
                        className={`px-1 rounded ${
                          isSelected
                            ? 'bg-zinc-950 text-amber-400'
                            : penaltyValue > 0
                            ? 'bg-rose-950 text-rose-300'
                            : 'bg-zinc-800 text-zinc-300'
                        }`}
                      >
                        {slot.position}
                      </span>
                      <span className={`font-mono ${isSelected ? 'text-zinc-950 font-black' : 'text-amber-400'}`}>
                        {player?.rating || 80}
                      </span>
                    </div>

                    {/* Player Name Only (Strictly No Photos) — shows the
                        surname only on the compact pitch slot so it never
                        overflows the card; the full name still appears in
                        the squad list / bench / role modal. */}
                    <div className="text-[10px] sm:text-[11px] font-black truncate max-w-full text-center leading-tight mt-0.5">
                      {(() => {
                        const fullName = player?.nameAr || player?.name || 'شاغر';
                        const parts = fullName.trim().split(' ');
                        return parts.length > 1 ? parts[parts.length - 1] : fullName;
                      })()}
                    </div>

                    {/* Role or Out of Position Badge */}
                    {penaltyValue > 0 ? (
                      <div className="text-[8px] font-bold text-rose-400 flex items-center gap-0.5 mt-0.5">
                        <AlertCircle className="w-2.5 h-2.5" />
                        <span>خارج مركزه (-{penaltyValue})</span>
                      </div>
                    ) : roleDef ? (
                      <div className="text-[8px] font-bold text-amber-300 truncate max-w-full mt-0.5">
                        {roleDef.nameAr}
                      </div>
                    ) : null}

                    {/* Fitness bar */}
                    {player && (
                      <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full ${
                            player.fitness > 80 ? 'bg-emerald-400' : player.fitness > 60 ? 'bg-yellow-400' : 'bg-red-500'
                          }`}
                          style={{ width: `${player.fitness}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bench Substitutes */}
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs sm:text-sm font-black text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                دكة البدلاء ({benchPlayers.length} لاعبين)
              </h4>
              <span className="text-[10px] text-zinc-400 font-bold">
                {selectedBenchPlayerId ? 'اختار لاعباً في الملعب لإتمام التبديل' : 'اضغط على أي بديل لاختياره للتبديل'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {benchPlayers.map((player) => {
                const isSelected = selectedBenchPlayerId === player.id;

                return (
                  <button
                    key={player.id}
                    onClick={() => handleBenchPlayerClick(player.id)}
                    className={`p-2 rounded-xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400 text-zinc-950 border-amber-300 ring-2 ring-amber-400 scale-102'
                        : 'bg-zinc-950/70 border-zinc-800 hover:border-zinc-700 text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[9px] font-bold w-full">
                      <span className={`px-1 rounded ${isSelected ? 'bg-zinc-950 text-amber-400' : 'bg-zinc-800 text-zinc-400'}`}>
                        {player.position}
                      </span>
                      <span className={`font-mono ${isSelected ? 'text-zinc-950 font-black' : 'text-amber-400'}`}>
                        {player.rating}
                      </span>
                    </div>

                    <div className="text-[10px] sm:text-xs font-black truncate my-1">{player.nameAr}</div>

                    <div className="flex items-center justify-between text-[9px] text-zinc-400">
                      <span>لياقة: {player.fitness}%</span>
                      <span>{player.goals > 0 ? `⚽ ${player.goals}` : ''}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* TAB 2: TACTICAL SLIDERS & ADVANCED INSTRUCTIONS */}
      {activeTab === 'INSTRUCTIONS' && (
        <div className="space-y-4">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-5 space-y-5">
            <div>
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>تعليمات المدرب وإعدادات النزعة التكتيكية</span>
              </h4>
              <p className="text-xs text-zinc-400 mt-1">
                كل تعديل ينعكس مباشرة وفورياً على محرك محاكاة المباريات، وفرص الأهداف، ومعدل استنزاف اللياقة البدنية.
              </p>
            </div>

            {/* 1. Mentality */}
            <div className="space-y-2 border-t border-zinc-800/80 pt-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white">النزعة والعقلية التكتيكية:</span>
                <span className="text-amber-400 font-bold">
                  {tactics.mentality === 'VERY_DEFENSIVE'
                    ? 'دفاعي بحت (تأمين كامل)'
                    : tactics.mentality === 'DEFENSIVE'
                    ? 'دفاعي (تحفظ)'
                    : tactics.mentality === 'ATTACKING'
                    ? 'هجومي (مبادرة)'
                    : tactics.mentality === 'ALL_OUT_ATTACK'
                    ? 'هجوم كاسح (مجازفة)'
                    : 'متوازن (توازن ميداني)'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: 'VERY_DEFENSIVE', label: 'دفاعي بحت' },
                  { id: 'DEFENSIVE', label: 'دفاعي' },
                  { id: 'BALANCED', label: 'متوازن' },
                  { id: 'ATTACKING', label: 'هجومي' },
                  { id: 'ALL_OUT_ATTACK', label: 'هجوم كاسح' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => updateTacticalSlider('mentality', item.id)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      (tactics.mentality || 'BALANCED') === item.id
                        ? 'bg-amber-500 text-zinc-950 border-amber-400 font-black shadow-md'
                        : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Defensive Line */}
            <div className="space-y-2 border-t border-zinc-800/80 pt-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white">عمق خط الدفاع:</span>
                <span className="text-blue-400 font-bold">
                  {tactics.defensiveLine === 'DEEP'
                    ? 'منخفض (دفاع منطقة)'
                    : tactics.defensiveLine === 'HIGH'
                    ? 'متقدم (مصيدة تسلل)'
                    : 'متوازن'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'DEEP', label: 'منخفض (تراجع للصندوق)' },
                  { id: 'BALANCED', label: 'متوازن' },
                  { id: 'HIGH', label: 'متقدم (مصيدة تسلل)' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => updateTacticalSlider('defensiveLine', item.id)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      (tactics.defensiveLine || 'BALANCED') === item.id
                        ? 'bg-blue-500 text-white border-blue-400 font-black'
                        : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Pressing Intensity */}
            <div className="space-y-2 border-t border-zinc-800/80 pt-3">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-white">شدة وكثافة الضغط:</span>
                <span className="text-emerald-400 font-bold">
                  {tactics.pressingIntensity === 'LOW'
                    ? 'ضغط هادئ'
                    : tactics.pressingIntensity === 'HIGH'
                    ? 'ضغط عالٍ'
                    : tactics.pressingIntensity === 'INTENSE'
                    ? 'ضغط خانق مستمر'
                    : 'متوازن'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'LOW', label: 'ضغط هادئ' },
                  { id: 'BALANCED', label: 'متوازن' },
                  { id: 'HIGH', label: 'ضغط عالٍ' },
                  { id: 'INTENSE', label: 'ضغط خانق' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => updateTacticalSlider('pressingIntensity', item.id)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      (tactics.pressingIntensity || 'BALANCED') === item.id
                        ? 'bg-emerald-500 text-zinc-950 border-emerald-400 font-black'
                        : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Tempo & Width */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-zinc-800/80 pt-3">
              {/* Tempo */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-white">إيقاع اللعب:</span>
                  <span className="text-amber-400 font-bold">
                    {tactics.tempo === 'SLOW' ? 'صبور وبطيء' : tactics.tempo === 'FAST' ? 'سريع ومباشر' : 'متوازن'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'SLOW', label: 'بطيء وصبور' },
                    { id: 'BALANCED', label: 'متوازن' },
                    { id: 'FAST', label: 'سريع ومباشر' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => updateTacticalSlider('tempo', item.id)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        (tactics.tempo || 'BALANCED') === item.id
                          ? 'bg-amber-500 text-zinc-950 border-amber-400 font-black'
                          : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Width */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-white">عرض الملعب:</span>
                  <span className="text-purple-400 font-bold">
                    {tactics.width === 'NARROW' ? 'ضيق من العمق' : tactics.width === 'WIDE' ? 'عريض عبر الأطراف' : 'متوازن'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'NARROW', label: 'ضيق بالعمق' },
                    { id: 'BALANCED', label: 'متوازن' },
                    { id: 'WIDE', label: 'أطراف عريضة' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => updateTacticalSlider('width', item.id)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        (tactics.width || 'BALANCED') === item.id
                          ? 'bg-purple-500 text-white border-purple-400 font-black'
                          : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 5. Passing Style & Counter Attack */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-zinc-800/80 pt-3">
              {/* Passing */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-white">أسلوب التمرير:</span>
                  <span className="text-cyan-400 font-bold">
                    {tactics.passingStyle === 'SHORT'
                      ? 'قصير وسريع'
                      : tactics.passingStyle === 'DIRECT'
                      ? 'بيني مباشر'
                      : tactics.passingStyle === 'LONG'
                      ? 'كرات طويلة'
                      : 'مختلط'}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { id: 'SHORT', label: 'قصير' },
                    { id: 'MIXED', label: 'مختلط' },
                    { id: 'DIRECT', label: 'مباشر' },
                    { id: 'LONG', label: 'طويل' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => updateTacticalSlider('passingStyle', item.id)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        (tactics.passingStyle || 'MIXED') === item.id
                          ? 'bg-cyan-500 text-zinc-950 border-cyan-400 font-black'
                          : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Counter-Attacking */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-white">التحولات والهجمات المرتدة:</span>
                  <span className="text-rose-400 font-bold">
                    {tactics.counterAttacking === 'AGGRESSIVE'
                      ? 'خاطفة وفورية'
                      : tactics.counterAttacking === 'CONSERVATIVE'
                      ? 'تحفظ وتريث'
                      : 'متوازنة'}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'CONSERVATIVE', label: 'تحفظ حذر' },
                    { id: 'BALANCED', label: 'متوازنة' },
                    { id: 'AGGRESSIVE', label: 'مرتدات خاطفة' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => updateTacticalSlider('counterAttacking', item.id)}
                      className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        (tactics.counterAttacking || 'BALANCED') === item.id
                          ? 'bg-rose-500 text-white border-rose-400 font-black'
                          : 'bg-zinc-950 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TACTICAL COHESION & VERDICT */}
      {activeTab === 'COHESION' && (
        <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 sm:p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
            <div>
              <h4 className="text-base font-black text-white flex items-center gap-2">
                <Gauge className="w-5 h-5 text-amber-400" />
                <span>تقرير الانسجام والتناغم التكتيكي الشامل</span>
              </h4>
              <p className="text-xs text-zinc-400 mt-1">
                يقيس المحاكي مدى ترابط أسلوب اللعب مع الخطة والتعليمات وأدوار اللاعبين.
              </p>
            </div>
            <div className="text-center p-3 rounded-2xl bg-zinc-950 border border-zinc-800">
              <div className="text-2xl font-black font-mono" style={{ color: cohesion.color }}>
                {cohesion.score}%
              </div>
              <div className="text-[10px] font-bold text-zinc-400">مستوى {cohesion.levelAr}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Strengths */}
            <div className="bg-zinc-950/80 border border-emerald-500/30 rounded-2xl p-4 space-y-2">
              <h5 className="text-xs font-black text-emerald-400 flex items-center gap-1.5">
                <Check className="w-4 h-4" />
                <span>نقاط القوة التكتيكية (+مكاسب ميدانية):</span>
              </h5>
              {cohesion.strengthsAr.length === 0 ? (
                <p className="text-xs text-zinc-500">لا توجد مزايا خاصة مع دي التوليفة الحالية.</p>
              ) : (
                <ul className="space-y-1.5 text-xs text-zinc-300">
                  {cohesion.strengthsAr.map((str, idx) => (
                    <li key={`str_${idx}`} className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Warnings & Issues */}
            <div className="bg-zinc-950/80 border border-amber-500/30 rounded-2xl p-4 space-y-2">
              <h5 className="text-xs font-black text-amber-400 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" />
                <span>تحذيرات وملاحظات فنية (-مخاطر):</span>
              </h5>
              {cohesion.issuesAr.length === 0 ? (
                <p className="text-xs text-emerald-400">خطة متوازنة ومتكاملة بدون ثغرات هيكلية واضحة!</p>
              ) : (
                <ul className="space-y-1.5 text-xs text-zinc-300">
                  {cohesion.issuesAr.map((iss, idx) => (
                    <li key={`iss_${idx}`} className="flex items-start gap-2">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>{iss}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Coaching Advice */}
          <div className="bg-gradient-to-r from-amber-500/10 via-zinc-950 to-zinc-950 border border-amber-500/30 rounded-2xl p-4">
            <h5 className="text-xs font-black text-amber-300 mb-1">نصيحة المساعد الفني:</h5>
            <p className="text-xs text-zinc-300 leading-relaxed">
              {getTacticalChangeFeedback(
                team.formation,
                tactics.formation,
                team.playingStyle,
                tactics.playingStyle
              )}
            </p>
          </div>
        </div>
      )}

      {/* Role Assignment Modal */}
      {showRoleModalForPlayer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="text-sm font-black text-white">
                    تحديد الدور التكتيكي: {showRoleModalForPlayer.nameAr}
                  </h3>
                  <span className="text-xs text-zinc-400">
                    المركز الأصلي: {showRoleModalForPlayer.position} • التقييم: {showRoleModalForPlayer.rating}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowRoleModalForPlayer(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-zinc-300">
              اختار دوراً تكتيكياً يناسب خطة لعبك ويمنح اللاعب واجبات محددة على أرضية الميدان:
            </p>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {COACH_TACTICAL_ROLES.map((role) => {
                const isSelected = tactics.playerRoles?.[showRoleModalForPlayer.id] === role.id;
                const isSuitable = role.suitablePositions.includes(showRoleModalForPlayer.position);

                return (
                  <button
                    key={role.id}
                    onClick={() => assignPlayerRole(showRoleModalForPlayer.id, role.id)}
                    className={`w-full p-3 rounded-2xl border text-right transition-all flex flex-col gap-1 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-500/20 border-amber-400 ring-1 ring-amber-400'
                        : 'bg-zinc-900/80 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white">{role.nameAr}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">({role.name})</span>
                      </div>
                      {isSuitable ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold">
                          مناسب لمركزه
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400">
                          دور استثنائي
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400 leading-relaxed">{role.shortDescAr}</p>
                    <div className="text-[10px] text-amber-400/90 font-bold mt-0.5">
                      الأثر الميداني: {role.tacticalImpactAr}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => {
                  const updatedRoles = { ...(tactics.playerRoles || {}) };
                  delete updatedRoles[showRoleModalForPlayer.id];
                  onUpdateTactics({ ...tactics, playerRoles: updatedRoles });
                  setShowRoleModalForPlayer(null);
                }}
                className="px-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white cursor-pointer"
              >
                إلغاء الدور التكتيكي الخاص
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
