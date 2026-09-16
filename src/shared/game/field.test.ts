import { describe, expect, it } from "vitest";
import { createRng } from "./rng";
import { buildField, buildRaceCard, FIELD_SIZE } from "./field";
import { NAMED_KUSKAR } from "../content/kuskar";
import { SUBST } from "../content/names";

//const SEEDS = Array.from({ length: 1000 }, (_, i) => i * 7919 + 1);
//const friendNames = new Set(NAMED_KUSKAR.map((k) => k.name));

describe("buildField", () => {
  // it("respects all per-field constraints", () => {
  //   for (const seed of SEEDS) {
  //     const { horses, stats } = buildField(
  //       FIELD_SIZE,
  //       createRng(seed),
  //     );
  //     expect(horses.map((h) => h.n)).toEqual([1, 2, 3, 4]);
  //     expect(stats.map((s) => s.n)).toEqual([1, 2, 3, 4]);

  //     const names = horses.map((h) => h.name);
  //     expect(new Set(names).size, `dubbla namn, seed ${seed}`).toBe(FIELD_SIZE);
  //     expect(
  //       new Set(names.map(finalWord)).size,
  //       `dubbla slutord, seed ${seed}: ${names}`,
  //     ).toBe(FIELD_SIZE);
  //     expect(new Set(horses.map((h) => h.jockey)).size).toBe(FIELD_SIZE);
  //     expect(new Set(horses.map((h) => h.note)).size).toBe(FIELD_SIZE);
  //     expect(new Set(horses.map((h) => h.tip)).size).toBe(FIELD_SIZE);

  //     // Three from the stable, one nobody, and never a race without one of Simon's own.
  //     const named = horses.filter((h) => namedNames.has(h.jockey));
  //     expect(named, `seed ${seed}`).toHaveLength(3);
  //     expect(
  //       named.filter((h) => friendNames.has(h.jockey)).length,
  //       `seed ${seed}`,
  //     ).toBeGreaterThanOrEqual(1);

  //     for (const h of horses) {
  //       expect(h.baseOdds).toBeGreaterThanOrEqual(1.45);
  //       expect(h.baseOdds).toBeLessThanOrEqual(58);
  //       expect(Math.round(h.baseOdds * 100) / 100).toBe(h.baseOdds);
  //       expect(h.form).toMatch(/^([1-9gd]-){4}[1-9gd]$/);
  //       expect(KOMMENTARER).toContain(h.note);
  //       expect(TIPS).toContain(h.tip);
  //       for (const text of [h.name, h.jockey, h.title, h.story, h.jnote]) {
  //         expect(text).toBeTruthy();
  //         expect(text).not.toContain("undefined");
  //       }
  //     }
  //     for (const s of stats) {
  //       expect(s.strength >= 0.72 && s.strength <= 1.32).toBe(true);
  //       expect(s.stamina >= 0.8 && s.stamina <= 1.2).toBe(true);
  //       expect(s.temper >= 0.02 && s.temper <= 0.16).toBe(true);
  //     }
  //   }
  // });

  // it("named kuskar use their own title and notes", () => {
  //   for (const seed of SEEDS.slice(0, 200)) {
  //     for (const h of buildField(FIELD_SIZE, ALL_KUSKAR, createRng(seed))
  //       .horses) {
  //       const k = ALL_KUSKAR.find((x) => x.name === h.jockey);
  //       if (!k) continue;
  //       expect(h.title).toBe(k.title);
  //       expect(k.notes).toContain(h.jnote);
  //     }
  //   }
  // });

  // it("caps named kuskar by how many exist", () => {
  //   for (const seed of SEEDS.slice(0, 100)) {
  //     expect(
  //       buildField(FIELD_SIZE, [], createRng(seed)).horses.some((h) =>
  //         namedNames.has(h.jockey),
  //       ),
  //     ).toBe(false);
  //     const one = buildField(
  //       FIELD_SIZE,
  //       NAMED_KUSKAR.slice(0, 1),
  //       createRng(seed),
  //     ).horses;
  //     expect(one.filter((h) => h.jockey === NAMED_KUSKAR[0].name)).toHaveLength(
  //       1,
  //     );
  //     // An all-guest stable still fills the three named slots.
  //     const guestsOnly = buildField(
  //       FIELD_SIZE,
  //       NAMED_KUSKAR,
  //       createRng(seed),
  //     ).horses;
  //     expect(guestsOnly.filter((h) => NAMED_KUSKAR.has(h.jockey))).toHaveLength(
  //       3,
  //     );
  //   }
  // });

  it("falls back to a generic note when a named kusk has no notes", () => {
    const kusk = { name: "Testkusk", title: "ny", notes: [] };
    const { horses } = buildField(
      FIELD_SIZE,
      [kusk, { ...kusk, name: "Testkusk2" }],
      createRng(3),
    );
    for (const h of horses.filter((x) => x.jockey.startsWith("Testkusk"))) {
      expect(h.jnote).toContain(h.jockey);
    }
  });

  it("is deterministic per seed", () => {
    expect(buildRaceCard(NAMED_KUSKAR, createRng(99))).toEqual(
      buildRaceCard(NAMED_KUSKAR, createRng(99)),
    );
    expect(buildRaceCard(NAMED_KUSKAR, createRng(99))).not.toEqual(
      buildRaceCard(NAMED_KUSKAR, createRng(100)),
    );
  });

  it("race card has distance and conditions", () => {
    const card = buildRaceCard(NAMED_KUSKAR, createRng(5));
    expect(card.dist).toMatch(/\d m/);
    expect(card.cond).toBeTruthy();
  });
});

describe("content rules", () => {
  it("SUBST nouns are in definite form (-en, -et, -an)", () => {
    for (const s of SUBST) expect(s, s).toMatch(/(n|t)$/);
  });

  it("every named kusk has a title and seven notes", () => {
    for (const k of NAMED_KUSKAR) {
      expect(k.title).toBeTruthy();
      expect(k.notes, k.name).toHaveLength(7);
    }
  });
});
