// End-to-end check of the Supabase backend through the public API, as a guest device and the GM.
// WIPES all players, bets and races (gm_reset_night) at start and end, hence --reset.
//
//   npm run smoke -- --reset
//
// Env (from the shell or .env.local): VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, GM_PASSWORD.
// SMOKE_SUPABASE_URL / SMOKE_SUPABASE_KEY / SMOKE_GM_PASSWORD override them (local stack).
import assert from "node:assert/strict";
import WebSocket from "ws";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createSupabase } from "../src/lib/client";
import { createApi } from "../src/lib/api";
import { RallyError } from "../src/lib/errors";
import type { BetRow, Identity, RaceCardInput } from "../src/lib/types";
import type { ErrorCode } from "../src/shared/content/errors";
import {
  buildField,
  buildRaceCard,
  FIELD_SIZE,
} from "../src/shared/game/field";
import {
  computeOdds,
  payoutFor,
  poolsFromBets,
  roundOdds,
} from "../src/shared/game/odds";
import { createRng } from "../src/shared/game/rng";
import {
  COUPON_MAX_AMOUNT,
  COUPON_MAX_BATCH,
  COUPON_TIERS,
  LOAN_AMOUNT,
  LOAN_DEBT,
  LOAN_THRESHOLD,
  MIN_STAKE,
  netWorth,
  PRIZE_CARD_COOLDOWN_S,
  PRIZE_CARD_TIERS,
  WELCOME_BONUS,
} from "../src/shared/game/economy";
import {
  PLINKO_MAX_STAKE,
  PLINKO_ROWS,
  plinkoPayout,
  slotOf,
} from "../src/shared/game/plinko";
import type { KuskInput } from "../src/shared/game/types";

if (!process.argv.includes("--reset")) {
  console.error(
    "smoke: this wipes all players, bets and races. Run with --reset to confirm.",
  );
  process.exit(2);
}
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local: rely on the shell env.
}

const url = process.env.SMOKE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key =
  process.env.SMOKE_SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const pw = process.env.SMOKE_GM_PASSWORD || process.env.GM_PASSWORD;
if (!url || !key || !pw) {
  console.error(
    "smoke: missing Supabase URL, key or GM password (see the header of scripts/smoke.ts).",
  );
  process.exit(2);
}

const db: SupabaseClient = createSupabase(url, key, {
  realtime: { transport: WebSocket as never },
});
const api = createApi(db);
const gm = api.gm;

// Helpers ------------------------------------------------------------------------------------

async function step(name: string, fn: () => Promise<void>) {
  const t0 = Date.now();
  try {
    await fn();
    console.log(`PASS  ${name} (${Date.now() - t0} ms)`);
  } catch (err) {
    console.log(`FAIL  ${name}`);
    console.error(err);
    await db.removeAllChannels();
    process.exit(1);
  }
}

async function expectCode(promise: Promise<unknown>, code: ErrorCode) {
  try {
    await promise;
  } catch (err) {
    assert.ok(
      err instanceof RallyError,
      `expected RallyError(${code}), got ${String(err)}`,
    );
    assert.equal(err.code, code);
    return;
  }
  assert.fail(`expected error ${code}, but the call succeeded`);
}

async function waitFor(label: string, check: () => boolean, timeoutMs = 10000) {
  const until = Date.now() + timeoutMs;
  while (!check()) {
    if (Date.now() > until) assert.fail(`timed out waiting for ${label}`);
    await new Promise((r) => setTimeout(r, 50));
  }
}

async function balanceOf(id: Identity) {
  const p = await api.getPlayer(id.playerId);
  assert.ok(p, "player exists");
  return p.balance;
}

let kusks: KuskInput[] = [];
let seedCounter = 1000;
function newCard(): RaceCardInput {
  const seed = seedCounter++;
  const card = buildRaceCard(kusks, createRng(seed));
  return {
    horses: card.horses,
    stats: card.stats,
    seed,
    dist: card.dist,
    cond: card.cond,
  };
}

async function newPlayer(name: string): Promise<Identity> {
  const p = await api.createPlayer(name);
  return { playerId: p.id, token: p.token };
}

/** Places a bet and checks the captured odds against the TS model over the bets so far. */
async function betChecked(
  card: RaceCardInput,
  raceId: string,
  placed: BetRow[],
  who: Identity,
  horseN: number,
  stake: number,
) {
  const idx = card.horses.findIndex((h) => h.n === horseN);
  const expected = roundOdds(
    computeOdds(card.horses, poolsFromBets(card.horses, placed))[idx],
  );
  const bet = await api.placeBet(who, raceId, horseN, stake);
  assert.equal(
    bet.odds,
    expected,
    `odds for horse ${horseN} after ${placed.length} bets`,
  );
  assert.equal(bet.status, "open");
  assert.equal(bet.payout, null);
  placed.push(bet);
  return bet;
}

/** Creates a race and opens betting. */
async function openRace() {
  const card = newCard();
  const race = await gm.createRace(pw!, card);
  await gm.setStatus(pw!, race.id, "betting");
  return { card, race };
}

async function runToEnd(raceId: string) {
  await gm.setStatus(pw!, raceId, "closed");
  await gm.setStatus(pw!, raceId, "running");
}

// Steps --------------------------------------------------------------------------------------

console.log(`smoke: ${new URL(url).host}`);

let anna: Identity, bo: Identity, cia: Identity;
const initialKuskCount = { n: 0 };

await step("gm auth and reset", async () => {
  assert.equal(await gm.login(pw), true);
  await expectCode(gm.login("fel-lösenord"), "gm_unauthorized");
  await gm.resetNight(pw);
  assert.equal(await api.getActiveRace(), null);
  assert.deepEqual(await api.getPlayers(), []);
  const rows = await api.getKusks();
  assert.ok(rows.length >= 2, "at least two kuskar seeded");
  initialKuskCount.n = rows.length;
  kusks = rows.map((k) => ({
    name: k.name,
    title: k.title,
    notes: k.notes,
  }));
});

