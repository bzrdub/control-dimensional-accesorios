// Acceso a tablas de tolerancias por extremo y armado de la especificación de un producto.
// Origen: ./generated/tolerancias/<archivo>.json  (generado por `node .tools/xl/extraer.cjs`, NO editar a mano)
import { getMapeo } from '../config/extremos/index.js'
import { especificacionDeProducto } from './especificacionProducto.js'

const archivos = import.meta.glob('./generated/tolerancias/*.json', { eager: true, import: 'default' })
const TABLAS = Object.fromEntries(
  Object.entries(archivos).map(([ruta, json]) => [ruta.split('/').pop().replace('.json', ''), json]),
)

/** Especificación evaluable del producto, o null si su combinación/accesorio aún no tiene mapeo. */
export const especificacionDe = (producto) => especificacionDeProducto(producto, TABLAS)

/** Motivo por el que un producto aún no es evaluable (para mostrar al usuario). */
export function motivoPendiente(producto) {
  const mapeo = getMapeo(producto.material, producto.fusion)
  if (!mapeo) return 'Esta combinación de material y fusión aún no tiene mapeo de extremos.'
  return mapeo.pendientes?.[producto.accesorio] ?? 'Este accesorio aún no tiene mapeo de extremos.'
}
