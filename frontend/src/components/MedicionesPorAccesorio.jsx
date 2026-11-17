import { useEffect, useState } from 'react'
import TooltipFijo from './ui/TooltipFijo.jsx'
import { BarraFiltros, Filtro, FiltroFechas } from './ui/Filtros.jsx'
import { CLASE_FILTRO } from './ui/estilos.js'
import { useDebounce } from '../hooks/useDebounce.js'
import { getCatalogo } from '../data/especificaciones.js'
import { cantidadesPorAccesorio, listarEnsayos } from '../data/ensayos.js'
import { columnasPorExtremo } from '../domain/columnasMediciones.js'
import { motivoFueraDeRango, n } from '../domain/textos.js'

// Mediciones separadas por accesorio, como las hojas numeradas de CONTROL *.xlsm:
// una pestaña por accesorio (orden del LISTADO) y una fila por ingreso con sus cotas por extremo.
// Casillas fuera de rango en rojo con el motivo al pasar el cursor (mismo criterio que el formulario).

const ID_TOOLTIP = 'tooltip-medicion-registro'
// Compacto y con texto en varias líneas: la tabla debe caber en el ancho de la página sin scroll horizontal.
const TH = 'border border-slate-300 px-1 py-1 font-semibold leading-tight'
const TD = 'border border-slate-200 px-1 py-0.5 leading-tight'

const ESTILO_CELDA = {
  NO_CONFORME: 'bg-red-100 font-semibold text-red-800 cursor-help',
  SIN_TOLERANCIA: 'bg-amber-50 text-amber-900',
  REGISTRO: 'text-slate-500',
}

function textoCelda(m) {
  if (m.estado === 'NO_CONFORME') return motivoFueraDeRango(m)
  if (m.estado === 'SIN_TOLERANCIA') return 'La tabla no define tolerancia para esta cota'
  if (m.registro) return m.nominal !== null ? `Solo registro · nominal ${n(m.nominal)}` : 'Solo registro'
  if (m.min !== null && m.max !== null) return `Rango permitido [${n(m.min)} – ${n(m.max)}]`
  if (m.min !== null) return `Mínimo permitido ≥ ${n(m.min)}`
  if (m.max !== null) return `Máximo permitido ≤ ${n(m.max)}`
  return ''
}

const FILTROS_VACIOS = { desde: '', hasta: '', despacho: '', inspector: '', productoId: '', fuera: false }

