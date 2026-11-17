// Columnas de la vista "mediciones por accesorio", agrupadas como las hojas numeradas de la planilla:
// "Medición Extremo 1 | Medición Extremo 2 | …" y, dentro de cada extremo, sus cotas.

/** "E1.D1min" → "D1_min" (nomenclatura de los formularios VBA) */
export const codigoCorto = (codigo) => codigo.split('.')[1].replace(/(min|max)$/, '_$1')

/**
 * @param {Array<{mediciones: Array<{codigo, etiqueta}>}>} ensayos  ingresos de un mismo accesorio
 * @returns {Array<{extremo:number, columnas:Array<{codigo, etiqueta, corto}>}>}
 *   Unión de las cotas de todos los ingresos (los productos de un accesorio pueden variar),
 *   ordenada por extremo y luego por el orden de medición.
 */
export function columnasPorExtremo(ensayos) {
  const columnas = new Map()
  for (const e of ensayos) {
    e.mediciones.forEach((m, orden) => {
      if (columnas.has(m.codigo)) return
      const extremo = Number(m.codigo.split('.')[0].slice(1))
      columnas.set(m.codigo, { codigo: m.codigo, etiqueta: m.etiqueta, corto: codigoCorto(m.codigo), extremo, orden })
    })
  }
  const grupos = []
  for (const c of [...columnas.values()].sort((a, b) => a.extremo - b.extremo || a.orden - b.orden)) {
    const g = grupos.at(-1)
    if (g?.extremo === c.extremo) g.columnas.push(c)
    else grupos.push({ extremo: c.extremo, columnas: [c] })
  }
  return grupos.map(({ extremo, columnas: cs }) => ({
    extremo,
    columnas: cs.map(({ codigo, etiqueta, corto }) => ({ codigo, etiqueta, corto })),
  }))
}
