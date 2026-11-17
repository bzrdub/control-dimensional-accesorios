import { useEffect, useState } from 'react'
import Modal from './ui/Modal.jsx'
import CampoFecha from './ui/CampoFecha.jsx'
import { hoyISO } from '../domain/fechas.js'
import FormularioMediciones from './FormularioMediciones.jsx'
import { getCatalogo, etiquetaDimension } from '../data/especificaciones.js'
import { especificacionDe, motivoPendiente } from '../data/tolerancias.js'
import { imagenesDe } from '../data/imagenes.js'
import { guardarEnsayo } from '../data/ensayos.js'

// "INGRESAR ACCESORIO": formulario de ingreso (como Ingreso.frm) → formulario de mediciones → guardar.
// La fecha es la del reporte (editable, hoy por defecto, no futura). La hora es automática: la registra
// el servidor al guardar; aquí solo se muestra.

const OTRA_MARCA = 'OTRO'
const pad = (x) => String(x).padStart(2, '0')
const horaTexto = (d) => `${pad(d.getHours())}:${pad(d.getMinutes())}`

function useReloj() {
  const [ahora, setAhora] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 15_000)
    return () => clearInterval(t)
  }, [])
  return ahora
}

const claseCampo =
  'w-full rounded border border-slate-400 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100'

function Campo({ etiqueta, error, children, className = '' }) {
  return (
    <label className={`block space-y-1 text-sm text-slate-800 ${className}`}>
      <span>{etiqueta}</span>
      {children}
      {error && <span className="block text-xs text-red-700">{error}</span>}
    </label>
  )
}

const CABECERA_INICIAL = {
  fecha: '',
  despacho: '1',
  inspector: '',
  accesorio: '',
  productoId: '',
  marca: '',
  marcaOtra: '',
  numeroOperacion: '',
  cantidadLote: '',
  inspeccionVisual: 'Sin Observación',
}

function validar(c) {
  const e = {}
  if (!/^\d{4}-\d{2}-\d{2}$/.test(c.fecha)) e.fecha = 'Ingrese una fecha válida (dd-mm-aaaa).'
  else if (c.fecha > hoyISO()) e.fecha = 'La fecha no puede ser posterior a hoy.'
  if (!/^\d+$/.test(c.despacho) || Number(c.despacho) < 1) e.despacho = 'Número de despacho (1 o más).'
  if (!c.inspector) e.inspector = 'Seleccione el inspector.'
  if (!c.accesorio) e.accesorio = 'Seleccione el tipo de accesorio.'
  if (!c.productoId) e.productoId = 'Seleccione las dimensiones.'
  if (!c.marca) e.marca = 'Seleccione la marca.'
  else if (c.marca === OTRA_MARCA && !c.marcaOtra.trim()) e.marcaOtra = 'Escriba la marca.'
  if (c.cantidadLote !== '' && (!/^\d+$/.test(c.cantidadLote) || Number(c.cantidadLote) < 1))
    e.cantidadLote = 'Cantidad entera mayor que 0.'
  return e
}

