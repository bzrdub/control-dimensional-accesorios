// Lógica pura de validación dimensional (sin React, sin red).
// Se podrá replicar 1:1 en Django para que backend y frontend den el mismo veredicto.

export const ESTADO = {
  CONFORME: 'CONFORME',
  NO_CONFORME: 'NO_CONFORME',
  SIN_DATO: 'SIN_DATO',
  SIN_TOLERANCIA: 'SIN_TOLERANCIA', // la cota debería evaluarse pero no hay límite en la tabla
  REGISTRO: 'REGISTRO', //             solo se registra, no se evalúa
}

const vacio = (v) => v === null || v === undefined || v === '' || Number.isNaN(Number(v))

/**
 * Evalúa una medición contra una cota. Límites inclusivos; min o max pueden ser null (límite de un lado).
 * @param {{codigo:string, min?:number|null, max?:number|null, registro?:boolean}} cota
 * @param {number|string|null|undefined} valor
 */
export function evaluarCota(cota, valor) {
  const min = cota.min ?? null
  const max = cota.max ?? null
  const base = { codigo: cota.codigo, valor: vacio(valor) ? null : Number(valor), min, max, desviacion: null }

  if (cota.registro) {
    // Desviación solo informativa respecto del nominal, si existe.
    const nominal = cota.nominal ?? null
    const desviacion = nominal !== null && base.valor !== null ? Number((base.valor - nominal).toFixed(4)) : null
    return { ...base, estado: ESTADO.REGISTRO, desviacion }
  }
  if (min === null && max === null) return { ...base, estado: ESTADO.SIN_TOLERANCIA }
  if (base.valor === null) return { ...base, estado: ESTADO.SIN_DATO }

  const v = base.valor
  let desviacion = 0
  if (min !== null && v < min) desviacion = v - min
  else if (max !== null && v > max) desviacion = v - max
  return {
    ...base,
    estado: desviacion === 0 ? ESTADO.CONFORME : ESTADO.NO_CONFORME,
    desviacion: Number(desviacion.toFixed(4)),
  }
}

/**
 * Evalúa todas las cotas. Las de solo registro no influyen en el resultado global.
 * Global: NO_CONFORME > SIN_TOLERANCIA > SIN_DATO > CONFORME.
 * @param {{id:string, cotas:Array}} especificacion
 * @param {Record<string, number|string>} mediciones  p. ej. { 'E1.L1': 63.2 }
 */
export function evaluarEspecificacion(especificacion, mediciones = {}) {
  const resultados = especificacion.cotas.map((c) => evaluarCota(c, mediciones[c.codigo]))
  const estados = new Set(resultados.map((r) => r.estado))
  const estadoGlobal =
    [ESTADO.NO_CONFORME, ESTADO.SIN_TOLERANCIA, ESTADO.SIN_DATO].find((e) => estados.has(e)) ?? ESTADO.CONFORME
  return { especificacionId: especificacion.id, estadoGlobal, resultados }
}
