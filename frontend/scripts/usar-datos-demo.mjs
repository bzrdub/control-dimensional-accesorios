// Instala los datos DEMO (ficticios) para que el proyecto funcione al clonarlo desde GitHub.
//
// Los datos reales (catálogo, tolerancias e imágenes) se extraen de las planillas de la planta con
// `.tools/xl/extraer.cjs` y no se versionan. Este script copia frontend/datos-demo/ a src/data/generated/
// y genera compartido/generated/especificaciones.json (la norma que usa el backend).
//
// Uso (desde frontend/):  npm run datos:demo           (no toca datos reales si existen)
//                         npm run datos:demo -- --forzar
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const DEMO = fileURLToPath(new URL('../datos-demo/', import.meta.url))
const DESTINO = fileURLToPath(new URL('../src/data/generated/', import.meta.url))
const forzar = process.argv.includes('--forzar')

function hayDatosReales() {
  if (!existsSync(DESTINO)) return false
  const jsons = readdirSync(DESTINO, { recursive: true }).filter((f) => String(f).endsWith('.json') && !String(f).endsWith('imagenes.json'))
  return jsons.some((f) => !JSON.parse(readFileSync(`${DESTINO}/${f}`, 'utf8')).demo)
}

if (hayDatosReales() && !forzar) {
  console.error('src/data/generated/ ya tiene datos reales: no se reemplazan (use --forzar si de verdad quiere los DEMO).')
  process.exit(1)
}

rmSync(DESTINO, { recursive: true, force: true })
mkdirSync(DESTINO, { recursive: true })
cpSync(DEMO, DESTINO, { recursive: true })

// Especificaciones del backend a partir de los datos recién copiados (import dinámico: lee los archivos nuevos).
const { SALIDA, construirTodas } = await import('./generar-especificaciones.mjs')
const datos = construirTodas()
mkdirSync(new URL('./', SALIDA), { recursive: true })
writeFileSync(SALIDA, JSON.stringify(datos, null, 1) + '\n', 'utf8')
console.log(`Datos DEMO instalados: ${Object.keys(datos.especificaciones).length} productos con especificación.`)
