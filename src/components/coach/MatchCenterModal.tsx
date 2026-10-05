// ============================================================
// أنت المدرب | مركز محاكاة المباراة (Match Center Simulator)
// Realistic Two-Phase Match Engine with Half-Time Dressing Room & Tactical Control
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  CoachTeam,
  CoachSquadPlayer,
  CoachMatchResult,
  CoachMatchEvent,
  UserTacticalSettings
} from '../../types/coachGameTypes';
import {
  COACH_FORMATIONS,
  COACH_PLAYING_STYLES
} from '../../data/coachFormationsAndStyles';
import {
  CoachSimulationEngine,
  HalfTimeSimState,
  SimulationParams,
  PartialHalfResult
} from '../../services/coachSimulationEngine';
import { CoachAiIntelligence } from '../../services/coachAiIntelligence';
import { audioManager } from '../../services/audioManager';
import confetti from 'canvas-confetti';
import {
  Trophy,
  Flame,
  Shield,
  Clock,
  Play,
  FastForward,
  CheckCircle2,
  Award,
  Zap,
  Activity,
  ChevronLeft,
  Bot,
  User,
  Megaphone,
  Radio,
  ArrowRightLeft,
  Sliders,
  MessageSquare,
  AlertCircle,
  Check,
  RotateCcw
} from 'lucide-react';

interface MatchCenterModalProps {
  homeTeam: CoachTeam;
  awayTeam: CoachTeam;
  matchResult?: CoachMatchResult;
  simulationParams?: SimulationParams;
  userTeamId: string;
  userTactics?: UserTacticalSettings;
  rewardPointsInfo?: { pointsDelta: number; breakdown: { labelAr: string; amount: number }[] };
  onMatchSimulationStateChange?: (isSimulating: boolean) => void;
  onFinish: (finalResult?: CoachMatchResult) => void;
}

