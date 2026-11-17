import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { SALIDA, construirTodas, leerGenerado } from '../../scripts/generar-especificaciones.mjs'

// El backend valida contra compartido/generated/especificaciones.json. Si esta prueba falla,
// el archivo no refleja los mapeos/tablas actuales: ejecutar `npm run especificaciones`.
// Sin datos (clon recién descargado, antes de `npm run datos:demo`) se omite.
const hayDatos = existsSync(new URL('./generated/productos/', import.meta.url))

test('especificaciones del backend al día con los mapeos y tablas', { skip: !hayDatos && 'sin datos: ejecute npm run datos:demo' }, () => {
  assert.ok(existsSync(SALIDA), 'Falta compartido/generated/especificaciones.json (npm run especificaciones)')
  assert.deepEqual(leerGenerado(), construirTodas())
})
