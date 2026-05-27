import { StyleSheet, Text, View } from "react-native";
import { ODK, PlayType, Result, type PlaylistData } from "@huddlestat/shared";
import { PlayerInput } from "./PlayerInput";
import { Stepper } from "./Stepper";

type PlayPlayerFieldsProps = {
  draft: PlaylistData;
  onChange: (draft: PlaylistData) => void;
};

export function PlayPlayerFields({ draft, onChange }: PlayPlayerFieldsProps) {
  const { playType, result, odk } = draft;

  if (!playType) return null;

  const showKicker =
    playType === PlayType.Kickoff ||
    playType === PlayType.KickoffReceive ||
    playType === PlayType.Punt ||
    playType === PlayType.PuntReceive ||
    playType === PlayType.FieldGoal;

  const showReturner =
    playType === PlayType.KickoffReceive ||
    playType === PlayType.PuntReceive ||
    result === Result.Return;

  const showKickYards =
    playType === PlayType.Kickoff ||
    playType === PlayType.FieldGoal ||
    playType === PlayType.Punt;

  const showReturnYards = showReturner && result === Result.Return;

  const showRusher = playType === PlayType.Run;
  const showPasser = playType === PlayType.Pass;
  const showReceiver = playType === PlayType.Pass;
  const showTacklers =
    playType === PlayType.Run ||
    playType === PlayType.Pass ||
    odk === ODK.Defense;
  const showInterceptor =
    playType === PlayType.Pass && result === Result.Interception;

  const kickerLabel =
    playType === PlayType.Punt || playType === PlayType.PuntReceive
      ? "Punter"
      : "Kicker";

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Players</Text>

      {showKicker ? (
        <PlayerInput
          label={kickerLabel}
          value={draft.kicker}
          onChange={(kicker) => onChange({ ...draft, kicker })}
        />
      ) : null}

      {showKickYards ? (
        <View style={styles.stepperWrap}>
          <Stepper
            label="Kick yards"
            value={draft.kickYards ?? 0}
            onChange={(kickYards) =>
              onChange({
                ...draft,
                kickYards: kickYards === 0 ? undefined : kickYards,
              })
            }
            min={0}
            max={99}
          />
        </View>
      ) : null}

      {showReturner ? (
        <PlayerInput
          label="Returner"
          value={draft.returner}
          onChange={(returner) => onChange({ ...draft, returner })}
        />
      ) : null}

      {showReturnYards ? (
        <View style={styles.stepperWrap}>
          <Stepper
            label="Return yards"
            value={draft.returnYards ?? 0}
            onChange={(returnYards) =>
              onChange({
                ...draft,
                returnYards: returnYards === 0 ? undefined : returnYards,
                gainLoss: returnYards,
              })
            }
            min={-99}
            max={99}
          />
        </View>
      ) : null}

      {showPasser ? (
        <PlayerInput
          label="Passer"
          value={draft.passer}
          onChange={(passer) => onChange({ ...draft, passer })}
        />
      ) : null}

      {showReceiver ? (
        <PlayerInput
          label="Receiver"
          value={draft.receiver}
          onChange={(receiver) => onChange({ ...draft, receiver })}
        />
      ) : null}

      {showRusher ? (
        <PlayerInput
          label="Rusher"
          value={draft.rusher}
          onChange={(rusher) => onChange({ ...draft, rusher })}
        />
      ) : null}

      {showInterceptor ? (
        <PlayerInput
          label="Intercepted by"
          value={draft.interceptedBy}
          onChange={(interceptedBy) => onChange({ ...draft, interceptedBy })}
        />
      ) : null}

      {showTacklers ? (
        <>
          <PlayerInput
            label="Tackler 1"
            value={draft.tackler1}
            onChange={(tackler1) => onChange({ ...draft, tackler1 })}
          />
          <PlayerInput
            label="Tackler 2"
            value={draft.tackler2}
            onChange={(tackler2) => onChange({ ...draft, tackler2 })}
          />
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1e3a5f",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stepperWrap: {
    alignSelf: "flex-start",
  },
});
