import { useState } from 'react'

function AddInline({ label, onAdd, onAdded }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!value.trim()) return
    setBusy(true)
    const created = await onAdd(value.trim())
    setBusy(false)
    if (created) {
      onAdded(created)
      setValue('')
      setOpen(false)
    }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-xs text-green-600 hover:underline -mt-2 block">
        + Add a new {label}
      </button>
    )
  }

  return (
    <div className="flex gap-2 -mt-2">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { e.preventDefault(); submit() }
          if (e.key === 'Escape') setOpen(false)
        }}
        placeholder={`New ${label} name`}
        className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
      />
      <button type="button" onClick={submit} disabled={busy}
        className="px-4 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm disabled:opacity-60">
        Add
      </button>
      <button type="button" onClick={() => setOpen(false)} className="px-2 text-sm text-gray-500">Cancel</button>
    </div>
  )
}

export default AddInline