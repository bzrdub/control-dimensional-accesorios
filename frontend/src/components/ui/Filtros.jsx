import CampoFecha from './CampoFecha.jsx'
import { CLASE_FILTRO } from './estilos.js'

// Piezas de la barra de filtros del registro (global y por accesorio).

export function Filtro({ etiqueta, children, className = '' }) {
  return (
    <label className={`flex flex-col gap-0.5 text-[11px] font-semibold text-slate-600 ${className}`}>
      {etiqueta}
      {children}
    </label>
  )
}

/** Rango de fechas del reporte (ISO 'aaaa-mm-dd' o ''). */
export function FiltroFechas({ desde, hasta, onDesde, onHasta }) {
  return (
    <>
      <Filtro etiqueta="Fecha desde" className="w-32">
        <CampoFecha value={desde} max={hasta || undefined} onChange={onDesde} className={CLASE_FILTRO} />
      </Filtro>
      <Filtro etiqueta="Fecha hasta" className="w-32">
        <CampoFecha value={hasta} onChange={onHasta} className={CLASE_FILTRO} />
      </Filtro>
    </>
  )
}

/** Contenedor: filtros + contador + "Limpiar filtros". */
export function BarraFiltros({ children, activos, total, cargando, onLimpiar }) {
  return (
    <div role="search" className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm">
      {children}
      <div className="ml-auto flex items-center gap-3 self-center pt-3 text-xs text-slate-600">
        <span aria-live="polite">{cargando ? 'Buscando…' : `${total} ${total === 1 ? 'resultado' : 'resultados'}`}</span>
        <button
          type="button"
          onClick={onLimpiar}
          disabled={!activos}
          className="rounded border border-slate-300 px-2 py-1 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  )
}
