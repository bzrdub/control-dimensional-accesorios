import { useCallback, useEffect, useRef, useState } from 'react'
import IngresoAccesorio from './IngresoAccesorio.jsx'
import EnsayoPHI from './EnsayoPHI.jsx'
import MedicionesPorAccesorio from './MedicionesPorAccesorio.jsx'
import { BarraFiltros, Filtro, FiltroFechas } from './ui/Filtros.jsx'
import { CLASE_FILTRO } from './ui/estilos.js'
import { useDebounce } from '../hooks/useDebounce.js'
import { hoyISO } from '../domain/fechas.js'
import { cambiarEstadoAprobacion, getCatalogos, listarEnsayos } from '../data/ensayos.js'
import { etiquetaProducto, mensajeGuardado, n, plural } from '../domain/textos.js'
import { ESTADOS_APROBACION, estadoAprobacion, nombreFalla } from '../config/registro.js'
import { TIPOS_FUSION } from '../config/materiales.js'

// Registro global de una combinación material/fusión (como la hoja GLOBAL de CONTROL *.xlsm):
// botones INGRESAR ACCESORIO y ENSAYO PHI, y la tabla de ingresos con su PHI, aspecto y estado.

const FILTROS_VACIOS = { desde: '', hasta: '', despacho: '', inspector: '', q: '', phi: '', aprobacion: '' }

function IconoInicio() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 11l9-8 9 8M5 9.5V21h5v-6h4v6h5V9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function SelectorEstado({ ensayo, onCambiar }) {
  const actual = estadoAprobacion(ensayo.estadoAprobacion)
  return (
    <select
      value={actual.id}
      onChange={(e) => onCambiar(ensayo, e.target.value)}
      aria-label={`Estado de aprobación: ${etiquetaProducto(ensayo)}`}
      className={`w-full rounded border px-0.5 py-0.5 text-center text-[11px] font-semibold ${actual.clase}`}
    >
      {ESTADOS_APROBACION.map((e) => (
        <option key={e.id} value={e.id}>{e.nombre}</option>
      ))}
    </select>
  )
}

// Compacto y con texto en varias líneas: la tabla debe caber en el ancho de la página sin scroll horizontal.
const TH = 'border border-slate-300 px-1 py-1 font-semibold leading-tight'
const TD = 'border border-slate-200 px-1 py-0.5 leading-tight'

