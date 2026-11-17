import { useEffect, useState } from 'react'
import { evaluarEspecificacion, ESTADO } from '../domain/validacion.js'
import { cotasDe } from '../domain/especificacion.js'
import { fmtDesv, mensajeGuardado, motivoFueraDeRango, n, plural } from '../domain/textos.js'
import DiagramaAccesorio from './DiagramaAccesorio.jsx'

// Formulario de ingreso dimensional con la estructura de los formularios VBA:
// grilla "Puntos de medición" (cotas en filas × salidas en columnas) a la izquierda e imagen a la derecha.
// Extremos de distinto tipo (p. ej. espiral + espiga) se muestran en grillas separadas, como las secciones del VBA.
// Montar con key={producto.id} para reiniciar las mediciones al cambiar de producto.
//
// Criterio de UX (definido con calidad): sin etiqueta global de "No Conforme" y sin bloquear el guardado.
// Cada casilla fuera de rango se marca en rojo y, al pasar el cursor o enfocarla, explica el motivo.

const ESTILO_INPUT = {
  [ESTADO.CONFORME]: 'border-green-500 bg-green-50',
  [ESTADO.NO_CONFORME]: 'border-red-600 bg-red-50 text-red-800 ring-1 ring-red-500',
  [ESTADO.SIN_DATO]: 'border-slate-400 bg-white',
  [ESTADO.SIN_TOLERANCIA]: 'border-amber-400 bg-amber-50',
  [ESTADO.REGISTRO]: 'border-slate-300 bg-slate-50',
}

function textoLimites(c) {
  if (c.registro) return c.nominal !== null && c.nominal !== undefined ? `nom. ${n(c.nominal)}` : 'registro'
  if (c.min !== null && c.max !== null) return `${n(c.min)}–${n(c.max)}`
  if (c.min !== null) return `≥ ${n(c.min)}`
  if (c.max !== null) return `≤ ${n(c.max)}`
  return 'sin tol.'
}

// "E1.D1min" → "D1_min" (nomenclatura de los formularios VBA)
const codigoCorto = (codigo) => codigo.split('.')[1].replace(/(min|max)$/, '_$1')

/** Agrupa extremos consecutivos o no por tipo, conservando el orden de aparición. */
function agruparPorTipo(extremos) {
  const grupos = []
  for (const e of extremos) {
    const g = grupos.find((x) => x.tipo === e.tipo)
    if (g) g.extremos.push(e)
    else grupos.push({ tipo: e.tipo, nombre: e.nombre, sinMedicion: e.sinMedicion, extremos: [e] })
  }
  return grupos
}

const ID_TOOLTIP = 'tooltip-fuera-de-rango'

/** Tooltip con posición fija (no lo recorta el scroll horizontal de la grilla). */
function TooltipFueraDeRango({ aviso, porCodigo }) {
  const r = aviso && porCodigo[aviso.codigo]
  if (!r || r.estado !== ESTADO.NO_CONFORME) return null
  const ancho = 320
  const x = Math.min(Math.max(aviso.x, ancho / 2 + 8), window.innerWidth - ancho / 2 - 8)
  const arriba = aviso.top > 72
  return (
    <div
      id={ID_TOOLTIP}
      role="tooltip"
      style={{
        position: 'fixed',
        left: x,
        top: arriba ? aviso.top - 6 : aviso.bottom + 6,
        transform: `translate(-50%, ${arriba ? '-100%' : '0'})`,
        maxWidth: ancho,
      }}
      className="pointer-events-none z-50 rounded bg-red-800 px-2.5 py-1.5 text-xs leading-snug text-white shadow-lg"
    >
      {motivoFueraDeRango(r)}
    </div>
  )
}

