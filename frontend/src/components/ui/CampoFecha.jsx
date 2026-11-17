import { useRef, useState } from 'react'
import { isoATexto, mascaraFecha, textoAISO } from '../../domain/fechas.js'

// Fecha en formato chileno dd-mm-aaaa, independiente del idioma del navegador (el <input type="date">
// nativo muestra mm/dd/aaaa en sistemas en inglés). El botón abre el calendario nativo.
// `value` y `onChange` usan ISO 'aaaa-mm-dd'; mientras la fecha esté incompleta o no exista, onChange('').
export default function CampoFecha({ value, onChange, max, className = '', ...props }) {
  const [texto, setTexto] = useState(() => isoATexto(value))
  const [ultimo, setUltimo] = useState(value)
  const calendario = useRef(null)

  // Si el valor cambia desde fuera (p. ej. eligiendo en el calendario), se refleja en el texto.
  if (value !== ultimo) {
    setUltimo(value)
    if (value && value !== textoAISO(texto)) setTexto(isoATexto(value))
  }

  const escribir = (e) => {
    const t = mascaraFecha(e.target.value)
    setTexto(t)
    const iso = textoAISO(t)
    setUltimo(iso)
    onChange(iso)
  }

  const abrirCalendario = () => {
    const el = calendario.current
    if (!el) return
    try {
      el.showPicker()
    } catch {
      el.focus() // navegadores sin showPicker()
    }
  }

  return (
    <span className="relative inline-flex items-stretch">
      <input
        {...props}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="dd-mm-aaaa"
        maxLength={10}
        value={texto}
        onChange={escribir}
        className={`${className} pr-9 tabular-nums`}
      />
      <button
        type="button"
        onClick={abrirCalendario}
        aria-label="Abrir calendario"
        title="Abrir calendario"
        className="absolute inset-y-0 right-0 flex w-8 items-center justify-center text-slate-500 hover:text-slate-900"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
        </svg>
      </button>
      {/* Selector nativo oculto: solo aporta el calendario. */}
      <input
        ref={calendario}
        type="date"
        tabIndex={-1}
        aria-hidden="true"
        value={value || ''}
        max={max}
        onChange={(e) => {
          setTexto(isoATexto(e.target.value))
          setUltimo(e.target.value)
          onChange(e.target.value)
        }}
        className="pointer-events-none absolute bottom-0 right-0 h-0 w-0 opacity-0"
      />
    </span>
  )
}
