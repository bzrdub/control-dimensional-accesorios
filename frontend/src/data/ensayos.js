// Acceso a la API de ensayos (backend Django, ver backend/README.md).
// El servidor evalúa con su propia especificación normativa (compartido/generated/especificaciones.json),
// pone fecha y hora de ingreso, y nunca rechaza un ensayo por estar incompleto o fuera de rango.

async function pedir(url, { metodo = 'GET', cuerpo } = {}) {
  let respuesta
  try {
    respuesta = await fetch(url, {
      method: metodo,
      headers: cuerpo === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    })
  } catch {
    throw new Error('No se pudo conectar con el servidor. ¿Está corriendo el backend?')
  }
  const datos = await respuesta.json().catch(() => ({}))
  if (!respuesta.ok) throw new Error(datos.error ?? `Error ${respuesta.status} del servidor.`)
  return datos
}

/** Listas del formulario de ingreso: { inspectores: string[], marcas: string[], estadosAprobacion } */
export const getCatalogos = () => pedir('/api/catalogos/')

/**
 * Registro global de una combinación material/fusión (más recientes primero).
 * @param {{material, fusion, fecha?: 'AAAA-MM-DD', despacho?: number, limite?: number}} filtros
 * @returns {Promise<{total:number, resultados:Array}>}
 */
export function listarEnsayos(filtros) {
  const q = new URLSearchParams(Object.entries(filtros).filter(([, v]) => v !== undefined && v !== null && v !== ''))
  return pedir(`/api/ensayos/?${q}`)
}

/** Cantidad de ingresos por código de accesorio: { cantidades: { '1': 12, ... } } */
export const cantidadesPorAccesorio = (material, fusion) =>
  pedir(`/api/ensayos/por-accesorio/?${new URLSearchParams({ material, fusion })}`)

/**
 * @param {{productoId, fecha?: 'AAAA-MM-DD', despacho, inspector, marca, numeroOperacion?, cantidadLote?, inspeccionVisual?,
 *          mediciones: Record<string, number>, cotas?: Array}} ensayo
 * @returns {Promise<{id:number, mediciones:Array, advertencias:string[]}>}
 */
export const guardarEnsayo = (ensayo) => pedir('/api/ensayos/', { metodo: 'POST', cuerpo: ensayo })

/** Estado de aprobación manual: 'EN_PROCESO' | 'APROBADO' | 'RECHAZADO'. */
export const cambiarEstadoAprobacion = (id, estadoAprobacion) =>
  pedir(`/api/ensayos/${id}/`, { metodo: 'PATCH', cuerpo: { estadoAprobacion } })

/**
 * Ensayo PHI con condiciones comunes sobre varios accesorios.
 * @param {{presion, temperatura, tiempo, resultados: Array<{id, falla: 'SIN_FALLAS'|'RUPTURA'|'FILTRACION', tiempoFalla?}>}} phi
 */
export const registrarPHI = (phi) => pedir('/api/ensayos/phi/', { metodo: 'POST', cuerpo: phi })