function GrillaPuntos({ grupo, porCodigo, mediciones, actualizar, mostrarTitulo, aviso, mostrarAviso, ocultarAviso }) {
  const filas = grupo.extremos[0].cotas.map((c) => codigoCorto(c.codigo))
  const fuentes = [...new Set(grupo.extremos.map((e) => (e.sinTolerancia ? `${e.fuente} (sin fila ${e.medida})` : e.fuente)))]

  return (
    <div className="space-y-1">
      {mostrarTitulo && <p className="text-sm font-semibold text-slate-800">{grupo.nombre}</p>}
      <div className="overflow-x-auto">
        <table className="text-sm">
          <tbody>
            {filas.map((fila, iFila) => {
              const ref = grupo.extremos[0].cotas[iFila]
              return (
                <tr key={fila}>
                  <th scope="row" className="py-1 pr-3 text-left align-middle font-semibold text-slate-900" title={ref.etiqueta}>
                    {fila}
                  </th>
                  {grupo.extremos.map((e) => {
                    const c = e.cotas[iFila]
                    const r = porCodigo[c.codigo]
                    const limites = textoLimites(c)
                    const fuera = r.estado === ESTADO.NO_CONFORME
                    const eventosAviso = {
                      onMouseEnter: (ev) => mostrarAviso(c.codigo, ev.currentTarget),
                      onFocus: (ev) => mostrarAviso(c.codigo, ev.currentTarget),
                      onMouseLeave: ocultarAviso,
                      onBlur: ocultarAviso,
                    }
                    return (
                      <td key={e.numero} className="px-1 py-1 align-top">
                        <input
                          type="number"
                          step="0.01"
                          inputMode="decimal"
                          aria-label={`Salida ${e.numero} ${c.etiqueta}`}
                          aria-invalid={fuera || undefined}
                          aria-describedby={fuera && aviso?.codigo === c.codigo ? ID_TOOLTIP : undefined}
                          title={fuera ? undefined : `${c.etiqueta} · salida ${e.numero} · límites: ${limites}`}
                          placeholder={limites}
                          value={mediciones[c.codigo] ?? ''}
                          onChange={(ev) => actualizar(c.codigo, ev.target.value)}
                          {...eventosAviso}
                          className={`w-24 rounded-sm border px-1.5 py-1 text-right tabular-nums placeholder:text-[11px] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 ${ESTILO_INPUT[r.estado]}`}
                        />
                        {r.desviacion ? (
                          <span className={`block text-right text-[11px] tabular-nums ${c.registro ? 'text-slate-500' : 'text-red-700'}`}>
                            {fmtDesv(r.desviacion)}
                          </span>
                        ) : null}
                      </td>
                    )
                  })}
                  <td className="py-1 pl-1 align-top text-xs text-blue-700">[mm]</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="text-sm font-semibold text-slate-900">
            <tr>
              <th scope="row" className="pt-3 pr-3 text-left">N° salida</th>
              {grupo.extremos.map((e) => (
                <td key={e.numero} className="px-1 pt-3 text-center">{e.numero}</td>
              ))}
            </tr>
            <tr>
              <th scope="row" className="pr-3 text-left">Diámetro</th>
              {grupo.extremos.map((e) => (
                <td key={e.numero} className="px-1 text-center whitespace-nowrap">{e.medida.replace(/ mm$/, '')}</td>
              ))}
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-[11px] text-slate-500">Tolerancias: {fuentes.join(' · ')}</p>
    </div>
  )
}

// Cotas tal como las vio el navegador: el servidor evalúa con su propia norma y solo las usa para advertir diferencias.
const cotasVistas = (cotas) =>
  cotas.map(({ codigo, min, max, nominal, registro }) => ({
    codigo,
    min: min ?? null,
    max: max ?? null,
    nominal: nominal ?? null,
    registro: Boolean(registro),
  }))

const SIN_ENVIO = { estado: 'inactivo', mensaje: '', advertencias: [] }

export default function FormularioMediciones({ especificacion, accesorio, referencia, imagenes = [], onAtras, onGuardar }) {
  const [mediciones, setMediciones] = useState({})
  const [envio, setEnvio] = useState(SIN_ENVIO)
  const [aviso, setAviso] = useState(null) // { codigo, x, top, bottom } de la casilla bajo el cursor/foco

  const cotas = cotasDe(especificacion)
  const { resultados } = evaluarEspecificacion({ id: especificacion.id, cotas }, mediciones)
  const porCodigo = Object.fromEntries(resultados.map((r) => [r.codigo, r]))

  const actualizar = (codigo, valor) => {
    setMediciones((m) => ({ ...m, [codigo]: valor }))
    setEnvio(SIN_ENVIO)
  }
  const mostrarAviso = (codigo, el) => {
    const { left, width, top, bottom } = el.getBoundingClientRect()
    setAviso({ codigo, x: left + width / 2, top, bottom })
  }
  const ocultarAviso = () => setAviso(null)

  // La posición es fija: al desplazar la página el tooltip quedaría desfasado, así que se oculta.
  useEffect(() => {
    if (!aviso) return
    window.addEventListener('scroll', ocultarAviso, true)
    window.addEventListener('resize', ocultarAviso)
    return () => {
      window.removeEventListener('scroll', ocultarAviso, true)
      window.removeEventListener('resize', ocultarAviso)
    }
  }, [aviso])

  const grupos = agruparPorTipo(especificacion.extremos)
  const medibles = grupos.filter((g) => !g.sinMedicion)
  const sinMedicion = especificacion.extremos.filter((e) => e.sinMedicion)
  const etiquetaDe = Object.fromEntries(cotas.map((c) => [c.codigo, c.etiqueta]))

  const aMedir = resultados.filter((r) => r.estado !== ESTADO.REGISTRO || r.valor !== null)
  const ingresadas = resultados.filter((r) => r.valor !== null).length
  const fueraDeRango = resultados.filter((r) => r.estado === ESTADO.NO_CONFORME)
  const sinTolerancia = resultados.filter((r) => r.estado === ESTADO.SIN_TOLERANCIA).length

  // El guardado nunca se bloquea por datos incompletos o fuera de rango; solo se evita el doble envío.
  const guardando = envio.estado === 'guardando'
  const yaGuardado = envio.estado === 'ok'

  const guardar = async () => {
    setEnvio({ ...SIN_ENVIO, estado: 'guardando', mensaje: 'Guardando…' })
    try {
      const valores = Object.entries(mediciones).filter(([, v]) => v !== '' && v !== null && v !== undefined)
      const r = await onGuardar({
        cotas: cotasVistas(cotas),
        mediciones: Object.fromEntries(valores.map(([k, v]) => [k, Number(v)])),
      })
      setEnvio({ estado: 'ok', mensaje: mensajeGuardado(r), advertencias: r.advertencias ?? [] })
    } catch (e) {
      setEnvio({ ...SIN_ENVIO, estado: 'error', mensaje: e.message })
    }
  }

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <h3 className="text-lg font-bold uppercase text-slate-900">Mediciones para accesorio: {accesorio}</h3>
        <p className="text-sm font-semibold uppercase text-slate-800">
          Medidas específicas para: <span className="normal-case">{referencia}</span>
        </p>
        <p className="text-xs text-slate-600" aria-live="polite">
          Medidas ingresadas: {ingresadas} de {aMedir.length}
          {fueraDeRango.length > 0 && (
            <span className="font-semibold text-red-700"> · {plural(fueraDeRango.length, 'fuera de rango', 'fuera de rango')}</span>
          )}
          {sinTolerancia > 0 && (
            <span className="text-amber-700"> · {plural(sinTolerancia, 'cota sin tolerancia en tabla', 'cotas sin tolerancia en tabla')}</span>
          )}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section aria-label="Puntos de medición" className="space-y-5">
          <p className="text-sm font-semibold text-slate-800">Puntos de medición</p>
          {medibles.map((g) => (
            <GrillaPuntos
              key={g.tipo}
              grupo={g}
              porCodigo={porCodigo}
              mediciones={mediciones}
              actualizar={actualizar}
              mostrarTitulo={medibles.length > 1}
              aviso={aviso}
              mostrarAviso={mostrarAviso}
              ocultarAviso={ocultarAviso}
            />
          ))}
          {sinMedicion.length > 0 && (
            <ul className="space-y-0.5 text-xs text-slate-600">
              {sinMedicion.map((e) => (
                <li key={e.numero}>
                  Salida {e.numero} · {e.nombre} {e.medida} — {e.fuente.toLowerCase()}
                </li>
              ))}
            </ul>
          )}
        </section>

        <DiagramaAccesorio imagenes={imagenes} />
      </div>

      <TooltipFueraDeRango aviso={aviso} porCodigo={porCodigo} />

      {fueraDeRango.length > 0 && (
        <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <p className="font-semibold">Medidas fuera de rango ({fueraDeRango.length})</p>
          <ul className="mt-1 list-inside list-disc text-xs">
            {fueraDeRango.map((r) => {
              const [salida, cota] = r.codigo.split('.')
              return (
                <li key={r.codigo}>
                  Salida {salida.slice(1)} · {cota} ({etiquetaDe[r.codigo]}): {motivoFueraDeRango(r)}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {envio.estado !== 'inactivo' && (
        <div
          role="status"
          className={`space-y-1 rounded border px-3 py-2 text-sm ${
            envio.estado === 'error'
              ? 'border-red-200 bg-red-50 text-red-800'
              : envio.estado === 'ok'
                ? 'border-green-200 bg-green-50 text-green-800'
                : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
        >
          <p>{envio.mensaje}</p>
          {envio.advertencias.length > 0 && (
            <ul className="list-inside list-disc text-xs text-amber-800">
              {envio.advertencias.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-wrap justify-center gap-4 border-t border-slate-200 pt-4">
        <button
          type="button"
          disabled={!onGuardar || guardando || yaGuardado}
          onClick={guardar}
          title={yaGuardado ? 'Ya guardado; modifique una medida para guardar otra versión' : 'Guardar el ensayo (se permite incompleto)'}
          className="w-36 rounded border border-slate-800 bg-slate-800 px-4 py-2 text-sm text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-100 disabled:text-slate-400"
        >
          {guardando ? 'Guardando…' : yaGuardado ? 'Guardado' : 'Aceptar'}
        </button>
        <button
          type="button"
          onClick={() => {
            setMediciones({})
            setEnvio(SIN_ENVIO)
          }}
          className="w-36 rounded border border-slate-400 bg-white px-4 py-2 text-sm text-slate-800 hover:bg-slate-50"
        >
          Limpiar
        </button>
        {onAtras && (
          <button
            type="button"
            onClick={onAtras}
            className="w-36 rounded border border-slate-400 bg-white px-4 py-2 text-sm text-slate-800 hover:bg-slate-50"
          >
            Atrás
          </button>
        )}
      </div>
    </div>
  )
}