await step("create players", async () => {
  anna = await newPlayer("  Smoke   Anna ");
  bo = await newPlayer("Smoke Bo");
  cia = await newPlayer("Smoke Cia");
  const p = await api.getPlayer(anna.playerId);
  assert.ok(p);
  assert.equal(p.name, "Smoke Anna");
  assert.equal(p.balance, WELCOME_BONUS);
  assert.ok(p.tag >= 10 && p.tag <= 99);
  await expectCode(api.createPlayer("   "), "name_empty");
  await expectCode(api.createPlayer("x".repeat(25)), "name_too_long");
});

await step("RLS: anon cannot write tables or read secrets", async () => {
  const ins = await db
    .from("players")
    .insert({ name: "Hack", tag: 11, balance: 999999 });
  assert.ok(ins.error, "insert players must fail");
  await db.from("players").update({ balance: 999999 }).eq("id", anna.playerId);
  await db.from("players").delete().eq("id", anna.playerId);
  assert.equal(
    await balanceOf(anna),
    WELCOME_BONUS,
    "balance unchanged after update/delete attempts",
  );
  const bet = await db.from("bets").insert({
    player_id: anna.playerId,
    race_id: anna.playerId,
    horse_n: 1,
    stake: 10,
    odds: 2,
  });
  assert.ok(bet.error, "insert bets must fail");
  await db.from("game_state").update({ active_race_id: null }).eq("id", true);
  const item = await db
    .from("shop_items")
    .insert({ name: "Gratis öl", price: 0 });
  assert.ok(item.error, "insert shop_items must fail");
  const buy = await db
    .from("purchases")
    .insert({ player_id: anna.playerId, item_name: "Öl", kind: "physical", price: 0 });
  assert.ok(buy.error, "insert purchases must fail");
  const shelfBefore = (await api.getShopItems()).length;
  await db.from("shop_items").update({ price: 1 }).neq("name", "");
  await db.from("shop_items").delete().neq("name", "");
  const shelfAfter = await api.getShopItems();
  assert.equal(shelfAfter.length, shelfBefore, "shop_items unchanged");
  assert.ok(
    shelfAfter.every((i) => i.price !== 1),
    "shop_items prices unchanged",
  );
  await db.from("kusks").delete().neq("name", "");
  assert.equal(
    (await api.getKusks()).length,
    initialKuskCount.n,
    "kusks unchanged",
  );
  const coupon = await db
    .from("coupons")
    .insert({ tier: 3, amount: 5000, batch: anna.playerId });
  assert.ok(coupon.error, "insert coupons must fail");
  const couponsBefore = (await api.getCoupons()).length;
  await db.from("coupons").update({ redeemed_at: null }).neq("amount", 0);
  await db.from("coupons").delete().neq("amount", 0);
  assert.equal(
    (await api.getCoupons()).length,
    couponsBefore,
    "coupons unchanged",
  );
  const drop = await db.from("plinko_drops").insert({
    player_id: anna.playerId,
    stake: 10,
    path: 0,
    slot: 0,
    m10: 1000,
    payout: 100000,
    balance_after: 100000,
  });
  assert.ok(drop.error, "insert plinko_drops must fail");
  const card = await db.from("prize_cards").insert({ tier: 3, amount: 1000 });
  assert.ok(card.error, "insert prize_cards must fail");
  const claim = await db.from("prize_claims").insert({
    player_id: anna.playerId,
    tier: 3,
    amount: 1000,
    label: "",
  });
  assert.ok(claim.error, "insert prize_claims must fail");
  const secret = await db
    .from("prize_card_secrets")
    .insert({ code: "ZZZZZZZZ", card_id: anna.playerId });
  assert.ok(secret.error, "insert prize_card_secrets must fail");
  for (const table of [
    "player_secrets",
    "race_secrets",
    "gm_auth",
    // The whole kupong security model: the printed codes must be unreadable from a browser.
    "coupon_secrets",
    // And the vinstkort codes, for the same reason.
    "prize_card_secrets",
  ]) {
    const res = await db.from(table).select("*");
    assert.ok(
      res.error || (res.data ?? []).length === 0,
      `${table} must not be readable`,
    );
  }
  const priv = await db
    .schema("private")
    .rpc("compute_odds", { p_base: [2, 3], p_pools: [0, 0] });
  assert.ok(priv.error, "private schema must not be callable");
});

await step("SQL/TS odds parity (400 markets)", async () => {
  const markets: { base: number[]; pools: number[] }[] = [];
  for (let i = 0; i < 400; i++) {
    const r = createRng(i + 1);
    const { horses } = buildField(FIELD_SIZE, kusks, r);
    const scale = [0, 50, 500, 5000, 100000][i % 5];
    const pools = horses.map(() => (r.int(3) === 0 ? 0 : r.int(scale + 1)));
    markets.push({ base: horses.map((h) => h.baseOdds), pools });
  }
  markets.push({
    base: [1.5, 60, 60, 60, 60, 60],
    pools: [100000, 0, 0, 0, 0, 0],
  });
  markets.push({
    base: [3.77, 3.77, 3.77, 3.77, 3.77, 3.77],
    pools: [0, 0, 0, 0, 0, 0],
  });
  for (let i = 0; i < markets.length; i += 40) {
    const chunk = markets.slice(i, i + 40);
    const results = await Promise.all(
      chunk.map((m) => api.computeOdds(m.base, m.pools)),
    );
    chunk.forEach((m, j) => {
      const expected = computeOdds(
        m.base.map((baseOdds) => ({ baseOdds })),
        m.pools,
      ).map(roundOdds);
      assert.deepEqual(
        results[j],
        expected,
        `market ${i + j}: base ${m.base} pools ${m.pools}`,
      );
    });
  }
});