export default function IngresoAccesorio({ material, fusion, catalogos, despachoSugerido = 1, onCancelar, onGuardado }) {
  const ahora = useReloj()
  const [catalogo, setCatalogo] = useState(null)
  const [cab, setCab] = useState(() => ({ ...CABECERA_INICIAL, fecha: hoyISO(), despacho: String(despachoSugerido) }))
  const [errores, setErrores] = useState({})
  const [paso, setPaso] = useState('cabecera')
  const [vioMediciones, setVioMediciones] = useState(false)

  useEffect(() => {
    let vigente = true
    getCatalogo(material, fusion).then((c) => vigente && setCatalogo(c))
    return () => {
      vigente = false
    }
  }, [material, fusion])

  const poner = (campo) => (ev) => {
    const valor = ev.target.value
    setCab((c) => ({ ...c, [campo]: valor, ...(campo === 'accesorio' ? { productoId: '' } : {}) }))
    setErrores((e) => ({ ...e, [campo]: undefined }))
  }

  const accesorios = catalogo?.accesorios.filter((a) => a.cantidad > 0) ?? []
  const productos = catalogo?.productos.filter((p) => String(p.accesorio) === cab.accesorio) ?? []
  const producto = productos.find((p) => p.id === cab.productoId) ?? null
  const espec = producto ? especificacionDe(producto) : null

  const aceptarCabecera = (ev) => {
    ev.preventDefault()
    const e = validar(cab)
    if (producto && !espec) e.productoId = `Sin tolerancias: ${motivoPendiente(producto)}`
    setErrores(e)
    if (Object.keys(e).length === 0) {
      setVioMediciones(true)
      setPaso('mediciones')
    }
  }

  const guardar = async (datos) => {
    const r = await guardarEnsayo({
      productoId: producto.id,
      fecha: cab.fecha,
      despacho: Number(cab.despacho),
      inspector: cab.inspector,
      marca: cab.marca === OTRA_MARCA ? cab.marcaOtra.trim() : cab.marca,
      numeroOperacion: cab.numeroOperacion.trim(),
      cantidadLote: cab.cantidadLote === '' ? null : Number(cab.cantidadLote),
      inspeccionVisual: cab.inspeccionVisual.trim(),
      ...datos,
    })
    onGuardado(r)
    return r
  }

  const cerrar = () => {
    if (paso === 'mediciones' && !window.confirm('¿Descartar este ingreso? Las medidas no guardadas se perderán.')) return
    onCancelar()
  }

  return (
    <Modal
      titulo={paso === 'cabecera' ? 'Ingrese Tipo de Accesorio' : `Mediciones · Despacho ${cab.despacho} · ${cab.inspector}`}
      ancho={paso === 'cabecera' ? 'max-w-xl' : 'max-w-6xl'}
      onCerrar={cerrar}
    >
      {/* La cabecera queda montada (oculta) para no perder datos al volver desde las mediciones. */}
      <form onSubmit={aceptarCabecera} hidden={paso !== 'cabecera'} className="space-y-4" noValidate>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <Campo etiqueta="Fecha del reporte:" error={errores.fecha}>
              <CampoFecha value={cab.fecha} max={hoyISO()} onChange={(iso) => poner('fecha')({ target: { value: iso } })} className={`${claseCampo} w-36`} />
            </Campo>
            <Campo etiqueta="Despacho:" error={errores.despacho}>
              <input type="number" min="1" step="1" value={cab.despacho} onChange={poner('despacho')} className={`${claseCampo} w-20 text-center`} />
            </Campo>
          </div>
          <Campo etiqueta="Hora:">
            <output
              title="Se registra automáticamente al guardar"
              className="block w-20 rounded border border-slate-300 bg-slate-100 px-2 py-1.5 text-center text-sm tabular-nums"
            >
              {horaTexto(ahora)}
            </output>
          </Campo>
        </div>

        <Campo etiqueta="Inspector:" error={errores.inspector}>
          <select value={cab.inspector} onChange={poner('inspector')} className={claseCampo}>
            <option value="" />
            {(catalogos?.inspectores ?? []).map((i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
        </Campo>

        <Campo etiqueta="Tipo de accesorio:" error={errores.accesorio}>
          <select value={cab.accesorio} onChange={poner('accesorio')} disabled={!catalogo} className={claseCampo}>
            <option value="">{catalogo ? '' : 'Cargando…'}</option>
            {accesorios.map((a) => (
              <option key={a.id} value={String(a.id)}>
                {a.nombre}
              </option>
            ))}
          </select>
        </Campo>

        <Campo etiqueta="Dimensiones:" error={errores.productoId}>
          <select value={cab.productoId} onChange={poner('productoId')} disabled={!cab.accesorio} className={`${claseCampo} tabular-nums`}>
            <option value="" />
            {productos.map((p) => {
              const evaluable = Boolean(especificacionDe(p))
              const nombreAcc = accesorios.find((a) => String(a.id) === cab.accesorio)?.nombre
              return (
                <option key={p.id} value={p.id} disabled={!evaluable}>
                  {p.producto !== nombreAcc ? `${p.producto} · ` : ''}
                  {etiquetaDimension(p)}
                  {evaluable ? '' : ' (sin tolerancias)'}
                </option>
              )
            })}
          </select>
        </Campo>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Marca:" error={errores.marca}>
            <select value={cab.marca} onChange={poner('marca')} className={claseCampo}>
              <option value="" />
              {(catalogos?.marcas ?? []).map((m) => (
                <option key={m}>{m}</option>
              ))}
              <option value={OTRA_MARCA}>OTRO</option>
            </select>
          </Campo>
          {cab.marca === OTRA_MARCA && (
            <Campo etiqueta="Otra marca:" error={errores.marcaOtra}>
              <input value={cab.marcaOtra} onChange={poner('marcaOtra')} maxLength={100} className={claseCampo} />
            </Campo>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Campo etiqueta="Número de Operación:">
            <input value={cab.numeroOperacion} onChange={poner('numeroOperacion')} maxLength={50} className={claseCampo} />
          </Campo>
          <Campo etiqueta="Cantidad por Lote:" error={errores.cantidadLote}>
            <input type="number" min="1" step="1" value={cab.cantidadLote} onChange={poner('cantidadLote')} className={claseCampo} />
          </Campo>
        </div>

        <Campo etiqueta="Inspección Visual:">
          <textarea value={cab.inspeccionVisual} onChange={poner('inspeccionVisual')} rows={3} maxLength={1000} className={claseCampo} />
        </Campo>

        <div className="flex justify-center gap-6 pt-2">
          <button type="submit" className="w-36 rounded border border-slate-800 bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700">
            Aceptar
          </button>
          <button type="button" onClick={onCancelar} className="w-36 rounded border border-slate-400 bg-white px-4 py-2 text-sm text-slate-800 hover:bg-slate-50">
            Cancelar
          </button>
        </div>
      </form>

      {/* Montado desde la primera visita: "Atrás" conserva las medidas; cambiar de producto las reinicia (key). */}
      {vioMediciones && producto && espec && (
        <div hidden={paso !== 'mediciones'}>
          <FormularioMediciones
            key={producto.id}
            especificacion={espec}
            accesorio={producto.producto}
            referencia={producto.referencia}
            imagenes={imagenesDe(producto)}
            onAtras={() => setPaso('cabecera')}
            onGuardar={guardar}
          />
        </div>
      )}
    </Modal>
  )
}
