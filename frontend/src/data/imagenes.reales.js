// Pruebas contra las imágenes reales de planta (no versionadas). Se cargan desde imagenes.test.js.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const leer = (rel) => JSON.parse(fs.readFileSync(new URL(rel, import.meta.url)))
const IMAGENES = leer('./generated/imagenes.json')

// Accesorios sin ninguna imagen en Matrices/Imágenes (clave "MATERIAL|FUSION|código").
const SIN_IMAGEN = ['PP-RCT|SOCKET|10'] // Codo 90° - Cuello Corto - Terminal Plástico HE

test('cada accesorio de los catálogos tiene esquema de norma (salvo excepciones conocidas)', () => {
  const sinEsquema = []
  for (const material of ['hdpe', 'pp-rct'])
    for (const fusion of ['electrofusion', 'socket', 'tope']) {
      const cat = leer(`./generated/productos/${material}/${fusion}.json`)
      for (const a of cat.accesorios) {
        const def = IMAGENES[`${cat.material}|${cat.fusion}`]?.[a.codigo]
        if (!def?.norma?.length) sinEsquema.push(`${cat.material}|${cat.fusion}|${a.codigo}`)
      }
    }
  assert.deepEqual(sinEsquema, SIN_IMAGEN)
})

test('todas las imágenes referenciadas existen en frontend/public', () => {
  const rutas = []
  for (const combo of Object.values(IMAGENES))
    for (const def of Object.values(combo)) {
      rutas.push(...def.norma.map((n) => n.src))
      if (typeof def.foto === 'string') rutas.push(def.foto)
      else if (def.foto) rutas.push(...Object.values(def.foto).filter(Boolean))
    }
  assert.ok(rutas.length > 150)
  for (const src of rutas) assert.ok(fs.existsSync(new URL(`../../public${src}`, import.meta.url)), `falta ${src}`)
})

test('Flange: la foto depende de la variante del producto', () => {
  const fotos = IMAGENES['HDPE|TOPE']['5'].foto
  assert.deepEqual(Object.keys(fotos).sort(), ['Flange Acero Carbono', 'Flange Alma de Acero'])
})
