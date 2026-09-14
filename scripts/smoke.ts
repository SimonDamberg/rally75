// End-to-end check of the Supabase backend through the public API, as a guest device and the GM.
// WIPES all players, bets and races (gm_reset_night) at start and end, hence --reset.
//
//   npm run smoke -- --reset
//
// Env (from the shell or .env.local): VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, GM_PASSWORD.
// SMOKE_SUPABASE_URL / SMOKE_SUPABASE_KEY / SMOKE_GM_PASSWORD override them (local stack).
import assert from 'node:assert/strict'
import WebSocket from 'ws'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createSupabase } from '../src/lib/client'
import { createApi } from '../src/lib/api'
import { RallyError } from '../src/lib/errors'
import type { BetRow, Identity, RaceCardInput } from '../src/lib/types'
import type { ErrorCode } from '../src/shared/content/errors'
import { buildField, buildRaceCard } from '../src/shared/game/field'
import { computeOdds, payoutFor, poolsFromBets, roundOdds } from '../src/shared/game/odds'
import { createRng } from '../src/shared/game/rng'
import { LOAN_AMOUNT, LOAN_DEBT, MIN_STAKE, WELCOME_BONUS } from '../src/shared/game/economy'
import type { KuskInput } from '../src/shared/game/types'

if (!process.argv.includes('--reset')) {
  console.error('smoke: this wipes all players, bets and races. Run with --reset to confirm.')
  process.exit(2)
}
try {
  process.loadEnvFile('.env.local')
} catch {
  // No .env.local: rely on the shell env.
}

const url = process.env.SMOKE_SUPABASE_URL || process.env.VITE_SUPABASE_URL
const key = process.env.SMOKE_SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY
const pw = process.env.SMOKE_GM_PASSWORD || process.env.GM_PASSWORD
if (!url || !key || !pw) {
  console.error('smoke: missing Supabase URL, key or GM password (see the header of scripts/smoke.ts).')
  process.exit(2)
}

const db: SupabaseClient = createSupabase(url, key, {
  realtime: { transport: WebSocket as never },
})
const api = createApi(db)
const gm = api.gm

// Helpers ------------------------------------------------------------------------------------

async function step(name: string, fn: () => Promise<void>) {
  const t0 = Date.now()
  try {
    await fn()
    console.log(`PASS  ${name} (${Date.now() - t0} ms)`)
  } catch (err) {
    console.log(`FAIL  ${name}`)
    console.error(err)
    await db.removeAllChannels()
    process.exit(1)
  }
}

async function expectCode(promise: Promise<unknown>, code: ErrorCode) {
  try {
    await promise
  } catch (err) {
    assert.ok(err instanceof RallyError, `expected RallyError(${code}), got ${String(err)}`)
    assert.equal(err.code, code)
    return
  }
  assert.fail(`expected error ${code}, but the call succeeded`)
}

async function waitFor(label: string, check: () => boolean, timeoutMs = 10000) {
  const until = Date.now() + timeoutMs
  while (!check()) {
    if (Date.now() > until) assert.fail(`timed out waiting for ${label}`)
    await new Promise((r) => setTimeout(r, 50))
  }
}

async function balanceOf(id: Identity) {
  const p = await api.getPlayer(id.playerId)
  assert.ok(p, 'player exists')
  return p.balance
}

let kusks: KuskInput[] = []
let seedCounter = 1000
function newCard(): RaceCardInput {
  const seed = seedCounter++
  const card = buildRaceCard(kusks, createRng(seed))
  return { horses: card.horses, stats: card.stats, seed, dist: card.dist, cond: card.cond }
}

async function newPlayer(name: string): Promise<Identity> {
  const p = await api.createPlayer(name)
  return { playerId: p.id, token: p.token }
}

/** Places a bet and checks the captured odds against the TS model over the bets so far. */
async function betChecked(card: RaceCardInput, raceId: string, placed: BetRow[], who: Identity, horseN: number, stake: number) {
  const idx = card.horses.findIndex((h) => h.n === horseN)
  const expected = roundOdds(computeOdds(card.horses, poolsFromBets(card.horses, placed))[idx])
  const bet = await api.placeBet(who, raceId, horseN, stake)
  assert.equal(bet.odds, expected, `odds for horse ${horseN} after ${placed.length} bets`)
  assert.equal(bet.status, 'open')
  assert.equal(bet.payout, null)
  placed.push(bet)
  return bet
}

