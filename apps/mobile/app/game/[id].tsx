import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  PlayType,
  Result,
  defaultKickoffPlay,
  liveDraftFromLastPlay,
  nextDraftAfterPlay,
  normalizePlayOnSave,
  type PlaylistData,
} from "@huddlestat/shared";
import { SyncStatusBar } from "@/components/SyncStatusBar";
import { PlayLogSidebar } from "@/components/tagging/PlayLogSidebar";
import { TaggingHeader } from "@/components/tagging/TaggingHeader";
import { TaggingPad } from "@/components/tagging/TaggingPad";
import { getLocalGame } from "@/lib/db/games";
import {
  countUnsyncedPlays,
  getNextPlayNumber,
  listPlaysForGame,
  saveLocalPlay,
  updateLocalPlay,
} from "@/lib/db/plays";
import type { LocalGame, LocalPlay } from "@/lib/db/types";
import {
  ensureOffensePadDraft,
  getVisiblePlayerSlots,
  type PlayerSlotKey,
} from "@/lib/tagging/playConfig";
import {
  applyKickoffSpotsToDraft,
  defaultKickoffReturnSpots,
  initKickoffSpotsFromDraft,
  touchbackDraftPatch,
  type KickoffReturnSpots,
} from "@/lib/tagging/kickoffReturn";
import {
  applyPuntSpotsToDraft,
  defaultPuntSpots,
  initPuntSpotsFromDraft,
  type PuntSpots,
} from "@/lib/tagging/puntReturn";
import {
  applyTackleSpotToDraft,
  initTackleEndFromDraft,
  needsTackleSpot,
  type TackleEnd,
} from "@/lib/tagging/tackleSpot";
import { LAYOUT } from "@/lib/tagging/layoutConstants";
import {
  applyKickoffRole,
  firstKickoffPlayerSlot,
  getKickoffRole,
  kickoffRoleFromDraft,
  setKickoffRole,
  type KickoffRole,
} from "@/lib/tagging/kickoffRole";
import { useSync } from "@/context/sync-context";

function playToDraft(play: LocalPlay): PlaylistData {
  return {
    playNumber: play.playNumber,
    odk: play.odk,
    yardLine: play.yardLine,
    down: play.down,
    distance: play.distance,
    hash: play.hash,
    gainLoss: play.gainLoss,
    passer: play.passer,
    receiver: play.receiver,
    rusher: play.rusher,
    result: play.result,
    team: play.team,
    tackler1: play.tackler1,
    tackler2: play.tackler2,
    recoveredBy: play.recoveredBy,
    returnYards: play.returnYards,
    returner: play.returner,
    playType: play.playType,
    kicker: play.kicker,
    kickYards: play.kickYards,
    interceptedBy: play.interceptedBy,
    completion: play.completion,
  };
}

function isKickoffDraft(draft: PlaylistData): boolean {
  return (
    draft.playType === PlayType.Kickoff ||
    draft.playType === PlayType.KickoffReceive
  );
}

function withKickoffRole(draft: PlaylistData, role: KickoffRole): PlaylistData {
  return isKickoffDraft(draft) ? applyKickoffRole(draft, role) : draft;
}

function buildLiveDraft(
  plays: LocalPlay[],
  nextNum: number,
  teamCode: string,
  kickoffRole: KickoffRole,
): PlaylistData {
  const last = plays[plays.length - 1];
  if (last) {
    return ensureOffensePadDraft(
      withKickoffRole(
        liveDraftFromLastPlay(playToDraft(last), nextNum, teamCode),
        kickoffRole,
      ),
    );
  }
  return withKickoffRole(
    defaultKickoffPlay(nextNum, teamCode, { result: Result.Return }),
    kickoffRole,
  );
}

function applySpotDraft(
  draft: PlaylistData,
  kickoff: KickoffReturnSpots,
  punt: PuntSpots,
  end: TackleEnd,
) {
  return applyTackleSpotToDraft(
    applyPuntSpotsToDraft(
      applyKickoffSpotsToDraft(ensureOffensePadDraft(draft), kickoff),
      punt,
    ),
    end,
  );
}

