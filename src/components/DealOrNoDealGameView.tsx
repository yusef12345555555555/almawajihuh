// ============================================================
// ديل أور نو ديل | DEAL OR NO DEAL — الشاشة الرئيسية للعبة (v2)
//
// المنطق كله على حالة حقيقية (dealOrNoDealEngine): seed + سجل أفعال.
//   • 5 جولات ثابتة: حراس ← مدافعين ← وسط ← مهاجمين ← مدربين.
//   • كل لاعب 4 صناديق مقفولة (الاتنين شايفينها). بيفتح صندوق والخصم بيشوفه، وبعدين:
//       خد الصفقة = ياخد اللاعب ده والنظام بيفتح باقي الصناديق للاتنين.
//       جازف      = يفتح الصندوق الثاني فقط (مفيش صندوق ثالث) وبعده تكشف الجولة كلها.
//   • بعدها الدور للخصم بـ4 صناديق تانية مختلفة من نفس المركز.
//   • ضد لاعب حقيقي: لاعب A بيختار مدة التفكير (5..30 ثانية) وبتتنفذ الخطوة تلقائي لو الوقت خلص.
//   • عدد الكروت الخاصة في المباراة من 1 إلى 3، وتوزيعها عشوائي على جولات وصناديق ولاعبين مختلفة.
//   • بعد الجولة الخامسة: تشكيلة فعلية من اللي اتكسب ← "مين هيكسب؟" ← محاكاة حقيقية.
// ============================================================

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Loader2, LogOut, Swords, WifiOff } from "lucide-react";
import { PlayerSnapshot, UserProfile } from "../types";
import { getAllCoaches, getCoachesSync } from "../services/coachRepository";
import {
  DND_CARD_INFO,
  DND_STAGES,
  DndAction,
  DndBox,
  DndCardType,
  DndEvent,
  DndItem,
  DndMode,
  DndSide,
  DndState,
} from "../types/dealOrNoDealTypes";
import {
  aiPickBox,
  aiShouldDeal,
  applyAction,
  buildPools,
  buildSquad,
  drawStage,
  itemName,
  itemRating,
  other,
  poolSignature,
  poolsAreSufficient,
  randomSeed,
  replay,
  simulateFinal,
  toPublicView,
} from "../services/dealOrNoDealEngine";
import {
  DealOrNoDealSync,
  DndMatchRow,
  makePairKey,
} from "../services/dealOrNoDealSync";
import {
  clearDndMatch,
  loadDndMatch,
  saveDndMatch,
} from "../services/dealOrNoDealPersistence";
import {
  getAllPlayers,
  getLocalPlayers,
  invalidatePlayerCache,
} from "../services/playerRepository";
import { StorageService } from "../services/storageService";
import { audioManager } from "../services/audioManager";
import { WithdrawResultScreen } from "./WithdrawResultScreen";
import {
  BoxTile,
  CardBank,
  FormationPitch,
  GameCardMini,
  GameCardReveal,
  ItemCard,
  RoundsLog,
  StageStepper,
  TurfPanel,
  TurnTimer,
} from "./DealOrNoDealParts";
import { DealOrNoDealMatch } from "./DealOrNoDealMatch";
import { PlayerAvatarBadge } from "./PlayerAvatarBadge";

interface Props {
  user: UserProfile;
  presetOpponent: PlayerSnapshot | null;
  playMethod: "quick" | "private" | "ai" | "resume" | "referee";
  onBackToHome: () => void;
  onWithdraw: (winnerIsOpponent: boolean) => void;
  /** Used by tournament matches: the turn duration was already chosen when the
   *  tournament was created, so skip the "pick your thinking time" lobby screen
   *  entirely and start playing straight away with this value. */
  presetTurnSeconds?: number;
  /** Used by tournament matches: reports the REAL match outcome (from the actual
   *  simulation, not assumed) so the tournament bracket can advance correctly. */
  onMatchFinished?: (outcome: "win" | "loss" | "draw") => void;
}

const AI_OPPONENT: PlayerSnapshot = {
  playerId: "AI-BOT",
  id: "ai_bot",
  name: "AI",
  nameAr: "فريق AI",
  avatar: "av_bot",
};
const toSnapshot = (u: UserProfile): PlayerSnapshot => ({
  playerId: u.playerId || "",
  id: u.id,
  name: u.username,
  nameAr: u.nameAr,
  avatar: u.avatar,
  rating: u.rating,
});

type Screen = "boot" | "waiting" | "lobby" | "error" | "play" | "left";
const TURN_OPTIONS = [5, 10, 15, 20, 25, 30, 35];

type Spot =
  | { kind: "card"; ev: DndEvent; item: DndItem }
  | { kind: "gamble"; side: DndSide }
  /** اللاعب/المدرب اللي نزل التشكيلة بعد الصفقة أو المجازفة — بيظهر ثانية ونص وبعدها تتكشف كل الصناديق. */
  | {
      kind: "acquired";
      side: DndSide;
      item: DndItem;
      cardType?: DndCardType;
      cardFirst: boolean;
    };

const ACQUIRED_SPOT_MS = 1500; // مدة ظهور اللاعب اللي اتاخد
const ACQUIRED_CARD_FIRST_MS = 1300; // لو فيه كرت لسه ماظهرش: الكرت الأول وبعدين اللاعب

/**
 * اختيار كرت الـAI بعد اكتمال التشكيلة (درع / سرقة).
 * - الدرع: يحمي أقوى لاعب عنده مش محمي.
 * - السرقة: بس لو اللاعب المسروق أقوى فعلاً من لاعبه في نفس الخانة (السرقة بتبدّل مش بتضيف).
 */
function pickAiSquadCard(cur: DndState, side: DndSide): DndAction | null {
  const cards = cur.cards[side];
  if (!cards.length) return null;
  const foe = other(side);
  const playersOf = (s: DndSide) =>
    cur.acquired[s].filter(
      (it): it is Extract<DndItem, { kind: "PLAYER" }> =>
        !!it && it.kind === "PLAYER",
    );
  const unprotected = (s: DndSide) =>
    playersOf(s).filter(
      (it) => !cur.protectedPlayerIds[s].includes(it.player.id),
    );

  if (cards.includes("SHIELD")) {
    const best = [...unprotected(side)].sort(
      (a, b) => b.player.overallRating - a.player.overallRating,
    )[0];
    if (best)
      return {
        t: "USE_CARD",
        s: side,
        cardType: "SHIELD",
        targetPlayerId: best.player.id,
      };
  }
  if (cards.includes("STEAL")) {
    const mineBySlot = (slot: number) => {
      const it = cur.acquired[side][slot];
      return it && it.kind === "PLAYER" ? it.player.overallRating : 0;
    };
    const slotOf = (pos: string) =>
      pos === "GK"
        ? 0
        : ["CB", "LB", "RB"].includes(pos)
          ? 1
          : ["CDM", "CM", "CAM"].includes(pos)
            ? 2
            : 3;
    const gains = unprotected(foe)
      .map((it) => ({
        it,
        gain: it.player.overallRating - mineBySlot(slotOf(it.player.position)),
      }))
      .filter((x) => x.gain > 0)
      .sort((a, b) => b.gain - a.gain);
    if (gains[0])
      return {
        t: "USE_CARD",
        s: side,
        cardType: "STEAL",
        targetSide: foe,
        targetPlayerId: gains[0].it.player.id,
      };
  }
  return null;
}