let raceNoStart = 0;

await step("race lifecycle with ruling none", async () => {
  let card = newCard();
  const race = await gm.createRace(pw, card);
  raceNoStart = race.race_no;
  assert.equal(race.status, "paddock");
  assert.equal((await api.getActiveRace())?.id, race.id);
  await expectCode(api.placeBet(anna, race.id, 1, 10), "race_not_betting");

  card = newCard();
  const rerolled = await gm.rerollRace(pw, race.id, card);
  assert.deepEqual(rerolled.field, card.horses);
  const secrets = await gm.getSecrets(pw, race.id);
  assert.equal(secrets.seed, card.seed);
  assert.deepEqual(secrets.stats, card.stats);

  await expectCode(gm.setStatus(pw, race.id, "running"), "invalid_transition");
  await expectCode(gm.setStatus(pw, race.id, "finished"), "invalid_transition");
  await gm.setStatus(pw, race.id, "betting");
  await expectCode(gm.rerollRace(pw, race.id, newCard()), "race_not_paddock");

  // Realtime: bets INSERTs must reach an anon subscriber.
  const seen = new Set<string>();
  let subscribed = false;
  const channel = db
    .channel("smoke-bets")
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "bets" },
      (payload) => {
        seen.add(String((payload.new as { id: string }).id));
      },
    )
    // postgres_changes only start flowing after this system event (later than SUBSCRIBED).
    .on("system", {}, (payload: { extension?: string; status?: string }) => {
      if (payload.extension === "postgres_changes" && payload.status === "ok")
        subscribed = true;
    })
    .subscribe();
  await waitFor("realtime subscription", () => subscribed);

  const [h1, h2, h3] = card.horses.map((h) => h.n);
  const placed: BetRow[] = [];
  await betChecked(card, race.id, placed, anna, h1, 100);
  await betChecked(card, race.id, placed, bo, h1, 250);
  await betChecked(card, race.id, placed, cia, h2, 50);
  await betChecked(card, race.id, placed, anna, h3, MIN_STAKE);
  await betChecked(card, race.id, placed, bo, h2, 25);

  await expectCode(
    api.placeBet(anna, race.id, h1, MIN_STAKE - 1),
    "stake_too_low",
  );
  await expectCode(
    api.placeBet(cia, race.id, h1, 5000),
    "insufficient_balance",
  );
  await expectCode(
    api.placeBet({ ...anna, token: bo.token }, race.id, h1, 10),
    "invalid_token",
  );
  await expectCode(api.placeBet(anna, race.id, 99, 10), "horse_not_found");
  await expectCode(
    api.placeBet({ playerId: race.id, token: anna.token }, race.id, h1, 10),
    "player_not_found",
  );

  assert.equal(await balanceOf(anna), WELCOME_BONUS - 110);
  assert.equal(await balanceOf(bo), WELCOME_BONUS - 275);
  assert.equal(await balanceOf(cia), WELCOME_BONUS - 50);
  await waitFor("5 realtime bet inserts", () =>
    placed.every((b) => seen.has(b.id)),
  );
  await db.removeChannel(channel);

  await gm.setStatus(pw, race.id, "closed");
  await expectCode(api.placeBet(anna, race.id, h1, 10), "race_not_betting");
  await gm.setStatus(pw, race.id, "betting");
  await gm.setStatus(pw, race.id, "closed");
  const order = card.horses.map((h) => h.n);
  await expectCode(
    gm.publishResult(pw, race.id, order, "none", null),
    "race_not_running",
  );
  await gm.setStatus(pw, race.id, "running");
  await expectCode(gm.createRace(pw, newCard()), "race_in_progress");
  await expectCode(
    gm.publishResult(pw, race.id, [h1, h1, ...order.slice(2)], "none", null),
    "invalid_order",
  );
  await expectCode(
    gm.publishResult(pw, race.id, order.slice(1), "none", null),
    "invalid_order",
  );
  await expectCode(
    gm.publishResult(pw, race.id, order, "fusk" as never, null),
    "invalid_ruling",
  );
  await expectCode(
    gm.publishResult("fel", race.id, order, "none", null),
    "gm_unauthorized",
  );

  const done = await gm.publishResult(pw, race.id, order, "none", null);
  assert.equal(done.status, "finished");
  assert.deepEqual(done.result, {
    order,
    original_order: order,
    ruling: "none",
    inquiry_text: null,
  });

  const [a1, b1, , a3] = placed;
  assert.equal(
    await balanceOf(anna),
    WELCOME_BONUS - 110 + payoutFor(100, a1.odds),
  );
  assert.equal(
    await balanceOf(bo),
    WELCOME_BONUS - 275 + payoutFor(250, b1.odds),
  );
  assert.equal(await balanceOf(cia), WELCOME_BONUS - 50);
  const bets = await api.getRaceBets(race.id);
  for (const b of bets) {
    if (b.horse_n === h1) {
      assert.equal(b.status, "won");
      assert.equal(b.payout, payoutFor(b.stake, b.odds));
    } else {
      assert.equal(b.status, "lost");
      assert.equal(b.payout, 0);
    }
  }
  assert.equal(bets.find((b) => b.id === a3.id)?.status, "lost");
  await expectCode(api.placeBet(anna, race.id, h1, 10), "race_not_betting");
  await expectCode(
    gm.publishResult(pw, race.id, order, "none", null),
    "race_not_running",
  );
});

