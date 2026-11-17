import { test } from 'node:test'
import assert from 'node:assert/strict'
import { evaluarCota } from './validacion.js'
import { motivoFueraDeRango } from './textos.js'

test('tooltip fuera de rango: rango completo y límites de un solo lado', () => {
  assert.equal(
    motivoFueraDeRango(evaluarCota({ codigo: 'D1', min: 63, max: 63.6 }, 63.8)),
    'Valor medido 63.8 fuera del rango permitido [63 – 63.6] · desviación +0.2 mm',
  )
  assert.equal(
    motivoFueraDeRango(evaluarCota({ codigo: 'e', min: 5, max: null }, 4.5)),
    'Valor medido 4.5 bajo el mínimo permitido (≥ 5) · desviación -0.5 mm',
  )
  assert.equal(
    motivoFueraDeRango(evaluarCota({ codigo: 'ov', min: null, max: 1.2 }, 1.5)),
    'Valor medido 1.5 sobre el máximo permitido (≤ 1.2) · desviación +0.3 mm',
  )
})
