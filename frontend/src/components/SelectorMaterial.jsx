import { MATERIALES } from '../config/materiales.js'
import Paso from './ui/Paso.jsx'

export default function SelectorMaterial({ value, onChange }) {
  return (
    <Paso numero={1} titulo="Material">
      <div className="grid gap-3 sm:grid-cols-3">
        {MATERIALES.map((m) => {
          const selected = value === m.id
          return (
            <button
              key={m.id}
              type="button"
              disabled={!m.active}
              aria-pressed={selected}
              onClick={() => onChange(m.id)}
              className={[
                'rounded-lg border p-4 text-left transition',
                selected
                  ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600'
                  : 'border-slate-300 bg-white hover:border-blue-400',
                !m.active && 'cursor-not-allowed opacity-50 hover:border-slate-300',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-slate-900">{m.nombre}</span>
                {!m.active && (
                  <span className="rounded bg-slate-200 px-2 py-0.5 text-xs text-slate-600">Próximamente</span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">{m.descripcion}</p>
            </button>
          )
        })}
      </div>
    </Paso>
  )
}