await step(
  "ruling pay_new_winner: winner demoted, second place pays",
  async () => {
    const { card, race } = await openRace();
    assert.equal(race.race_no, raceNoStart + 1);
    const order = card.horses.map((h) => h.n).reverse();
    const [first, second] = order;
    const before = { anna: await balanceOf(anna), bo: await balanceOf(bo) };
    const placed: BetRow[] = [];
    await betChecked(card, race.id, placed, anna, first, 100);
    const boBet = await betChecked(card, race.id, placed, bo, second, 40);
    await runToEnd(race.id);
    const done = await gm.publishResult(
      pw,
      race.id,
      order,
      "pay_new_winner",
      "Galopp i mål",
    );
    assert.equal(done.status, "finished");
    assert.deepEqual(done.result, {
      order: [...order.slice(1), first],
      original_order: order,
      ruling: "pay_new_winner",
      inquiry_text: "Galopp i mål",
    });
    assert.equal(await balanceOf(anna), before.anna - 100);
    assert.equal(
      await balanceOf(bo),
      before.bo - 40 + payoutFor(40, boBet.odds),
    );
  },
);

await step("ruling void: house keeps the stakes", async () => {
  const { card, race } = await openRace();
  const order = card.horses.map((h) => h.n);
  const before = { anna: await balanceOf(anna), bo: await balanceOf(bo) };
  const placed: BetRow[] = [];
  await betChecked(card, race.id, placed, anna, order[0], 60);
  await betChecked(card, race.id, placed, bo, order[1], 20);
  await runToEnd(race.id);
  const done = await gm.publishResult(
    pw,
    race.id,
    order,
    "void",
    "Startbilen körde fel",
  );
  assert.equal(done.status, "void");
  assert.equal(done.result?.ruling, "void");
  assert.equal(await balanceOf(anna), before.anna - 60);
  assert.equal(await balanceOf(bo), before.bo - 20);
  for (const b of await api.getRaceBets(race.id)) {
    assert.equal(b.status, "void");
    assert.equal(b.payout, 0);
  }
});

await step("ruling dismiss: original result stands", async () => {
  const { card, race } = await openRace();
  const order = card.horses.map((h) => h.n);
  const before = await balanceOf(cia);
  const placed: BetRow[] = [];
  const bet = await betChecked(card, race.id, placed, cia, order[0], 30);
  await runToEnd(race.id);
  const done = await gm.publishResult(
    pw,
    race.id,
    order,
    "dismiss",
    "Protest från Palm",
  );
  assert.equal(done.status, "finished");
  assert.deepEqual(done.result?.order, order);
  assert.equal(await balanceOf(cia), before - 30 + payoutFor(30, bet.odds));
});

await step("gm_set_status void: stakes refunded", async () => {
  const { card, race } = await openRace();
  const before = { anna: await balanceOf(anna), bo: await balanceOf(bo) };
  const placed: BetRow[] = [];
  await betChecked(card, race.id, placed, anna, card.horses[2].n, 70);
  await betChecked(card, race.id, placed, bo, card.horses[3].n, 15);
  const voided = await gm.setStatus(pw, race.id, "void");
  assert.equal(voided.status, "void");
  assert.equal(voided.result, null);
  assert.equal(await balanceOf(anna), before.anna);
  assert.equal(await balanceOf(bo), before.bo);
  for (const b of await api.getRaceBets(race.id)) {
    assert.equal(b.status, "void");
    assert.equal(b.payout, b.stake);
  }
  await expectCode(gm.setStatus(pw, race.id, "betting"), "invalid_transition");
  await expectCode(gm.setStatus(pw, race.id, "void"), "invalid_transition");
});

await step("server_now tracks the database clock", async () => {
  const sent = Date.now();
  const server = await api.serverNow();
  const received = Date.now();
  assert.ok(Number.isFinite(server), "server_now parses as a timestamp");
  // The laptop and the database are both NTP-synced; allow a wide band so this never flakes.
  const offset = server - (sent + received) / 2;
  assert.ok(
    Math.abs(offset) < 60_000,
    `clock offset ${offset} ms is implausible`,
  );
});

await step("gm_skip_race moves started_at back", async () => {
  const { card, race } = await openRace();
  await expectCode(gm.skipRace(pw, race.id, 20_000), "race_not_running");

  await gm.setStatus(pw, race.id, "closed");
  const running = await gm.setStatus(pw, race.id, "running");
  assert.ok(running.started_at, "running stamps started_at");

  await expectCode(gm.skipRace(pw, race.id, -1), "bad_run_ms");
  await expectCode(gm.skipRace("fel", race.id, 20_000), "gm_unauthorized");

  const RUN_MS = 20_000;
  const skipped = await gm.skipRace(pw, race.id, RUN_MS);
  const moved =
    Date.parse(running.started_at!) - Date.parse(skipped.started_at!);
  // The skip drags the start back by the run length, plus whatever time the calls took.
  assert.ok(
    moved >= RUN_MS - 1000,
    `started_at moved back ${moved} ms, expected about ${RUN_MS}`,
  );
  assert.ok(
    moved < RUN_MS + 10_000,
    `started_at moved back ${moved} ms, far more than expected`,
  );
  assert.equal(skipped.status, "running");

  // A skipped race still settles normally.
  const order = card.horses.map((h) => h.n);
  const done = await gm.publishResult(pw, race.id, order, "none", null);
  assert.equal(done.status, "finished");
});

await step("night_paid matches the winning payouts", async () => {
  const bets = await Promise.all(
    (await api.getRaces()).map((r) => api.getRaceBets(r.id)),
  );
  const expected = bets
    .flat()
    .reduce((sum, b) => (b.status === "won" ? sum + (b.payout ?? 0) : sum), 0);
  assert.equal(await api.getNightPaid(), expected);
});