export const DealOrNoDealGameView: React.FC<Props> = ({
  user,
  presetOpponent,
  playMethod,
  onBackToHome,
  onWithdraw,
  presetTurnSeconds,
  onMatchFinished,
}) => {
  const me = useMemo(
    () => toSnapshot(user),
    [user.id, user.nameAr, user.avatar],
  );

  const [screen, setScreen] = useState<Screen>("boot");
  const [errorMsg, setErrorMsg] = useState("");
  const [state, setState] = useState<DndState | null>(null);
  const [opp, setOpp] = useState<PlayerSnapshot>(presetOpponent || AI_OPPONENT);
  const [mySide, setMySide] = useState<DndSide>("A");
  const [mode, setMode] = useState<DndMode>("AI");
  const [spot, setSpot] = useState<Spot | null>(null);
  const [turnSeconds, setTurnSeconds] = useState<number | null>(null);
  const [refPlayers, setRefPlayers] = useState<
    [PlayerSnapshot, PlayerSnapshot] | null
  >(null);
  const [refView, setRefView] = useState(true); // true = شاشة الحكم (سرية) · false = شاشة اللاعبين
  const [timeLeft, setTimeLeft] = useState(0);
  const [lobbyLeft, setLobbyLeft] = useState(30);
  const [kickoff, setKickoff] = useState(false);
  const [resumedKickoff, setResumedKickoff] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [leftInfo, setLeftInfo] = useState<{ didWithdraw: boolean } | null>(
    null,
  );
  const [session, setSession] = useState(0);
  const [rematchWaiting, setRematchWaiting] = useState(false);
  const [cardPicker, setCardPicker] = useState<{
    cardType: DndCardType;
  } | null>(null);

  const poolsRef = useRef(buildPools([], []));
  const actionsRef = useRef<DndAction[]>([]);
  const stateRef = useRef<DndState | null>(null);
  const rowRef = useRef<DndMatchRow | null>(null);
  const sideRef = useRef<DndSide>("A");
  const modeRef = useRef<DndMode>(
    playMethod === "ai" ? "AI" : playMethod === "referee" ? "REF" : "PVP",
  );
  const refPlayersRef = useRef<[PlayerSnapshot, PlayerSnapshot] | null>(null);
  const oppRef = useRef<PlayerSnapshot>(presetOpponent || AI_OPPONENT);
  const saltRef = useRef("first");
  const kickoffRef = useRef(false);
  const turnRef = useRef<number | null>(null);
  const rewardedRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);
  const aliveRef = useRef(true);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
      cleanupRef.current?.();
    };
  }, []);

  // ---------- حفظ محلي ----------
  const persist = useCallback(() => {
    const st = stateRef.current;
    if (!st) return;
    saveDndMatch({
      v: 3,
      mode: modeRef.current,
      matchId: rowRef.current?.id ?? null,
      seed: st.seed,
      mySide: sideRef.current,
      opponent: oppRef.current,
      players: refPlayersRef.current || undefined,
      actions: actionsRef.current,
      turnSeconds: turnRef.current,
      kickoff: kickoffRef.current,
      savedAt: Date.now(),
    });
  }, []);

  const itemOfEvent = useCallback(
    (st: DndState, ev: DndEvent): DndItem =>
      st.draw[ev.side]?.find((b) => b.index === ev.box)?.item ??
      drawStage(st.seed, ev.stage, st.starter, poolsRef.current)[ev.side][
        Math.max(0, ev.box)
      ].item,
    [],
  );

  const showSpotFor = useCallback(
    (st: DndState, prevEvents: number) => {
      const fresh = st.events.slice(prevEvents);
      if (fresh.length === 0) return;
      const ev = fresh[fresh.length - 1];
      if (ev.kind === "CARD" && ev.box < 0) return;
      audioManager.playReveal();
      const isRefMode = modeRef.current === "REF";
      const mine = !isRefMode && ev.side === sideRef.current;

      // الكروت سرية 100%: الحكم فقط يرى كرت المفاجأة. اللاعبون يرون الصندوق
      // واللاعب الناتج فقط، ولا تظهر بطاقة الكرت في أي شاشة لاعب أو AI.
      if (ev.kind === "CARD" && ev.attempt === 1) {
        if (isRefMode) setSpot({ kind: "card", ev, item: itemOfEvent(st, ev) });
        return;
      }

      // نهاية دور (صفقة أو صندوق المجازفة): يظهر اللاعب اللي نزل التشكيلة ثانية ونص،
      // وبعدها تتكشف كل الصناديق. لو الصندوق فيه كرت وماظهرش قبل كده (المجازفة) يظهر الكرت الأول.
      // الكرت نفسه بيظهر لصاحبه وللحكم بس (سريّة كروت الخصم زي ما هي).
      if (
        st.revealHold &&
        (ev.kind === "DEAL" ||
          ev.kind === "FORCED" ||
          (ev.kind === "CARD" && ev.attempt === 2))
      ) {
        // في حالة قبول الصفقة لا نغطي لوحة الصناديق بصورة اللاعب؛
        // الصندوق المختار يفضل ظاهر بعلامة "نزل التشكيلة" وكل الصناديق تفضل مكشوفة.
        if (ev.kind === "DEAL") {
          setSpot(null);
          return;
        }
        const chosen = st.acquired[ev.side]?.[st.stage];
        if (!chosen) return;
        const chosenBox = st.draw[ev.side].find((b) => b.role === "chosen");
        const cardType = mine || isRefMode ? chosenBox?.cardType : undefined;
        setSpot({
          kind: "acquired",
          side: ev.side,
          item: chosen,
          cardType,
          cardFirst: !!cardType,
        });
        return;
      }

      // الجازفة بعد أول اختيار مجرد إعلان للخصم؛ صاحب الدور يكمل باختيار الصندوق الثاني فورًا.
      if (ev.kind === "GAMBLE") {
        if (!mine || isRefMode) setSpot({ kind: "gamble", side: ev.side });
        return;
      }

      // فتح أول صندوق عادي للخصم/الحكم.
      if ((!mine || isRefMode) && ev.kind === "OPEN") {
        setSpot({ kind: "card", ev, item: itemOfEvent(st, ev) });
      }
    },
    [itemOfEvent],
  );

  // ---------- تنفيذ فعل (بتاعي أو من الخصم) ----------
  const commit = useCallback(
    (action: DndAction, remote: boolean): boolean => {
      const cur = stateRef.current;
      if (!cur) return false;
      const r = applyAction(cur, action, poolsRef.current);
      if (!r.ok) return false;
      const prevEvents = cur.events.length;
      stateRef.current = r.state;
      actionsRef.current = [...actionsRef.current, action];
      setState(r.state);
      showSpotFor(r.state, prevEvents);
      persist();
      if (!remote && modeRef.current === "PVP" && rowRef.current) {
        DealOrNoDealSync.pushActions(rowRef.current, actionsRef.current).catch(
          () => {},
        );
      }
      return true;
    },
    [persist, showSpotFor],
  );

  const mergeRemote = useCallback(
    (remote: DndAction[]) => {
      const cur = stateRef.current;
      if (!cur) return;
      const have = actionsRef.current.length;
      if (remote.length <= have) return;
      const missing = remote.slice(have);
      const prevEvents = cur.events.length;
      let st = cur;
      const applied: DndAction[] = [];
      for (const a of missing) {
        const r = applyAction(st, a, poolsRef.current);
        if (!r.ok) break;
        st = r.state;
        applied.push(a);
      }
      if (applied.length === 0) return;
      stateRef.current = st;
      actionsRef.current = [...actionsRef.current, ...applied];
      setState(st);
      showSpotFor(st, prevEvents);
      persist();
    },
    [persist, showSpotFor],
  );

  // ---------- تسجيل الجوايز (مرة واحدة) ----------
  const rewardOnce = useCallback(
    (outcome: "win" | "loss" | "draw", seed: number) => {
      if (rewardedRef.current || modeRef.current === "REF") return; // وضع الحكم: مفيش جوايز على جهاز الحكم
      rewardedRef.current = true;
      StorageService.recordMatchResult(outcome === "win", outcome === "draw");
      StorageService.awardUniversal10Points("deal_or_no_deal", `dnd_${seed}`);
      if (outcome === "win") StorageService.addCoinsAndXP(500, 320);
    },
    [],
  );

  // ---------- مزامنة الماتش الحقيقي ----------
  const onRow = useCallback(
    (row: DndMatchRow) => {
      rowRef.current = row;
      if (
        row.status === "ABANDONED" &&
        row.abandonedBy &&
        row.abandonedBy !== sideRef.current
      ) {
        if (!rewardedRef.current) {
          rewardedRef.current = true;
          StorageService.recordMatchResult(true, false);
          StorageService.addCoinsAndXP(500, 320);
        }
        clearDndMatch();
        cleanupRef.current?.();
        setLeftInfo({ didWithdraw: false });
        setScreen("left");
        return;
      }
      if (row.turnSeconds && turnRef.current == null) {
        turnRef.current = row.turnSeconds;
        setTurnSeconds(row.turnSeconds);
        setScreen((sc) => (sc === "lobby" ? "play" : sc));
        persist();
      }
      if (row.actions.length > actionsRef.current.length)
        mergeRemote(row.actions);
      else if (
        row.actions.length < actionsRef.current.length &&
        row.status === "IN_PROGRESS"
      ) {
        DealOrNoDealSync.pushActions(row, actionsRef.current).catch(() => {});
      }
    },
    [mergeRemote, persist],
  );

  const startSync = useCallback(
    (row: DndMatchRow) => {
      rowRef.current = row;
      const unsub = DealOrNoDealSync.subscribe(row.id, onRow);
      const poll = setInterval(async () => {
        const fresh = await DealOrNoDealSync.fetch(row.id);
        if (fresh && aliveRef.current) onRow(fresh);
      }, 2500);
      const wake = async () => {
        const fresh = await DealOrNoDealSync.fetch(row.id);
        if (fresh && aliveRef.current) onRow(fresh);
      };
      document.addEventListener("visibilitychange", wake);
      window.addEventListener("online", wake);
      cleanupRef.current = () => {
        unsub();
        clearInterval(poll);
        document.removeEventListener("visibilitychange", wake);
        window.removeEventListener("online", wake);
      };
    },
    [onRow],
  );

  const enter = useCallback(
    (
      seed: number,
      side: DndSide,
      oppSnap: PlayerSnapshot,
      actions: DndAction[],
      m: DndMode,
    ) => {
      sideRef.current = side;
      modeRef.current = m;
      oppRef.current = oppSnap;
      let st: DndState;
      try {
        st = replay(seed, poolsRef.current, actions);
      } catch (err) {
        console.error("[DND] replay failed", err);
        setErrorMsg("حصلت مشكلة في تجهيز اللعبة. جرّب تاني.");
        setScreen("error");
        return;
      }
      stateRef.current = st;
      actionsRef.current = actions.slice(0, st.actionCount);
      rewardedRef.current = false;
      kickoffRef.current = false;
      turnRef.current = null;
      setTurnSeconds(null);
      setMySide(side);
      setMode(m);
      setOpp(oppSnap);
      setState(st);
      setSpot(null);
      setKickoff(false);
      setRematchWaiting(false);
      setScreen("play");
      persist();
    },
    [persist],
  );

  // ---------- بداية اللعبة ----------
  useEffect(() => {
    let cancelled = false;
    cleanupRef.current?.();
    cleanupRef.current = null;

    const fail = (msg: string) => {
      if (cancelled) return;
      setErrorMsg(msg);
      setScreen("error");
    };

    (async () => {
      setScreen("boot");
      // AI والحكم لا يحتاجان أي طلب شبكي: لازم يفتحوا فورًا حتى لو Supabase
      // غير متاح أو الشبكة واقفة. اللاعب الحقيقي فقط يحاول تحديث صور/بيانات الإدارة.
      // المصدر الوحيد للاعبين والمدربين هو الإدارة (لازم نت) — بنجيب أحدث نسخة
      // وبنستنى لحد 8 ثواني، ولو الشبكة وقفت بنستخدم آخر نسخة اتحملت.
      const [players, coaches] = await Promise.all([
        Promise.race<import("../types").FootballPlayer[]>([
          getAllPlayers(true),
          new Promise<import("../types").FootballPlayer[]>((resolve) =>
            setTimeout(() => resolve(getLocalPlayers()), 8000),
          ),
        ]),
        Promise.race<import("../types").Coach[]>([
          getAllCoaches(true),
          new Promise<import("../types").Coach[]>((resolve) =>
            setTimeout(() => resolve(getCoachesSync()), 8000),
          ),
        ]),
      ]);
      let pools = buildPools(players, coaches);
      if (cancelled) return;
      if (!poolsAreSufficient(pools))
        return fail(
          `مفيش لاعبين/مدربين كفاية في قاعدة البيانات لتشغيل اللعبة — محتاجين 8 على الأقل في كل مركز. الموجود دلوقتي: حراس ${pools.GK.length}، مدافعين ${pools.DEF.length}، وسط ${pools.MID.length}، مهاجمين ${pools.ATT.length}، مدربين ${pools.COACH.length}. اطلب من الإدارة إضافة الباقي، ولازم يكون فيه اتصال بالإنترنت.`,
        );
      poolsRef.current = pools;
      const sig = poolSignature(pools);

      // 1) رجوع لماتش شغال
      const saved =
        session === 0 && playMethod === "resume" ? loadDndMatch() : null;
      if (playMethod === "resume" && !saved)
        return fail("مفيش ماتش شغال تكمله.");
      if (saved && saved.mode === "REF" && saved.players) {
        refPlayersRef.current = saved.players;
        setRefPlayers(saved.players);
        enter(saved.seed, "A", saved.players[1], saved.actions, "REF");
        kickoffRef.current = saved.kickoff;
        setResumedKickoff(saved.kickoff);
        setKickoff(saved.kickoff);
        return;
      }
      if (saved) {
        if (saved.mode === "AI") {
          enter(saved.seed, saved.mySide, saved.opponent, saved.actions, "AI");
        } else {
          const row = saved.matchId
            ? await DealOrNoDealSync.fetch(saved.matchId)
            : null;
          if (cancelled) return;
          if (!row || row.status === "FINISHED") {
            clearDndMatch();
            return fail("الماتش ده خلص.");
          }
          const side: DndSide = row.playerA.id === me.id ? "A" : "B";
          const oppSnap =
            (side === "A" ? row.playerB : row.playerA) || saved.opponent;
          if (row.status === "ABANDONED") {
            sideRef.current = side;
            if (row.abandonedBy && row.abandonedBy !== side) {
              onRow(row);
              return;
            }
            clearDndMatch();
            return fail("الماتش ده اتقفل.");
          }
          const acts =
            row.actions.length >= saved.actions.length
              ? row.actions
              : saved.actions;
          enter(row.seed, side, oppSnap, acts, "PVP");
          kickoffRef.current = saved.kickoff;
          setResumedKickoff(saved.kickoff);
          setKickoff(saved.kickoff);
          rowRef.current = row;
          startSync(row);
          if (row.turnSeconds) {
            turnRef.current = row.turnSeconds;
            setTurnSeconds(row.turnSeconds);
          } else setScreen("lobby");
        }
        if (saved.mode === "AI") {
          kickoffRef.current = saved.kickoff;
          setResumedKickoff(saved.kickoff);
          setKickoff(saved.kickoff);
        }
        return;
      }

      // 1.5) وضع الحكم: الحكم بيدير الماتش لاعبين على شاشة واحدة
      if (modeRef.current === "REF" || playMethod === "referee") {
        let pl = refPlayersRef.current;
        if (!pl) {
          try {
            pl = JSON.parse(
              localStorage.getItem("dnd_referee_players_v1") || "null",
            );
          } catch {
            pl = null;
          }
        }
        if (!pl || pl.length !== 2)
          return fail("لازم تدخل بيانات اللاعبين الاتنين الأول.");
        modeRef.current = "REF";
        refPlayersRef.current = pl;
        setRefPlayers(pl);
        enter(randomSeed(), "A", pl[1], [], "REF");
        return;
      }

      // 2) ماتش جديد ضد AI
      if (modeRef.current === "AI" || playMethod === "ai") {
        enter(randomSeed(), "A", AI_OPPONENT, [], "AI");
        return;
      }

      // 3) ماتش جديد ضد لاعب حقيقي
      const oppSnap = presetOpponent || oppRef.current;
      if (!oppSnap || oppSnap.id === AI_OPPONENT.id)
        return fail('لازم تبدأ الماتش من زر "ابدأ الماتش" عشان نلاقي خصم.');
      if (!DealOrNoDealSync.isAvailable())
        return fail("اللعب ضد لاعب حقيقي محتاج اتصال بالإنترنت.");
      setOpp(oppSnap);
      oppRef.current = oppSnap;
      setScreen("waiting");
      const pairKey = makePairKey(me.id, oppSnap.id, saltRef.current);
      let row = await DealOrNoDealSync.joinOrCreate(
        me,
        pairKey,
        randomSeed(),
        sig,
      );
      if (cancelled) return;
      if (!row)
        return fail("معرفناش نفتح غرفة الماتش. اتأكد من الإنترنت وحاول تاني.");

      const started = Date.now();
      while (!cancelled && row.status === "WAITING") {
        if (Date.now() - started > 90_000) {
          await DealOrNoDealSync.cancelWaiting(row.id);
          return fail("الخصم ماردش. جرب تاني أو العب ضد AI.");
        }
        await new Promise((r) => setTimeout(r, 1500));
        const fresh = await DealOrNoDealSync.fetch(row.id);
        if (fresh) row = fresh;
      }
      if (cancelled) return;
      if (row.status !== "IN_PROGRESS")
        return fail("الغرفة اتقفلت. حاول تاني.");

      // قاعدة اللاعبين لازم تكون متطابقة عند الطرفين
      if (row.poolSig && row.poolSig !== sig) {
        invalidatePlayerCache();
        pools = buildPools(await getAllPlayers(true), await getAllCoaches(true));
        poolsRef.current = pools;
        if (row.poolSig !== poolSignature(pools))
          return fail(
            "قاعدة اللاعبين مش متطابقة بينك وبين الخصم. اقفل وافتح اللعبة وحاول تاني.",
          );
      }
      const side: DndSide = row.playerA.id === me.id ? "A" : "B";
      const theOpp = (side === "A" ? row.playerB : row.playerA) || oppSnap;
      enter(row.seed, side, theOpp, row.actions, "PVP");
      startSync(row);
      if (row.turnSeconds) {
        turnRef.current = row.turnSeconds;
        setTurnSeconds(row.turnSeconds);
      } else setScreen("lobby");
    })().catch(() => fail("حصل خطأ غير متوقع. حاول تاني."));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // ---------- اختفاء الـ Spotlight تلقائياً ----------
  useEffect(() => {
    if (!spot) return;
    const ms =
      spot.kind === "acquired"
        ? (spot.cardFirst ? ACQUIRED_CARD_FIRST_MS : 0) + ACQUIRED_SPOT_MS
        : spot.kind === "gamble"
          ? 1200
          : 1500;
    const t = setTimeout(() => setSpot(null), ms);
    return () => clearTimeout(t);
  }, [spot]);

  // ---------- تثبيت كشف الصناديق 4 ثوانٍ ثم الانتقال ----------
  // العدّاد بيبدأ بعد ما لاعب الصفقة يختفي (ثانية ونص) — عشان الصناديق تفضل ظاهرة 4 ثوانٍ كاملة.
  useEffect(() => {
    if (!state?.revealHold || screen !== "play" || spot) return;
    const timer = setTimeout(() => {
      const cur = stateRef.current;
      if (!cur?.revealHold || cur.phase !== "PLAY") return;
      commit({ t: "CONTINUE", s: cur.turn }, false);
    }, 4000);
    return () => clearTimeout(timer);
  }, [state?.revealHold, state?.actionCount, screen, commit, spot]);

  // ---------- الـ AI ----------
  useEffect(() => {
    if (
      mode !== "AI" ||
      !state ||
      (state.phase !== "PLAY" && state.phase !== "SQUADS") ||
      spot ||
      state.revealHold ||
      screen !== "play"
    )
      return;
    if (state.phase === "SQUADS") {
      // بعد ما اللاعب يبدأ المباراة التشكيلات بتتثبت — الـAI مايلمسش التشكيلة بعد كده.
      if (kickoff) return;
      const t = setTimeout(() => {
        const cur = stateRef.current;
        if (!cur || cur.phase !== "SQUADS" || kickoffRef.current) return;
        const action = pickAiSquadCard(cur, other(sideRef.current));
        if (action) commit(action, false);
      }, 1200);
      return () => clearTimeout(t);
    }
    if (state.turn === mySide) return;
    const t = setTimeout(() => {
      const cur = stateRef.current;
      if (!cur || cur.phase !== "PLAY" || cur.turn === sideRef.current) return;
      const side = cur.turn;
      const aiCards = cur.cards[side];
      if (aiCards.length) {
        const chooseTarget = (targetSide: DndSide) => {
          const target = cur.acquired[targetSide].find(
            (it): it is Extract<DndItem, { kind: "PLAYER" }> =>
              !!it &&
              it.kind === "PLAYER" &&
              !cur.protectedPlayerIds[targetSide].includes(it.player.id),
          );
          return target?.player.id;
        };
        // الحماية والسرقة للـAI تتفعّل بعد اكتمال التشكيلة فقط؛ أثناء اللعب الكرت المسموح هو لبس صحبك.
        const preferred = aiCards.includes("SWAP")
          ? {
              t: "USE_CARD" as const,
              s: side,
              cardType: "SWAP" as const,
              targetSide: other(side),
              targetPlayerId: chooseTarget(other(side)),
            }
          : null;
        if (
          preferred &&
          (!("targetPlayerId" in preferred) || preferred.targetPlayerId)
        ) {
          commit(preferred, false);
          return;
        }
      }
      if (cur.opened.length === 1 && !cur.gambled) {
        // القرار ثابت على عدد محاولتين: ياخد الصفقة أو يجازف للصندوق الثاني.
        const view = toPublicView(cur, side, poolsRef.current);
        commit(
          aiShouldDeal(view, cur.seed)
            ? { t: "DEAL", s: side }
            : { t: "GAMBLE", s: side },
          false,
        );
        return;
      }
      const avail = cur.draw[side].filter((b) => !b.opened).map((b) => b.index);
      commit({ t: "OPEN", s: side, b: aiPickBox(avail) }, false);
    }, 1500);
    return () => clearTimeout(t);
  }, [state, spot, mode, mySide, screen, commit, kickoff]);

  // ---------- أفعالي ----------
  const isRefMode = mode === "REF";
  const myTurn =
    !!state && state.phase === "PLAY" && (isRefMode || state.turn === mySide);
  const actSide: DndSide = isRefMode && state ? state.turn : mySide;
  const decisionBoxIndex = state
    ? (state.pendingCardBox ?? state.opened[state.opened.length - 1])
    : -1;
  const pendingCard =
    state && state.pendingCardBox !== null
      ? state.draw[state.turn][state.pendingCardBox]
      : null;
  const decisionNeeded =
    !!state &&
    myTurn &&
    !state.revealHold &&
    (!!pendingCard || (state.opened.length === 1 && !state.gambled));
  const canOpen =
    !!state &&
    myTurn &&
    !spot &&
    !state.revealHold &&
    !decisionNeeded &&
    state.opened.length < 2;

  const openBox = (b: number) => {
    if (!canOpen) return;
    audioManager.playCardDraw();
    commit({ t: "OPEN", s: actSide, b }, false);
  };
  const takeDeal = () => {
    setSpot(null);
    audioManager.playSuccess();
    commit({ t: "DEAL", s: actSide }, false);
  };
  const gamble = () => {
    setSpot(null);
    audioManager.playClick();
    commit({ t: "GAMBLE", s: actSide }, false);
  };

  // ---------- مؤقت التفكير (مفعل في كل الأنماط بما فيها AI و PVP) ----------
  useEffect(() => {
    const effectiveSecs = turnSeconds || 15;
    if (
      screen !== "play" ||
      !state ||
      state.phase !== "PLAY" ||
      state.revealHold
    )
      return;
    const deadline = Date.now() + effectiveSecs * 1000;
    setTimeLeft(effectiveSecs);
    const iv = setInterval(() => {
      const left = Math.ceil((deadline - Date.now()) / 1000);
      setTimeLeft(Math.max(0, left));
      if (left <= 0) {
        clearInterval(iv);
        const cur = stateRef.current;
        if (!cur || cur.phase !== "PLAY") return;
        // صاحب الدور ينفذ الخطوة التلقائية فور انتهاء الوقت
        if (modeRef.current === "AI" || cur.turn === sideRef.current) {
          if (
            cur.pendingCardBox !== null ||
            (cur.opened.length === 1 && !cur.gambled)
          ) {
            commit({ t: "DEAL", s: cur.turn }, false);
          } else {
            const avail = cur.draw[cur.turn]
              .filter((b) => !b.opened)
              .map((b) => b.index);
            if (avail.length)
              commit({ t: "OPEN", s: cur.turn, b: aiPickBox(avail) }, false);
          }
        }
      }
    }, 250);
    return () => clearInterval(iv);
  }, [
    state?.actionCount,
    state?.revealHold,
    state?.turn,
    turnSeconds,
    screen,
    mode,
    commit,
  ]);

  // ---------- اللوبي: لاعب A بيختار مدة التفكير ----------
  const chooseTurn = useCallback(
    (sec: number) => {
      turnRef.current = sec;
      setTurnSeconds(sec);
      if (rowRef.current) {
        rowRef.current = { ...rowRef.current, turnSeconds: sec };
        DealOrNoDealSync.setTurnSeconds(rowRef.current, sec).catch(() => {});
      }
      persist();
      setScreen("play");
    },
    [persist],
  );
  // Tournament matches pre-agree the turn duration at creation time — skip
  // the lobby's manual picker entirely and jump straight into play.
  useEffect(() => {
    if (screen !== "lobby" || !presetTurnSeconds) return;
    chooseTurn(presetTurnSeconds);
  }, [screen, presetTurnSeconds, chooseTurn]);

  useEffect(() => {
    if (screen !== "lobby" || sideRef.current !== "A" || presetTurnSeconds) return;
    setLobbyLeft(30);
    const iv = setInterval(() => {
      setLobbyLeft((l) => {
        if (l <= 1) {
          clearInterval(iv);
          chooseTurn(15); // لو ماختارش: 15 ثانية
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(iv);
  }, [screen, chooseTurn]);

  // ---------- الانسحاب ----------
  const doWithdraw = async () => {
    setConfirmLeave(false);
    if (modeRef.current === "REF") {
      clearDndMatch();
      onBackToHome();
      return;
    }
    const finished = state?.phase === "SQUADS" && kickoff;
    if (!finished) {
      if (!rewardedRef.current) {
        rewardedRef.current = true;
        StorageService.recordMatchResult(false, false);
      }
      if (modeRef.current === "PVP" && rowRef.current) {
        await DealOrNoDealSync.abandon(
          rowRef.current,
          sideRef.current,
          actionsRef.current,
        ).catch(() => {});
      }
    }
    cleanupRef.current?.();
    clearDndMatch();
    setLeftInfo({ didWithdraw: true });
    setScreen("left");
  };

  const leaveToGames = () => {
    if (screen === "waiting" && rowRef.current)
      DealOrNoDealSync.cancelWaiting(rowRef.current.id).catch(() => {});
    cleanupRef.current?.();
    onBackToHome();
  };

  const rematch = () => {
    clearDndMatch();
    cleanupRef.current?.();
    cleanupRef.current = null;
    if (modeRef.current === "PVP") {
      saltRef.current = rowRef.current?.id || String(Date.now());
      setRematchWaiting(true);
    }
    rowRef.current = null;
    setSession((s) => s + 1);
  };

  // ---------- عرض ----------
  const shell = (children: React.ReactNode) => (
    <div
      dir="rtl"
      className="relative min-h-screen overflow-hidden bg-black text-white pb-24"
      style={{
        backgroundImage:
          "linear-gradient(rgba(0,0,0,.12), rgba(0,0,0,.38)), url(/games/backgrounds/deal-or-no-deal-bg.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="relative z-10">{children}</div>
    </div>
  );

  if (screen === "left" && leftInfo) {
    return (
      <WithdrawResultScreen
        didWithdraw={leftInfo.didWithdraw}
        myName={user.nameAr}
        myAvatar={user.avatar}
        opponentName={opp.nameAr}
        opponentAvatar={opp.avatar}
        onBack={() => onWithdraw(leftInfo.didWithdraw)}
      />
    );
  }

  if (screen === "boot" || screen === "waiting") {
    return shell(
      <div className="flex flex-col items-center justify-center gap-4 pt-32 px-6 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-amber-400" />
        <div className="text-lg font-black">
          {screen === "waiting"
            ? `مستني ${opp.nameAr} يدخل الغرفة…`
            : "بنجهّز الصناديق…"}
        </div>
        {screen === "waiting" && (
          <button
            type="button"
            onClick={leaveToGames}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-2 text-sm font-bold"
          >
            إلغاء
          </button>
        )}
      </div>,
    );
  }

  if (screen === "lobby") {
    return shell(
      <div className="max-w-sm mx-auto px-4 pt-24 text-center space-y-5">
        <div className="text-2xl font-black text-amber-300">
          مدة التفكير في كل خطوة
        </div>
        {mySide === "A" ? (
          <>
            <div className="text-xs text-zinc-400 break-words">
              اختار الوقت اللي كل لاعب هيفكر فيه — لو الوقت خلص بتتنفذ الخطوة تلقائي. (لو ماختارتش هيبقى 15 ثانية بعد {lobbyLeft})
            </div>
            <div className="grid grid-cols-3 gap-3">
              {TURN_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => chooseTurn(n)}
                  className="rounded-2xl border-2 border-amber-400/60 bg-zinc-900 py-4 text-xl font-black text-amber-200 hover:bg-amber-500 hover:text-black active:scale-95 transition"
                >
                  {n}
                  <div className="text-[10px] font-bold">ثانية</div>
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-3 text-zinc-300">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
            <div className="text-sm font-bold break-words">
              مستني {opp.nameAr} يختار مدة التفكير…
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => setConfirmLeave(true)}
          className="text-xs font-bold text-zinc-500"
        >
          انسحاب
        </button>
        {confirmLeave && (
          <LeaveDialog
            onCancel={() => setConfirmLeave(false)}
            onConfirm={doWithdraw}
          />
        )}
      </div>,
    );
  }

  if (screen === "error" || !state) {
    return shell(
      <div className="flex flex-col items-center gap-4 pt-28 px-6 text-center">
        <WifiOff className="w-10 h-10 text-rose-400" />
        <div className="text-base font-black break-words max-w-sm">
          {errorMsg || "حصل خطأ"}
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={() => {
              modeRef.current = "AI";
              setSession((s) => s + 1);
            }}
            className="rounded-xl bg-amber-500 px-5 py-2 text-sm font-black text-black"
          >
            العب ضد AI
          </button>
          <button
            type="button"
            onClick={leaveToGames}
            className="rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-2 text-sm font-bold"
          >
            العودة للألعاب
          </button>
        </div>
      </div>,
    );
  }

  const stageDef = DND_STAGES[Math.min(state.stage, DND_STAGES.length - 1)];
  const oppSide = other(mySide);
  const isRef = mode === "REF";
  const nameOf = (side: DndSide): string =>
    isRef
      ? refPlayers
        ? refPlayers[side === "A" ? 0 : 1].nameAr
        : side
      : side === mySide
        ? user.nameAr
        : opp.nameAr;
  const avatarOf = (side: DndSide): string =>
    isRef
      ? refPlayers
        ? refPlayers[side === "A" ? 0 : 1].avatar
        : ""
      : side === mySide
        ? user.avatar
        : opp.avatar;
  const leftSide: DndSide = isRef ? "A" : mySide; // التشكيلة الأولى (تشكيلتك / اللاعب الأول)
  const rightSide: DndSide = other(leftSide);
  const leftSquad = buildSquad(state, leftSide);
  const rightSquad = buildSquad(state, rightSide);
  const leftTitle = isRef ? nameOf("A") : "تشكيلتك";
  const rightTitle = isRef ? nameOf("B") : "تشكيلة الخصم";

  // المحاكاة النهائية
  if (state.phase === "SQUADS" && kickoff) {
    return shell(
      <DealOrNoDealMatchHost
        state={state}
        nameA={nameOf("A")}
        nameB={nameOf("B")}
        mySide={leftSide}
        myName={nameOf(leftSide)}
        oppName={nameOf(rightSide)}
        mySquad={leftSquad}
        oppSquad={rightSquad}
        neutral={isRef}
        opponent={mode === "AI" || isRef ? null : opp}
        myAvatar={user.avatar}
        oppAvatar={opp.avatar}
        startFinished={resumedKickoff}
        canRematch
        rematchWaiting={rematchWaiting}
        onFinished={(o) => {
          rewardOnce(o, state.seed);
          clearDndMatch();
          if (
            modeRef.current === "PVP" &&
            rowRef.current &&
            sideRef.current === "A"
          ) {
            DealOrNoDealSync.finish(
              rowRef.current,
              o === "draw" ? "DRAW" : o === "win" ? "A" : "B",
            ).catch(() => {});
          }
          onMatchFinished?.(o);
        }}
        onRematch={rematch}
        onBackToGames={leaveToGames}
      />,
    );
  }

  // شاشة التشكيلات
  if (state.phase === "SQUADS") {
    const squadCardSide: DndSide = isRef ? state.turn : mySide;
    return shell(
      <div className="max-w-3xl mx-auto px-3 py-5 space-y-5">
        <div className="text-center">
          <div className="text-2xl font-black text-amber-300">
            التشكيلات جاهزة!
          </div>
          <div className="text-xs text-zinc-400 mt-1">
            دول اللاعبين اللي اتكسبوا فعلاً في الصناديق
          </div>
        </div>
        <div className="grid grid-cols-1 gap-5 max-w-sm mx-auto">
          <FormationPitch
            title={leftTitle}
            slots={leftSquad.bySlot}
            coach={leftSquad.coach}
            cards={leftSquad.cards}
            accent="emerald"
            equipped={isRef ? undefined : user.equippedCosmetics}
          />
          <FormationPitch
            title={rightTitle}
            slots={rightSquad.bySlot}
            coach={rightSquad.coach}
            cards={rightSquad.cards}
            accent="rose"
            equipped={isRef ? undefined : (opp as any).equippedCosmetics}
          />
        </div>
        <div className="rounded-2xl border border-amber-400/20 bg-zinc-950/70 p-2">
          <div className="mb-2 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-center text-[10px] font-black text-amber-200">
            بعد اكتمال التشكيلة: فعّل درع الحماية أو كرت السرقة واختار هدفك
          </div>
          <div className="grid grid-cols-1 gap-2">
            <CardBank
              cards={state.cards[leftSide]}
              label={`كروت ${leftTitle}`}
              active={!isRef && leftSide === mySide}
              onUse={
                !isRef && leftSide === mySide
                  ? (cardType) => setCardPicker({ cardType })
                  : undefined
              }
              isUsable={(cardType) =>
                cardType === "SHIELD" || cardType === "STEAL"
              }
            />
            <CardBank
              cards={state.cards[rightSide]}
              label={`كروت ${rightTitle}`}
              active={!isRef && rightSide === mySide}
              onUse={
                !isRef && rightSide === mySide
                  ? (cardType) => setCardPicker({ cardType })
                  : undefined
              }
              isUsable={(cardType) =>
                cardType === "SHIELD" || cardType === "STEAL"
              }
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            // الـAI يخلّص استخدام كروته قبل الصافرة، عشان المحاكاة تتلعب بالتشكيلتين النهائيتين بالظبط.
            if (modeRef.current === "AI") {
              for (let guard = 0; guard < 6; guard++) {
                const cur = stateRef.current;
                if (!cur || cur.phase !== "SQUADS") break;
                const action = pickAiSquadCard(cur, other(sideRef.current));
                if (!action || !commit(action, false)) break;
              }
            }
            kickoffRef.current = true;
            persist();
            audioManager.playWhistle();
            setKickoff(true);
          }}
          className="w-full rounded-2xl bg-gradient-to-l from-amber-500 to-yellow-400 py-4 text-xl font-black text-black shadow-[0_0_30px_rgba(245,158,11,0.5)]"
        >
          مين هيكسب؟
        </button>
        <button
          type="button"
          onClick={() => setConfirmLeave(true)}
          className="w-full text-center text-xs font-bold text-zinc-500"
        >
          {isRef ? "إنهاء الماتش" : "انسحاب"}
        </button>
        {confirmLeave && (
          <LeaveDialog
            referee={isRef}
            onCancel={() => setConfirmLeave(false)}
            onConfirm={doWithdraw}
          />
        )}
        {cardPicker && !isRef && (
          <CardTargetDialog
            cardType={cardPicker.cardType}
            state={state}
            side={squadCardSide}
            onCancel={() => setCardPicker(null)}
            onSelect={(targetSide, targetPlayerId) => {
              const action: DndAction = {
                t: "USE_CARD",
                s: squadCardSide,
                cardType: cardPicker.cardType,
                targetSide,
                targetPlayerId,
              };
              const ok = commit(action, false);
              if (ok) setCardPicker(null);
            }}
          />
        )}
      </div>,
    );
  }

  // شاشة اللعب
  const activeName = nameOf(state.turn);
  const topSide: DndSide = isRef ? "A" : oppSide;
  const botSide: DndSide = isRef ? "B" : mySide;
  const peek = isRef && refView; // الحكم بس بيشوف محتوى الصناديق المقفولة
  const decisionName = isRef ? activeName : "أنت";

  const banner = state.revealHold
    ? "الصناديق اتفتحت بالكامل — الجولة التالية بعد 4 ثوانٍ"
    : isRef
      ? state.opened.length === 0
        ? `${activeName}: افتح صندوق من صناديقك`
        : state.gambled
          ? `${activeName} جازف — يفتح أي صندوق تاني (إجباري)`
          : `${activeName}: خد الصفقة ولا جازف؟`
      : myTurn
        ? state.opened.length === 0
          ? "افتح صندوق من صناديقك"
          : state.gambled
            ? "جازفت — افتح أي صندوق تاني (إجباري وهو اللي هينزل)"
            : "خد الصفقة ولا جازف؟"
        : state.gambled
          ? `${opp.nameAr} جازف — بيختار صندوق تاني`
          : state.opened.length === 1
            ? `${opp.nameAr} بيفكر: يخد الصفقة ولا يجازف؟`
            : `${opp.nameAr} بيفتح صناديقه…`;
  const firstOpenedItem =
    decisionNeeded && decisionBoxIndex !== undefined
      ? (state.draw[state.turn][decisionBoxIndex]?.item ?? null)
      : null;
  const decisionCardType =
    decisionNeeded && decisionBoxIndex !== undefined
      ? state.draw[state.turn][decisionBoxIndex]?.cardType
      : undefined;

  const panel = (side: DndSide, tone: "emerald" | "rose") => {
    const active = state.turn === side;
    const mine = !isRef && side === mySide;
    const interactive = canOpen && active;
    return (
      <TurfPanel active={active} tone={tone}>
        <div className="flex items-center gap-2 mb-2 min-w-0">
          <PlayerAvatarBadge avatar={avatarOf(side)} size="sm" equipped={isRef ? undefined : mine ? user.equippedCosmetics : (opp as any).equippedCosmetics} />
          <span className="text-xs font-black text-white drop-shadow truncate">
            {mine ? "صناديقك" : `صناديق ${nameOf(side)}`}
          </span>
        </div>
        <div
          className={`grid gap-2 ${mine || isRef ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-4 gap-1.5"}`}
        >
          {state.draw[side].map((b) => (
            <BoxTile
              key={b.index}
              box={b}
              interactive={interactive && !b.opened}
              dimmed={!active}
              compact={!mine && !isRef}
              peek={peek && !b.opened ? b.item : undefined}
              peekCardType={peek && !b.opened ? b.cardType : undefined}
              showCardOnClosed={isRef}
              onOpen={() => openBox(b.index)}
            />
          ))}
        </div>
      </TurfPanel>
    );
  };

  return shell(
    <div className="max-w-3xl mx-auto px-3 py-3 space-y-3">
      {/* الهيدر */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setConfirmLeave(true)}
          className="flex items-center gap-1 rounded-xl border border-zinc-700 bg-zinc-900/80 px-3 py-1.5 text-xs font-bold text-zinc-200"
        >
          <LogOut className="w-3.5 h-3.5 rotate-180" />{" "}
          {isRef ? "إنهاء" : "انسحاب"}
        </button>
        <div className="text-center min-w-0">
          <div className="text-base font-black text-amber-300">
            {isRef ? "ديل أور نو ديل — وضع الحكم" : "ديل أور نو ديل"}
          </div>
          <div className="text-[11px] text-zinc-400 break-words">
            الجولة {state.stage + 1} من 5 — {stageDef.labelAr}
          </div>
        </div>
        <div className="w-16" />
      </div>

      <StageStepper current={state.stage} done={false} />

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 rounded-2xl border border-amber-400/25 bg-black/50 px-2 py-2 shadow-[0_0_28px_rgba(245,158,11,0.12)]">
        <div className="min-w-0 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5 text-center">
          <div className="text-[9px] font-bold text-zinc-500">المرحلة</div>
          <div className="text-xs font-black text-amber-200 truncate">
            {stageDef.labelAr}
          </div>
        </div>
        <div className="text-center">
          <div className="text-[9px] font-black text-zinc-400 tracking-wide">
            DEAL OR NO DEAL
          </div>
          <div className="mt-0.5 inline-flex items-center rounded-full border-2 border-amber-400 bg-gradient-to-r from-amber-500 to-yellow-300 px-4 py-1 text-base font-black text-black shadow-[0_0_18px_rgba(245,158,11,0.35)]">
            الجولة {state.stage + 1} / 5
          </div>
        </div>
        <div
          className={`min-w-0 rounded-xl border px-2 py-1.5 text-center ${myTurn ? "border-emerald-400/60 bg-emerald-500/10" : "border-rose-400/50 bg-rose-500/10"}`}
        >
          <div className="text-[9px] font-bold text-zinc-500">دلوقتي</div>
          <div
            className={`text-xs font-black truncate ${myTurn ? "text-emerald-300" : "text-rose-300"}`}
          >
            {isRef
              ? `دور ${activeName}`
              : myTurn
                ? "دورك"
                : `دور ${activeName}`}
          </div>
        </div>
      </div>

      {isRef && (
        <button
          type="button"
          onClick={() => setRefView((v) => !v)}
          className={`w-full rounded-2xl border px-4 py-2.5 text-sm font-black ${refView ? "border-amber-400 bg-amber-500/15 text-amber-200" : "border-zinc-600 bg-zinc-900 text-zinc-200"}`}
        >
          {refView
            ? "👁 شاشة الحكم — بتشوف كل الصناديق (اضغط لإخفائها قبل ما تدّي الموبايل للاعبين)"
            : "🙈 شاشة اللاعبين — المحتوى مخفي (اضغط للرجوع لشاشة الحكم)"}
        </button>
      )}

      {/* الدور */}
      <div
        className={`rounded-2xl border px-4 py-3 text-center transition-all ${
          myTurn
            ? "border-emerald-400 bg-emerald-500/15 shadow-[0_0_24px_rgba(16,185,129,0.4)]"
            : "border-rose-400/60 bg-rose-500/10"
        }`}
      >
        <div
          className={`text-2xl font-black ${myTurn ? "text-emerald-300" : "text-rose-300"}`}
        >
          {isRef ? `دور ${activeName}` : myTurn ? "دورك" : "دور الخصم"}
        </div>
        <div className="text-xs text-zinc-300 mt-0.5 break-words">{banner}</div>
        {!spot && (
          <div className="mt-2">
            <TurnTimer
              left={timeLeft}
              total={turnSeconds || 15}
              mine={myTurn}
            />
          </div>
        )}
      </div>

      {state.revealHold && !spot && (
        <div className="rounded-2xl border-2 border-amber-400/70 bg-amber-500/10 px-4 py-3 text-center shadow-[0_0_24px_rgba(245,158,11,.25)]">
          <div className="text-base font-black text-amber-200">
            ✨ كشف الصناديق مكتمل
          </div>
          <div className="text-[11px] text-zinc-300 mt-1">
            كل الصناديق باينة دلوقتي، والصندوق اللي نزل التشكيلة متعلم عليه — وبعد 4 ثواني نكمل الجولة.
          </div>
        </div>
      )}

      {panel(topSide, "rose")}
      {panel(botSide, "emerald")}

      {/* التشكيلة أثناء اللعب — ملعبين بالطول جنب بعض بدل كروت الخانات القديمة */}
      <div className="grid grid-cols-1 min-[560px]:grid-cols-2 gap-4 max-w-sm min-[560px]:max-w-none mx-auto">
        <FormationPitch
          compact
          title={isRef ? leftTitle : "تشكيلتك"}
          slots={leftSquad.bySlot}
          coach={leftSquad.coach}
          cards={leftSquad.cards}
          accent="emerald"
          equipped={isRef ? undefined : user.equippedCosmetics}
        />
        <FormationPitch
          compact
          title={isRef ? rightTitle : `تشكيلة ${opp.nameAr}`}
          slots={rightSquad.bySlot}
          coach={rightSquad.coach}
          cards={rightSquad.cards}
          accent="rose"
          equipped={isRef ? undefined : (opp as any).equippedCosmetics}
        />
      </div>

      {/* بنك الكروت — ظاهر في AI وفي اللعب مع صاحبك، والحكم يشوف الكروت عند الطرفين */}
      <div className="grid grid-cols-1 gap-2">
        <CardBank
          cards={state.cards[leftSide]}
          label={isRef ? `كروت ${leftTitle}` : "كروتك"}
          active={
            ((!isRef && leftSide === mySide && myTurn) ||
              (isRef && state.turn === leftSide)) &&
            !spot &&
            !state.revealHold
          }
          onUse={!isRef ? (cardType) => setCardPicker({ cardType }) : undefined}
          isUsable={(cardType) => !isRef && cardType === "SWAP"}
        />
        <CardBank
          cards={state.cards[rightSide]}
          label={`كروت ${isRef ? rightTitle : opp.nameAr}`}
          active={
            isRef && state.turn === rightSide && !spot && !state.revealHold
          }
          onUse={!isRef ? (cardType) => setCardPicker({ cardType }) : undefined}
          isUsable={(cardType) => !isRef && cardType === "SWAP"}
        />
      </div>

      {/* سجل الجولات — الحكم بيشوف كل صناديق كل جولة */}
      {isRef && refView && (
        <RoundsLog
          seed={state.seed}
          starter={state.starter}
          pools={poolsRef.current}
          upTo={state.stage}
          events={state.events}
          nameOf={nameOf}
        />
      )}

      {/* نافذة القرار: خد الصفقة / جازف */}
      {decisionNeeded && firstOpenedItem && !spot && (
        <Overlay>
          <div className="text-center text-sm font-black text-amber-300 mb-2 break-words">
            {decisionName} فتح صندوق {decisionBoxIndex! + 1} —{" "}
            {stageDef.singularAr}
          </div>
          {!decisionCardType && firstOpenedItem && (
            <>
              <ItemCard item={firstOpenedItem} />
              <div className="mt-2 text-center text-sm font-black text-white break-words">
                {itemName(firstOpenedItem)}
              </div>
            </>
          )}
          {decisionCardType && (
            <>
              <div className="mt-3">
                <GameCardReveal type={decisionCardType} />
              </div>
              <div className="mt-2 text-center text-xs font-black text-amber-200">
                الكرت ظهر — اللاعب اللي جواه لسه مخبي
              </div>
            </>
          )}
          {mode === "PVP" && turnSeconds && (
            <div className="mt-2 w-full max-w-xs">
              <TurnTimer left={timeLeft} total={turnSeconds} mine />
            </div>
          )}
          <div className="mt-3 grid grid-cols-1 gap-2 w-full max-w-xs">
            <button
              type="button"
              onClick={takeDeal}
              className="rounded-2xl bg-emerald-500 py-3 text-base font-black text-black shadow-[0_0_20px_rgba(16,185,129,0.6)] active:scale-95"
            >
              {decisionCardType ? "خد الصفقة + الكرت ✅" : "خد الصفقة ✅"}
              <div className="text-[10px] font-bold">
                {decisionCardType
                  ? "اللاعب ينزل تشكيلتك والكرت يروح للبنك"
                  : "اللاعب ينزل تشكيلتك فورًا"}
              </div>
            </button>
            <button
              type="button"
              onClick={gamble}
              className="rounded-2xl bg-rose-500 py-3 text-base font-black text-white shadow-[0_0_20px_rgba(244,63,94,0.6)] active:scale-95"
            >
              {decisionCardType ? "شوف صندوق تاني 🎲" : "جازف 🎲"}
              <div className="text-[10px] font-bold">
                المحاولة الثانية بس — مفيش صندوق ثالث
              </div>
            </button>
          </div>
        </Overlay>
      )}

      {/* Spotlight للحدث */}
      {spot && (
        <Overlay onClick={() => setSpot(null)}>
          <SpotBody
            spot={spot}
            nameOf={nameOf}
            mySide={isRef ? null : mySide}
            stageSingular={stageDef.singularAr}
          />
        </Overlay>
      )}

      {cardPicker && (
        <CardTargetDialog
          cardType={cardPicker.cardType}
          state={state}
          side={actSide}
          onCancel={() => setCardPicker(null)}
          onSelect={(targetSide, targetPlayerId) => {
            const action: DndAction = {
              t: "USE_CARD",
              s: actSide,
              cardType: cardPicker.cardType,
              targetSide,
              targetPlayerId,
            };
            const ok = commit(action, false);
            if (ok) setCardPicker(null);
          }}
        />
      )}
      {confirmLeave && (
        <LeaveDialog
          referee={isRef}
          onCancel={() => setConfirmLeave(false)}
          onConfirm={doWithdraw}
        />
      )}
    </div>,
  );
};

const createSeededLocal = (seed: number): number => {
  let x = seed >>> 0 || 1;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return ((x >>> 0) % 1000) / 1000;
};

// ---------------- عناصر مساعدة ----------------
const Overlay: React.FC<{
  children: React.ReactNode;
  onClick?: () => void;
}> = ({ children, onClick }) => (
  <div
    onClick={onClick}
    className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-sm p-3"
  >
    <div
      className="max-h-[94vh] w-full max-w-sm overflow-y-auto flex flex-col items-center py-2"
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  </div>
);

const SpotBody: React.FC<{
  spot: Spot;
  nameOf: (s: DndSide) => string;
  mySide: DndSide | null;
  stageSingular: string;
}> = ({ spot, nameOf, mySide, stageSingular }) => {
  if (spot.kind === "gamble") {
    return (
      <div className="text-center py-10">
        <div className="text-6xl">🎲</div>
        <div className="mt-3 text-xl font-black text-rose-300 break-words">
          {nameOf(spot.side)} جازف!
        </div>
        <div className="text-xs text-zinc-400 mt-1">
          هيفتح صندوق تاني — وهو إجباري
        </div>
      </div>
    );
  }
  const spotSide: DndSide = spot.kind === "acquired" ? spot.side : spot.ev.side;
  const mine = mySide !== null && spotSide === mySide;
  const who = mine ? "أنت" : nameOf(spotSide);
  if (spot.kind === "card") {
    const hidePlayer =
      spot.ev.kind === "CARD" && spot.ev.attempt === 1 && mySide !== null;
    return (
      <>
        <div className="text-center text-sm font-black mb-2 break-words text-amber-300">
          {who} فتح صندوق {spot.ev.box + 1}
        </div>
        {hidePlayer ? (
          <div className="flex flex-col items-center">
            <GameCardReveal type={spot.ev.cardType!} />
            <div className="mt-2 text-center text-sm font-black text-white">
              الكرت ظهر لوحده — اللاعب لسه مستخبي
            </div>
          </div>
        ) : (
          <>
            <ItemCard item={spot.item} />
            {spot.ev.cardType && (
              <div className="mt-3">
                <GameCardReveal type={spot.ev.cardType} />
              </div>
            )}
            <div className="mt-2 text-center text-sm font-black text-white break-words">
              {spot.ev.cardType
                ? `${DND_CARD_INFO[spot.ev.cardType].nameAr} — ${DND_CARD_INFO[spot.ev.cardType].shortAr}`
                : `${stageSingular}: ${itemName(spot.item)} — ${itemRating(spot.item)}`}
            </div>
          </>
        )}
      </>
    );
  }
  return (
    <AcquiredSpotBody spot={spot} who={who} stageSingular={stageSingular} />
  );
};

/** اللاعب اللي نزل التشكيلة بعد الصفقة/المجازفة (ثانية ونص) — لو فيه كرت جديد بيظهر الأول. */
const AcquiredSpotBody: React.FC<{
  spot: Extract<Spot, { kind: "acquired" }>;
  who: string;
  stageSingular: string;
}> = ({ spot, who, stageSingular }) => {
  const [showCard, setShowCard] = useState(spot.cardFirst);
  useEffect(() => {
    if (!spot.cardFirst) return;
    const t = setTimeout(() => setShowCard(false), ACQUIRED_CARD_FIRST_MS);
    return () => clearTimeout(t);
  }, [spot.cardFirst]);

  if (showCard && spot.cardType) {
    return (
      <div className="flex flex-col items-center dnd-pop-in">
        <div className="text-center text-sm font-black mb-2 text-amber-300 break-words">
          {who} — الكرت ظهر الأول 🎴
        </div>
        <GameCardReveal type={spot.cardType} />
        <div className="mt-2 text-center text-xs font-black text-amber-200">
          {DND_CARD_INFO[spot.cardType].nameAr} —{" "}
          {DND_CARD_INFO[spot.cardType].shortAr}
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center dnd-pop-in">
      <div className="text-center text-sm font-black mb-2 text-emerald-300 break-words">
        {who} خد {stageSingular} ✅
      </div>
      <ItemCard item={spot.item} />
      <div className="mt-2 text-center text-sm font-black text-white break-words">
        {itemName(spot.item)}
      </div>
      {spot.cardType && (
        <div className="mt-2 flex items-center gap-2 rounded-2xl border border-amber-400/40 bg-black/50 px-3 py-1.5">
          <GameCardMini type={spot.cardType} compact showMicro={false} />
          <span className="text-[11px] font-black text-amber-200">
            + {DND_CARD_INFO[spot.cardType].nameAr} اتضاف لبنك الكروت
          </span>
        </div>
      )}
    </div>
  );
};

const CardTargetDialog: React.FC<{
  cardType: DndCardType;
  state: DndState;
  side: DndSide;
  onCancel: () => void;
  onSelect: (targetSide: DndSide, targetPlayerId: string) => void;
}> = ({ cardType, state, side, onCancel, onSelect }) => {
  const targetSide: DndSide = cardType === "SHIELD" ? side : other(side);
  const targets = state.acquired[targetSide]
    .filter((it): it is DndItem & { kind: "PLAYER" } => it?.kind === "PLAYER")
    .map((it) => it.player);
  const protectedIds = state.protectedPlayerIds[targetSide];
  const eligible = targets.filter((p) =>
    cardType === "SHIELD"
      ? !state.protectedPlayerIds[side].includes(p.id)
      : cardType === "STEAL"
        ? !protectedIds.includes(p.id)
        : true,
  );
  return (
    <Overlay>
      <div
        className="w-full max-w-sm rounded-3xl border border-amber-400/40 bg-zinc-950 p-4 shadow-[0_0_40px_rgba(245,158,11,0.25)]"
        dir="rtl"
      >
        <div className="text-center text-lg font-black text-amber-200">
          اختار هدف الكرت
        </div>
        <div className="mt-1 text-center text-xs text-zinc-400">
          {DND_CARD_INFO[cardType].nameAr}
        </div>
        <div className="mt-4 space-y-2">
          {eligible.map((player) => (
            <button
              key={player.id}
              type="button"
              onClick={() => onSelect(targetSide, player.id)}
              className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900 px-3 py-2 text-right hover:border-amber-400/60"
            >
              <img
                src={player.photoUrl}
                alt=""
                className="h-11 w-11 rounded-xl border-2 border-amber-400/60 object-contain bg-black/20"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-black text-white">
                  {player.nameAr}
                </span>
              </span>
            </button>
          ))}
          {eligible.length === 0 && (
            <div className="rounded-2xl border border-dashed border-zinc-700 p-4 text-center text-xs text-zinc-500">
              {cardType === "STEAL"
                ? "كل لاعيبة الخصم المتاحة عليهم حماية."
                : "مفيش لاعب صالح للكرت دلوقتي."}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="mt-4 w-full rounded-2xl border border-zinc-700 bg-zinc-900 py-3 text-xs font-black text-zinc-200"
        >
          إلغاء
        </button>
      </div>
    </Overlay>
  );
};

const LeaveDialog: React.FC<{
  onCancel: () => void;
  onConfirm: () => void;
  referee?: boolean;
}> = ({ onCancel, onConfirm, referee }) => (
  <div
    className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4"
    dir="rtl"
  >
    <div className="w-full max-w-xs rounded-3xl border border-zinc-700 bg-zinc-900 p-5 text-center space-y-4">
      <Swords className="w-8 h-8 mx-auto text-rose-400" />
      <div className="text-lg font-black text-white">متأكد إنك عايز تخرج؟</div>
      <div className="text-xs text-zinc-400 break-words">
        {referee
          ? "الماتش هيتقفل بدون نتيجة."
          : "لو خرجت هتتحسب عليك خسارة والخصم بياخد الفوز."}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={onConfirm}
          className="rounded-xl bg-rose-500 py-2.5 text-sm font-black text-white"
        >
          أيوه، خروج
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-zinc-600 bg-zinc-800 py-2.5 text-sm font-black text-white"
        >
          كمّل اللعب
        </button>
      </div>
    </div>
  </div>
);

const DealOrNoDealMatchHost: React.FC<{
  state: DndState;
  nameA: string;
  nameB: string;
  mySide: DndSide;
  myName: string;
  oppName: string;
  mySquad: ReturnType<typeof buildSquad>;
  oppSquad: ReturnType<typeof buildSquad>;
  startFinished: boolean;
  neutral?: boolean;
  opponent?: PlayerSnapshot | null;
  myAvatar?: string;
  oppAvatar?: string;
  canRematch: boolean;
  rematchWaiting: boolean;
  onFinished: (o: "win" | "loss" | "draw") => void;
  onRematch: () => void;
  onBackToGames: () => void;
}> = (p) => {
  // المفتاح بيتغير لو أي لاعب اتبدّل (سرقة/لبس صحبك) → المحاكاة دايمًا على التشكيلة الفعلية.
  const squadKey = (["A", "B"] as DndSide[])
    .map((sd) =>
      p.state.acquired[sd]
        .map((it) =>
          it
            ? it.kind === "PLAYER"
              ? it.player.id
              : it.kind === "COACH"
                ? it.coach.id
                : "card"
            : "-",
        )
        .join(","),
    )
    .join("|");
  const result = useMemo(
    () => simulateFinal(p.state, p.nameA, p.nameB),
    [p.state.seed, p.nameA, p.nameB, squadKey],
  );
  return (
    <DealOrNoDealMatch
      result={result}
      mySide={p.mySide}
      myName={p.myName}
      oppName={p.oppName}
      mySquad={p.mySquad}
      oppSquad={p.oppSquad}
      canRematch={p.canRematch}
      rematchWaiting={p.rematchWaiting}
      startFinished={p.startFinished}
      neutral={p.neutral}
      opponent={p.opponent}
      myAvatar={p.myAvatar}
      oppAvatar={p.oppAvatar}
      onFinished={p.onFinished}
      onRematch={p.onRematch}
      onBackToGames={p.onBackToGames}
    />
  );
};