/** Creates a race and opens betting. */
async function openRace() {
  const card = newCard()
  const race = await gm.createRace(pw!, card)
  await gm.setStatus(pw!, race.id, 'betting')
  return { card, race }
}

async function runToEnd(raceId: string) {
  await gm.setStatus(pw!, raceId, 'closed')
  await gm.setStatus(pw!, raceId, 'running')
}

// Steps --------------------------------------------------------------------------------------

console.log(`smoke: ${new URL(url).host}`)

let anna: Identity, bo: Identity, cia: Identity
const initialKuskCount = { n: 0 }

await step('gm auth and reset', async () => {
  assert.equal(await gm.login(pw), true)
  await expectCode(gm.login('fel-lösenord'), 'gm_unauthorized')
  await gm.resetNight(pw)
  assert.equal(await api.getActiveRace(), null)
  assert.deepEqual(await api.getPlayers(), [])
  const rows = await api.getKusks()
  assert.ok(rows.length >= 2, 'at least two kuskar seeded')
  initialKuskCount.n = rows.length
  kusks = rows.map((k) => ({ name: k.name, title: k.title, notes: k.notes }))
})

await step('create players', async () => {
  anna = await newPlayer('  Smoke   Anna ')
  bo = await newPlayer('Smoke Bo')
  cia = await newPlayer('Smoke Cia')
  const p = await api.getPlayer(anna.playerId)
  assert.ok(p)
  assert.equal(p.name, 'Smoke Anna')
  assert.equal(p.balance, WELCOME_BONUS)
  assert.ok(p.tag >= 10 && p.tag <= 99)
  await expectCode(api.createPlayer('   '), 'name_empty')
  await expectCode(api.createPlayer('x'.repeat(25)), 'name_too_long')
})

await step('RLS: anon cannot write tables or read secrets', async () => {
  const ins = await db.from('players').insert({ name: 'Hack', tag: 11, balance: 999999 })
  assert.ok(ins.error, 'insert players must fail')
  await db.from('players').update({ balance: 999999 }).eq('id', anna.playerId)
  await db.from('players').delete().eq('id', anna.playerId)
  assert.equal(await balanceOf(anna), WELCOME_BONUS, 'balance unchanged after update/delete attempts')
  const bet = await db.from('bets').insert({ player_id: anna.playerId, race_id: anna.playerId, horse_n: 1, stake: 10, odds: 2 })
  assert.ok(bet.error, 'insert bets must fail')
  await db.from('game_state').update({ active_race_id: null }).eq('id', true)
  await db.from('kusks').delete().neq('name', '')
  assert.equal((await api.getKusks()).length, initialKuskCount.n, 'kusks unchanged')
  for (const table of ['player_secrets', 'race_secrets', 'gm_auth']) {
    const res = await db.from(table).select('*')
    assert.ok(res.error || (res.data ?? []).length === 0, `${table} must not be readable`)
  }
  const priv = await db.schema('private').rpc('compute_odds', { p_base: [2, 3], p_pools: [0, 0] })
  assert.ok(priv.error, 'private schema must not be callable')
})

await step('SQL/TS odds parity (400 markets)', async () => {
  const markets: { base: number[]; pools: number[] }[] = []
  for (let i = 0; i < 400; i++) {
    const r = createRng(i + 1)
    const { horses } = buildField(6, kusks, r)
    const scale = [0, 50, 500, 5000, 100000][i % 5]
    const pools = horses.map(() => (r.int(3) === 0 ? 0 : r.int(scale + 1)))
    markets.push({ base: horses.map((h) => h.baseOdds), pools })
  }
  markets.push({ base: [1.5, 60, 60, 60, 60, 60], pools: [100000, 0, 0, 0, 0, 0] })
  markets.push({ base: [3.77, 3.77, 3.77, 3.77, 3.77, 3.77], pools: [0, 0, 0, 0, 0, 0] })
  for (let i = 0; i < markets.length; i += 40) {
    const chunk = markets.slice(i, i + 40)
    const results = await Promise.all(chunk.map((m) => api.computeOdds(m.base, m.pools)))
    chunk.forEach((m, j) => {
      const expected = computeOdds(m.base.map((baseOdds) => ({ baseOdds })), m.pools).map(roundOdds)
      assert.deepEqual(results[j], expected, `market ${i + j}: base ${m.base} pools ${m.pools}`)
    })
  }
})