await step("paddock race is replaced by gm_create_race", async () => {
  const first = await gm.createRace(pw, newCard());
  const second = await gm.createRace(pw, newCard());
  assert.equal(second.race_no, first.race_no);
  assert.equal(await api.getRace(first.id), null);
  assert.equal((await api.getActiveRace())?.id, second.id);
});

await step("Snabblån and balance adjustments", async () => {
  await expectCode(api.takeLoan(cia), "loan_not_allowed");
  // Exactly LOAN_THRESHOLD is still too rich for a loan.
  await gm.adjustBalance(pw, cia.playerId, LOAN_THRESHOLD - (await balanceOf(cia)));
  await expectCode(api.takeLoan(cia), "loan_not_allowed");
  // One below it is broke enough (a fresh player, so Cia's numbers stay as later steps expect).
  const nastan = await newPlayer("Smoke Nästan");
  await gm.adjustBalance(pw, nastan.playerId, LOAN_THRESHOLD - 1 - WELCOME_BONUS);
  const nearly = await api.takeLoan(nastan);
  assert.equal(nearly.balance, LOAN_THRESHOLD - 1 + LOAN_AMOUNT);
  const balance = await balanceOf(cia);
  await expectCode(
    gm.adjustBalance(pw, cia.playerId, -balance - 1),
    "balance_negative",
  );
  const broke = await gm.adjustBalance(pw, cia.playerId, -balance);
  assert.equal(broke.balance, 0);
  await expectCode(
    api.takeLoan({ ...cia, token: anna.token }),
    "invalid_token",
  );
  const loaned = await api.takeLoan(cia);
  assert.equal(loaned.balance, LOAN_AMOUNT);
  assert.equal(loaned.debt, LOAN_DEBT);
  assert.equal(loaned.loans_taken, 1);
  await expectCode(api.takeLoan(cia), "loan_not_allowed");
  const back = await gm.adjustBalance(pw, cia.playerId, 250);
  assert.equal(back.balance, LOAN_AMOUNT + 250);
  await expectCode(gm.adjustBalance("fel", cia.playerId, 1), "gm_unauthorized");
});

await step("paying the debt back", async () => {
  // Cia is left by the previous step holding LOAN_AMOUNT + 250 with a debt of LOAN_DEBT.
  const before = (await api.getPlayer(cia.playerId))!;
  assert.equal(before.debt, LOAN_DEBT);

  await expectCode(api.repayDebt(cia, 0), "bad_amount");
  await expectCode(api.repayDebt(cia, -100), "bad_amount");
  await expectCode(api.repayDebt({ ...cia, token: bo.token }, 100), "invalid_token");
  // Over the balance, which is the lower of balance and debt here.
  await expectCode(api.repayDebt(cia, before.balance + 1), "repay_too_large");

  const partly = await api.repayDebt(cia, 250);
  assert.equal(partly.balance, before.balance - 250);
  assert.equal(partly.debt, LOAN_DEBT - 250);
  // The whole point: the same amount comes off both, so no leaderboard moves.
  assert.equal(netWorth(partly), netWorth(before));
  assert.equal(partly.loans_taken, 1);

  // Clearing the rest needs the money first; the debt outruns one loan by design.
  await gm.adjustBalance(pw, cia.playerId, LOAN_DEBT);
  const clear = await api.repayDebt(cia, partly.debt);
  assert.equal(clear.debt, 0);
  assert.equal(clear.balance, partly.balance + LOAN_DEBT - partly.debt);
  assert.equal(netWorth(clear), netWorth(partly) + LOAN_DEBT);
  await expectCode(api.repayDebt(cia, 100), "no_debt");
});

await step("gm player management", async () => {
  const renamed = await gm.renamePlayer(pw, bo.playerId, "  Nytt   Namn ");
  assert.equal(renamed.name, "Nytt Namn");
  await expectCode(gm.renamePlayer(pw, bo.playerId, ""), "name_empty");
  assert.ok((await api.getPlayerBets(anna.playerId)).length > 0);
  await gm.deletePlayer(pw, anna.playerId);
  assert.equal(await api.getPlayer(anna.playerId), null);
  assert.deepEqual(await api.getPlayerBets(anna.playerId), []);
  await expectCode(gm.deletePlayer(pw, anna.playerId), "player_not_found");
  await expectCode(api.takeLoan(anna), "player_not_found");
});

await step("gm kusk management", async () => {
  const created = await gm.upsertKusk(pw, {
    id: null,
    name: " Smokey ",
    title: "testkusk",
    notes: ["Rad ett."],
    active: true,
  });
  assert.equal(created.name, "Smokey");
  const updated = await gm.upsertKusk(pw, {
    ...created,
    title: "ny titel",
    notes: ["A", "B"],
    active: false,
  });
  assert.equal(updated.id, created.id);
  assert.deepEqual(updated.notes, ["A", "B"]);
  assert.equal(updated.active, false);
  await expectCode(gm.upsertKusk(pw, { ...created, name: " " }), "name_empty");
  await gm.deleteKusk(pw, created.id);
  await expectCode(gm.deleteKusk(pw, created.id), "kusk_not_found");
  await expectCode(gm.upsertKusk(pw, { ...created }), "kusk_not_found");
  assert.equal((await api.getKusks()).length, initialKuskCount.n);
});

