// Genera compartido/generated/especificaciones.json: la especificación normativa (cotas y límites)
// de cada producto con mapeo, construida con EXACTAMENTE el mismo código que usa la app.
// El backend Django valida contra este archivo; no recibe límites del navegador.
//
// Uso (desde frontend/):  npm run especificaciones
// Ejecutar después de `node .tools/xl/extraer.cjs` o de cambiar src/config/extremos/*.js.
// La prueba src/data/especificacionesGeneradas.test.js falla si el archivo quedó desactualizado.
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { normalizarCatalogo } from '../src/domain/catalogo.js'
import { cotasDe } from '../src/domain/especificacion.js'
import { especificacionDeProducto } from '../src/data/especificacionProducto.js'

const GENERADOS = new URL('../src/data/generated/', import.meta.url)
export const SALIDA = new URL('../../compartido/generated/especificaciones.json', import.meta.url)

const leerJson = (url) => JSON.parse(readFileSync(url, 'utf8'))

function archivosJson(dir) {
  return readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((e) => e.isFile() && e.name.endsWith('.json'))
    .map((e) => `${e.parentPath ?? e.path}/${e.name}`.replaceAll('\\', '/'))
    .sort()
}

const esLimite = (x) => x === null || (typeof x === 'number' && Number.isFinite(x))

export function construirTodas() {
  const tablas = {}
  for (const ruta of archivosJson(fileURLToPath(new URL('tolerancias/', GENERADOS)))) {
    tablas[ruta.split('/').pop().replace('.json', '')] = JSON.parse(readFileSync(ruta, 'utf8'))
  }

  const especificaciones = {}
  for (const ruta of archivosJson(fileURLToPath(new URL('productos/', GENERADOS)))) {
    for (const p of normalizarCatalogo(JSON.parse(readFileSync(ruta, 'utf8'))).productos) {
      const e = especificacionDeProducto(p, tablas)
      if (!e) continue
      if (especificaciones[p.id]) throw new Error(`Producto duplicado: ${p.id}`)
      const cotas = cotasDe(e).map(({ codigo, etiqueta, min, max, nominal, registro }) => {
        const cota = { codigo, etiqueta, min: min ?? null, max: max ?? null, nominal: nominal ?? null, registro: Boolean(registro) }
        for (const k of ['min', 'max', 'nominal']) {
          if (!esLimite(cota[k])) throw new Error(`${p.id} ${codigo}: ${k} no numérico (${JSON.stringify(cota[k])})`)
        }
        return cota
      })
      especificaciones[p.id] = {
        material: p.material,
        fusion: p.fusion,
        accesorio: String(p.accesorio),
        producto: p.producto,
        referencia: p.referencia ?? '',
        cotas,
      }
    }
  }

  const ordenadas = Object.fromEntries(Object.keys(especificaciones).sort().map((k) => [k, especificaciones[k]]))
  return {
    _descripcion:
      'GENERADO por frontend/scripts/generar-especificaciones.mjs. NO editar a mano. ' +
      'Especificación normativa por producto (id = material|fusion|producto|referencia).',
    especificaciones: ordenadas,
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const datos = construirTodas()
  mkdirSync(new URL('./', SALIDA), { recursive: true })
  writeFileSync(SALIDA, JSON.stringify(datos, null, 1) + '\n', 'utf8')
  const n = Object.keys(datos.especificaciones).length
  console.log(`${n} especificaciones → ${fileURLToPath(SALIDA)}`)
}

export const leerGenerado = () => leerJson(SALIDA)
