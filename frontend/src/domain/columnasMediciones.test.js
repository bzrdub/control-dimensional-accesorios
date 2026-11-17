import { test } from 'node:test'
import assert from 'node:assert/strict'
import { columnasPorExtremo, codigoCorto } from './columnasMediciones.js'

const m = (codigo, etiqueta = codigo) => ({ codigo, etiqueta })

test('agrupa por extremo, une cotas de distintos productos y respeta el orden de medición', () => {
  const grupos = columnasPorExtremo([
    { mediciones: [m('E1.L1'), m('E1.D1min'), m('E2.L1'), m('E2.D1min')] },
    { mediciones: [m('E1.L1'), m('E1.D1min'), m('E1.ov'), m('E2.L1'), m('E2.D1min'), m('E3.e')] },
  ])
  assert.deepEqual(
    grupos.map((g) => [g.extremo, g.columnas.map((c) => c.corto)]),
    [
      [1, ['L1', 'D1_min', 'ov']],
      [2, ['L1', 'D1_min']],
      [3, ['e']],
    ],
  )
  assert.equal(codigoCorto('E10.D1max'), 'D1_max')
  assert.deepEqual(columnasPorExtremo([]), [])
})