await step("butiken", async () => {
  // Own players: the gm player management step above deletes the ones from the top of the run.
  const rik = await newPlayer("Smoke Rik");
  const fattig = await newPlayer("Smoke Fattig");
  const shelf = await api.getShopItems();
  assert.ok(shelf.length > 0, "the seed catalogue must be on the shelves");

  // A private shelf for this run, so the seeded catalogue is left as Simon will find it.
  const beer = await gm.upsertShopItem(pw, {
    id: null,
    name: "Smoke Öl",
    blurb: "Kall.",
    price: 300,
    stock: 1,
    kind: "physical",
    effect: "none",
    effect_value: "",
    sort: 900,
    active: true,
  });
  const crown = await gm.upsertShopItem(pw, {
    id: null,
    name: "Smoke Krona",
    blurb: "",
    price: 100,
    stock: null,
    kind: "digital",
    effect: "badge",
    effect_value: "👑",
    sort: 901,
    active: true,
  });
  const shelved = await gm.upsertShopItem(pw, {
    id: null,
    name: "Smoke Ur sortimentet",
    blurb: "",
    price: 10,
    stock: null,
    kind: "physical",
    effect: "none",
    effect_value: "",
    sort: 902,
    active: false,
  });

  await expectCode(api.buyItem(rik, crypto.randomUUID()), "item_not_found");
  await expectCode(api.buyItem(rik, shelved.id), "item_inactive");
  await expectCode(
    api.buyItem({ ...rik, token: fattig.token }, beer.id),
    "invalid_token",
  );

  const before = (await api.getPlayer(rik.playerId))!;
  const purchase = await api.buyItem(rik, beer.id);
  assert.equal(purchase.price, 300);
  assert.equal(purchase.item_name, "Smoke Öl");
  const after = (await api.getPlayer(rik.playerId))!;
  assert.equal(after.balance, before.balance - 300);
  assert.equal(after.spent, before.spent + 300);
  // The whole point of the Butik: drinking cannot cost you a place on the Topplista.
  assert.equal(netWorth(after), netWorth(before));

  const soldOut = (await api.getShopItems()).find((i) => i.id === beer.id)!;
  assert.equal(soldOut.stock, 0);
  await expectCode(api.buyItem(fattig, beer.id), "out_of_stock");

  // Cosmetics are the only thing a digital item may do.
  const crowned = await api.buyItem(rik, crown.id);
  assert.equal(crowned.kind, "digital");
  assert.equal((await api.getPlayer(rik.playerId))!.badge, "👑");

  const mine = await api.getPlayerPurchases(rik.playerId);
  assert.equal(mine.length, 2, "both receipts are the buyer's");
  assert.ok(
    (await api.getPurchases()).some((p) => p.id === purchase.id),
    "the purchase shows up in the GM feed",
  );

  // Too poor: a fresh player cannot reach a price above the welcome bonus.
  const pricey = await gm.upsertShopItem(pw, { ...beer, stock: 5, price: WELCOME_BONUS + 1 });
  await expectCode(api.buyItem(fattig, pricey.id), "insufficient_balance");

  // Ångra puts the RM, the shelf and the receipt back where they were.
  const refunded = await gm.refundPurchase(pw, purchase.id);
  assert.equal(refunded.id, purchase.id);
  const undone = (await api.getPlayer(rik.playerId))!;
  assert.equal(undone.balance, after.balance + 300 - 100);
  assert.equal(undone.spent, after.spent + 100 - 300);
  assert.equal(undone.badge, "👑", "a granted badge survives the refund");
  assert.equal(
    (await api.getShopItems()).find((i) => i.id === beer.id)!.stock,
    6,
    "the refund restocks the shelf",
  );
  await expectCode(gm.refundPurchase(pw, purchase.id), "purchase_not_found");

  for (const id of [beer.id, crown.id, shelved.id]) await gm.deleteShopItem(pw, id);
  assert.equal((await api.getShopItems()).length, shelf.length);
});

await step("gm butik management", async () => {
  const before = (await api.getShopItems()).length;
  const created = await gm.upsertShopItem(pw, {
    id: null,
    name: "  Smoke Vara  ",
    blurb: "  Text.  ",
    price: 250,
    stock: 3,
    kind: "physical",
    effect: "none",
    effect_value: "",
    sort: 950,
    active: true,
  });
  assert.equal(created.name, "Smoke Vara");
  assert.equal(created.blurb, "Text.");

  const updated = await gm.upsertShopItem(pw, {
    ...created,
    price: 400,
    stock: null,
    active: false,
  });
  assert.equal(updated.id, created.id);
  assert.equal(updated.price, 400);
  assert.equal(updated.stock, null, "an empty lager means obegränsat");
  assert.equal(updated.active, false);

  await expectCode(gm.upsertShopItem(pw, { ...created, name: " " }), "name_empty");
  await expectCode(gm.upsertShopItem(pw, { ...created, price: -1 }), "bad_price");
  await expectCode(gm.upsertShopItem(pw, { ...created, stock: -1 }), "bad_stock");
  await expectCode(
    gm.upsertShopItem(pw, { ...created, kind: "liquid" as never }),
    "bad_kind",
  );
  await expectCode(
    gm.upsertShopItem(pw, { ...created, effect: "money" as never }),
    "bad_effect",
  );
  await expectCode(
    gm.upsertShopItem("fel lösenord", { ...created }),
    "gm_unauthorized",
  );

  await gm.deleteShopItem(pw, created.id);
  await expectCode(gm.deleteShopItem(pw, created.id), "item_not_found");
  await expectCode(gm.upsertShopItem(pw, { ...created }), "item_not_found");
  assert.equal((await api.getShopItems()).length, before);
});

