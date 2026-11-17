import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { evaluarCota, evaluarEspecificacion, ESTADO } from './validacion.js'

const cota = { codigo: 'D1', min: 63.0, max: 63.6 }

test('dentro de tolerancia (límites inclusivos)', () => {
  assert.equal(evaluarCota(cota, 63.0).estado, ESTADO.CONFORME)
  assert.equal(evaluarCota(cota, 63.6).estado, ESTADO.CONFORME)
})

test('fuera de tolerancia calcula desviación', () => {
  const r = evaluarCota(cota, 63.8)
  assert.equal(r.estado, ESTADO.NO_CONFORME)
  assert.equal(r.desviacion, 0.2)
  assert.equal(evaluarCota(cota, 62.9).desviacion, -0.1)
})

test('sin medición', () => {
  assert.equal(evaluarCota(cota, undefined).estado, ESTADO.SIN_DATO)
  assert.equal(evaluarCota(cota, '').estado, ESTADO.SIN_DATO)
})

// Casos compartidos con el backend (backend/ensayos/tests/test_validacion.py).
const compartidos = JSON.parse(readFileSync(new URL('../../../compartido/casos-validacion.json', import.meta.url), 'utf8'))

for (const c of compartidos.cotas) {
  test(`compartido · cota: ${c.nombre}`, () => {
    const r = evaluarCota(c.cota, c.valor)
    assert.equal(r.estado, c.esperado.estado)
    assert.equal(r.desviacion, c.esperado.desviacion)
    if ('valor' in c.esperado) assert.equal(r.valor, c.esperado.valor)
  })
}

for (const c of compartidos.especificaciones) {
  test(`compartido · especificación: ${c.nombre}`, () => {
    assert.equal(evaluarEspecificacion({ id: 'X', cotas: c.cotas }, c.mediciones).estadoGlobal, c.esperado)
  })
}

test('estado global de una especificación', () => {
  const spec = { id: 'X', cotas: [cota, { codigo: 'L1', min: 39, max: 41 }] }
  assert.equal(evaluarEspecificacion(spec, { D1: 63.2, L1: 40 }).estadoGlobal, ESTADO.CONFORME)
  assert.equal(evaluarEspecificacion(spec, { D1: 63.2, L1: 42 }).estadoGlobal, ESTADO.NO_CONFORME)
  assert.equal(evaluarEspecificacion(spec, { D1: 63.2 }).estadoGlobal, ESTADO.SIN_DATO)
})