let raceNoStart = 0

await step('race lifecycle with ruling none', async () => {
  let card = newCard()
  const race = await gm.createRace(pw, card)
  raceNoStart = race.race_no
  assert.equal(race.status, 'paddock')
  assert.equal((await api.getActiveRace())?.id, race.id)
  await expectCode(api.placeBet(anna, race.id, 1, 10), 'race_not_betting')

  card = newCard()
  const rerolled = await gm.rerollRace(pw, race.id, card)
  assert.deepEqual(rerolled.field, card.horses)
  const secrets = await gm.getSecrets(pw, race.id)
  assert.equal(secrets.seed, card.seed)
  assert.deepEqual(secrets.stats, card.stats)

  await expectCode(gm.setStatus(pw, race.id, 'running'), 'invalid_transition')
  await expectCode(gm.setStatus(pw, race.id, 'finished'), 'invalid_transition')
  await gm.setStatus(pw, race.id, 'betting')
  await expectCode(gm.rerollRace(pw, race.id, newCard()), 'race_not_paddock')

  // Realtime: bets INSERTs must reach an anon subscriber.
  const seen = new Set<string>()
  let subscribed = false
  const channel = db
    .channel('smoke-bets')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bets' }, (payload) => {
      seen.add(String((payload.new as { id: string }).id))
    })
    // postgres_changes only start flowing after this system event (later than SUBSCRIBED).
    .on('system', {}, (payload: { extension?: string; status?: string }) => {
      if (payload.extension === 'postgres_changes' && payload.status === 'ok') subscribed = true
    })
    .subscribe()
  await waitFor('realtime subscription', () => subscribed)

  const [h1, h2, h3] = card.horses.map((h) => h.n)
  const placed: BetRow[] = []
  await betChecked(card, race.id, placed, anna, h1, 100)
  await betChecked(card, race.id, placed, bo, h1, 250)
  await betChecked(card, race.id, placed, cia, h2, 50)
  await betChecked(card, race.id, placed, anna, h3, MIN_STAKE)
  await betChecked(card, race.id, placed, bo, h2, 25)

  await expectCode(api.placeBet(anna, race.id, h1, MIN_STAKE - 1), 'stake_too_low')
  await expectCode(api.placeBet(cia, race.id, h1, 5000), 'insufficient_balance')
  await expectCode(api.placeBet({ ...anna, token: bo.token }, race.id, h1, 10), 'invalid_token')
  await expectCode(api.placeBet(anna, race.id, 99, 10), 'horse_not_found')
  await expectCode(api.placeBet({ playerId: race.id, token: anna.token }, race.id, h1, 10), 'player_not_found')

  assert.equal(await balanceOf(anna), WELCOME_BONUS - 110)
  assert.equal(await balanceOf(bo), WELCOME_BONUS - 275)
  assert.equal(await balanceOf(cia), WELCOME_BONUS - 50)
  await waitFor('5 realtime bet inserts', () => placed.every((b) => seen.has(b.id)))
  await db.removeChannel(channel)

  await gm.setStatus(pw, race.id, 'closed')
  await expectCode(api.placeBet(anna, race.id, h1, 10), 'race_not_betting')
  await gm.setStatus(pw, race.id, 'betting')
  await gm.setStatus(pw, race.id, 'closed')
  const order = card.horses.map((h) => h.n)
  await expectCode(gm.publishResult(pw, race.id, order, 'none', null), 'race_not_running')
  await gm.setStatus(pw, race.id, 'running')
  await expectCode(gm.createRace(pw, newCard()), 'race_in_progress')
  await expectCode(gm.publishResult(pw, race.id, [h1, h1, ...order.slice(2)], 'none', null), 'invalid_order')
  await expectCode(gm.publishResult(pw, race.id, order.slice(1), 'none', null), 'invalid_order')
  await expectCode(gm.publishResult(pw, race.id, order, 'fusk' as never, null), 'invalid_ruling')
  await expectCode(gm.publishResult('fel', race.id, order, 'none', null), 'gm_unauthorized')

  const done = await gm.publishResult(pw, race.id, order, 'none', null)
  assert.equal(done.status, 'finished')
  assert.deepEqual(done.result, { order, original_order: order, ruling: 'none', inquiry_text: null })

  const [a1, b1, , a3] = placed
  assert.equal(await balanceOf(anna), WELCOME_BONUS - 110 + payoutFor(100, a1.odds))
  assert.equal(await balanceOf(bo), WELCOME_BONUS - 275 + payoutFor(250, b1.odds))
  assert.equal(await balanceOf(cia), WELCOME_BONUS - 50)
  const bets = await api.getRaceBets(race.id)
  for (const b of bets) {
    if (b.horse_n === h1) {
      assert.equal(b.status, 'won')
      assert.equal(b.payout, payoutFor(b.stake, b.odds))
    } else {
      assert.equal(b.status, 'lost')
      assert.equal(b.payout, 0)
    }
  }
  assert.equal(bets.find((b) => b.id === a3.id)?.status, 'lost')
  await expectCode(api.placeBet(anna, race.id, h1, 10), 'race_not_betting')
  await expectCode(gm.publishResult(pw, race.id, order, 'none', null), 'race_not_running')
})

