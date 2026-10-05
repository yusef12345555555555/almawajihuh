// ============================================================
// أنت المدرب | غرفة الإعداد التكتيكي المزدوج (Dual Coach Pre-Match)
// ============================================================

import React, { useMemo, useState } from 'react';
import { COACHES } from '../../data/footballData';
import { Coach } from '../../types';
import { CoachTeam, UserTacticalSettings } from '../../types/coachGameTypes';
import { COACH_FORMATIONS, COACH_PLAYING_STYLES } from '../../data/coachFormationsAndStyles';
import { audioManager } from '../../services/audioManager';
import { Swords, Shield, Zap, Sliders, Play, X, User, Bot } from 'lucide-react';

interface DualCoachPreMatchModalProps {
  homeTeam: CoachTeam;
  awayTeam: CoachTeam;
  homeTactics?: UserTacticalSettings;
  awayTactics?: UserTacticalSettings;
  onConfirmKickoff: (updatedHomeTeam: CoachTeam, updatedAwayTeam: CoachTeam) => void;
  onCancel: () => void;
}

type Phase = 'COACHES' | 'FORMATIONS';
type Mentality = 'ATTACK' | 'BALANCED' | 'DEFEND';

export const DualCoachPreMatchModal: React.FC<DualCoachPreMatchModalProps> = ({
  homeTeam,
  awayTeam,
  onConfirmKickoff,
  onCancel,
}) => {
  const [phase, setPhase] = useState<Phase>('COACHES');
  const [activeTab, setActiveTab] = useState<'HOME' | 'AWAY'>('HOME');

  const [homeFormation, setHomeFormation] = useState(homeTeam.formation || '4-3-3');
  const [awayFormation, setAwayFormation] = useState(awayTeam.formation || '4-3-3');
  const [homeStyle, setHomeStyle] = useState(homeTeam.playingStyle || 'Balanced');
  const [awayStyle, setAwayStyle] = useState(awayTeam.playingStyle || 'Balanced');
  const [homeMentality, setHomeMentality] = useState<Mentality>('BALANCED');
  const [awayMentality, setAwayMentality] = useState<Mentality>('BALANCED');

  const pickCoach = (teamId: string, offset: number): Coach => {
    const hash = [...teamId].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) + offset * 17;
    return COACHES[hash % COACHES.length];
  };

  const homeCoach = useMemo(() => pickCoach(homeTeam.id, 0), [homeTeam.id]);
  const awayCoach = useMemo(() => {
    const candidate = pickCoach(awayTeam.id, 1);
    return candidate.id === homeCoach.id
      ? COACHES[(COACHES.indexOf(candidate) + 1) % COACHES.length]
      : candidate;
  }, [awayTeam.id, homeCoach.id]);

  const coachStyleToEngineStyle = (coach: Coach) => {
    if (coach.style === 'Tiki-Taka') return 'possession';
    if (coach.style === 'Counter Attack') return 'counter_attack';
    if (coach.style === 'High Press') return 'high_press';
    if (coach.style === 'Park the Bus') return 'low_block';
    return 'fast_buildup';
  };

  const managerFromCoach = (team: CoachTeam, coach: Coach) => ({
    ...(team.currentManager || team.manager),
    name: coach.name,
    nameAr: coach.nameAr,
    photoUrl: coach.photoUrl,
    nationality: coach.nationality,
    nationalityAr: coach.nationalityAr,
    preferredFormation: coach.preferredFormations?.[0] || team.formation,
    preferredStyle: coach.style,
    tacticalMindset: coach.rating,
  });

  const handleKickoff = () => {
    audioManager.playWhistle();
    const updatedHome: CoachTeam = {
      ...homeTeam,
      formation: homeFormation,
      playingStyle: coachStyleToEngineStyle(homeCoach),
      currentManager: managerFromCoach(homeTeam, homeCoach),
      manager: managerFromCoach(homeTeam, homeCoach),
    };
    const updatedAway: CoachTeam = {
      ...awayTeam,
      formation: awayFormation,
      playingStyle: coachStyleToEngineStyle(awayCoach),
      currentManager: managerFromCoach(awayTeam, awayCoach),
      manager: managerFromCoach(awayTeam, awayCoach),
    };
    onConfirmKickoff(updatedHome, updatedAway);
  };

  const isHomeHuman = homeTeam.controllerType === 'HUMAN';
  const isAwayHuman = awayTeam.controllerType === 'HUMAN';
  const currentTeam = activeTab === 'HOME' ? homeTeam : awayTeam;
  const currentFormation = activeTab === 'HOME' ? homeFormation : awayFormation;
  const currentStyle = activeTab === 'HOME' ? homeStyle : awayStyle;
  const currentMentality = activeTab === 'HOME' ? homeMentality : awayMentality;

  const setFormation = (value: string) => activeTab === 'HOME' ? setHomeFormation(value) : setAwayFormation(value);
  const setStyle = (value: string) => activeTab === 'HOME' ? setHomeStyle(value) : setAwayStyle(value);
  const setMentality = (value: Mentality) => activeTab === 'HOME' ? setHomeMentality(value) : setAwayMentality(value);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto" dir="rtl">
      <div className="relative w-full max-w-3xl bg-zinc-950 border border-zinc-800 rounded-3xl p-5 sm:p-7 shadow-[0_0_50px_rgba(0,0,0,0.9)] space-y-6">
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white">غرفة الإعداد التكتيكي قبل ضربة البداية</h2>
              <p className="text-xs text-zinc-400">اختيار المدربين أولاً، ثم عرض التشكيلتين، وبعدها تبدأ المحاكاة فقط عند الضغط على صافرة البداية.</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white" aria-label="إغلاق">
            <X className="w-5 h-5" />
          </button>
        </div>

        {phase === 'COACHES' && (
          <div className="space-y-5">
            <div className="text-center">
              <div className="text-xs text-amber-300 font-black mb-1">الخطوة الأولى</div>
              <h3 className="text-xl font-black text-white">النظام يختار مدرباً لكل فريق</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[{ team: homeTeam, coach: homeCoach, label: 'مدرب المستضيف', accent: 'amber' }, { team: awayTeam, coach: awayCoach, label: 'مدرب الضيف', accent: 'blue' }].map((item) => (
                <div key={item.team.id} className={`rounded-3xl border-2 p-4 text-center ${item.accent === 'amber' ? 'border-amber-400/50 bg-amber-500/10' : 'border-blue-400/50 bg-blue-500/10'}`}>
                  <div className="text-[10px] text-zinc-400 font-black">{item.label} • {item.team.nameAr}</div>
                  <div className="mx-auto mt-3 w-24 h-24 rounded-3xl overflow-hidden border border-white/15 bg-black">
                    <img src={item.coach.photoUrl} alt={item.coach.nameAr} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <div className="mt-2 text-lg font-black text-white">{item.coach.nameAr}</div>
                  <div className="text-[10px] text-amber-300 font-bold">{item.coach.styleAr} • ⭐ {item.coach.rating}</div>
                </div>
              ))}
            </div>
            <button onClick={() => { audioManager.playClick(); setPhase('FORMATIONS'); }} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-blue-500 text-zinc-950 font-black text-sm shadow-[0_0_28px_rgba(245,158,11,.35)]">
              عرض التشكيلتين والمدربين
            </button>
          </div>
        )}

        {phase === 'FORMATIONS' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[{ team: homeTeam, coach: homeCoach, formation: homeFormation, accent: 'amber' }, { team: awayTeam, coach: awayCoach, formation: awayFormation, accent: 'blue' }].map((item) => (
                <div key={item.team.id} className={`rounded-2xl border p-3 flex items-center gap-3 ${item.accent === 'amber' ? 'border-amber-400/40 bg-amber-500/10' : 'border-blue-400/40 bg-blue-500/10'}`}>
                  <img src={item.coach.photoUrl} alt={item.coach.nameAr} className="w-12 h-12 rounded-2xl object-cover border border-white/15" referrerPolicy="no-referrer" />
                  <div className="min-w-0">
                    <div className="text-[9px] text-zinc-500 font-black">المدرب • {item.team.nameAr}</div>
                    <div className="text-sm font-black text-white truncate">{item.coach.nameAr}</div>
                    <div className="text-[10px] text-amber-300 font-bold">{item.formation} • {item.coach.styleAr}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setActiveTab('HOME')} className={`p-3 rounded-2xl border text-right flex items-center gap-3 ${activeTab === 'HOME' ? 'bg-amber-500/20 border-amber-500 text-white' : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'}`}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm" style={{ backgroundColor: homeTeam.primaryColor || '#f59e0b' }}>{homeTeam.shortName}</div>
                <div className="flex-1 truncate">
                  <div className="text-xs font-black truncate">{homeTeam.nameAr}</div>
                  <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">{isHomeHuman ? <><User className="w-2.5 h-2.5 text-emerald-400" /> مدرب بشري</> : <><Bot className="w-2.5 h-2.5 text-blue-400" /> ذكاء اصطناعي</>}</div>
                </div>
              </button>
              <button onClick={() => setActiveTab('AWAY')} className={`p-3 rounded-2xl border text-right flex items-center gap-3 ${activeTab === 'AWAY' ? 'bg-blue-500/20 border-blue-500 text-white' : 'bg-zinc-900/60 border-zinc-800 text-zinc-400'}`}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-sm" style={{ backgroundColor: awayTeam.primaryColor || '#3b82f6' }}>{awayTeam.shortName}</div>
                <div className="flex-1 truncate">
                  <div className="text-xs font-black truncate">{awayTeam.nameAr}</div>
                  <div className="text-[10px] text-zinc-400 flex items-center gap-1 mt-0.5">{isAwayHuman ? <><User className="w-2.5 h-2.5 text-emerald-400" /> مدرب بشري</> : <><Bot className="w-2.5 h-2.5 text-blue-400" /> ذكاء اصطناعي</>}</div>
                </div>
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-amber-400">إعداد خطة: {currentTeam.nameAr}</h3>
                <span className="text-[10px] text-zinc-400">الملعب: {currentTeam.stadiumName}</span>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-300">تشكيلة الفريق</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {COACH_FORMATIONS.slice(0, 6).map((formation) => (
                    <button key={formation.id} onClick={() => { audioManager.playClick(); setFormation(formation.id); }} className={`py-2 px-1 rounded-xl text-xs font-mono font-bold border ${currentFormation === formation.id ? 'bg-amber-500 text-zinc-950 border-amber-400' : 'bg-zinc-950 text-zinc-300 border-zinc-800'}`}>
                      {formation.id}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-300">الأسلوب التكتيكي</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {COACH_PLAYING_STYLES.slice(0, 4).map((style) => (
                    <button key={style.id} onClick={() => { audioManager.playClick(); setStyle(style.id); }} className={`p-2 rounded-xl text-xs font-bold border text-right ${currentStyle === style.id || currentStyle === style.name ? 'bg-amber-500/20 border-amber-400 text-amber-300' : 'bg-zinc-950 text-zinc-400 border-zinc-800'}`}>
                      {style.nameAr}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-300">عقلية المباراة</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: 'ATTACK' as Mentality, label: 'هجومي', Icon: Zap, activeClass: 'bg-red-500/20 border-red-400 text-red-300' },
                    { id: 'BALANCED' as Mentality, label: 'متوازن', Icon: Sliders, activeClass: 'bg-amber-500/20 border-amber-400 text-amber-300' },
                    { id: 'DEFEND' as Mentality, label: 'دفاعي', Icon: Shield, activeClass: 'bg-emerald-500/20 border-emerald-400 text-emerald-300' },
                  ]).map((option) => (
                    <button key={option.id} onClick={() => { audioManager.playClick(); setMentality(option.id); }} className={`py-2 px-2 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 ${currentMentality === option.id ? option.activeClass : 'bg-zinc-950 text-zinc-400 border-zinc-800'}`}>
                      <option.Icon className="w-3 h-3" />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button onClick={handleKickoff} className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-zinc-950 font-black text-sm shadow-[0_0_25px_rgba(245,158,11,0.5)] flex items-center justify-center gap-2">
                <Play className="w-4 h-4 fill-zinc-950" />
                <span>صافرة البداية ودخول المستطيل الأخضر</span>
              </button>
              <button onClick={onCancel} className="px-5 py-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white text-xs font-bold">إلغاء</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