await step("kuponger", async () => {
  // Own players and own print run, so the step is independent of what came before it.
  const vinnare = await newPlayer("Smoke Vinnare");
  const tjuv = await newPlayer("Smoke Tjuv");
  const before = (await api.getCoupons()).length;

  await expectCode(gm.createCoupons(pw!, 4, 250, "Dart", 1), "bad_tier");
  await expectCode(
    gm.createCoupons(pw!, 1, COUPON_MAX_AMOUNT + 1, "Dart", 1),
    "coupon_amount",
  );
  await expectCode(
    gm.createCoupons(pw!, 1, 250, "Dart", COUPON_MAX_BATCH + 1),
    "bad_count",
  );
  await expectCode(gm.createCoupons("fel", 1, 250, "Dart", 1), "gm_unauthorized");

  const tier = COUPON_TIERS[2];
  const made = await gm.createCoupons(pw!, tier.tier, tier.amount, "Smoke Dart", 3);
  assert.equal(made.coupons.length, 3, "three kuponger minted");
  assert.equal(new Set(made.coupons.map((c) => c.code)).size, 3, "codes are unique");
  for (const c of made.coupons) {
    assert.match(
      c.code,
      /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$/,
      `code ${c.code} must be 8 Crockford base32 characters`,
    );
  }
  assert.equal((await api.getCoupons()).length, before + 3);

  await expectCode(api.redeemCoupon(vinnare, "ZZZZZZZZ"), "coupon_not_found");
  await expectCode(api.redeemCoupon(vinnare, ""), "coupon_not_found");
  await expectCode(
    api.redeemCoupon({ ...vinnare, token: tjuv.token }, made.coupons[0].code),
    "invalid_token",
  );

  // The happy path, typed the way a guest would off a printed card: lowercase, with the dash.
  const paid = await api.getPlayer(vinnare.playerId);
  const code = made.coupons[0].code;
  const typed = `${code.slice(0, 4)}-${code.slice(4)}`.toLowerCase();
  const claimed = await api.redeemCoupon(vinnare, typed);
  assert.equal(claimed.amount, tier.amount);
  assert.equal(claimed.tier, tier.tier);
  assert.equal(claimed.label, "Smoke Dart");
  assert.equal(claimed.redeemed_by, vinnare.playerId);
  assert.ok(claimed.redeemed_at, "a redeemed kupong is stamped");
  const after = (await api.getPlayer(vinnare.playerId))!;
  assert.equal(after.balance, paid!.balance + tier.amount);
  assert.equal(after.spent, paid!.spent, "a kupong is not Butik spending");
  assert.equal(after.debt, paid!.debt);
  // Unlike a purchase or a repayment, kupong RM is meant to move you up the Topplista.
  assert.equal(netWorth(after), netWorth(paid!) + tier.amount);

  // One ticket, one claim: not by the same guest, not by the next one to find the code.
  await expectCode(api.redeemCoupon(vinnare, code), "coupon_used");
  await expectCode(api.redeemCoupon(tjuv, typed), "coupon_used");
  assert.equal(
    (await api.getPlayer(tjuv.playerId))!.balance,
    WELCOME_BONUS,
    "the second scanner gets nothing",
  );

  // Reprinting a lost sheet gives back exactly the same codes.
  const again = await gm.batchCodes(pw!, made.batch);
  assert.deepEqual(
    again.coupons.map((c) => c.code).sort(),
    made.coupons.map((c) => c.code).sort(),
    "a reprint is the same print run",
  );
  await expectCode(gm.batchCodes(pw!, crypto.randomUUID()), "coupon_batch_not_found");

  // Ångra: the RM comes back off the balance and the ticket is claimable again, by someone else.
  const freed = await gm.voidClaim(pw!, claimed.id);
  assert.equal(freed.redeemed_at, null);
  assert.equal(freed.redeemed_by, null);
  assert.equal(
    (await api.getPlayer(vinnare.playerId))!.balance,
    paid!.balance,
    "voiding a claim takes the RM back",
  );
  await expectCode(gm.voidClaim(pw!, claimed.id), "coupon_not_redeemed");
  await expectCode(gm.voidClaim(pw!, crypto.randomUUID()), "coupon_not_found");
  const reclaimed = await api.redeemCoupon(tjuv, code);
  assert.equal(reclaimed.redeemed_by, tjuv.playerId, "a freed ticket works again");

  // Deleting the run takes the codes with it (coupon_secrets cascades).
  assert.equal(await gm.deleteCouponBatch(pw!, made.batch), 3);
  await expectCode(
    gm.deleteCouponBatch(pw!, made.batch),
    "coupon_batch_not_found",
  );
  assert.equal((await api.getCoupons()).length, before);
  await expectCode(api.redeemCoupon(vinnare, made.coupons[1].code), "coupon_not_found");
});