await step('ruling pay_new_winner: winner demoted, second place pays', async () => {
  const { card, race } = await openRace()
  assert.equal(race.race_no, raceNoStart + 1)
  const order = card.horses.map((h) => h.n).reverse()
  const [first, second] = order
  const before = { anna: await balanceOf(anna), bo: await balanceOf(bo) }
  const placed: BetRow[] = []
  await betChecked(card, race.id, placed, anna, first, 100)
  const boBet = await betChecked(card, race.id, placed, bo, second, 40)
  await runToEnd(race.id)
  const done = await gm.publishResult(pw, race.id, order, 'pay_new_winner', 'Galopp i mål')
  assert.equal(done.status, 'finished')
  assert.deepEqual(done.result, {
    order: [...order.slice(1), first],
    original_order: order,
    ruling: 'pay_new_winner',
    inquiry_text: 'Galopp i mål',
  })
  assert.equal(await balanceOf(anna), before.anna - 100)
  assert.equal(await balanceOf(bo), before.bo - 40 + payoutFor(40, boBet.odds))
})

await step('ruling void: house keeps the stakes', async () => {
  const { card, race } = await openRace()
  const order = card.horses.map((h) => h.n)
  const before = { anna: await balanceOf(anna), bo: await balanceOf(bo) }
  const placed: BetRow[] = []
  await betChecked(card, race.id, placed, anna, order[0], 60)
  await betChecked(card, race.id, placed, bo, order[1], 20)
  await runToEnd(race.id)
  const done = await gm.publishResult(pw, race.id, order, 'void', 'Startbilen körde fel')
  assert.equal(done.status, 'void')
  assert.equal(done.result?.ruling, 'void')
  assert.equal(await balanceOf(anna), before.anna - 60)
  assert.equal(await balanceOf(bo), before.bo - 20)
  for (const b of await api.getRaceBets(race.id)) {
    assert.equal(b.status, 'void')
    assert.equal(b.payout, 0)
  }
})

await step('ruling dismiss: original result stands', async () => {
  const { card, race } = await openRace()
  const order = card.horses.map((h) => h.n)
  const before = await balanceOf(cia)
  const placed: BetRow[] = []
  const bet = await betChecked(card, race.id, placed, cia, order[0], 30)
  await runToEnd(race.id)
  const done = await gm.publishResult(pw, race.id, order, 'dismiss', 'Protest från Palm')
  assert.equal(done.status, 'finished')
  assert.deepEqual(done.result?.order, order)
  assert.equal(await balanceOf(cia), before - 30 + payoutFor(30, bet.odds))
})

