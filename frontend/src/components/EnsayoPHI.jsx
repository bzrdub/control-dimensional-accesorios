import { useEffect, useState } from 'react'
import Modal from './ui/Modal.jsx'
import CampoFecha from './ui/CampoFecha.jsx'
import { hoyISO } from '../domain/fechas.js'
import { listarEnsayos, registrarPHI } from '../data/ensayos.js'
import { etiquetaProducto } from '../domain/textos.js'
import { FALLAS_PHI as FALLAS, nombreFalla } from '../config/registro.js'

// "ENSAYO PHI" (como fmIngresoPHI + fmFallaPHI del VBA): se elige fecha y despacho, se ingresan las
// condiciones comunes (presión, temperatura, tiempo) y, por cada accesorio ensayado, "Sin fallas" o
// la falla (Ruptura / Filtración) con su tiempo de fallo.

const esNumero = (v) => v !== '' && Number.isFinite(Number(v)) && Number(v) >= 0

const claseCampo =
  'w-full rounded border border-slate-400 bg-white px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 disabled:bg-slate-100 disabled:text-slate-400'

export default function EnsayoPHI({ material, fusion, despachoSugerido = 1, onCancelar, onRegistrado }) {
  const [fecha, setFecha] = useState(hoyISO)
  const [despacho, setDespacho] = useState(String(despachoSugerido))
  const [cond, setCond] = useState({ presion: '', temperatura: '', tiempo: '' })
  const [lista, setLista] = useState({ clave: null, ensayos: [], error: null })
  const [filas, setFilas] = useState({}) // id → { ensayado, falla, tiempoFalla }
  const [error, setError] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const clave = /^\d+$/.test(despacho) && fecha ? `${fecha}|${despacho}` : null

  useEffect(() => {
    if (!clave) return
    let vigente = true
    listarEnsayos({ material, fusion, fecha, despacho, limite: 500 })
      .then((d) => vigente && setLista({ clave, ensayos: d.resultados, error: null }))
      .catch((e) => vigente && setLista({ clave, ensayos: [], error: e.message }))
    return () => {
      vigente = false
    }
  }, [clave, material, fusion, fecha, despacho])

  const cargando = clave !== null && lista.clave !== clave
  const ensayos = lista.clave === clave ? lista.ensayos : []
  const fila = (id) => filas[id] ?? { ensayado: false, falla: 'SIN_FALLAS', tiempoFalla: '' }
  const cambiarFila = (id, cambios) => {
    setFilas((f) => ({ ...f, [id]: { ...fila(id), ...cambios } }))
    setError(null)
  }
  const seleccionados = ensayos.filter((e) => fila(e.id).ensayado)
  const todos = ensayos.length > 0 && seleccionados.length === ensayos.length

  const aceptar = async (ev) => {
    ev.preventDefault()
    if (!['presion', 'temperatura', 'tiempo'].every((k) => esNumero(cond[k]))) {
      setError('Faltan condiciones de ensayo: ponga el valor 0 (cero) si lo desconoce.')
      return
    }
    if (seleccionados.length === 0) {
      setError('Marque al menos un accesorio ensayado.')
      return
    }
    const sinTiempo = seleccionados.filter((e) => fila(e.id).falla !== 'SIN_FALLAS' && !esNumero(fila(e.id).tiempoFalla))
    if (sinTiempo.length) {
      setError(`Ingrese el tiempo de fallo de: ${sinTiempo.map(etiquetaProducto).join('; ')}.`)
      return
    }
    setEnviando(true)
    try {
      const r = await registrarPHI({
        presion: Number(cond.presion),
        temperatura: Number(cond.temperatura),
        tiempo: Number(cond.tiempo),
        resultados: seleccionados.map((e) => {
          const f = fila(e.id)
          return { id: e.id, falla: f.falla, tiempoFalla: f.falla === 'SIN_FALLAS' ? null : Number(f.tiempoFalla) }
        }),
      })
      onRegistrado(r.resultados)
    } catch (e) {
      setError(e.message)
      setEnviando(false)
    }
  }

  return (
    <Modal titulo="Ensayo PHI" ancho="max-w-4xl" onCerrar={onCancelar}>
      <form onSubmit={aceptar} className="space-y-5" noValidate>
        <fieldset className="flex flex-wrap gap-4">
          <legend className="mb-2 text-sm font-semibold text-slate-800">Accesorios del despacho</legend>
          <label className="space-y-1 text-sm">
            <span className="block">Fecha:</span>
            <CampoFecha value={fecha} max={hoyISO()} onChange={setFecha} className={`${claseCampo} w-36`} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="block">Despacho:</span>
            <input type="number" min="1" step="1" value={despacho} onChange={(e) => setDespacho(e.target.value)} className={`${claseCampo} w-24 text-center`} />
          </label>
        </fieldset>

        <fieldset className="grid gap-4 sm:grid-cols-3">
          <legend className="mb-2 text-sm font-semibold text-slate-800">Condiciones de ensayo (comunes)</legend>
          {[
            ['presion', 'Presión de ensayo [MPa]'],
            ['temperatura', 'Temperatura de ensayo [°C]'],
            ['tiempo', 'Tiempo de ensayo [h]'],
          ].map(([k, etiqueta]) => (
            <label key={k} className="space-y-1 text-sm">
              <span className="block">{etiqueta}</span>
              <input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={cond[k]}
                onChange={(e) => {
                  setCond((c) => ({ ...c, [k]: e.target.value }))
                  setError(null)
                }}
                className={`${claseCampo} tabular-nums`}
              />
            </label>
          ))}
        </fieldset>

        <div className="overflow-x-auto rounded border border-slate-300 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-left text-xs uppercase text-slate-600">
              <tr>
                <th className="px-2 py-2">
                  <input
                    type="checkbox"
                    aria-label="Marcar todos"
                    checked={todos}
                    disabled={ensayos.length === 0}
                    onChange={(e) => setFilas(Object.fromEntries(ensayos.map((x) => [x.id, { ...fila(x.id), ensayado: e.target.checked }])))}
                  />
                </th>
                <th className="px-2 py-2">Hora</th>
                <th className="px-2 py-2">Producto</th>
                <th className="px-2 py-2">Resultado</th>
                <th className="px-2 py-2">Tiempo de fallo [h]</th>
              </tr>
            </thead>
            <tbody>
              {cargando && (
                <tr>
                  <td colSpan={5} className="px-2 py-4 text-center text-slate-500">Cargando…</td>
                </tr>
              )}
              {!cargando && lista.error && (
                <tr>
                  <td colSpan={5} className="px-2 py-4 text-center text-red-700">{lista.error}</td>
                </tr>
              )}
              {!cargando && !lista.error && ensayos.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-2 py-4 text-center text-slate-500">
                    No hay accesorios ingresados en el despacho {despacho || '—'} de esa fecha.
                  </td>
                </tr>
              )}
              {ensayos.map((e) => {
                const f = fila(e.id)
                const conFalla = f.falla !== 'SIN_FALLAS'
                return (
                  <tr key={e.id} className="border-t border-slate-200 align-top">
                    <td className="px-2 py-1.5">
                      <input
                        type="checkbox"
                        aria-label={`Ensayado: ${etiquetaProducto(e)}`}
                        checked={f.ensayado}
                        onChange={(ev) => cambiarFila(e.id, { ensayado: ev.target.checked })}
                      />
                    </td>
                    <td className="px-2 py-1.5 tabular-nums">{e.hora}</td>
                    <td className="px-2 py-1.5">
                      {etiquetaProducto(e)}
                      {e.phi && (
                        <span className="block text-xs text-amber-700">
                          Ya tiene PHI ({nombreFalla(e.phi.falla)}); se reemplazará si lo marca.
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5">
                      <select
                        value={f.falla}
                        disabled={!f.ensayado}
                        onChange={(ev) => cambiarFila(e.id, { falla: ev.target.value })}
                        className={`${claseCampo} w-36 ${f.ensayado && conFalla ? 'border-red-500 text-red-800' : ''}`}
                      >
                        {FALLAS.map((x) => (
                          <option key={x.id} value={x.id}>{x.nombre}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        inputMode="decimal"
                        aria-label={`Tiempo de fallo: ${etiquetaProducto(e)}`}
                        placeholder={conFalla ? '' : 'N/A'}
                        value={conFalla ? f.tiempoFalla : ''}
                        disabled={!f.ensayado || !conFalla}
                        onChange={(ev) => cambiarFila(e.id, { tiempoFalla: ev.target.value })}
                        className={`${claseCampo} w-28 tabular-nums`}
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {error && <p role="alert" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

        <div className="flex justify-center gap-6">
          <button
            type="submit"
            disabled={enviando}
            className="w-36 rounded border border-orange-600 bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600 disabled:opacity-60"
          >
            {enviando ? 'Guardando…' : 'Aceptar'}
          </button>
          <button type="button" onClick={onCancelar} className="w-36 rounded border border-slate-400 bg-white px-4 py-2 text-sm text-slate-800 hover:bg-slate-50">
            Cancelar
          </button>
        </div>
      </form>
    </Modal>
  )
}
