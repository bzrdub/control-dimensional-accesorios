// Composición pura mapeo + tablas → especificación (sin Vite). La usan la app (data/tolerancias.js)
// y el generador de especificaciones del backend (scripts/generar-especificaciones.mjs).
import { getMapeo } from '../config/extremos/index.js'
import { construirEspecificacion } from '../domain/especificacion.js'

/**
 * @param {object} producto  producto normalizado (domain/catalogo.js)
 * @param {Record<string, object>} tablas  { 'pp-rct': <json de tolerancias>, ... }
 */
export function especificacionDeProducto(producto, tablas) {
  const mapeo = getMapeo(producto.material, producto.fusion)
  if (!mapeo) return null
  return construirEspecificacion(producto, mapeo, tablas[mapeo.tolerancias] ?? null)
}
