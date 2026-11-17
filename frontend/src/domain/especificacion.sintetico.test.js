import { test } from 'node:test'
import assert from 'node:assert/strict'
import { construirEspecificacion, cotasDe } from './especificacion.js'
import { evaluarEspecificacion, ESTADO } from './validacion.js'

// Pruebas con tablas sintéticas: no dependen de los datos de planta.

test('celdas no numéricas ("-") de la planilla quedan sin límite, no como límite de texto', () => {
  const tabla = { hojas: [{ hoja: '1', nombre: 'Prueba', filas: [{ dimension: 110, valores: { A: '-', B: 5, N: '-' } }] }] }
  const m = {
    accesorios: { X: [['T', 0]] },
    tipos: {
      T: {
        nombre: 'Prueba',
        hoja: () => '1',
        cotas: [
          { codigo: 'D', etiqueta: 'D', min: 'A', max: 'B' },
          { codigo: 'C', etiqueta: 'C', min: 'A', max: 'A' },
          { codigo: 'R', etiqueta: 'R', nominal: 'N', tolerancia: null },
          { codigo: 'F', etiqueta: 'F', min: (v) => v.A - 1, max: null },
        ],
      },
    },
  }
  const esp = construirEspecificacion({ id: 'x', accesorio: 'X', diametros: [110] }, m, tabla)
  const [d, c, r, f] = esp.extremos[0].cotas
  assert.deepEqual([d.min, d.max], [null, 5])
  assert.deepEqual([c.min, c.max], [null, null])
  assert.equal(r.nominal, null)
  assert.equal(f.min, null)
  const res = evaluarEspecificacion({ id: 'x', cotas: cotasDe(esp) }, { 'E1.C': 999, 'E1.R': 1 })
  assert.equal(res.resultados[1].estado, ESTADO.SIN_TOLERANCIA) // antes: CONFORME por comparar contra "-"
  assert.equal(res.resultados[2].desviacion, null) // antes: NaN
})
