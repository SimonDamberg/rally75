// Race card generation, ported from the prototype's buildField().
import type { Rng } from "./rng";
import type {
  Field,
  HorsePublic,
  HorseStats,
  KuskInput,
  RaceCard,
} from "./types";
import {
  ADJ,
  EFTERLED,
  EFTERNAMN,
  EPITET,
  FORLED,
  FORNAMN,
  KUSKTITEL,
  ORTER,
  SUBST,
} from "../content/names";
import { KUSK_NOTER, STORY_MALLAR } from "../content/stories";
import { BANOR, DISTANSER, KOMMENTARER, SILKS, TIPS } from "../content/race";
import { winWeights } from "./odds";

export const FIELD_SIZE = 4;
/** One slot in every field goes to a nobody from FORNAMN + EFTERNAMN. */
export const RANDOM_KUSKAR_PER_FIELD = 0;
/** The other three come from the stable, and at least one of them is a friend. */
export const NAMED_KUSKAR_PER_FIELD = 4;

const round = (x: number, decimals: number) => {
  const f = 10 ** decimals;
  return Math.round(x * f) / f;
};

export function horseName(r: Rng): string {
  const x = r.next();
  if (x < 0.42) return `${r.pick(ORTER)} ${r.pick(EPITET)}`;
  if (x < 0.83) return `${r.pick(FORLED)} ${r.pick(EFTERLED)}`;
  return `Den ${r.pick(ADJ)} ${r.pick(SUBST)}`;
}

export function jockeyName(r: Rng): string {
  return `${r.pick(FORNAMN)} ${r.pick(EFTERNAMN)}`;
}

export function formLine(r: Rng): string {
  const marks: string[] = [];
  for (let i = 0; i < 5; i++) {
    const x = r.next();
    marks.push(x < 0.12 ? "g" : x < 0.18 ? "d" : String(1 + r.int(9)));
  }
  return marks.join("-");
}

export const finalWord = (name: string) => name.split(" ").pop() ?? name;

/**
 * Builds an n-horse field. `kusks` are the stable's own (active) kuskar; three of them
 * (capped by how many exist) get random slots, and the remaining slot is a random kusk.
 */
export function buildField(
  n: number,
  kusks: readonly KuskInput[],
  r: Rng,
): Field {
  const namedCount = Math.min(
    kusks.length,
    Math.max(0, n - RANDOM_KUSKAR_PER_FIELD),
    NAMED_KUSKAR_PER_FIELD,
  );
  const namedPool = r.shuffle(kusks);
  const slots = r.shuffle([...Array(n).keys()]);
  const namedSlots = new Set(slots.slice(0, namedCount));

  // No duplicate comment or tip within a field
  const tipPool = r.shuffle(TIPS);
  const notePool = r.shuffle(KOMMENTARER);

  const usedNames = new Set<string>();
  const usedTails = new Set<string>();
  const usedJockeys = new Set<string>();
  const horses: HorsePublic[] = [];
  const stats: HorseStats[] = [];

  for (let i = 0; i < n; i++) {
    // Avoid both the same name and the same final word (two Soptunnor in one race)
    let name: string;
    let guard = 0;
    do {
      name = horseName(r);
      guard++;
    } while (
      (usedNames.has(name) || usedTails.has(finalWord(name))) &&
      guard < 80
    );
    usedNames.add(name);
    usedTails.add(finalWord(name));

    let jockey: string;
    let title: string;
    let jnote: string;
    const named = namedSlots.has(i) ? namedPool.pop() : undefined;
    if (named) {
      jockey = named.name;
      title = named.title;
      jnote = named.notes.length
        ? r.pick(named.notes)
        : r.pick(KUSK_NOTER)(jockey, r);
    } else {
      guard = 0;
      do {
        jockey = jockeyName(r);
        guard++;
      } while (usedJockeys.has(jockey) && guard < 60);
      title = r.pick(KUSKTITEL);
      jnote = r.pick(KUSK_NOTER)(jockey, r);
    }
    usedJockeys.add(jockey);

    const strength = r.float(0.72, 1.32);
    horses.push({
      n: i + 1,
      name,
      jockey,
      title,
      story: r.pick(STORY_MALLAR)(name, jockey, r),
      jnote,
      form: formLine(r),
      note: notePool[i % notePool.length],
      tip: tipPool[i % tipPool.length],
      silk: SILKS[i % SILKS.length],
      baseOdds: 0,
    });
    // Rounded so the values survive a jsonb round trip unchanged
    stats.push({
      n: i + 1,
      strength: round(strength, 4),
      stamina: round(r.float(0.8, 1.2), 4),
      temper: round(r.float(0.02, 0.16), 4),
    });
  }

  // Morning line from strength, with noise so the favourite does not always win
  const weights = winWeights(stats);
  horses.forEach((h, i) => {
    const p = weights[i];
    h.baseOdds = round(
      Math.min(58, Math.max(1.45, (1 / p) * 0.86 * r.float(0.88, 1.16))),
      2,
    );
  });

  return { horses, stats };
}

export function buildRaceCard(
  kusks: readonly KuskInput[],
  r: Rng,
  n = FIELD_SIZE,
): RaceCard {
  const field = buildField(n, kusks, r);
  return { ...field, dist: r.pick(DISTANSER), cond: r.pick(BANOR) };
}