export const MatchCenterModal: React.FC<MatchCenterModalProps> = ({
  homeTeam: initialHomeTeam,
  awayTeam: initialAwayTeam,
  matchResult: initialMatchResult,
  simulationParams,
  userTeamId,
  userTactics: initialTactics,
  rewardPointsInfo,
  onMatchSimulationStateChange,
  onFinish
}) => {
  const isUserHome = userTeamId === initialHomeTeam.id;
  const isUserAway = userTeamId === initialAwayTeam.id;

  // Active teams and tactics state (allows half-time substitutions and tactical adjustments)
  const [currentHomeTeam, setCurrentHomeTeam] = useState<CoachTeam>(initialHomeTeam);
  const [currentAwayTeam, setCurrentAwayTeam] = useState<CoachTeam>(initialAwayTeam);
  const [currentTactics, setCurrentTactics] = useState<UserTacticalSettings>(
    initialTactics || {
      formation: isUserHome ? initialHomeTeam.formation : initialAwayTeam.formation,
      playingStyle: isUserHome ? initialHomeTeam.playingStyle : initialAwayTeam.playingStyle,
      mentality: 'BALANCED',
      tempo: 'BALANCED',
      width: 'BALANCED',
      pressingIntensity: 'BALANCED',
      defensiveLine: 'BALANCED'
    }
  );

  // Match progression state
  const [currentMinute, setCurrentMinute] = useState<number>(0);
  const [isHalfTime, setIsHalfTime] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [simSpeed, setSimSpeed] = useState<number>(1); // 1x or 3x
  const [visibleEvents, setVisibleEvents] = useState<CoachMatchEvent[]>([]);
  const [activeCoachShout, setActiveCoachShout] = useState<string | null>(null);

  // Half-time tactical state
  const [halfTimeSubStarterId, setHalfTimeSubStarterId] = useState<string | null>(null);
  const [halfTimeSubBenchId, setHalfTimeSubBenchId] = useState<string | null>(null);
  const [subsCount, setSubsCount] = useState<number>(0);
  const [selectedTeamTalk, setSelectedTeamTalk] = useState<'MOTIVATIONAL' | 'DEMANDING' | 'CALMING' | null>(null);
  const [teamTalkApplied, setTeamTalkApplied] = useState<boolean>(false);

  // Simulation state references
  const [halfTimeState, setHalfTimeState] = useState<HalfTimeSimState | null>(null);
  const [finalResult, setFinalResult] = useState<CoachMatchResult | null>(initialMatchResult || null);
  const secondHalfSimulatedRef = useRef<boolean>(false);

  // Forced in-match decision (injury substitution / red-card tactical
  // response). Only ever fires for the manager's OWN team — the
  // engine never pauses for the opponent's injuries/red cards.
  const [pendingPartial, setPendingPartial] = useState<PartialHalfResult | null>(null);
  const [chosenSubId, setChosenSubId] = useState<string | null>(null);

  // Initialize first half simulation
  useEffect(() => {
    const params: SimulationParams = simulationParams || {
      homeTeam: initialHomeTeam,
      awayTeam: initialAwayTeam,
      userTeamId,
      userTactics: currentTactics,
      matchday: initialMatchResult?.matchday || 1,
      isKnockout: initialMatchResult?.isExtraTime !== undefined,
      aiDifficulty: 'NORMAL'
    };

    const htState = CoachSimulationEngine.simulateFirstHalf(params);
    if ('isPartial' in htState) {
      // A stoppage happened before anything else in the half was
      // decided — pause here and force the manager's decision before
      // generating a single further minute of this match.
      setPendingPartial(htState);
      setCurrentMinute(htState.resumeMinute);
      setVisibleEvents(htState.eventsSoFar);
      return;
    }

    setHalfTimeState(htState);

    // Speculative full-match pre-computation, used only as a fallback
    // if the manager instant-skips before reaching half-time. If THAT
    // speculative run also hits a stoppage, it is auto-resolved (no
    // substitution / balanced tactics) since instant-skip means the
    // manager opted out of detailed control.
    const initialFull = CoachSimulationEngine.simulateSecondHalf(htState);
    if ('isPartial' in initialFull) {
      const autoResolved = CoachSimulationEngine.resumeSecondHalf(initialFull, initialHomeTeam, initialAwayTeam, currentTactics);
      setFinalResult(autoResolved);
    } else {
      setFinalResult(initialFull);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Applies the manager's resolved decision (substitution already
  // merged into `home`/`away`, or tactics already updated) and
  // continues the simulation from exactly where it paused.
  const finishPendingResolution = (partial: PartialHalfResult, home: CoachTeam, away: CoachTeam, tactics: UserTacticalSettings) => {
    if (partial.half === 1) {
      const resumedHalf = CoachSimulationEngine.resumeFirstHalf(partial, home, away, tactics);
      setHalfTimeState(resumedHalf);
      const speculativeFull = CoachSimulationEngine.simulateSecondHalf(resumedHalf);
      if ('isPartial' in speculativeFull) {
        const autoResolved = CoachSimulationEngine.resumeSecondHalf(speculativeFull, home, away, tactics);
        setFinalResult(autoResolved);
      } else {
        setFinalResult(speculativeFull);
      }
    } else {
      const finalRes = CoachSimulationEngine.resumeSecondHalf(partial, home, away, tactics);
      setFinalResult(finalRes);
      secondHalfSimulatedRef.current = true;
    }
    setPendingPartial(null);
    setChosenSubId(null);
    audioManager.playClick();
  };

  // Manager confirms the forced substitution after an injury.
  const handleConfirmInjurySub = () => {
    if (!pendingPartial || !chosenSubId) return;
    const affectedIsHome = pendingPartial.pendingDecision.teamId === currentHomeTeam.id;
    const affectedTeam = affectedIsHome ? currentHomeTeam : currentAwayTeam;
    const injuredId = pendingPartial.pendingDecision.playerId;

    const newStartingXI = affectedTeam.startingXI.map((id) => (id === injuredId ? chosenSubId : id));
    const newBench = affectedTeam.bench.map((id) => (id === chosenSubId ? injuredId : id));
    // Persist the injury onto the player himself so future matchdays
    // (squad screen, next-match auto-selection) correctly treat him as
    // unavailable — not just this match's lineup swap.
    const newSquad = affectedTeam.squad.map((p) =>
      p.id === injuredId
        ? {
            ...p,
            injuryStatus: {
              type: 'MUSCLE' as const,
              typeAr: 'إصابة عضلية',
              weeksRemaining: Math.floor(Math.random() * 3) + 1,
              descriptionAr: 'إصابة أثناء المباراة استدعت تبديلاً فوريًا'
            }
          }
        : p
    );
    const updatedTeam: CoachTeam = { ...affectedTeam, startingXI: newStartingXI, bench: newBench, squad: newSquad };

    if (affectedIsHome) setCurrentHomeTeam(updatedTeam);
    else setCurrentAwayTeam(updatedTeam);

    finishPendingResolution(
      pendingPartial,
      affectedIsHome ? updatedTeam : currentHomeTeam,
      affectedIsHome ? currentAwayTeam : updatedTeam,
      currentTactics
    );
  };

  // Manager chooses a tactical response after a red card.
  const handleConfirmRedCardResponse = (preset: 'DEFENSIVE' | 'BALANCED' | 'AGGRESSIVE') => {
    if (!pendingPartial) return;
    const updatedTactics: UserTacticalSettings = {
      ...currentTactics,
      mentality: preset === 'DEFENSIVE' ? 'VERY_DEFENSIVE' : preset === 'AGGRESSIVE' ? 'ATTACKING' : 'BALANCED',
      defensiveLine: preset === 'DEFENSIVE' ? 'DEEP' : currentTactics.defensiveLine
    };
    setCurrentTactics(updatedTactics);
    finishPendingResolution(pendingPartial, currentHomeTeam, currentAwayTeam, updatedTactics);
  };

  // Controller types
  const homeIsHuman = currentHomeTeam.controllerType === 'HUMAN' || isUserHome;
  const awayIsHuman = currentAwayTeam.controllerType === 'HUMAN' || isUserAway;

  const homePersonality = !homeIsHuman ? CoachAiIntelligence.getTeamPersonality(currentHomeTeam) : null;
  const awayPersonality = !awayIsHuman ? CoachAiIntelligence.getTeamPersonality(currentAwayTeam) : null;

  // Sync simulation active state for floating chat (active strictly during live pitch minutes)
  useEffect(() => {
    if (currentMinute > 0 && currentMinute < 90 && !isHalfTime && !isFinished) {
      onMatchSimulationStateChange?.(true);
    } else {
      onMatchSimulationStateChange?.(false);
    }
    return () => {
      onMatchSimulationStateChange?.(false);
    };
  }, [currentMinute, isHalfTime, isFinished, onMatchSimulationStateChange]);

  // Live minute ticker loop
  useEffect(() => {
    if (isFinished || isHalfTime || !finalResult || pendingPartial) return;

    const interval = setInterval(() => {
      setCurrentMinute((prev) => {
        const next = prev + simSpeed;

        // Reached Half-Time (Minute 45)
        if (prev < 45 && next >= 45) {
          setIsHalfTime(true);
          audioManager.playWhistle();
          // Filter events up to minute 45
          const firstHalfEvents = (finalResult?.halfTimeEvents || finalResult.events.filter((e) => e.minute <= 45));
          setVisibleEvents(firstHalfEvents);
          return 45;
        }

        // Reached Full-Time (Minute 90+)
        if (next >= 90) {
          setIsFinished(true);
          const userScore = isUserHome ? finalResult.homeScore : finalResult.awayScore;
          const oppScore = isUserHome ? finalResult.awayScore : finalResult.homeScore;

          if (userScore > oppScore) {
            audioManager.playFanfare();
            confetti({ particleCount: 70, spread: 75, origin: { y: 0.6 } });
          } else {
            audioManager.playWhistle();
          }

          setVisibleEvents(finalResult.events);
          return 90;
        }

        // Add events that occurred in this minute window
        const newEvents = finalResult.events.filter((e) => e.minute <= next && e.minute > prev);
        if (newEvents.length > 0) {
          newEvents.forEach((ev) => {
            if (ev.type === 'GOAL') audioManager.playGoal();
            else if (ev.type === 'YELLOW_CARD') audioManager.playWarning();
            else if (ev.type === 'TACTICAL_REACTION' || ev.type === 'TACTICAL_CHANGE') audioManager.playWhistle();
          });
          setVisibleEvents((prevEv) => [...prevEv, ...newEvents]);
        }

        return next;
      });
    }, 110 / simSpeed);

    return () => clearInterval(interval);
  }, [isFinished, isHalfTime, simSpeed, finalResult, isUserHome, pendingPartial]);

  // Handle in-game tactical instructions from manager
  const handleCoachShout = (shoutType: 'ATTACK' | 'DEFEND' | 'KEEP_BALL') => {
    audioManager.playClick();
    let text = '';
    if (shoutType === 'ATTACK') {
      text = '⚡ تقدموا للأمام! ضغط عالٍ وهجوم شامل لتهديد المرمى!';
    } else if (shoutType === 'DEFEND') {
      text = '🛡️ تراجع وتأمين دفاعي! أغلقوا المساحات واعتمدوا على المرتدات!';
    } else {
      text = '🔄 هدوء وتدوير للكرة! تحكموا في إيقاع اللعب وأرهقوا المنافس!';
    }

    setActiveCoachShout(text);
    const shoutEvent: CoachMatchEvent = {
      minute: Math.min(89, Math.max(1, currentMinute)),
      type: 'TACTICAL_CHANGE',
      teamId: isUserHome ? currentHomeTeam.id : currentAwayTeam.id,
      teamName: isUserHome ? currentHomeTeam.nameAr : currentAwayTeam.nameAr,
      playerName: isUserHome
        ? currentHomeTeam.currentManager?.nameAr || 'المدرب'
        : currentAwayTeam.currentManager?.nameAr || 'المدرب',
      descriptionAr: `📣 توجيهات فورية من المدرب: ${text}`
    };

    setVisibleEvents((prev) => [...prev, shoutEvent]);
    setTimeout(() => setActiveCoachShout(null), 4000);
  };

  // Instant Skip
  const handleInstantSkip = () => {
    if (currentMinute < 45 && !isHalfTime) {
      // Skip directly to half-time so manager has the chance to adjust tactics
      setCurrentMinute(45);
      setIsHalfTime(true);
      audioManager.playWhistle();
      if (finalResult) {
        setVisibleEvents(finalResult.halfTimeEvents || finalResult.events.filter((e) => e.minute <= 45));
      }
    } else {
      // Skip to full-time
      if (!secondHalfSimulatedRef.current && halfTimeState) {
        const res = CoachSimulationEngine.simulateSecondHalf(halfTimeState, {
          homeTeam: currentHomeTeam,
          awayTeam: currentAwayTeam,
          userTactics: currentTactics
        });
        // Instant-skip means the manager opted out of detailed control,
        // so any stoppage here is auto-resolved (no substitution /
        // unchanged tactics) rather than pausing.
        const resolvedRes =
          'isPartial' in res
            ? CoachSimulationEngine.resumeSecondHalf(res, currentHomeTeam, currentAwayTeam, currentTactics)
            : res;
        setFinalResult(resolvedRes);
        setVisibleEvents(resolvedRes.events);
      } else if (finalResult) {
        setVisibleEvents(finalResult.events);
      }
      setCurrentMinute(90);
      setIsHalfTime(false);
      setIsFinished(true);
      setPendingPartial(null);
      audioManager.playWhistle();

      const userScore = isUserHome ? (finalResult?.homeScore || 0) : (finalResult?.awayScore || 0);
      const oppScore = isUserHome ? (finalResult?.awayScore || 0) : (finalResult?.homeScore || 0);
      if (userScore > oppScore) {
        audioManager.playFanfare();
        confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
      }
    }
  };

  // Half-time substitution
  const handleHalfTimeSub = () => {
    if (!halfTimeSubStarterId || !halfTimeSubBenchId) return;
    if (subsCount >= 5) return;

    const userTeam = isUserHome ? currentHomeTeam : currentAwayTeam;
    const newStartingXI = userTeam.startingXI.map((id) => (id === halfTimeSubStarterId ? halfTimeSubBenchId : id));
    const newBench = userTeam.bench.map((id) => (id === halfTimeSubBenchId ? halfTimeSubStarterId : id));

    const updatedTeam: CoachTeam = {
      ...userTeam,
      startingXI: newStartingXI,
      bench: newBench
    };

    if (isUserHome) {
      setCurrentHomeTeam(updatedTeam);
    } else {
      setCurrentAwayTeam(updatedTeam);
    }

    setSubsCount((prev) => prev + 1);
    setHalfTimeSubStarterId(null);
    setHalfTimeSubBenchId(null);
    audioManager.playClick();
  };

  // Half-time team talk selection
  const handleSelectTeamTalk = (talk: 'MOTIVATIONAL' | 'DEMANDING' | 'CALMING') => {
    setSelectedTeamTalk(talk);
    setTeamTalkApplied(true);
    audioManager.playClick();
  };

  // Resume to Second Half
  const handleResumeSecondHalf = () => {
    if (!halfTimeState) return;

    audioManager.playWhistle();

    // Simulate second half with all manager adjustments and team talk applied!
    const updatedTacticsWithTalk: UserTacticalSettings = {
      ...currentTactics,
      mentality:
        selectedTeamTalk === 'MOTIVATIONAL'
          ? 'ATTACKING'
          : selectedTeamTalk === 'DEMANDING'
          ? 'ALL_OUT_ATTACK'
          : currentTactics.mentality
    };
    setCurrentTactics(updatedTacticsWithTalk);

    const secondHalfResult = CoachSimulationEngine.simulateSecondHalf(halfTimeState, {
      homeTeam: currentHomeTeam,
      awayTeam: currentAwayTeam,
      userTactics: updatedTacticsWithTalk
    });

    if ('isPartial' in secondHalfResult) {
      // A stoppage occurs somewhere in the second half — pause exactly
      // there and force the manager's decision before anything past
      // that minute is generated.
      setPendingPartial(secondHalfResult);
      setVisibleEvents(secondHalfResult.eventsSoFar);
      setIsHalfTime(false);
      setCurrentMinute(secondHalfResult.resumeMinute);
      return;
    }

    secondHalfSimulatedRef.current = true;
    setFinalResult(secondHalfResult);
    setIsHalfTime(false);
    setCurrentMinute(46);
  };

  // Calculate live score
  const currentHomeScore = isFinished
    ? finalResult?.homeScore || 0
    : isHalfTime
    ? halfTimeState?.homeScore || 0
    : finalResult?.events.filter((e) => e.type === 'GOAL' && e.teamId === currentHomeTeam.id && e.minute <= currentMinute).length || 0;

  const currentAwayScore = isFinished
    ? finalResult?.awayScore || 0
    : isHalfTime
    ? halfTimeState?.awayScore || 0
    : finalResult?.events.filter((e) => e.type === 'GOAL' && e.teamId === currentAwayTeam.id && e.minute <= currentMinute).length || 0;

  const userTeam = isUserHome ? currentHomeTeam : currentAwayTeam;
  const userStarters = userTeam.startingXI
    .map((id) => userTeam.squad.find((p) => p.id === id))
    .filter(Boolean) as CoachSquadPlayer[];
  const userBench = userTeam.bench
    .map((id) => userTeam.squad.find((p) => p.id === id))
    .filter(Boolean) as CoachSquadPlayer[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md overflow-y-auto">
      {/* Forced In-Match Decision: Injury Substitution / Red Card Response */}
      {pendingPartial && (
        <div className="fixed inset-0 z-[80] bg-black/92 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-amber-500/40 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            {pendingPartial.pendingDecision.type === 'INJURY' ? (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🚑</span>
                  <h3 className="text-base font-black text-white">إصابة! يجب اختيار بديل على طول</h3>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  <span className="text-white font-bold">{pendingPartial.pendingDecision.playerName}</span> أصيب في
                  الدقيقة {pendingPartial.pendingDecision.minute} وهو <span className="text-amber-300 font-black">{pendingPartial.pendingDecision.positionAr}</span>.
                  اللاعب لا يستطيع مواصلة اللعب؛ اختار بديلاً مناسبًا من دكة البدلاء.
                </p>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {(isUserHome ? currentHomeTeam : currentAwayTeam).bench.map((benchId) => {
                    const p = (isUserHome ? currentHomeTeam : currentAwayTeam).squad.find((s) => s.id === benchId);
                    if (!p) return null;
                    const selected = chosenSubId === benchId;
                    return (
                      <button
                        key={benchId}
                        onClick={() => setChosenSubId(benchId)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border text-xs font-bold transition-colors cursor-pointer ${
                          selected
                            ? 'bg-amber-500 text-zinc-950 border-amber-400'
                            : 'bg-zinc-950/60 border-zinc-800 text-white hover:border-amber-500/40'
                        }`}
                      >
                        <span>{p.nameAr}</span>
                        <span className="text-[10px] opacity-80">
                          {p.position} • {p.rating}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={handleConfirmInjurySub}
                  disabled={!chosenSubId}
                  className="w-full px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-zinc-950 text-sm font-black transition-colors cursor-pointer"
                >
                  تأكيد التبديل واستكمال المباراة
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🟥</span>
                  <h3 className="text-base font-black text-white">طرد مباشر! فريقك دلوقتي بعشرة لاعبين</h3>
                </div>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  <span className="text-white font-bold">{pendingPartial.pendingDecision.playerName}</span> طُرد في
                  الدقيقة {pendingPartial.pendingDecision.minute} من مركز <span className="text-rose-300 font-black">{pendingPartial.pendingDecision.positionAr}</span>.
                  اختار استجابة تكتيكية فورية لتفادي الخسارة قبل استكمال المباراة.
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => handleConfirmRedCardResponse('DEFENSIVE')}
                    className="w-full text-right px-4 py-3 rounded-2xl bg-zinc-950/60 border border-zinc-800 hover:border-emerald-500/40 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    🛡️ تكتل دفاعي — حماية النتيجة (أقل هجوماً، دفاع أكثر تماسكاً)
                  </button>
                  <button
                    onClick={() => handleConfirmRedCardResponse('BALANCED')}
                    className="w-full text-right px-4 py-3 rounded-2xl bg-zinc-950/60 border border-zinc-800 hover:border-amber-500/40 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    ⚖️ استمرار متوازن — بلا تغيير جذري في الخطة
                  </button>
                  <button
                    onClick={() => handleConfirmRedCardResponse('AGGRESSIVE')}
                    className="w-full text-right px-4 py-3 rounded-2xl bg-zinc-950/60 border border-zinc-800 hover:border-rose-500/40 text-white text-xs font-bold transition-colors cursor-pointer"
                  >
                    ⚡ المخاطرة والهجوم المرتد — دفاع أضعف، فرص هجومية أكثر
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="relative w-full max-w-6xl max-h-[94vh] overflow-y-auto bg-zinc-950 border border-zinc-800 rounded-3xl p-4 sm:p-6 shadow-[0_0_50px_rgba(0,0,0,0.9)] space-y-5">
        {/* Atmosphere Lighting */}
        <div
          className="absolute top-0 left-1/4 w-80 h-36 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: currentHomeTeam.primaryColor || '#f59e0b' }}
        />
        <div
          className="absolute top-0 right-1/4 w-80 h-36 rounded-full blur-3xl opacity-20 pointer-events-none"
          style={{ backgroundColor: currentAwayTeam.primaryColor || '#3b82f6' }}
        />

        {/* 1. Header: Stadium & Clock */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 pb-3">
          <div className="flex items-center gap-2">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isFinished ? 'bg-zinc-500' : isHalfTime ? 'bg-amber-400' : 'bg-red-500 animate-ping'
              }`}
            />
            <span className="text-xs font-black text-white uppercase tracking-wider">
              {isFinished
                ? 'صافرة النهاية • نتيجة نهائية'
                : isHalfTime
                ? 'استراحة الشوطين • غرفة الملابس'
                : 'محاكاة المباراة مباشرة'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1 bg-zinc-900 border border-zinc-700 rounded-xl text-xs font-mono font-black text-amber-400">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {currentMinute}' {isFinished ? 'FT' : isHalfTime ? 'HT' : ''}
              </span>
            </div>

            {!isFinished && !isHalfTime && !pendingPartial && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setSimSpeed(simSpeed === 1 ? 3 : 1)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                    simSpeed > 1
                      ? 'bg-amber-500 text-zinc-950 border-amber-400 font-black'
                      : 'bg-zinc-900 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  {simSpeed}x سرعة
                </button>
                <button
                  onClick={handleInstantSkip}
                  className="flex items-center gap-1 px-3 py-1 rounded-lg bg-zinc-900 border border-amber-500/40 text-amber-300 hover:bg-amber-500 hover:text-zinc-950 text-xs font-black transition-all cursor-pointer"
                >
                  <FastForward className="w-3.5 h-3.5" />
                  <span>تخطي</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 2. Main Live Scoreboard */}
        <div className="bg-gradient-to-b from-zinc-900 via-zinc-950 to-zinc-900 border border-zinc-800 rounded-2xl p-4 sm:p-6 flex items-center justify-between">
          {/* Home Team */}
          <div className="flex-1 flex flex-col items-center text-center">
            <div
              className="w-14 sm:w-18 h-14 sm:h-18 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-lg mb-2"
              style={{ backgroundColor: currentHomeTeam.primaryColor || '#f59e0b' }}
            >
              {currentHomeTeam.shortName}
            </div>
            <h3 className="text-xs sm:text-base font-black text-white truncate max-w-[120px] sm:max-w-none">
              {currentHomeTeam.nameAr}
            </h3>
            <span className="text-[10px] text-zinc-400 mt-0.5">
              {currentHomeTeam.formation} • {currentHomeTeam.playingStyle}
            </span>

            <div className="mt-1.5 flex flex-col items-center gap-1">
              {homeIsHuman ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black border border-emerald-500/40 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>{isUserHome ? 'فريقك (بشري 👤)' : 'لاعب بشري 👤'}</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[9px] font-black border border-blue-400/30 flex items-center gap-1">
                  <Bot className="w-3 h-3" />
                  <span>{homePersonality?.badgeAr || 'ذكاء اصطناعي 🤖'}</span>
                </span>
              )}
            </div>
          </div>

          {/* Center Score */}
          <div className="px-4 sm:px-8 text-center">
            <div className="flex items-center justify-center gap-3 sm:gap-6 font-mono text-3xl sm:text-5xl font-black text-white tracking-wider">
              <span>{currentHomeScore}</span>
              <span className="text-zinc-600 text-2xl sm:text-4xl">-</span>
              <span>{currentAwayScore}</span>
            </div>

            {finalResult?.penaltyScore && isFinished && (
              <div className="text-xs font-mono font-bold text-amber-400 mt-1">
                ركلات الترجيح: ({finalResult.penaltyScore[0]} - {finalResult.penaltyScore[1]})
              </div>
            )}

            <div className="text-[11px] text-zinc-400 font-bold mt-2">{currentHomeTeam.stadiumName}</div>
          </div>

          {/* Away Team */}
          <div className="flex-1 flex flex-col items-center text-center">
            <div
              className="w-14 sm:w-18 h-14 sm:h-18 rounded-2xl flex items-center justify-center font-black text-white text-xl shadow-lg mb-2"
              style={{ backgroundColor: currentAwayTeam.primaryColor || '#3b82f6' }}
            >
              {currentAwayTeam.shortName}
            </div>
            <h3 className="text-xs sm:text-base font-black text-white truncate max-w-[120px] sm:max-w-none">
              {currentAwayTeam.nameAr}
            </h3>
            <span className="text-[10px] text-zinc-400 mt-0.5">
              {currentAwayTeam.formation} • {currentAwayTeam.playingStyle}
            </span>

            <div className="mt-1.5 flex flex-col items-center gap-1">
              {awayIsHuman ? (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black border border-emerald-500/40 flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>{isUserAway ? 'فريقك (بشري 👤)' : 'لاعب بشري 👤'}</span>
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[9px] font-black border border-blue-400/30 flex items-center gap-1">
                  <Bot className="w-3 h-3" />
                  <span>{awayPersonality?.badgeAr || 'ذكاء اصطناعي 🤖'}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 3. HALF-TIME DRESSING ROOM & TACTICAL ADJUSTMENTS */}
        {isHalfTime && halfTimeState && (
          <div className="bg-zinc-900/95 border-2 border-amber-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-5 h-5 text-amber-400" />
                <div>
                  <h4 className="text-sm font-black text-white">غرفة الملابس واستراحة الشوطين</h4>
                  <p className="text-[11px] text-zinc-400">
                    نتيجة الشوط الأول: {halfTimeState.homeScore} - {halfTimeState.awayScore} • اتخذ قراراتك للشوط الثاني
                  </p>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/30">
                التبديلات: {subsCount} / 5
              </span>
            </div>

            {/* Tactical Feedback from 1st Half */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-2xl bg-zinc-950/80 border border-emerald-500/30">
                <div className="text-xs font-black text-emerald-400 flex items-center gap-1.5 mb-1.5">
                  <Check className="w-3.5 h-3.5" />
                  <span>ما اللي يعمل بنجاح في الشوط الأول:</span>
                </div>
                <ul className="text-xs text-zinc-300 space-y-1">
                  {halfTimeState.halfTimeFeedback.whatIsWorkingAr.map((w, idx) => (
                    <li key={`wk_${idx}`}>• {w}</li>
                  ))}
                </ul>
              </div>

              <div className="p-3 rounded-2xl bg-zinc-950/80 border border-amber-500/30">
                <div className="text-xs font-black text-amber-400 flex items-center gap-1.5 mb-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>نقاط الضعف والمشاكل التكتيكية:</span>
                </div>
                <ul className="text-xs text-zinc-300 space-y-1">
                  {halfTimeState.halfTimeFeedback.whatIsNotWorkingAr.map((nw, idx) => (
                    <li key={`nwk_${idx}`}>• {nw}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Momentum Bar */}
            <div className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>
                <strong>زخم الشوط الأول:</strong> {halfTimeState.halfTimeFeedback.momentumAr}
              </span>
            </div>

            {/* Half-Time Substitutions */}
            <div className="space-y-3 bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <ArrowRightLeft className="w-4 h-4 text-amber-400" />
                  <span>التبديلات بين الشوطين (اختار لاعباً أساسياً ثم بديلاً):</span>
                </span>
                {halfTimeSubStarterId && (
                  <span className="text-amber-400 text-[10px] font-bold animate-pulse">
                    تم اختيار اللاعب، اختار البديل لإتمام النزول
                  </span>
                )}
              </div>

              {/* Starters selector */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {userStarters.map((starter) => (
                  <button
                    key={starter.id}
                    onClick={() => setHalfTimeSubStarterId(starter.id)}
                    className={`p-2 rounded-xl border text-right transition-all cursor-pointer ${
                      halfTimeSubStarterId === starter.id
                        ? 'bg-amber-400 text-zinc-950 border-amber-300 font-bold ring-2 ring-amber-400'
                        : 'bg-zinc-900 border-zinc-800 text-white hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[9px]">
                      <span>{starter.position}</span>
                      <span className="font-mono">{starter.rating}</span>
                    </div>
                    <div className="text-[10px] font-black truncate mt-0.5">{starter.nameAr}</div>
                    <div className="text-[8px] text-zinc-400 mt-0.5">لياقة: {starter.fitness}%</div>
                  </button>
                ))}
              </div>

              {/* Bench selector */}
              {halfTimeSubStarterId && (
                <div className="pt-2 border-t border-zinc-800 space-y-1.5">
                  <span className="text-[10px] text-zinc-400 font-bold block">اختار اللاعب البديل من الدكة:</span>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                    {userBench.map((benchPlayer) => (
                      <button
                        key={benchPlayer.id}
                        onClick={() => {
                          setHalfTimeSubBenchId(benchPlayer.id);
                          // Perform sub
                          const newStartingXI = userTeam.startingXI.map((id) =>
                            id === halfTimeSubStarterId ? benchPlayer.id : id
                          );
                          const newBench = userTeam.bench.map((id) =>
                            id === benchPlayer.id ? halfTimeSubStarterId : id
                          );
                          const updatedTeam: CoachTeam = {
                            ...userTeam,
                            startingXI: newStartingXI,
                            bench: newBench
                          };
                          if (isUserHome) setCurrentHomeTeam(updatedTeam);
                          else setCurrentAwayTeam(updatedTeam);

                          setSubsCount((prev) => prev + 1);
                          setHalfTimeSubStarterId(null);
                          audioManager.playClick();
                        }}
                        className="p-2 rounded-xl border bg-emerald-950/30 border-emerald-500/40 hover:bg-emerald-900/50 text-right cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-[9px] text-emerald-300">
                          <span>{benchPlayer.position}</span>
                          <span className="font-mono">{benchPlayer.rating}</span>
                        </div>
                        <div className="text-[10px] font-black text-white truncate mt-0.5">{benchPlayer.nameAr}</div>
                        <div className="text-[8px] text-emerald-400 mt-0.5">لياقة: {benchPlayer.fitness}%</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Half-Time Tactical Tweaks */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Formation */}
              <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800">
                <label className="text-[10px] font-bold text-zinc-400 block mb-1">الخطة للشوط الثاني:</label>
                <select
                  value={userTeam.formation}
                  onChange={(e) => {
                    const newForm = e.target.value;
                    const updated = { ...userTeam, formation: newForm };
                    if (isUserHome) setCurrentHomeTeam(updated);
                    else setCurrentAwayTeam(updated);
                    setCurrentTactics({ ...currentTactics, formation: newForm });
                  }}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg p-1.5 text-xs font-bold outline-none cursor-pointer"
                >
                  {COACH_FORMATIONS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} — {f.nameAr}
                    </option>
                  ))}
                </select>
              </div>

              {/* Mentality */}
              <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800">
                <label className="text-[10px] font-bold text-zinc-400 block mb-1">عقلية الشوط الثاني:</label>
                <select
                  value={currentTactics.mentality || 'BALANCED'}
                  onChange={(e) =>
                    setCurrentTactics({
                      ...currentTactics,
                      mentality: e.target.value as any
                    })
                  }
                  className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg p-1.5 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="VERY_DEFENSIVE">دفاعي بحت 🛡️</option>
                  <option value="DEFENSIVE">دفاعي 🧱</option>
                  <option value="BALANCED">متوازن ⚖️</option>
                  <option value="ATTACKING">هجومي ⚡</option>
                  <option value="ALL_OUT_ATTACK">هجوم كاسح 🔥</option>
                </select>
              </div>

              {/* Pressing */}
              <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800">
                <label className="text-[10px] font-bold text-zinc-400 block mb-1">شدة الضغط:</label>
                <select
                  value={currentTactics.pressingIntensity || 'BALANCED'}
                  onChange={(e) =>
                    setCurrentTactics({
                      ...currentTactics,
                      pressingIntensity: e.target.value as any
                    })
                  }
                  className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-lg p-1.5 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="LOW">ضغط هادئ</option>
                  <option value="BALANCED">متوازن</option>
                  <option value="HIGH">ضغط عالٍ</option>
                  <option value="INTENSE">ضغط خانق مستمر</option>
                </select>
              </div>
            </div>

            {/* Team Talk in Dressing Room */}
            <div className="space-y-2 bg-zinc-950/60 p-3.5 rounded-2xl border border-zinc-800">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span>حديث غرفة الملابس بين الشوطين (Team Talk):</span>
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  onClick={() => handleSelectTeamTalk('MOTIVATIONAL')}
                  className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                    selectedTeamTalk === 'MOTIVATIONAL'
                      ? 'bg-amber-500 text-zinc-950 border-amber-400 font-black'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-xs font-bold">🔥 تشجيع وتحفيز</div>
                  <div className="text-[10px] mt-0.5 opacity-80">
                    "واصلوا ده الضغط، الفوز بين أيديكم!" (+فاعلية هجومية)
                  </div>
                </button>

                <button
                  onClick={() => handleSelectTeamTalk('DEMANDING')}
                  className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                    selectedTeamTalk === 'DEMANDING'
                      ? 'bg-red-500 text-white border-red-400 font-black'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-xs font-bold">⚡ غضب ومطالبة بالمزيد</div>
                  <div className="text-[10px] mt-0.5 opacity-80">
                    "أداء غير مقبول! أريد قتالية فورية!" (+ضغط وقتالية)
                  </div>
                </button>

                <button
                  onClick={() => handleSelectTeamTalk('CALMING')}
                  className={`p-2.5 rounded-xl border text-right transition-all cursor-pointer ${
                    selectedTeamTalk === 'CALMING'
                      ? 'bg-blue-500 text-white border-blue-400 font-black'
                      : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-xs font-bold">🧘 هدوء وانضباط تكتيكي</div>
                  <div className="text-[10px] mt-0.5 opacity-80">
                    "حافظوا على تركيزكم ولا تتسرعوا" (+دقة تمرير)
                  </div>
                </button>
              </div>
            </div>

            {/* Resume Button */}
            <button
              onClick={handleResumeSecondHalf}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600 text-zinc-950 font-black text-sm shadow-[0_0_25px_rgba(16,185,129,0.5)] hover:scale-[1.01] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>انطلاق الشوط الثاني ⏱️</span>
            </button>
          </div>
        )}

        {/* 4. Live In-Match Coach Shouts (Active in 1st & 2nd Halves) */}
        {!isFinished && !isHalfTime && !pendingPartial && (
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-black text-amber-400">
                <Megaphone className="w-4 h-4" />
                <span>تدخل تكتيكي فوري للمدرب:</span>
              </div>
              <span className="text-[10px] text-zinc-400">وجه فريقك دلوقتي لتعديل مجريات اللقاء</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleCoachShout('ATTACK')}
                className="py-2 px-2 bg-red-950/40 hover:bg-red-900/60 border border-red-500/30 rounded-xl text-xs font-bold text-red-300 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 text-red-400" />
                <span>هجوم شامل</span>
              </button>

              <button
                onClick={() => handleCoachShout('KEEP_BALL')}
                className="py-2 px-2 bg-blue-950/40 hover:bg-blue-900/60 border border-blue-500/30 rounded-xl text-xs font-bold text-blue-300 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5 text-blue-400" />
                <span>تدوير واستحواذ</span>
              </button>

              <button
                onClick={() => handleCoachShout('DEFEND')}
                className="py-2 px-2 bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-300 hover:text-white transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                <span>تأمين دفاعي</span>
              </button>
            </div>

            {activeCoachShout && (
              <div className="mt-2 p-2 bg-amber-500/15 border border-amber-400/40 rounded-xl text-xs font-bold text-amber-300 animate-pulse text-center">
                {activeCoachShout}
              </div>
            )}
          </div>
        )}

        {/* 5. Live Match Event Feed */}
        <div className="bg-zinc-900/70 border border-zinc-800 rounded-2xl p-4 max-h-56 overflow-y-auto space-y-2">
          <div className="text-xs font-black text-zinc-300 pb-1 flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span>تسلسل أحداث اللقاء والقرارات التكتيكية:</span>
          </div>

          {visibleEvents.length === 0 ? (
            <div className="text-center py-6 text-xs text-zinc-500">
              المباراة جارية بحذر ودراسة تكتيكية متبادلة في منتصف الملعب...
            </div>
          ) : (
            visibleEvents.map((ev, idx) => (
              <div
                key={`ev_${idx}`}
                className={`p-2.5 rounded-xl text-xs flex items-center justify-between ${
                  ev.type === 'GOAL'
                    ? 'bg-amber-500/15 border border-amber-500/40 text-amber-200 font-bold'
                    : ev.type === 'TACTICAL_REACTION'
                    ? 'bg-purple-950/50 border border-purple-500/50 text-purple-200 font-black shadow-md'
                    : ev.type === 'TACTICAL_CHANGE'
                    ? 'bg-cyan-950/50 border border-cyan-500/40 text-cyan-200 font-bold'
                    : ev.type === 'YELLOW_CARD'
                    ? 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-300'
                    : 'bg-zinc-950/80 border border-zinc-800 text-zinc-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-amber-400 w-8">{ev.minute}'</span>
                  <span>{ev.descriptionAr}</span>
                </div>
                <span className="text-[10px] text-zinc-500">{ev.teamName}</span>
              </div>
            ))
          )}
        </div>

        {/* 6. Match Statistics (If finished) */}
        {isFinished && finalResult && (
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <h4 className="text-xs font-black text-white">إحصائيات المواجهة الرسمية</h4>

            {/* Possession Bar */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono font-bold">
                <span className="text-amber-400">{finalResult.stats.possession[0]}%</span>
                <span className="text-zinc-400">الاستحواذ</span>
                <span className="text-blue-400">{finalResult.stats.possession[1]}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-zinc-800 overflow-hidden flex">
                <div
                  className="h-full bg-amber-400"
                  style={{ width: `${finalResult.stats.possession[0]}%` }}
                />
                <div
                  className="h-full bg-blue-500"
                  style={{ width: `${finalResult.stats.possession[1]}%` }}
                />
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
              <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                <div className="font-mono font-black text-white">
                  {finalResult.stats.shots[0]} - {finalResult.stats.shots[1]}
                </div>
                <div className="text-[10px] text-zinc-400">إجمالي التسديدات</div>
              </div>

              <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                <div className="font-mono font-black text-emerald-400">
                  {finalResult.stats.shotsOnTarget[0]} - {finalResult.stats.shotsOnTarget[1]}
                </div>
                <div className="text-[10px] text-zinc-400">على المرمى</div>
              </div>

              <div className="bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                <div className="font-mono font-black text-white">
                  {finalResult.stats.corners[0]} - {finalResult.stats.corners[1]}
                </div>
                <div className="text-[10px] text-zinc-400">الركنيات</div>
              </div>
            </div>

            {/* Man of the Match & Tactical Verdict */}
            {finalResult.manOfTheMatch && (
              <div className="mt-3 p-3 rounded-xl bg-zinc-950 border border-amber-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-[10px] text-amber-400 font-bold">رجل المباراة (MVP)</div>
                    <div className="text-xs font-black text-white">
                      {finalResult.manOfTheMatch.playerName} ({finalResult.manOfTheMatch.teamName})
                    </div>
                  </div>
                </div>
                <div className="font-mono font-black text-sm text-amber-400">
                  ★ {finalResult.manOfTheMatch.rating}
                </div>
              </div>
            )}

            {finalResult.tacticalAnalysisAr && (
              <p className="text-xs text-zinc-300 italic bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 leading-relaxed">
                "{finalResult.tacticalAnalysisAr}"
              </p>
            )}

            {/* Manager Points Earned Summary */}
            {rewardPointsInfo && (
              <div className="mt-3 p-3.5 rounded-xl bg-gradient-to-r from-amber-950/30 via-zinc-950 to-zinc-950 border border-amber-500/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🌟</span>
                    <span className="text-xs font-black text-white">مكافآت نقاط المدرب (Manager Points)</span>
                  </div>
                  <span
                    className={`font-mono text-sm font-black ${
                      rewardPointsInfo.pointsDelta >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {rewardPointsInfo.pointsDelta >= 0
                      ? `+${rewardPointsInfo.pointsDelta}`
                      : `${rewardPointsInfo.pointsDelta}`}{' '}
                    نقطة
                  </span>
                </div>

                <div className="space-y-1 pt-1 border-t border-zinc-800/80">
                  {rewardPointsInfo.breakdown.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] text-zinc-300">
                      <span>• {item.labelAr}</span>
                      <span
                        className={`font-mono font-bold ${
                          item.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {item.amount >= 0 ? `+${item.amount}` : item.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 7. Footer CTA */}
        {isFinished && (
          <div className="pt-2">
            <button
              onClick={() => {
                audioManager.playClick();
                onFinish(finalResult || undefined);
              }}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-zinc-950 font-black text-sm shadow-[0_0_25px_rgba(245,158,11,0.5)] hover:scale-[1.01] active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>متابعة لجدول الترتيب والمباراة القادمة</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