await step("vinstkort", async () => {
  const vinnare = await newPlayer("Smoke Kortvinnare");
  const tvaan = await newPlayer("Smoke Tvåan");
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  await expectCode(gm.createPrizeCard(pw!, 4, "Dart"), "bad_card_tier");
  await expectCode(gm.createPrizeCard("fel", 1, "Dart"), "gm_unauthorized");

  const tier = PRIZE_CARD_TIERS[2];
  const made = await gm.createPrizeCard(pw!, tier.tier, "Smoke Dart");
  assert.match(made.code, /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{8}$/, "a card code is 8 Crockford characters");
  const row = (await api.getPrizeCards()).find((c) => c.id === made.id);
  assert.ok(row, "the card is public");
  assert.equal(row.amount, tier.amount, "the tier fixes the value");
  assert.equal(row.active, true);
  assert.ok(!("code" in row), "the public row carries no code");
  assert.deepEqual(await gm.prizeCardCode(pw!, made.id), made, "reprint gives the same code");

  await expectCode(api.claimPrizeCard(vinnare, "ZZZZZZZZ"), "card_not_found");
  await expectCode(api.claimPrizeCard(vinnare, ""), "card_not_found");
  await expectCode(
    api.claimPrizeCard({ ...vinnare, token: tvaan.token }, made.code),
    "invalid_token",
  );

  const before = (await api.getPlayer(vinnare.playerId))!;
  const first = await api.claimPrizeCard(vinnare, made.code);
  assert.equal(first.amount, tier.amount);
  assert.equal(first.card_id, made.id);
  assert.equal(first.player_id, vinnare.playerId);
  assert.equal(first.label, "Smoke Dart");
  const after = (await api.getPlayer(vinnare.playerId))!;
  assert.equal(after.balance, before.balance + tier.amount);
  assert.equal(netWorth(after), netWorth(before) + tier.amount, "a vinstkort lifts the Topplista");

  // A double scan of one flash: refused, and nothing paid.
  await expectCode(api.claimPrizeCard(vinnare, made.code), "card_cooldown");
  assert.equal(await balanceOf(vinnare), after.balance);
  // The cooldown is per guest: the next winner scans the same card straight away.
  await api.claimPrizeCard(tvaan, made.code);
  assert.equal(await balanceOf(tvaan), WELCOME_BONUS + tier.amount);

  // Reusable: after the cooldown, the same guest wins again off the same card.
  await sleep(PRIZE_CARD_COOLDOWN_S * 1000 + 300);
  await api.claimPrizeCard(vinnare, made.code);
  assert.equal(await balanceOf(vinnare), after.balance + tier.amount);

  // Pausa.
  const paused = await gm.setPrizeCardActive(pw!, made.id, false);
  assert.equal(paused.active, false);
  await expectCode(api.claimPrizeCard(tvaan, made.code), "card_inactive");
  await gm.setPrizeCardActive(pw!, made.id, true);

  // Ny kod: every photo of the old code is dead.
  const rotated = await gm.rotatePrizeCard(pw!, made.id);
  assert.notEqual(rotated.code, made.code);
  await sleep(PRIZE_CARD_COOLDOWN_S * 1000 + 300);
  await expectCode(api.claimPrizeCard(tvaan, made.code), "card_not_found");
  const viaNew = await api.claimPrizeCard(tvaan, rotated.code);
  assert.equal(await balanceOf(tvaan), WELCOME_BONUS + 2 * tier.amount);

  // Ångra takes the RM back and the claim leaves the feed.
  await gm.voidPrizeClaim(pw!, viaNew.id);
  assert.equal(await balanceOf(tvaan), WELCOME_BONUS + tier.amount);
  assert.ok(!(await api.getPrizeClaims()).some((c) => c.id === viaNew.id));
  await expectCode(gm.voidPrizeClaim(pw!, viaNew.id), "prize_claim_not_found");

  // Deleting the card kills the code but keeps tonight's payouts in the feed.
  await gm.deletePrizeCard(pw!, made.id);
  await expectCode(gm.deletePrizeCard(pw!, made.id), "card_not_found");
  await expectCode(gm.prizeCardCode(pw!, made.id), "card_not_found");
  await expectCode(gm.rotatePrizeCard(pw!, made.id), "card_not_found");
  await sleep(PRIZE_CARD_COOLDOWN_S * 1000 + 300);
  await expectCode(api.claimPrizeCard(vinnare, rotated.code), "card_not_found");
  const kept = (await api.getPrizeClaims()).filter((c) => c.label === "Smoke Dart");
  assert.equal(kept.length, 3, "claims survive their card");
  assert.ok(kept.every((c) => c.card_id === null));
});

await step("plånko", async () => {
  const kula = await newPlayer("Smoke Kula");
  const other = await newPlayer("Smoke Annan");
  await expectCode(api.plinkoDrop({ ...kula, token: other.token }, 10), "invalid_token");
  await expectCode(api.plinkoDrop(kula, MIN_STAKE - 1), "stake_too_low");
  await expectCode(api.plinkoDrop(kula, PLINKO_MAX_STAKE + 1), "stake_too_high");

  let balance = await balanceOf(kula);
  let staked = 0;
  let paid = 0;
  for (let i = 0; i < 50; i++) {
    const stake = [10, 25, 50][i % 3];
    if (balance < stake) break;
    const row = await api.plinkoDrop(kula, stake);
    assert.equal(row.player_id, kula.playerId);
    assert.equal(row.stake, stake);
    assert.ok(row.path >= 0 && row.path < 1 << PLINKO_ROWS, "path is 12 bits");
    assert.equal(row.slot, slotOf(row.path), "slot is the number of rights");
    assert.equal(row.payout, plinkoPayout(stake, row.slot), "SQL payout matches TS");
    balance = balance - stake + row.payout;
    assert.equal(row.balance_after, balance, "balance_after tracks the balance");
    staked += stake;
    paid += row.payout;
  }
  assert.equal(await balanceOf(kula), WELCOME_BONUS - staked + paid, "balance moved by stakes and payouts only");
  const mine = await api.getPlayerPlinkoDrops(kula.playerId);
  assert.equal(mine.reduce((sum, d) => sum + d.payout, 0), paid);
  assert.ok((await api.getPlinkoDrops()).length >= mine.length);

  // Broke: drain what is left with a stake the balance cannot cover.
  const current = await balanceOf(kula);
  await gm.adjustBalance(pw, kula.playerId, -current + 5);
  await expectCode(api.plinkoDrop(kula, 10), "insufficient_balance");
});

await step("reset night", async () => {
  await gm.resetNight(pw);
  assert.equal(await api.getActiveRace(), null);
  assert.deepEqual(await api.getPlayers(), []);
  assert.deepEqual(await api.getRaces(), []);
  assert.equal((await api.getKusks()).length, initialKuskCount.n);
  // The catalogue survives the night reset (like kuskar); receipts cascade off the players.
  assert.ok((await api.getShopItems()).length > 0);
  assert.deepEqual(await api.getPurchases(), []);
  // Plånko drops cascade off the players too.
  assert.deepEqual(await api.getPlinkoDrops(), []);
  // So do vinstkort claims.
  assert.deepEqual(await api.getPrizeClaims(), []);
});

await db.removeAllChannels();
console.log("smoke: all steps passed");
process.exit(0);
