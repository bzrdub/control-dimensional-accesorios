// Construye la especificación evaluable de un producto (pura, sin React ni red):
// producto (de la MATRIZ) + mapeo de extremos + tabla de tolerancias → extremos con cotas y límites.
//
// Una regla de límite (`min` / `max` de una cota en src/config/extremos/*.js) puede ser:
//   'Columna'                     → valor de esa columna en la fila del diámetro, en la hoja del extremo
//   5                             → valor fijo
//   (v) => v.A - 2 * v.B          → cálculo sobre los valores de la fila del extremo
//   { hoja: '1', columna: 'X' }   → columna de OTRA hoja, misma dimensión
// Un tipo de extremo con `sinMedicion: true` (p. ej. rosca metálica) se muestra pero no tiene cotas.
// Cota con valor nominal: { nominal: <regla>, tolerancia: null | 0.5 | { menos, mas } }
//   tolerancia null → "solo registro" mostrando el nominal (desviación informativa, sin veredicto)
//   tolerancia numérica → límites nominal − menos … nominal + mas
// La definición de un accesorio puede ser un array de extremos o una función (producto) => array.

const buscarFila = (tolerancias, hoja, dn) =>
  tolerancias?.hojas.find((h) => h.hoja === hoja)?.filas.find((f) => f.dimension === dn) ?? null

// Celdas no numéricas de las planillas (p. ej. "-" en flanges) = la tabla no define ese valor.
// Se tratan como null (→ "Sin tolerancia" o registro sin nominal), nunca como límite.
const numeroONull = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null)

function resolverLimite(regla, fila, tolerancias, dn) {
  if (regla === undefined || regla === null) return null
  if (typeof regla === 'number') return regla
  if (typeof regla === 'string') return numeroONull(fila?.valores[regla])
  if (typeof regla === 'function') return fila ? numeroONull(Number(Number(regla(fila.valores)).toFixed(4))) : null
  if (typeof regla === 'object') return numeroONull(buscarFila(tolerancias, regla.hoja, dn)?.valores[regla.columna])
  return null
}

/** Texto de la medida nominal de la boca: "20 mm", "1/2 in"... (desde "Dimensión Nominal" si existe). */
function medidaDeBoca(producto, indice, dn) {
  const partes = String(producto.dimension ?? '').split(/\s+x\s+/)
  const parte = partes.length === producto.diametros?.length ? partes[indice] : null
  return parte ? parte.replace(/\[(mm|in)\]/, ' $1').trim() : `DN ${dn}`
}

/**
 * @param {object} producto  { id, accesorio, pn, diametros, dimension? }
 * @param {object|null} mapeo  ver src/config/extremos/*.js
 * @param {object|null} tolerancias  JSON de generated/tolerancias/<archivo>.json
 * @returns {null | { id, extremos: Array }}  null si el accesorio no tiene mapeo
 */
function construirCota(c, numero, fila, tolerancias, dn) {
  const base = { codigo: `E${numero}.${c.codigo}`, etiqueta: c.etiqueta, unidad: 'mm' }
  if (c.nominal !== undefined) {
    const nominal = resolverLimite(c.nominal, fila, tolerancias, dn)
    const tol = typeof c.tolerancia === 'number' ? { menos: c.tolerancia, mas: c.tolerancia } : c.tolerancia
    if (!tol || nominal === null) return { ...base, conNominal: true, nominal, registro: true, min: null, max: null }
    const r = (x) => Number(x.toFixed(4))
    return { ...base, conNominal: true, nominal, registro: false, min: r(nominal - tol.menos), max: r(nominal + tol.mas) }
  }
  return {
    ...base,
    nominal: null,
    registro: Boolean(c.registro),
    min: c.registro ? null : resolverLimite(c.min, fila, tolerancias, dn),
    max: c.registro ? null : resolverLimite(c.max, fila, tolerancias, dn),
  }
}

export function construirEspecificacion(producto, mapeo, tolerancias) {
  const entrada = mapeo?.accesorios[producto.accesorio]
  const definicion = typeof entrada === 'function' ? entrada(producto) : entrada
  if (!definicion) return null

  const extremos = definicion.map(([tipoId, indice], i) => {
    const numero = i + 1
    const tipo = mapeo.tipos[tipoId]
    const dn = producto.diametros[indice]
    const base = { numero, tipo: tipoId, nombre: tipo.nombre, dn, medida: medidaDeBoca(producto, indice, dn) }

    if (tipo.sinMedicion) {
      return { ...base, sinMedicion: true, sinTolerancia: false, fuente: tipo.nota ?? 'Sin medición dimensional', cotas: [] }
    }

    const hoja = tipo.hoja(producto)
    const tabla = tolerancias?.hojas.find((h) => h.hoja === hoja) ?? null
    const fila = buscarFila(tolerancias, hoja, dn)

    return {
      ...base,
      sinMedicion: false,
      fuente: tabla ? `Hoja ${hoja} · ${tabla.nombre}` : `Hoja ${hoja ?? '?'} no encontrada`,
      sinTolerancia: !fila,
      cotas: tipo.cotas.map((c) => construirCota(c, numero, fila, tolerancias, dn)),
    }
  })

  return { id: producto.id, extremos }
}

export const cotasDe = (especificacion) => especificacion.extremos.flatMap((e) => e.cotas)
