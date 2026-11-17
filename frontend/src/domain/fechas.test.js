import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isoATexto, mascaraFecha, textoAISO } from './fechas.js'

test('formato chileno dd-mm-aaaa ↔ ISO', () => {
  assert.equal(isoATexto('2026-11-16'), '16-11-2026')
  assert.equal(isoATexto(''), '')
  assert.equal(textoAISO('16-11-2026'), '2026-11-16')
  assert.equal(textoAISO('05-01-2026'), '2026-01-05') // día primero, no mes (formato EE. UU.)
  assert.equal(textoAISO('31-02-2026'), '') // no existe
  assert.equal(textoAISO('29-02-2028'), '2028-02-29') // bisiesto
  assert.equal(textoAISO('16-11-26'), '') // incompleta
  assert.equal(textoAISO('16/11/2026'), '') // solo guiones
})

test('máscara al escribir', () => {
  assert.equal(mascaraFecha('1'), '1')
  assert.equal(mascaraFecha('1611'), '16-11')
  assert.equal(mascaraFecha('16112026'), '16-11-2026')
  assert.equal(mascaraFecha('16-11-20269'), '16-11-2026')
  assert.equal(mascaraFecha('16/11/2026'), '16-11-2026') // si escriben barras, se convierten
})
