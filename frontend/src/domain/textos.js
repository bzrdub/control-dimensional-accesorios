// Formato de números y mensajes de medición (puros, sin React).

export const n = (v) => String(Number(Number(v).toFixed(3)))
export const fmtDesv = (d) => (d > 0 ? `+${n(d)}` : n(d))

export const plural = (k, uno, varios) => `${k} ${k === 1 ? uno : varios}`

/** Mensaje tras guardar un ensayo, a partir de lo que evaluó el servidor. */
export function mensajeGuardado(r) {
  const faltan = r.mediciones.filter((m) => m.valor === null && !m.registro).length
  const fuera = r.mediciones.filter((m) => m.estado === 'NO_CONFORME').length
  const partes = [`Ensayo N° ${r.id} guardado`]
  if (faltan) partes.push(`borrador: ${plural(faltan, 'medida pendiente', 'medidas pendientes')}`)
  if (fuera) partes.push(plural(fuera, 'medida fuera de rango', 'medidas fuera de rango'))
  return partes.join(' · ') + '.'
}

/** Producto como en la columna "Producto" de la hoja GLOBAL: "Codo 45° - PN-20 25[mm] x 25[mm]". */
export const etiquetaProducto = (e) => (e.referencia ? `${e.producto} - ${e.referencia}` : e.producto)

/** Motivo de una medición fuera de rango (tooltip de la casilla y resumen). `r` = resultado de evaluarCota. */
export function motivoFueraDeRango(r) {
  const v = n(r.valor)
  const desv = `desviación ${fmtDesv(r.desviacion)} mm`
  if (r.min !== null && r.max !== null) return `Valor medido ${v} fuera del rango permitido [${n(r.min)} – ${n(r.max)}] · ${desv}`
  if (r.min !== null) return `Valor medido ${v} bajo el mínimo permitido (≥ ${n(r.min)}) · ${desv}`
  return `Valor medido ${v} sobre el máximo permitido (≤ ${n(r.max)}) · ${desv}`
}
