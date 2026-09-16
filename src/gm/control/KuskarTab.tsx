// Named kuskar (Simon's friends): who gets drawn into new fields and what is said about them.
import { useState } from 'react'
import type { KuskRow } from '../../lib/types'
import { GM_KUSKAR } from '../../shared/content/gm'
import { Button, cx, Modal, toast } from '../../ui'
import { Field, TextArea, TextInput } from './form'
import { useGmAction } from '../gmAuth'
import { parseNotes } from '../parse'

type Editing = { kusk: KuskRow | null } | null

export function KuskarTab({ kusks, onChange }: { kusks: readonly KuskRow[] | undefined; onChange: () => void }) {
  const [editing, setEditing] = useState<Editing>(null)

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 className="font-display text-2xl font-black text-plate uppercase">{GM_KUSKAR.title}</h2>
        <span className="text-sm text-ink-dim">{GM_KUSKAR.hint}</span>
        <span className="flex-1" />
        <Button onClick={() => setEditing({ kusk: null })}>{GM_KUSKAR.new}</Button>
      </div>

      {kusks && kusks.length === 0 && <p className="text-ink-dim">{GM_KUSKAR.empty}</p>}
      <ul className="flex flex-col gap-2">
        {kusks?.map((k) => (
          <li
            key={k.id}
            className={cx('flex items-center gap-4 rounded-xl bg-tote/60 px-5 py-4 ring-1 ring-white/10 ring-inset', !k.active && 'opacity-55')}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="flex items-center gap-3">
                <span className="truncate font-extrabold">{k.name}</span>
                <span
                  className={cx(
                    'shrink-0 rounded-full px-3 py-0.5 text-base font-bold uppercase',
                    k.active ? 'bg-cash/20 text-cash' : 'bg-void text-ink',
                  )}
                >
                  {k.active ? GM_KUSKAR.active : GM_KUSKAR.inactive}
                </span>
              </span>
              <span className="text-xl text-ink-dim">{GM_KUSKAR.notesCount(k.notes.length)}</span>
              {k.notes[0] && <span className="truncate text-lg text-ink-dim/80 italic">{k.notes[0]}</span>}
            </div>
            <Button variant="ghost" onClick={() => setEditing({ kusk: k })}>
              {GM_KUSKAR.edit}
            </Button>
          </li>
        ))}
      </ul>

      {editing && (
        <EditKusk
          key={editing.kusk?.id ?? 'new'}
          kusk={editing.kusk}
          onClose={() => setEditing(null)}
          onChange={onChange}
        />
      )}
    </div>
  )
}

function EditKusk({ kusk, onClose, onChange }: { kusk: KuskRow | null; onClose: () => void; onChange: () => void }) {
  const { run, busy } = useGmAction()
  const [name, setName] = useState(kusk?.name ?? '')
  const [notes, setNotes] = useState(kusk?.notes.join('\n') ?? '')
  const [active, setActive] = useState(kusk?.active ?? true)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const noteCount = parseNotes(notes).length

  const save = async () => {
    const row = await run((gm, pw) =>
      // The epithet is not shown anywhere any more; keep what the kusk had.
      gm.upsertKusk(pw, { id: kusk?.id ?? null, name, title: kusk?.title ?? '', notes: parseNotes(notes), active }),
    )
    if (!row) return
    toast({ text: GM_KUSKAR.saved(row.name) })
    onChange()
    onClose()
  }

  const remove = async () => {
    if (!kusk || !(await run(async (gm, pw) => (await gm.deleteKusk(pw, kusk.id), true)))) return
    toast({ text: GM_KUSKAR.deleted(kusk.name) })
    onChange()
    onClose()
  }

  return (
    <>
      <Modal
        open
        onClose={onClose}
        title={kusk ? kusk.name : GM_KUSKAR.new}
        className="w-[min(52rem,calc(100vw-2rem))]"
        actions={
          <>
            {kusk && (
              <Button variant="danger" disabled={busy} onClick={() => setConfirmDelete(true)}>
                {GM_KUSKAR.delete}
              </Button>
            )}
            <span className="flex-1" />
            <Button variant="ghost" onClick={onClose}>
              {GM_KUSKAR.cancel}
            </Button>
            <Button type="submit" form="kusk-form" loading={busy}>
              {GM_KUSKAR.save}
            </Button>
          </>
        }
      >
        <form
          id="kusk-form"
          className="flex flex-col gap-5"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
        >
          <Field label={GM_KUSKAR.nameLabel}>
            <TextInput maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={GM_KUSKAR.notesLabel} hint={GM_KUSKAR.notesHint(noteCount)}>
            <TextArea rows={8} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <button
            type="button"
            role="switch"
            aria-checked={active}
            onClick={() => setActive(!active)}
            className="flex items-center gap-4 self-start rounded-xl py-2 text-2xl font-bold"
          >
            <span className={cx('relative h-10 w-18 rounded-full transition-colors', active ? 'bg-cash' : 'bg-void')}>
              <span
                className={cx(
                  'absolute top-1 left-1 size-8 rounded-full bg-white transition-transform',
                  active && 'translate-x-8',
                )}
              />
            </span>
            {GM_KUSKAR.activeLabel}
          </button>
        </form>
      </Modal>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        tone="danger"
        title={kusk ? GM_KUSKAR.deleteConfirmTitle(kusk.name) : ''}
        actions={
          <>
            <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
              {GM_KUSKAR.cancel}
            </Button>
            <Button variant="danger" loading={busy} onClick={() => void remove()}>
              {GM_KUSKAR.deleteConfirmOk}
            </Button>
          </>
        }
      >
        <p className="text-xl">{GM_KUSKAR.deleteConfirmText}</p>
      </Modal>
    </>
  )
}
