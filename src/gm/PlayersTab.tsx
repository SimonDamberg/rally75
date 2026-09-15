// Player management: balances, debt, adjust, rename, delete, and the night reset.
import { useState } from 'react'
import type { PlayerRow } from '../lib/types'
import { GM_PLAYERS } from '../shared/content/gm'
import { MAX_NAME_LENGTH } from '../shared/game/economy'
import { fmtInt, fmtRm, playerLabel } from '../shared/game/format'
import { Button, cx, Modal, toast } from '../ui'
import { Field, TextInput } from './form'
import { useGmAction } from './gmAuth'
import { parseDelta } from './parse'

const QUICK = [-500, -100, -50, 50, 100, 500]

export function PlayersTab({ players, onReset }: { players: readonly PlayerRow[] | undefined; onReset: () => void }) {
  const { run, busy } = useGmAction()
  const [editId, setEditId] = useState<string | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const sorted = players ? [...players].sort((a, b) => b.balance - a.balance || a.name.localeCompare(b.name, 'sv')) : []
  const editing = players?.find((p) => p.id === editId) ?? null

  const reset = async () => {
    if (!(await run(async (gm, pw) => (await gm.resetNight(pw), true)))) return
    setConfirmReset(false)
    toast({ text: GM_PLAYERS.resetDone })
    onReset()
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center gap-4">
        <h2 className="font-display text-tv-md font-black text-plate uppercase">{GM_PLAYERS.title}</h2>
        {players && <span className="text-2xl text-ink-dim">{GM_PLAYERS.count(players.length)}</span>}
        <span className="flex-1" />
        <Button variant="danger" onClick={() => setConfirmReset(true)}>
          {GM_PLAYERS.reset}
        </Button>
      </div>

      {players && players.length === 0 && <p className="text-tv-sm text-ink-dim">{GM_PLAYERS.empty}</p>}
      {sorted.length > 0 && (
        <table className="w-full text-left text-2xl">
          <thead className="text-lg tracking-[0.12em] text-ink-dim uppercase">
            <tr>
              <th className="w-full py-2 pl-4 font-bold" />
              <th className="py-2 pl-6 text-right font-bold whitespace-nowrap">{GM_PLAYERS.balance}</th>
              <th className="py-2 pl-6 text-right font-bold whitespace-nowrap">{GM_PLAYERS.debt}</th>
              <th className="py-2 pl-6 text-right font-bold whitespace-nowrap">{GM_PLAYERS.loans}</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.id} className="border-t border-white/10">
                <td className="max-w-0 truncate py-2 pl-4 font-bold">{playerLabel(p.name, p.tag)}</td>
                <td className="py-2 pl-6 text-right whitespace-nowrap font-display font-black text-plate tabular-nums">{fmtRm(p.balance)}</td>
                <td className={cx('py-2 pl-6 text-right whitespace-nowrap tabular-nums', p.debt > 0 ? 'text-drift' : 'text-ink-dim')}>{fmtRm(p.debt)}</td>
                <td className="py-2 pl-6 text-right whitespace-nowrap text-ink-dim tabular-nums">{fmtInt(p.loans_taken)}</td>
                <td className="py-2 pr-2 pl-4 text-right">
                  <Button variant="ghost" onClick={() => setEditId(p.id)}>
                    {GM_PLAYERS.edit}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && <EditPlayer key={editing.id} player={editing} onClose={() => setEditId(null)} />}

      <Modal
        open={confirmReset}
        onClose={() => setConfirmReset(false)}
        tone="danger"
        title={GM_PLAYERS.resetConfirmTitle}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmReset(false)}>
              {GM_PLAYERS.cancel}
            </Button>
            <Button variant="danger" loading={busy} onClick={() => void reset()}>
              {GM_PLAYERS.resetConfirmOk}
            </Button>
          </>
        }
      >
        <p className="text-xl">{GM_PLAYERS.resetConfirmText}</p>
      </Modal>
    </div>
  )
}

