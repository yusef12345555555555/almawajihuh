// ============================================================
// أنت المدرب | نافذة اختيار وضع اللعب والصعوبة (Game Mode & AI Setup)
// ============================================================

import React, { useState } from 'react';
import {
  CoachGameplayMode,
  AIDifficulty,
  CoachTeam
} from '../../types/coachGameTypes';
import {
  AI_DIFFICULTIES,
  AI_PERSONALITIES
} from '../../services/coachAiIntelligence';
import { audioManager } from '../../services/audioManager';
import {
  Users,
  Bot,
  User,
  Zap,
  Globe,
  Sliders,
  CheckCircle2,
  Copy,
  ChevronLeft,
  X,
  Shield,
  Trophy,
  Flame,
  Shuffle
} from 'lucide-react';

interface CoachGameModeSelectorModalProps {
  currentMode: CoachGameplayMode;
  currentDifficulty: AIDifficulty;
  allTeams: CoachTeam[];
  userTeamId: string;
  roomCode?: string;
  onConfirm: (config: {
    mode: CoachGameplayMode;
    difficulty: AIDifficulty;
    secondPlayerTeamId?: string;
    customHumanTeamIds?: string[];
    roomCode: string;
  }) => void;
  onClose: () => void;
}

export const CoachGameModeSelectorModal: React.FC<CoachGameModeSelectorModalProps> = ({
  currentMode,
  currentDifficulty,
  allTeams,
  userTeamId,
  roomCode: initialRoomCode,
  onConfirm,
  onClose
}) => {
  const [selectedMode, setSelectedMode] = useState<CoachGameplayMode>(currentMode);
  const [selectedDifficulty, setSelectedDifficulty] = useState<AIDifficulty>(currentDifficulty);
  const [secondPlayerTeamId, setSecondPlayerTeamId] = useState<string>(
    allTeams.find((t) => t.id !== userTeamId)?.id || allTeams[1]?.id || ''
  );
  const [customHumanTeamIds, setCustomHumanTeamIds] = useState<string[]>([userTeamId]);
  const [roomCode, setRoomCode] = useState<string>(
    initialRoomCode || `COACH-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = () => {
    audioManager.playClick();
    navigator.clipboard.writeText(roomCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleToggleCustomTeam = (teamId: string) => {
    if (teamId === userTeamId) return; // Main team always human
    setCustomHumanTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  const handleSave = () => {
    audioManager.playClick();
    onConfirm({
      mode: selectedMode,
      difficulty: selectedDifficulty,
      secondPlayerTeamId: selectedMode === 'LOCAL_2P' ? secondPlayerTeamId : undefined,
      customHumanTeamIds: selectedMode === 'CUSTOM_MIXED' ? customHumanTeamIds : undefined,
      roomCode
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-[0_0_50px_rgba(0,0,0,0.9)] space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">
                تحديد نمط المنافسة والذكاء الاصطناعي
              </h2>
              <p className="text-xs text-zinc-400">
                العب بمفردك ضد الذكاء الاصطناعي أو مع أصدقائك (محلياً أو برمز الغرفة)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Mode Selection Grid */}
        <div className="space-y-3">
          <label className="text-xs font-black text-amber-400 uppercase tracking-wider block">
            اختار نظام اللعب (Game Mode)
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Mode 1: Solo vs AI */}
            <button
              onClick={() => {
                audioManager.playClick();
                setSelectedMode('SOLO');
              }}
              className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                selectedMode === 'SOLO'
                  ? 'bg-amber-500/15 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                  : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Bot className="w-4 h-4" />
                </div>
                {selectedMode === 'SOLO' && (
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <h3 className="text-sm font-black text-white">مدرب فردي ضد AI</h3>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                أنت تقود ناديك بمفردك، وكل المدربين المنافسين يتمتعون بشخصيات تكتيكية ذكية.
              </p>
            </button>

            {/* Mode 2: Local 2-Player */}
            <button
              onClick={() => {
                audioManager.playClick();
                setSelectedMode('LOCAL_2P');
              }}
              className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                selectedMode === 'LOCAL_2P'
                  ? 'bg-amber-500/15 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                  : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                {selectedMode === 'LOCAL_2P' && (
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <h3 className="text-sm font-black text-white">لاعبان محلياً (Pass & Play)</h3>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                العب مع صاحبك على نفس الجهاز.
              </p>
            </button>

            {/* Mode 3: Online Room Code */}
            <button
              onClick={() => {
                audioManager.playClick();
                setSelectedMode('ROOM_ONLINE');
              }}
              className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                selectedMode === 'ROOM_ONLINE'
                  ? 'bg-amber-500/15 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                  : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                  <Globe className="w-4 h-4" />
                </div>
                {selectedMode === 'ROOM_ONLINE' && (
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <h3 className="text-sm font-black text-white">غرفة برمز كود (Online Room)</h3>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                أنشئ غرفة برمز مخصص وشارك الرمز مع منافسك لبدء موسم تدريبي مشترك.
              </p>
            </button>

            {/* Mode 4: Custom Mixed */}
            <button
              onClick={() => {
                audioManager.playClick();
                setSelectedMode('CUSTOM_MIXED');
              }}
              className={`p-4 rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                selectedMode === 'CUSTOM_MIXED'
                  ? 'bg-amber-500/15 border-amber-500 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
                  : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-2">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
                  <Shuffle className="w-4 h-4" />
                </div>
                {selectedMode === 'CUSTOM_MIXED' && (
                  <CheckCircle2 className="w-4 h-4 text-amber-400" />
                )}
              </div>
              <h3 className="text-sm font-black text-white">تخصيص حر ومختلط (Mixed)</h3>
              <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                حدد بنفسك أي الأندية يتحكم بها مدربون بشريون وأيها يتحكم بها الذكاء الاصطناعي.
              </p>
            </button>
          </div>
        </div>

        {/* 2. Secondary Options per mode */}
        {selectedMode === 'LOCAL_2P' && (
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
            <label className="text-xs font-black text-emerald-400 flex items-center gap-2">
              <User className="w-4 h-4" />
              <span>اختار فريق اللاعب الثاني (المنافس البشري 👤):</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {allTeams
                .filter((t) => t.id !== userTeamId)
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      audioManager.playClick();
                      setSecondPlayerTeamId(t.id);
                    }}
                    className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer flex flex-col items-center ${
                      secondPlayerTeamId === t.id
                        ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-white text-xs mb-1"
                      style={{ backgroundColor: t.primaryColor || '#10b981' }}
                    >
                      {t.shortName}
                    </div>
                    <span className="text-xs font-bold truncate w-full">{t.nameAr}</span>
                  </button>
                ))}
            </div>
          </div>
        )}

        {selectedMode === 'ROOM_ONLINE' && (
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
            <label className="text-xs font-black text-blue-400 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span>رمز الغرفة ورابط المشاركة:</span>
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 py-2.5 px-4 bg-zinc-950 border border-zinc-800 rounded-xl font-mono text-base font-black text-amber-400 tracking-wider text-center">
                {roomCode}
              </div>
              <button
                onClick={handleCopyCode}
                className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Copy className="w-4 h-4" />
                <span>{copiedCode ? 'تم النسخ!' : 'نسخ الرمز'}</span>
              </button>
            </div>
            <p className="text-[11px] text-zinc-400">
              ابعت الكود لصاحبك وابدأوا.
            </p>
          </div>
        )}

        {selectedMode === 'CUSTOM_MIXED' && (
          <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-3">
            <label className="text-xs font-black text-purple-400 flex items-center gap-2">
              <Shuffle className="w-4 h-4" />
              <span>اختار الفرق البشرية 👤:</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {allTeams.map((t) => {
                const isHuman = customHumanTeamIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      audioManager.playClick();
                      handleToggleCustomTeam(t.id);
                    }}
                    className={`p-2 rounded-xl border text-right flex items-center justify-between text-xs transition-all cursor-pointer ${
                      isHuman
                        ? 'bg-purple-950/40 border-purple-500 text-purple-200 font-bold'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400'
                    }`}
                  >
                    <span className="truncate">{t.nameAr}</span>
                    <span className="text-[10px] font-mono font-black">
                      {isHuman ? '👤 بشري' : '🤖 AI'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 3. AI Difficulty Level Selector */}
        <div className="space-y-3">
          <label className="text-xs font-black text-amber-400 uppercase tracking-wider block">
            مستوى الـAI
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {(['EASY', 'NORMAL', 'HARD', 'LEGENDARY'] as AIDifficulty[]).map((level) => {
              const diff = AI_DIFFICULTIES[level];
              const isSelected = selectedDifficulty === level;
              return (
                <button
                  key={level}
                  onClick={() => {
                    audioManager.playClick();
                    setSelectedDifficulty(level);
                  }}
                  className={`p-3 rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.25)]'
                      : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-1">
                    <span className="text-xs font-black text-white">{diff.titleAr}</span>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                  <span className="text-[10px] text-amber-300 font-bold">{diff.badgeAr}</span>
                  <p className="text-[10px] text-zinc-400 mt-1 leading-snug line-clamp-2">
                    {diff.descriptionAr}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 4. Action CTA */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-zinc-950 font-black text-sm shadow-[0_0_25px_rgba(245,158,11,0.5)] hover:scale-[1.01] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>حفظ وابدأ</span>
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            className="px-5 py-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white text-xs font-bold transition-all cursor-pointer"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};
