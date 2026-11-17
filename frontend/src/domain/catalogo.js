// Normalización pura de un archivo de productos generado (sin Vite): la usan la app
// (data/especificaciones.js) y el generador de especificaciones del backend (scripts/).

/** Identificador estable de un producto; el backend lo usa para buscar su especificación. */
export const idProducto = (material, fusion, p) => `${material}|${fusion}|${p.producto}|${p.referencia}`

/** { material, fusion, fuente, accesorios, productos } → accesorios con cantidad y productos con id. */
export function normalizarCatalogo(a) {
  const productos = a.productos.map((p) => ({
    ...p,
    id: idProducto(a.material, a.fusion, p),
    material: a.material,
    fusion: a.fusion,
    cotas: p.cotas ?? [],
  }))
  const cantidad = new Map()
  for (const p of productos) cantidad.set(p.accesorio, (cantidad.get(p.accesorio) ?? 0) + 1)
  const accesorios = a.accesorios.map((acc) => ({
    id: acc.codigo,
    nombre: acc.nombre,
    cantidad: cantidad.get(acc.codigo) ?? 0,
  }))
  return { fuente: a.fuente, accesorios, productos }
}