export default function RegistroGlobal({ material, fusion, onInicio }) {
  const [datos, setDatos] = useState({ estado: 'cargando', resultados: [], total: 0, error: null })
  const [catalogos, setCatalogos] = useState(null)
  const [modal, setModal] = useState(null) // 'ingreso' | 'phi' | null
  const [avisos, setAvisos] = useState([]) // [{ tipo: 'ok'|'error'|'advertencia', texto }]
  const [vista, setVista] = useState('global') // 'global' | 'accesorios'
  const [version, setVersion] = useState(0) // cambia tras guardar → recarga la vista por accesorio
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const filtrosAplicados = useDebounce(filtros)
  const [despachoSugerido, setDespachoSugerido] = useState(1)
  const consulta = useRef(0) // descarta respuestas de búsquedas anteriores

  const cargar = useCallback(() => {
    const n = ++consulta.current
    const de = filtrosAplicados
    listarEnsayos({ material, fusion, limite: 500, ...de })
      .then((d) => n === consulta.current && setDatos({ estado: 'listo', resultados: d.resultados, total: d.total, error: null, de }))
      .catch((e) => n === consulta.current && setDatos((x) => ({ ...x, estado: 'error', error: e.message, de })))
    // Despacho sugerido: el del último ingreso de hoy (sin filtros), como el VBA que lo deja a mano.
    listarEnsayos({ material, fusion, fecha: hoyISO(), limite: 1 })
      .then((d) => setDespachoSugerido(d.resultados[0]?.despacho ?? 1))
      .catch(() => {})
  }, [material, fusion, filtrosAplicados])

  useEffect(() => {
    cargar()
  }, [cargar])

  useEffect(() => {
    getCatalogos().then(setCatalogos, (e) => setAvisos([{ tipo: 'error', texto: e.message }]))
  }, [])

  const filtrar = (campo) => (valor) => setFiltros((f) => ({ ...f, [campo]: valor }))
  const hayFiltros = Object.values(filtros).some(Boolean)
  // Buscando: hay filtros escritos aún sin aplicar, o la última respuesta es de otros filtros.
  const buscando = filtros !== filtrosAplicados || datos.de !== filtrosAplicados

  const alGuardar = (r) => {
    setModal(null)
    setAvisos([
      { tipo: 'ok', texto: mensajeGuardado(r) },
      ...(r.advertencias ?? []).map((texto) => ({ tipo: 'advertencia', texto })),
    ])
    setVersion((v) => v + 1)
    cargar()
  }

  const alRegistrarPHI = (resultados) => {
    setModal(null)
    const fallas = resultados.filter((e) => e.phi?.falla !== 'SIN_FALLAS').length
    setAvisos([
      {
        tipo: 'ok',
        texto: `Ensayo PHI registrado en ${plural(resultados.length, 'accesorio', 'accesorios')}${fallas ? ` · ${plural(fallas, 'con falla', 'con falla')}` : ''}.`,
      },
    ])
    cargar()
  }

  const cambiarEstado = async (ensayo, nuevo) => {
    const anterior = ensayo.estadoAprobacion
    const poner = (estado) =>
      setDatos((d) => ({ ...d, resultados: d.resultados.map((e) => (e.id === ensayo.id ? { ...e, estadoAprobacion: estado } : e)) }))
    poner(nuevo)
    try {
      await cambiarEstadoAprobacion(ensayo.id, nuevo)
    } catch (e) {
      poner(anterior)
      setAvisos([{ tipo: 'error', texto: `No se pudo cambiar el estado: ${e.message}` }])
    }
  }

  const tituloFusion = (TIPOS_FUSION[fusion]?.nombre ?? fusion).toUpperCase()

  return (
    <div className="space-y-4">
      <header className="rounded-lg border border-slate-300 bg-sky-100 px-4 py-5 text-center">
        <h2 className="text-lg font-bold tracking-wide text-slate-900 sm:text-xl">
          REGISTRO DE CONTROL DE ACCESORIOS - {material} - {tituloFusion}
        </h2>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={onInicio}
          title="Volver al inicio"
          aria-label="Volver al inicio"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-900 text-white shadow hover:bg-blue-800"
        >
          <IconoInicio />
        </button>
        <div className="flex flex-1 flex-wrap justify-center gap-4">
          <button
            type="button"
            onClick={() => setModal('ingreso')}
            className="w-64 rounded-md bg-sky-600 px-6 py-3 text-sm font-semibold tracking-wide text-white shadow hover:bg-sky-700"
          >
            INGRESAR ACCESORIO
          </button>
          <button
            type="button"
            onClick={() => setModal('phi')}
            className="w-64 rounded-md bg-orange-500 px-6 py-3 text-sm font-semibold tracking-wide text-white shadow hover:bg-orange-600"
          >
            ENSAYO PHI
          </button>
        </div>
      </div>

      {avisos.length > 0 && (
        <div role="status" className="space-y-1">
          {avisos.map((a, i) => (
            <p
              key={i}
              className={`flex items-start justify-between gap-3 rounded border px-3 py-2 text-sm ${
                a.tipo === 'ok'
                  ? 'border-green-200 bg-green-50 text-green-800'
                  : a.tipo === 'error'
                    ? 'border-red-200 bg-red-50 text-red-800'
                    : 'border-amber-200 bg-amber-50 text-amber-800'
              }`}
            >
              <span>{a.texto}</span>
              {i === 0 && (
                <button type="button" onClick={() => setAvisos([])} aria-label="Cerrar aviso" className="text-lg leading-none opacity-60 hover:opacity-100">
                  ×
                </button>
              )}
            </p>
          ))}
        </div>
      )}

      <div role="tablist" aria-label="Vista del registro" className="flex gap-1 border-b border-slate-300">
        {[
          ['global', 'Registro global'],
          ['accesorios', 'Mediciones por accesorio'],
        ].map(([id, nombre]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={vista === id}
            onClick={() => setVista(id)}
            className={`-mb-px rounded-t border px-4 py-2 text-sm font-semibold ${
              vista === id ? 'border-slate-300 border-b-white bg-white text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {nombre}
          </button>
        ))}
      </div>

      {vista === 'accesorios' && (
        <MedicionesPorAccesorio material={material} fusion={fusion} version={version} inspectores={catalogos?.inspectores ?? []} />
      )}

      {vista === 'global' && (
        <BarraFiltros activos={hayFiltros} total={datos.total} cargando={buscando} onLimpiar={() => setFiltros(FILTROS_VACIOS)}>
          <FiltroFechas desde={filtros.desde} hasta={filtros.hasta} onDesde={filtrar('desde')} onHasta={filtrar('hasta')} />
          <Filtro etiqueta="Despacho" className="w-20">
            <input
              type="number"
              min="1"
              value={filtros.despacho}
              onChange={(e) => filtrar('despacho')(e.target.value)}
              className={CLASE_FILTRO}
            />
          </Filtro>
          <Filtro etiqueta="Inspector" className="w-44">
            <select value={filtros.inspector} onChange={(e) => filtrar('inspector')(e.target.value)} className={CLASE_FILTRO}>
              <option value="">Todos</option>
              {(catalogos?.inspectores ?? []).map((i) => (
                <option key={i}>{i}</option>
              ))}
            </select>
          </Filtro>
          <Filtro etiqueta="Buscar (producto, dimensión, N° operación, marca)" className="min-w-56 flex-1">
            <input
              type="search"
              value={filtros.q}
              placeholder="p. ej. Codo 90, 110[mm], OP-123…"
              onChange={(e) => filtrar('q')(e.target.value)}
              className={CLASE_FILTRO}
            />
          </Filtro>
          <Filtro etiqueta="Ensayo PHI" className="w-32">
            <select value={filtros.phi} onChange={(e) => filtrar('phi')(e.target.value)} className={CLASE_FILTRO}>
              <option value="">Todos</option>
              <option value="pendiente">Pendiente</option>
              <option value="sin_fallas">Sin fallas</option>
              <option value="con_falla">Con falla</option>
            </select>
          </Filtro>
          <Filtro etiqueta="Estado" className="w-32">
            <select value={filtros.aprobacion} onChange={(e) => filtrar('aprobacion')(e.target.value)} className={CLASE_FILTRO}>
              <option value="">Todos</option>
              {ESTADOS_APROBACION.map((e) => (
                <option key={e.id} value={e.id}>{e.nombre}</option>
              ))}
            </select>
          </Filtro>
        </BarraFiltros>
      )}

      <div hidden={vista !== 'global'} className="rounded-lg border border-slate-300 bg-white shadow-sm">
        <table className="w-full border-collapse text-[11px]">
          <thead className="text-slate-800">
            <tr className="text-xs">
              <th colSpan={8} className={`${TH} bg-sky-100`}>Etiqueta</th>
              <th colSpan={5} className={`${TH} bg-orange-100`}>Ensayo PHI</th>
              <th className={`${TH} bg-yellow-100`}>Inspección Visual</th>
              <th className={`${TH} bg-green-100`}>Estado de Aprobación</th>
            </tr>
            <tr>
              {['Fecha Ingreso', 'Hora', 'N° Despacho', 'Inspector', 'Producto', 'Marca', 'N° Operación', 'Cantidad Lote'].map((t) => (
                <th key={t} className={`${TH} bg-sky-50`}>{t}</th>
              ))}
              {['Presión de ensayo [MPa]', 'Temperatura de ensayo [°C]', 'Tiempo de ensayo [h]', 'Tipo de Falla', 'Tiempo de Fallo [h]'].map((t) => (
                <th key={t} className={`${TH} bg-orange-50`}>{t}</th>
              ))}
              <th className={`${TH} bg-yellow-50`}>Aspecto</th>
              <th className={`${TH} bg-green-50`}>Estado</th>
            </tr>
          </thead>
          <tbody className="text-center tabular-nums text-slate-800">
            {datos.estado === 'cargando' && (
              <tr>
                <td colSpan={15} className="px-2 py-6 text-slate-500">Cargando registro…</td>
              </tr>
            )}
            {datos.estado === 'error' && (
              <tr>
                <td colSpan={15} className="px-2 py-6 text-red-700">{datos.error}</td>
              </tr>
            )}
            {datos.estado === 'listo' && datos.resultados.length === 0 && (
              <tr>
                <td colSpan={15} className="px-2 py-6 text-slate-500">
                  {hayFiltros ? 'Ningún ingreso coincide con los filtros.' : 'Aún no hay accesorios ingresados. Use “INGRESAR ACCESORIO”.'}
                </td>
              </tr>
            )}
            {datos.resultados.map((e) => {
              const falla = e.phi && e.phi.falla !== 'SIN_FALLAS'
              return (
                <tr key={e.id} className="odd:bg-white even:bg-slate-50 hover:bg-sky-50">
                  <td className={`${TD} whitespace-nowrap`}>{e.fecha}</td>
                  <td className={TD}>{e.hora}</td>
                  <td className={TD}>{e.despacho}</td>
                  <td className={TD}>{e.inspector || '—'}</td>
                  <td className={`${TD} min-w-48 text-left`}>{etiquetaProducto(e)}</td>
                  <td className={TD}>{e.marca || '—'}</td>
                  <td className={`${TD} break-all`}>{e.numeroOperacion || '—'}</td>
                  <td className={TD}>{e.cantidadLote ?? '—'}</td>
                  {e.phi ? (
                    <>
                      <td className={TD}>{n(e.phi.presion)}</td>
                      <td className={TD}>{n(e.phi.temperatura)}</td>
                      <td className={TD}>{n(e.phi.tiempo)}</td>
                      <td className={`${TD} ${falla ? 'font-semibold text-red-700' : ''}`}>{nombreFalla(e.phi.falla)}</td>
                      <td className={TD}>{falla ? n(e.phi.tiempoFalla) : 'N/A'}</td>
                    </>
                  ) : (
                    <td colSpan={5} className={`${TD} text-slate-400`}>Pendiente</td>
                  )}
                  <td className={TD}>{e.inspeccionVisual}</td>
                  <td className={`${TD} w-24`}>
                    <SelectorEstado ensayo={e} onCambiar={cambiarEstado} />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {vista === 'global' && datos.total > datos.resultados.length && (
        <p className="text-xs text-slate-500">Mostrando los {datos.resultados.length} ingresos más recientes de {datos.total}.</p>
      )}

      {modal === 'ingreso' && (
        <IngresoAccesorio
          material={material}
          fusion={fusion}
          catalogos={catalogos}
          despachoSugerido={despachoSugerido}
          onCancelar={() => setModal(null)}
          onGuardado={alGuardar}
        />
      )}
      {modal === 'phi' && (
        <EnsayoPHI
          material={material}
          fusion={fusion}
          despachoSugerido={despachoSugerido}
          onCancelar={() => setModal(null)}
          onRegistrado={alRegistrarPHI}
        />
      )}
    </div>
  )
}
