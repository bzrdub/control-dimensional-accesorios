// Capa de acceso a datos. Hoy lee los JSON generados desde las planillas; mañana hará fetch
// a la API de Django manteniendo la misma firma asíncrona, para no tocar los componentes.
//
// Origen: ./generated/productos/<material>/<fusion>.json
//   generado por `node .tools/xl/extraer.cjs` desde CONTROL <material>/*.xlsm
//   (hojas LISTADO y MATRIZ DE ACCESORIOS). NO editar a mano: regenerar.
// {
//   material, fusion, fuente,
//   accesorios: [{ codigo, nombre }],          ← orden del LISTADO
//   productos:  [{ accesorio (codigo), producto, pn, sdr, dimension, referencia, diametros, codigo, cotas? }]
// }

import { normalizarCatalogo } from '../domain/catalogo.js'

const archivos = import.meta.glob('./generated/productos/**/*.json', { eager: true, import: 'default' })

const CATALOGOS = {}
for (const a of Object.values(archivos)) {
  ;(CATALOGOS[a.material] ??= {})[a.fusion] = normalizarCatalogo(a)
}

const VACIO = { fuente: null, accesorios: [], productos: [] }

/** Catálogo de una combinación material/fusión: accesorios (orden LISTADO) y productos (orden MATRIZ). */
export async function getCatalogo(materialId, fusionId) {
  return CATALOGOS[materialId]?.[fusionId] ?? VACIO
}

/** "PN-16 SDR-11 32[mm] x 1[in]" → "PN-16 SDR-11 32 mm × 1 in" */
export const etiquetaDimension = (p) =>
  String(p.referencia || p.dimension)
    .replace(/\[(mm|in)\]/g, ' $1')
    .replace(/\s+x\s+/g, ' × ')
