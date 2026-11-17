import { useEffect, useId, useRef } from 'react'

// Ventana modal con barra de título (equivalente a los UserForm del VBA).
// Escape cierra solo si `onCerrar` existe; el contenido decide si pide confirmación.
export default function Modal({ titulo, onCerrar, ancho = 'max-w-xl', children }) {
  const idTitulo = useId()
  const panel = useRef(null)
  // Última versión de onCerrar sin re-ejecutar el efecto: los padres suelen pasar una función nueva en
  // cada render, y re-ejecutarlo devolvía el foco al primer campo con cada tecla.
  const cerrarRef = useRef(onCerrar)
  useEffect(() => {
    cerrarRef.current = onCerrar
  })

  // Solo al abrir: foco inicial, Escape y bloqueo del scroll de fondo.
  useEffect(() => {
    panel.current?.querySelector('input, select, textarea, button:not([data-cerrar])')?.focus()
    const alTeclear = (e) => e.key === 'Escape' && cerrarRef.current?.()
    document.addEventListener('keydown', alTeclear)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', alTeclear)
      document.body.style.overflow = overflow
    }
  }, [])

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-2 sm:p-6">
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        className={`my-auto w-full ${ancho} rounded-lg border border-slate-300 bg-slate-50 shadow-2xl`}
      >
        <div className="flex items-center justify-between rounded-t-lg border-b border-slate-200 bg-white px-4 py-2">
          <h2 id={idTitulo} className="text-sm font-medium text-slate-600">
            {titulo}
          </h2>
          {onCerrar && (
            <button
              type="button"
              data-cerrar
              onClick={onCerrar}
              aria-label="Cerrar"
              className="rounded px-2 text-xl leading-none text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              ×
            </button>
          )}
        </div>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  )
}