export default function MedicionesPorAccesorio({ material, fusion, version, inspectores = [] }) {
  const [accesorios, setAccesorios] = useState(null) // [{ id, nombre, cantidad }] con ingresos
  const [productos, setProductos] = useState([]) // catálogo, para el filtro de dimensión
  const [seleccion, setSeleccion] = useState(null)
  const [tabla, setTabla] = useState({ clave: null, accesorio: null, ensayos: [], total: 0, error: null })
  const [aviso, setAviso] = useState(null)
  const [error, setError] = useState(null)
  const [filtros, setFiltros] = useState(FILTROS_VACIOS)
  const aplicados = useDebounce(filtros)

  // Lista desplegable: accesorios del LISTADO que tienen ingresos.
  useEffect(() => {
    let vigente = true
    Promise.all([getCatalogo(material, fusion), cantidadesPorAccesorio(material, fusion)])
      .then(([catalogo, { cantidades }]) => {
        if (!vigente) return
        setProductos(catalogo.productos)
        const conIngresos = catalogo.accesorios
          .map((a) => ({ id: String(a.id), nombre: a.nombre, cantidad: cantidades[String(a.id)] ?? 0 }))
          .filter((a) => a.cantidad > 0)
        setAccesorios(conIngresos)
        setSeleccion((s) => (conIngresos.some((a) => a.id === s) ? s : (conIngresos[0]?.id ?? null)))
      })
      .catch((e) => vigente && setError(e.message))
    return () => {
      vigente = false
    }
  }, [material, fusion, version])

  const clave = seleccion ? `${seleccion}|${version}|${JSON.stringify(aplicados)}` : null
  useEffect(() => {
    if (!clave) return
    let vigente = true
    const { fuera, ...resto } = aplicados
    listarEnsayos({ material, fusion, accesorio: seleccion, detalle: 1, limite: 500, ...resto, fuera: fuera ? 1 : '' })
      .then((d) => vigente && setTabla({ clave, accesorio: seleccion, ensayos: d.resultados, total: d.total, error: null }))
      .catch((e) => vigente && setTabla({ clave, accesorio: seleccion, ensayos: [], total: 0, error: e.message }))
    return () => {
      vigente = false
    }
  }, [clave, material, fusion, seleccion, aplicados])

  const filtrar = (campo) => (valor) => setFiltros((f) => ({ ...f, [campo]: valor }))
  const hayFiltros = Object.values(filtros).some(Boolean)

  // Tooltip de posición fija: al desplazar se oculta para no quedar desfasado.
  useEffect(() => {
    if (!aviso) return
    const ocultar = () => setAviso(null)
    window.addEventListener('scroll', ocultar, true)
    return () => window.removeEventListener('scroll', ocultar, true)
  }, [aviso])

  if (error) return <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
  if (!accesorios) return <p className="text-sm text-slate-500">Cargando…</p>
  if (accesorios.length === 0) return <p className="text-sm text-slate-500">Aún no hay mediciones registradas.</p>

  const cargando = tabla.clave !== clave
  // Al cambiar filtros se mantienen las filas anteriores mientras llega la respuesta (sin parpadeo);
  // al cambiar de accesorio no, porque las columnas son otras.
  const mismoAccesorio = tabla.accesorio === seleccion
  const ensayos = mismoAccesorio ? tabla.ensayos : []
  const dimensiones = productos.filter((p) => String(p.accesorio) === seleccion)
  const grupos = columnasPorExtremo(ensayos)
  const nCotas = grupos.reduce((s, g) => s + g.columnas.length, 0)

  const mostrar = (ev, texto, codigo) => {
    const { left, width, top, bottom } = ev.currentTarget.getBoundingClientRect()
    setAviso({ texto, codigo, x: left + width / 2, top, bottom })
  }

  return (
    <div className="space-y-3">
      {/* Lista desplegable (en cascada) en vez de una pestaña por accesorio: más ordenado con muchos accesorios. */}
      <label className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-800">
        Accesorio:
        <select
          value={seleccion ?? ''}
          onChange={(e) => {
            setSeleccion(e.target.value)
            setFiltros((f) => ({ ...f, productoId: '' })) // la dimensión es propia de cada accesorio
          }}
          className="w-full max-w-md rounded border border-slate-400 bg-white px-2 py-1.5 text-sm font-normal focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
        >
          {accesorios.map((a) => (
            <option key={a.id} value={a.id}>
              {a.nombre} ({a.cantidad} {a.cantidad === 1 ? 'ingreso' : 'ingresos'})
            </option>
          ))}
        </select>
        <span className="text-xs font-normal text-slate-500">{accesorios.length} accesorios con mediciones</span>
      </label>

      <BarraFiltros
        activos={hayFiltros}
        total={mismoAccesorio ? tabla.total : 0}
        cargando={cargando}
        onLimpiar={() => setFiltros(FILTROS_VACIOS)}
      >
        <FiltroFechas desde={filtros.desde} hasta={filtros.hasta} onDesde={filtrar('desde')} onHasta={filtrar('hasta')} />
        <Filtro etiqueta="Despacho" className="w-20">
          <input type="number" min="1" value={filtros.despacho} onChange={(e) => filtrar('despacho')(e.target.value)} className={CLASE_FILTRO} />
        </Filtro>
        <Filtro etiqueta="Inspector" className="w-44">
          <select value={filtros.inspector} onChange={(e) => filtrar('inspector')(e.target.value)} className={CLASE_FILTRO}>
            <option value="">Todos</option>
            {inspectores.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
        </Filtro>
        <Filtro etiqueta="Dimensión" className="min-w-48 flex-1">
          <select value={filtros.productoId} onChange={(e) => filtrar('productoId')(e.target.value)} className={CLASE_FILTRO}>
            <option value="">Todas</option>
            {dimensiones.map((p) => (
              <option key={p.id} value={p.id}>
                {p.producto} · {p.referencia}
              </option>
            ))}
          </select>
        </Filtro>
        <label className="flex items-center gap-1.5 self-end pb-1 text-xs font-semibold text-red-800">
          <input type="checkbox" checked={filtros.fuera} onChange={(e) => filtrar('fuera')(e.target.checked)} className="accent-red-700" />
          Solo con medidas fuera de rango
        </label>
      </BarraFiltros>

      <div className="rounded-lg border border-slate-300 bg-white shadow-sm">
        <table className="w-full border-collapse text-[11px]">
          <thead className="text-slate-800">
            <tr className="text-xs">
              <th colSpan={7} className={`${TH} bg-sky-100`}>Etiqueta</th>
              {grupos.map((g) => (
                <th key={g.extremo} colSpan={g.columnas.length} className={`${TH} ${g.extremo % 2 ? 'bg-indigo-100' : 'bg-violet-100'}`}>
                  Medición Extremo {g.extremo}
                </th>
              ))}
            </tr>
            <tr>
              {['Fecha', 'Hora', 'N° Despacho', 'Inspector', 'Producto', 'Dimensión', 'Marca'].map((t) => (
                <th key={t} className={`${TH} bg-sky-50`}>{t}</th>
              ))}
              {grupos.flatMap((g) =>
                g.columnas.map((c) => (
                  // Encabezado corto (D1_min); el nombre completo va en el tooltip para ahorrar ancho.
                  <th key={c.codigo} title={`${c.etiqueta} [mm]`} className={`${TH} cursor-help ${g.extremo % 2 ? 'bg-indigo-50' : 'bg-violet-50'}`}>
                    {c.corto}
                  </th>
                )),
              )}
            </tr>
          </thead>
          <tbody className="text-center tabular-nums text-slate-800">
            {cargando && ensayos.length === 0 && (
              <tr>
                <td colSpan={7 + nCotas} className="px-2 py-6 text-slate-500">Cargando mediciones…</td>
              </tr>
            )}
            {!cargando && tabla.error && (
              <tr>
                <td colSpan={7 + nCotas} className="px-2 py-6 text-red-700">{tabla.error}</td>
              </tr>
            )}
            {!cargando && !tabla.error && ensayos.length === 0 && (
              <tr>
                <td colSpan={7 + nCotas} className="px-2 py-6 text-slate-500">Ningún ingreso coincide con los filtros.</td>
              </tr>
            )}
            {ensayos.map((e) => {
              const porCodigo = Object.fromEntries(e.mediciones.map((m) => [m.codigo, m]))
              return (
                <tr key={e.id} className="odd:bg-white even:bg-slate-50">
                  <td className={`${TD} whitespace-nowrap`}>{e.fecha}</td>
                  <td className={TD}>{e.hora}</td>
                  <td className={TD}>{e.despacho}</td>
                  <td className={TD}>{e.inspector || '—'}</td>
                  <td className={`${TD} min-w-28 text-left`}>{e.producto}</td>
                  <td className={`${TD} text-left`}>{e.referencia}</td>
                  <td className={TD}>{e.marca || '—'}</td>
                  {grupos.flatMap((g) =>
                    g.columnas.map((c) => {
                      const m = porCodigo[c.codigo]
                      if (!m) return <td key={c.codigo} className={`${TD} bg-slate-100`} title="No aplica a este producto" />
                      if (m.valor === null) return <td key={c.codigo} className={`${TD} text-slate-300`}>—</td>
                      const texto = textoCelda(m)
                      const fuera = m.estado === 'NO_CONFORME'
                      const id = `${e.id}.${c.codigo}`
                      return (
                        <td
                          key={c.codigo}
                          tabIndex={fuera ? 0 : undefined}
                          aria-describedby={fuera && aviso?.codigo === id ? ID_TOOLTIP : undefined}
                          onMouseEnter={(ev) => texto && mostrar(ev, texto, id)}
                          onFocus={(ev) => texto && mostrar(ev, texto, id)}
                          onMouseLeave={() => setAviso(null)}
                          onBlur={() => setAviso(null)}
                          className={`${TD} ${ESTILO_CELDA[m.estado] ?? ''}`}
                        >
                          {n(m.valor)}
                        </td>
                      )
                    }),
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {!cargando && tabla.total > ensayos.length && (
        <p className="text-xs text-slate-500">Mostrando los {ensayos.length} ingresos más recientes de {tabla.total}.</p>
      )}
      <TooltipFijo
        id={ID_TOOLTIP}
        aviso={aviso}
        className={aviso?.texto.startsWith('Valor medido') ? 'bg-red-800 text-white' : 'bg-slate-800 text-white'}
      />
    </div>
  )
}
