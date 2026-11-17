// Imágenes de referencia por accesorio (esquemas de norma + foto), como en los formularios VBA.
// Origen: ./generated/imagenes.json, generado por `node .tools/xl/imagenes.cjs` (que también copia los
// archivos a frontend/public/images). NO editar a mano: modificar la tabla del script y regenerar.
// Glob (no import directo): sin datos generados la app compila igual y simplemente no muestra imágenes.
const IMAGENES = Object.values(import.meta.glob('./generated/imagenes.json', { eager: true, import: 'default' }))[0] ?? {}

/**
 * @returns {{ src: string, titulo: string, tipo: 'norma' | 'foto' }[]}  esquemas primero, foto al final
 */
export function imagenesDe(producto) {
  const def = IMAGENES[`${producto.material}|${producto.fusion}`]?.[producto.accesorio]
  if (!def) return []
  const lista = def.norma.map((n) => ({ ...n, tipo: 'norma' }))
  const foto = typeof def.foto === 'string' ? def.foto : def.foto?.[producto.producto]
  if (foto) lista.push({ src: foto, titulo: 'Foto del accesorio', tipo: 'foto' })
  return lista
}