await step('gm_set_status void: stakes refunded', async () => {
  const { card, race } = await openRace()
  const before = { anna: await balanceOf(anna), bo: await balanceOf(bo) }
  const placed: BetRow[] = []
  await betChecked(card, race.id, placed, anna, card.horses[2].n, 70)
  await betChecked(card, race.id, placed, bo, card.horses[3].n, 15)
  const voided = await gm.setStatus(pw, race.id, 'void')
  assert.equal(voided.status, 'void')
  assert.equal(voided.result, null)
  assert.equal(await balanceOf(anna), before.anna)
  assert.equal(await balanceOf(bo), before.bo)
  for (const b of await api.getRaceBets(race.id)) {
    assert.equal(b.status, 'void')
    assert.equal(b.payout, b.stake)
  }
  await expectCode(gm.setStatus(pw, race.id, 'betting'), 'invalid_transition')
  await expectCode(gm.setStatus(pw, race.id, 'void'), 'invalid_transition')
})

await step('paddock race is replaced by gm_create_race', async () => {
  const first = await gm.createRace(pw, newCard())
  const second = await gm.createRace(pw, newCard())
  assert.equal(second.race_no, first.race_no)
  assert.equal(await api.getRace(first.id), null)
  assert.equal((await api.getActiveRace())?.id, second.id)
})

await step('Snabblån and balance adjustments', async () => {
  await expectCode(api.takeLoan(cia), 'loan_not_allowed')
  const balance = await balanceOf(cia)
  await expectCode(gm.adjustBalance(pw, cia.playerId, -balance - 1), 'balance_negative')
  const broke = await gm.adjustBalance(pw, cia.playerId, -balance)
  assert.equal(broke.balance, 0)
  await expectCode(api.takeLoan({ ...cia, token: anna.token }), 'invalid_token')
  const loaned = await api.takeLoan(cia)
  assert.equal(loaned.balance, LOAN_AMOUNT)
  assert.equal(loaned.debt, LOAN_DEBT)
  assert.equal(loaned.loans_taken, 1)
  await expectCode(api.takeLoan(cia), 'loan_not_allowed')
  const back = await gm.adjustBalance(pw, cia.playerId, 250)
  assert.equal(back.balance, LOAN_AMOUNT + 250)
  await expectCode(gm.adjustBalance('fel', cia.playerId, 1), 'gm_unauthorized')
})

await step('gm player management', async () => {
  const renamed = await gm.renamePlayer(pw, bo.playerId, '  Nytt   Namn ')
  assert.equal(renamed.name, 'Nytt Namn')
  await expectCode(gm.renamePlayer(pw, bo.playerId, ''), 'name_empty')
  assert.ok((await api.getPlayerBets(anna.playerId)).length > 0)
  await gm.deletePlayer(pw, anna.playerId)
  assert.equal(await api.getPlayer(anna.playerId), null)
  assert.deepEqual(await api.getPlayerBets(anna.playerId), [])
  await expectCode(gm.deletePlayer(pw, anna.playerId), 'player_not_found')
  await expectCode(api.takeLoan(anna), 'player_not_found')
})

await step('gm kusk management', async () => {
  const created = await gm.upsertKusk(pw, { id: null, name: ' Smokey ', title: 'testkusk', notes: ['Rad ett.'], active: true })
  assert.equal(created.name, 'Smokey')
  const updated = await gm.upsertKusk(pw, { ...created, title: 'ny titel', notes: ['A', 'B'], active: false })
  assert.equal(updated.id, created.id)
  assert.deepEqual(updated.notes, ['A', 'B'])
  assert.equal(updated.active, false)
  await expectCode(gm.upsertKusk(pw, { ...created, name: ' ' }), 'name_empty')
  await gm.deleteKusk(pw, created.id)
  await expectCode(gm.deleteKusk(pw, created.id), 'kusk_not_found')
  await expectCode(gm.upsertKusk(pw, { ...created }), 'kusk_not_found')
  assert.equal((await api.getKusks()).length, initialKuskCount.n)
})

await step('reset night', async () => {
  await gm.resetNight(pw)
  assert.equal(await api.getActiveRace(), null)
  assert.deepEqual(await api.getPlayers(), [])
  assert.deepEqual(await api.getRaces(), [])
  assert.equal((await api.getKusks()).length, initialKuskCount.n)
})

await db.removeAllChannels()
console.log('smoke: all steps passed')
process.exit(0)