function EditPlayer({ player, onClose }: { player: PlayerRow; onClose: () => void }) {
  const { run, busy } = useGmAction()
  const [amount, setAmount] = useState('')
  const [amountError, setAmountError] = useState(false)
  const [name, setName] = useState(player.name)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const label = playerLabel(player.name, player.tag)

  const adjust = async (delta: number) => {
    const row = await run((gm, pw) => gm.adjustBalance(pw, player.id, delta))
    if (!row) return
    setAmount('')
    toast({ text: GM_PLAYERS.adjusted(playerLabel(row.name, row.tag), fmtRm(row.balance)) })
  }

  const applyAmount = () => {
    const delta = parseDelta(amount)
    setAmountError(delta === null)
    if (delta !== null) void adjust(delta)
  }

  const rename = async () => {
    const row = await run((gm, pw) => gm.renamePlayer(pw, player.id, name))
    if (row) toast({ text: GM_PLAYERS.renamed(playerLabel(row.name, row.tag)) })
  }

  const remove = async () => {
    if (!(await run(async (gm, pw) => (await gm.deletePlayer(pw, player.id), true)))) return
    toast({ text: GM_PLAYERS.deleted(label) })
    onClose()
  }

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={label}
        className="w-[min(46rem,calc(100vw-2rem))]"
        actions={
          <>
            <Button variant="danger" disabled={busy} onClick={() => setConfirmDelete(true)}>
              {GM_PLAYERS.delete}
            </Button>
            <span className="flex-1" />
            <Button variant="ghost" onClick={onClose}>
              {GM_PLAYERS.close}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-6">
          <p className="flex flex-wrap items-baseline gap-x-6 text-2xl">
            <span>
              {GM_PLAYERS.balance} <b className="font-display text-4xl font-black text-plate tabular-nums">{fmtRm(player.balance)}</b>
            </span>
            <span className={player.debt > 0 ? 'text-drift' : 'text-ink-dim'}>
              {GM_PLAYERS.debt} <b className="tabular-nums">{fmtRm(player.debt)}</b>
            </span>
          </p>

          <div className="flex flex-col gap-3">
            <span className="text-lg font-bold tracking-[0.12em] text-ink-dim uppercase">{GM_PLAYERS.adjustLabel}</span>
            <div className="grid grid-cols-6 gap-2">
              {QUICK.map((d) => (
                <Button
                  key={d}
                  variant={d < 0 ? 'ghost' : 'primary'}
                  disabled={busy || player.balance + d < 0}
                  className="px-2"
                  onClick={() => void adjust(d)}
                >
                  {d > 0 ? `+${d}` : `−${-d}`}
                </Button>
              ))}
            </div>
            <form
              className="flex gap-3"
              onSubmit={(e) => {
                e.preventDefault()
                applyAmount()
              }}
            >
              <TextInput
                inputMode="text"
                placeholder={GM_PLAYERS.adjustPlaceholder}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                aria-invalid={amountError || undefined}
              />
              <Button type="submit" loading={busy}>
                {GM_PLAYERS.adjustApply}
              </Button>
            </form>
            {amountError && <p className="text-xl text-drift">{GM_PLAYERS.adjustInvalid}</p>}
          </div>

          <form
            className="flex items-end gap-3"
            onSubmit={(e) => {
              e.preventDefault()
              void rename()
            }}
          >
            <div className="flex-1">
              <Field label={GM_PLAYERS.renameLabel}>
                <TextInput maxLength={MAX_NAME_LENGTH} value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
            </div>
            <Button type="submit" variant="ghost" loading={busy} disabled={name.trim() === player.name}>
              {GM_PLAYERS.renameApply}
            </Button>
          </form>
        </div>
      </Modal>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        tone="danger"
        title={GM_PLAYERS.deleteConfirmTitle(label)}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              {GM_PLAYERS.cancel}
            </Button>
            <Button variant="danger" loading={busy} onClick={() => void remove()}>
              {GM_PLAYERS.deleteConfirmOk}
            </Button>
          </>
        }
      >
        <p className="text-xl">{GM_PLAYERS.deleteConfirmText}</p>
      </Modal>
    </>
  )
}