function firstPlayerSlot(draft: PlaylistData): PlayerSlotKey | null {
  const slots = getVisiblePlayerSlots(draft.playType, draft.result);
  return slots[0] ?? null;
}

function canSaveDraft(draft: PlaylistData): boolean {
  if (!draft.playType || !draft.result) return false;
  // Gate 3: require jersey on each visible slot before save
  return true;
}

export default function TaggingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { refreshCounts, pushStats, playsToSync } = useSync();
  const [game, setGame] = useState<LocalGame | null>(null);
  const [plays, setPlays] = useState<LocalPlay[]>([]);
  const [draft, setDraft] = useState<PlaylistData | null>(null);
  const [nextPlayNumber, setNextPlayNumber] = useState(1);
  const [saving, setSaving] = useState(false);
  const [unsyncedCount, setUnsyncedCount] = useState(0);
  const [activePlayerSlot, setActivePlayerSlot] =
    useState<PlayerSlotKey | null>(null);
  const [editingPlayId, setEditingPlayId] = useState<string | null>(null);
  const [catchUpMode, setCatchUpMode] = useState(false);
  const [kickoffSpots, setKickoffSpots] = useState<KickoffReturnSpots>(() =>
    initKickoffSpotsFromDraft(null),
  );
  const [puntSpots, setPuntSpots] = useState<PuntSpots>(() =>
    initPuntSpotsFromDraft(null),
  );
  const [kickoffRole, setKickoffRoleState] = useState<KickoffRole>("kick");
  const [tackleEnd, setTackleEnd] = useState<TackleEnd>(() =>
    initTackleEndFromDraft(defaultKickoffPlay(1, "WHS")),
  );
  const offLiveRef = useRef(false);

  useEffect(() => {
    offLiveRef.current = editingPlayId !== null || catchUpMode;
  }, [editingPlayId, catchUpMode]);

  const load = useCallback(async () => {
    if (!id) return;
    const g = await getLocalGame(id);
    if (!g) {
      router.replace("/");
      return;
    }
    setGame(g);
    const existing = await listPlaysForGame(id);
    setPlays(existing);
    setUnsyncedCount(await countUnsyncedPlays(id));
    const nextNum = await getNextPlayNumber(id);
    setNextPlayNumber(nextNum);
    const role = await getKickoffRole(id);
    setKickoffRoleState(role);

    if (!offLiveRef.current) {
      const liveDraft = buildLiveDraft(existing, nextNum, g.teamCode, role);
      const kickoff = initKickoffSpotsFromDraft(liveDraft);
      const punt = initPuntSpotsFromDraft(liveDraft);
      setKickoffSpots(kickoff);
      setPuntSpots(punt);
      const end = initTackleEndFromDraft(liveDraft);
      setTackleEnd(end);
      setDraft(applySpotDraft(liveDraft, kickoff, punt, end));
      setActivePlayerSlot(firstPlayerSlot(liveDraft));
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
      void refreshCounts();
    }, [load, refreshCounts]),
  );

  // Keep header in sync when SyncStatusBar / background sync finishes
  useEffect(() => {
    if (!id) return;
    void (async () => {
      setUnsyncedCount(await countUnsyncedPlays(id));
      const existing = await listPlaysForGame(id);
      setPlays(existing);
    })();
  }, [id, playsToSync]);

  function resumeLiveTagging() {
    if (!game) return;
    setEditingPlayId(null);
    setCatchUpMode(false);
    const liveDraft = buildLiveDraft(
      plays,
      nextPlayNumber,
      game.teamCode,
      kickoffRole,
    );
    const kickoff = initKickoffSpotsFromDraft(liveDraft);
    const punt = initPuntSpotsFromDraft(liveDraft);
    setKickoffSpots(kickoff);
    setPuntSpots(punt);
    const end = initTackleEndFromDraft(liveDraft);
    setTackleEnd(end);
    setDraft(applySpotDraft(liveDraft, kickoff, punt, end));
    setActivePlayerSlot(firstPlayerSlot(liveDraft));
  }

  function handleSelectPlay(play: LocalPlay) {
    setEditingPlayId(play.id);
    setCatchUpMode(false);
    const d = playToDraft(play);
    const kickoff = initKickoffSpotsFromDraft(d);
    const punt = initPuntSpotsFromDraft(d);
    setKickoffSpots(kickoff);
    setPuntSpots(punt);
    const end = initTackleEndFromDraft(d);
    setTackleEnd(end);
    setDraft(applySpotDraft(d, kickoff, punt, end));
    setActivePlayerSlot(firstPlayerSlot(d));
  }

  function handleCatchUp() {
    if (!game) return;
    setCatchUpMode(true);
    setEditingPlayId(null);
    const d = buildLiveDraft(plays, nextPlayNumber, game.teamCode, kickoffRole);
    const withNum = { ...d, playNumber: nextPlayNumber };
    const kickoff = initKickoffSpotsFromDraft(withNum);
    const punt = initPuntSpotsFromDraft(withNum);
    setKickoffSpots(kickoff);
    setPuntSpots(punt);
    const end = initTackleEndFromDraft(withNum);
    setTackleEnd(end);
    setDraft(applySpotDraft(withNum, kickoff, punt, end));
    setActivePlayerSlot(firstPlayerSlot(withNum));
  }

  function handleKickoffRoleChange(role: KickoffRole) {
    setKickoffRoleState(role);
    if (id) {
      void setKickoffRole(id, role);
    }
    if (!draft || !isKickoffDraft(draft)) return;
    const next = applyKickoffRole(draft, role);
    setDraft(next);
    setActivePlayerSlot(firstKickoffPlayerSlot(next));
  }

  function handleKickoffSpotsChange(spots: KickoffReturnSpots) {
    setKickoffSpots(spots);
    setDraft((d) => (d ? applyKickoffSpotsToDraft(d, spots) : d));
  }

  function handlePuntSpotsChange(spots: PuntSpots) {
    setPuntSpots(spots);
    setDraft((d) => (d ? applyPuntSpotsToDraft(d, spots) : d));
  }

  function handleTackleEndChange(end: TackleEnd) {
    setTackleEnd(end);
    setDraft((d) => (d ? applyTackleSpotToDraft(d, end) : d));
  }

  function handleDraftChange(next: PlaylistData) {
    const isKickoff =
      next.playType === PlayType.Kickoff ||
      next.playType === PlayType.KickoffReceive;
    const isPunt = next.playType === PlayType.Punt;

    if (isKickoff && next.result === Result.Touchback) {
      setKickoffSpots(defaultKickoffReturnSpots());
      setDraft(touchbackDraftPatch(next));
      return;
    }

    if (isKickoff && next.result === Result.Return) {
      setDraft(applyKickoffSpotsToDraft(next, kickoffSpots));
      return;
    }

    if (isPunt && next.result === Result.Touchback) {
      setPuntSpots(defaultPuntSpots(next.yardLine));
      setDraft(touchbackDraftPatch(next));
      return;
    }

    if (
      isPunt &&
      (next.result === Result.Return || next.result === Result.Downed)
    ) {
      const spotInputsChanged =
        draft?.playType !== next.playType ||
        draft?.result !== next.result ||
        draft?.yardLine !== next.yardLine;

      if (spotInputsChanged) {
        const spots = initPuntSpotsFromDraft(next);
        setPuntSpots(spots);
        setDraft(applyPuntSpotsToDraft(next, spots));
      } else {
        setDraft(applyPuntSpotsToDraft(next, puntSpots));
      }
      return;
    }

    if (isPunt) {
      setDraft(next);
      return;
    }

    if (needsTackleSpot(next.playType, next.result)) {
      const spotInputsChanged =
        draft?.playType !== next.playType ||
        draft?.result !== next.result ||
        draft?.yardLine !== next.yardLine;

      if (spotInputsChanged) {
        const end = initTackleEndFromDraft(next);
        setTackleEnd(end);
        setDraft(applyTackleSpotToDraft(next, end));
      } else {
        setDraft(applyTackleSpotToDraft(next, tackleEnd));
      }
      return;
    }

    setDraft(next);
  }

  async function handleSavePlay() {
    if (!id || !draft || !game || !canSaveDraft(draft)) return;
    setSaving(true);
    try {
      const toSave = normalizePlayOnSave(draft);
      if (editingPlayId) {
        const updated = await updateLocalPlay(editingPlayId, toSave);
        const newPlays = plays.map((p) =>
          p.id === editingPlayId ? updated : p,
        );
        setPlays(newPlays);
        setEditingPlayId(null);
        setCatchUpMode(false);
        const nextNum = await getNextPlayNumber(id);
        setNextPlayNumber(nextNum);
        const liveDraft = buildLiveDraft(
          newPlays,
          nextNum,
          game.teamCode,
          kickoffRole,
        );
        const kickoff = initKickoffSpotsFromDraft(liveDraft);
        const punt = initPuntSpotsFromDraft(liveDraft);
        setKickoffSpots(kickoff);
        setPuntSpots(punt);
        const end = initTackleEndFromDraft(liveDraft);
        setTackleEnd(end);
        setDraft(applySpotDraft(liveDraft, kickoff, punt, end));
        setActivePlayerSlot(firstPlayerSlot(liveDraft));
      } else {
        const saved = await saveLocalPlay(id, toSave);
        setPlays((prev) => [...prev, saved]);
        const nextNum = draft.playNumber + 1;
        setNextPlayNumber(nextNum);
        const next = withKickoffRole(
          ensureOffensePadDraft(
            nextDraftAfterPlay(toSave, nextNum, game.teamCode),
          ),
          kickoffRole,
        );
        const kickoff = initKickoffSpotsFromDraft(next);
        const punt = initPuntSpotsFromDraft(next);
        setKickoffSpots(kickoff);
        setPuntSpots(punt);
        const end = initTackleEndFromDraft(next);
        setTackleEnd(end);
        setDraft(applySpotDraft(next, kickoff, punt, end));
        setActivePlayerSlot(firstPlayerSlot(next));
        setCatchUpMode(false);
      }
      setUnsyncedCount(await countUnsyncedPlays(id));
      await refreshCounts();
      void pushStats().catch(() => undefined);
    } finally {
      setSaving(false);
    }
  }

  if (!game || !draft) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>Loading game…</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SyncStatusBar />

      <TaggingHeader
        game={game}
        draft={draft}
        unsyncedCount={unsyncedCount}
        undoEnabled={false}
      />

      <View style={styles.main}>
        <View style={styles.taggingColumn}>
          <TaggingPad
            draft={draft}
            onChange={handleDraftChange}
            activePlayerSlot={activePlayerSlot}
            onActivePlayerSlotChange={setActivePlayerSlot}
            kickoffSpots={kickoffSpots}
            onKickoffSpotsChange={handleKickoffSpotsChange}
            kickoffRole={
              isKickoffDraft(draft) ? kickoffRoleFromDraft(draft) : kickoffRole
            }
            onKickoffRoleChange={handleKickoffRoleChange}
            puntSpots={puntSpots}
            onPuntSpotsChange={handlePuntSpotsChange}
            tackleEnd={tackleEnd}
            onTackleEndChange={handleTackleEndChange}
          />
        </View>

        <PlayLogSidebar
          plays={plays}
          nextPlayNumber={nextPlayNumber}
          editingPlayId={editingPlayId}
          catchUpMode={catchUpMode}
          saving={saving}
          saveDisabled={!canSaveDraft(draft)}
          onCatchUp={handleCatchUp}
          onSelectPlay={handleSelectPlay}
          onResumeLive={resumeLiveTagging}
          onSave={() => void handleSavePlay()}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LAYOUT.colors.panelBg,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 18,
    color: LAYOUT.colors.textMuted,
  },
  main: {
    flex: 1,
    flexDirection: "row",
  },
  taggingColumn: {
    flex: LAYOUT.taggingPadFlex,
  },
});
