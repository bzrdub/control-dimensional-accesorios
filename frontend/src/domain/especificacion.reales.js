// Pruebas contra los datos REALES de planta (src/data/generated/, no versionados).
// Se cargan desde especificacion.test.js solo si esos datos existen.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { construirEspecificacion, cotasDe } from './especificacion.js'
import { evaluarEspecificacion, ESTADO } from './validacion.js'
import mapeo from '../config/extremos/pp-rct-electrofusion.js'
import hdpeSocket from '../config/extremos/hdpe-socket.js'
import ppRctTope from '../config/extremos/pp-rct-tope.js'
import hdpeEF from '../config/extremos/hdpe-electrofusion.js'
import hdpeTope from '../config/extremos/hdpe-tope.js'
import ppRctSocket from '../config/extremos/pp-rct-socket.js'
import { MAPEOS } from '../config/extremos/index.js'
import tolerancias from '../data/generated/tolerancias/pp-rct.json' with { type: 'json' }
import fs from 'node:fs'

const producto = (accesorio, pn, diametros) => ({ id: 'x', accesorio, pn, diametros })
const fila = (hoja, dn) => tolerancias.hojas.find((h) => h.hoja === hoja).filas.find((f) => f.dimension === dn).valores

test('Codo: dos extremos de electrofusión con límites de la hoja 1', () => {
  const esp = construirEspecificacion(producto(1, 'PN-20', [75, 75]), mapeo, tolerancias)
  assert.equal(esp.extremos.length, 2)
  const [l1, l2, l3, d1] = esp.extremos[0].cotas
  const t = fila('1', 75)
  assert.deepEqual([l1.min, l1.max], [t.L1_min, t['L1_Máx']])
  assert.deepEqual([l2.min, l2.max], [t.L2_min, null]) // solo mínimo
  assert.equal(l3.registro, true)
  assert.deepEqual([d1.min, d1.max], [t.D1_min, null]) // solo mínimo
})

test('Tee de Reducción: boca 2 = Diámetro 3, espiga = derivación (Diámetro 2) en hoja según PN', () => {
  const esp = construirEspecificacion(producto(6, 'PN-16', [160, 110, 160]), mapeo, tolerancias)
  assert.deepEqual(
    esp.extremos.map((e) => [e.tipo, e.dn]),
    [['ELECTROFUSION', 160], ['ELECTROFUSION', 160], ['ESPIGA', 110]],
  )
  const dmin = esp.extremos[2].cotas[0]
  assert.deepEqual([dmin.min, dmin.max], [fila('4', 110)['D_mín'], fila('4', 110)['D_máx']])
})

// Huecos conocidos en las tablas de tolerancias ("producto|dn"). Si agregas filas al Excel y regeneras,
// esta prueba fallará a propósito: quita aquí los casos ya resueltos.
const FALTANTES_CONOCIDOS = {
  'HDPE|ELECTROFUSION': [
    'Copla|280', //            Hoja 1 "Extremo Electrofusión" sin fila 280
    'Tee|140', //              Hoja 2 "Extremo Tubería" sin fila 140 (espiga de derivación)
    'Tee de Reducción|140',
  ],
  'PP-RCT|TOPE': [
    // Hoja 3 "Extremo Tubería PN-10" sin filas 140, 180, 280, 355, 400, 450
    ...[280, 355, 400, 450].flatMap((d) => [`Codo 90°|${d}`, `Tee|${d}`]),
    ...[140, 180, 280, 355, 400, 450].map((d) => `Stub End - Cuello Largo|${d}`),
    'Flange Acero Carbono|140', // Hoja 7 (ANSI) sin filas 140, 450
    'Flange Acero Carbono|450',
    'Flange Alma de Acero|225', // Hoja 6 (ISO) sin fila 225
  ],
  'PP-RCT|SOCKET': [
    'Flange Alma de Acero|32', //       Hoja 6 (ISO) sin fila 32
    'Stub End - Cuello Corto|200', //   Hoja 2 "Extremo Socket" llega hasta 160
    'Stub End - Cuello Corto|250',
  ],
  'HDPE|TOPE': [
    'Flange Acero Carbono|140', // Hoja 7 sin filas 140, 450
    'Flange Acero Carbono|450',
  ],
}

// Accesorios cuyas tablas tienen celdas "-" (sin valor) en algunas medidas: se permite límite/nominal null.
const CON_CELDAS_GUION = {
  'HDPE|TOPE': ['Flange Acero Carbono', 'Flange Alma de Acero'],
  'PP-RCT|TOPE': ['Flange Acero Carbono', 'Flange Alma de Acero'],
}

const leerJson = (rel) => JSON.parse(fs.readFileSync(new URL(rel, import.meta.url)))

// Cobertura para cada combinación con mapeo: todo producto (salvo accesorios pendientes) tiene mapeo,
// las filas faltantes son exactamente las conocidas y toda columna referenciada existe en su tabla.
for (const m of MAPEOS) {
  test(`${m.material} ${m.fusion}: mapeo completo, faltantes = conocidos, columnas válidas`, () => {
    const cat = leerJson(`../data/generated/productos/${m.material.toLowerCase()}/${m.fusion.toLowerCase()}.json`)
    const tol = leerJson(`../data/generated/tolerancias/${m.tolerancias}.json`)
    const faltantes = new Set()
    for (const p of cat.productos) {
      if (m.pendientes?.[p.accesorio]) continue
      const esp = construirEspecificacion(p, m, tol)
      assert.ok(esp, `sin mapeo: ${p.accesorio}. ${p.producto}`)
      for (const e of esp.extremos) {
        if (e.sinTolerancia) {
          faltantes.add(`${p.producto}|${e.dn}`)
          continue
        }
        if (CON_CELDAS_GUION[`${m.material}|${m.fusion}`]?.includes(p.producto)) continue
        for (const c of e.cotas) {
          if (!c.registro) assert.ok(c.min !== null || c.max !== null, `${p.producto} ${c.codigo} sin límites (¿columna mal escrita?)`)
          if (c.conNominal) assert.notEqual(c.nominal, null, `${p.producto} ${c.codigo} sin nominal (¿columna mal escrita?)`)
        }
      }
    }
    assert.deepEqual([...faltantes].sort(), [...new Set(FALTANTES_CONOCIDOS[`${m.material}|${m.fusion}`] ?? [])].sort())
  })
}

// Datos generados por .tools/xl/extraer.cjs: los diámetros deben coincidir con la Dimensión Nominal, salvo
// diferencias de orden o cantidad (intencionales, no se corrigen). Toda corrección debe dejar trazabilidad.
test('datos generados: diámetros coherentes con la Dimensión Nominal y correcciones trazables', () => {
  const aNumero = (s) =>
    String(s).replace(/\[(mm|in)\]/, '').trim().split(' ').reduce((a, t) => a + (t.includes('/') ? t.split('/')[0] / t.split('/')[1] : +t), 0)
  const corregidos = []
  for (const material of ['hdpe', 'pp-rct'])
    for (const fusion of ['electrofusion', 'socket', 'tope']) {
      const cat = leerJson(`../data/generated/productos/${material}/${fusion}.json`)
      for (const p of cat.productos) {
        const esperados = String(p.dimension).split(/\s+x\s+/).map(aNumero)
        const actuales = p.diametros.map(aNumero)
        const orden = (xs) => [...xs].sort((a, b) => a - b).join()
        const ok = esperados.length !== actuales.length || orden(esperados) === orden(actuales)
        assert.ok(ok, `${material}/${fusion} "${p.producto}" ${p.dimension} → ${JSON.stringify(p.diametros)} (regenerar con extraer.cjs)`)
        if (p.correccion) {
          assert.equal(p.correccion.original.length, p.diametros.length)
          corregidos.push(`${p.producto}|${p.dimension}`)
        }
      }
    }
  assert.deepEqual(corregidos.sort(), [
    'Copla - Terminal Metálico HI - Tuerca Volante|20[mm] x 1/2[in]',
    'Copla de Reducción|125[mm] x 110[mm]',
    'Tee de Reducción|50[mm] x 20[mm] x 50[mm]',
    'Terminal Metálico HI|20[mm] x 3/4[in]',
  ])
})

test('PP-RCT Tope: Tee evalúa el extremo 3 con sus propias medidas (corrección del VBA)', () => {
  const tol = leerJson('../data/generated/tolerancias/pp-rct.json')
  const esp = construirEspecificacion(producto(9, 'PN-10', [200, 90, 110]), ppRctTope, tol)
  const e3 = esp.extremos[2]
  assert.equal(e3.dn, 110)
  assert.deepEqual(e3.cotas.map((c) => c.codigo), ['E3.Dmin', 'E3.Dmax', 'E3.emin', 'E3.emax', 'E3.Lin', 'E3.Oval'])
  const oval = e3.cotas.find((c) => c.codigo === 'E3.Oval')
  assert.equal(oval.max, fila('3', 110).ovalidad) // ovalidad contra ovalidad, no contra diámetro
  assert.equal(e3.cotas.find((c) => c.codigo === 'E3.Lin').registro, true)
})

test('PP-RCT Tope: Copla Tope-Socket = tope (hoja por PN) + socket (hoja 2)', () => {
  const tol = leerJson('../data/generated/tolerancias/pp-rct.json')
  const esp = construirEspecificacion(producto(3, 'PN-16', [200, 110]), ppRctTope, tol)
  assert.deepEqual(esp.extremos.map((e) => [e.tipo, e.dn, e.fuente.split(' ·')[0]]), [
    ['TOPE', 200, 'Hoja 4'],
    ['SOCKET', 110, 'Hoja 2'],
  ])
})

test('Flange (HDPE y PP-RCT): hoja según producto; exterior evaluado en hoja 6; nominales solo registro', () => {
  for (const [m, archivo] of [[hdpeTope, 'hdpe-tope'], [ppRctTope, 'pp-rct']]) {
    const tol = leerJson(`../data/generated/tolerancias/${archivo}.json`)
    const t = (hoja, dn) => tol.hojas.find((h) => h.hoja === hoja).filas.find((f) => f.dimension === dn).valores
    const alma = construirEspecificacion({ ...producto(5, 'PN-16', [110]), producto: 'Flange Alma de Acero' }, m, tol)
    const carbono = construirEspecificacion({ ...producto(5, 'PN-16', [110]), producto: 'Flange Acero Carbono' }, m, tol)
    assert.equal(alma.extremos[0].tipo, 'FLANGE_ISO')
    assert.equal(carbono.extremos[0].tipo, 'FLANGE_ANSI')
    const a = Object.fromEntries(alma.extremos[0].cotas.map((c) => [c.codigo.split('.')[1], c]))
    assert.deepEqual([a.Dmin.min, a.Dmin.max, a.Dmin.registro], [t('6', 110).D_min, t('6', 110).D_max, false])
    assert.deepEqual([a.Cmin.nominal, a.Cmin.registro], [t('6', 110).d_2, true])
    assert.deepEqual([a.O8.nominal, a.tmax.nominal], [t('6', 110).d_1, t('6', 110).t])
    const c = Object.fromEntries(carbono.extremos[0].cotas.map((x) => [x.codigo.split('.')[1], x]))
    assert.deepEqual([c.Dmin.nominal, c.Dmin.registro], [t('7', 110).D_min, true])
  }
})

test('Cota nominal: desviación informativa en registro; con tolerancia se evalúa', () => {
  const reg = evaluarEspecificacion({ id: 'x', cotas: [{ codigo: 'a', registro: true, nominal: 12.6 }] }, { a: 12.8 })
  assert.deepEqual([reg.estadoGlobal, reg.resultados[0].estado, reg.resultados[0].desviacion], [ESTADO.CONFORME, ESTADO.REGISTRO, 0.2])
  const mapeoTol = {
    tipos: { X: { nombre: 'X', hoja: () => '7', cotas: [{ codigo: 't', etiqueta: 't', nominal: 't', tolerancia: { menos: 0.5, mas: 1 } }] } },
    accesorios: { 1: [['X', 0]] },
  }
  const tol = leerJson('../data/generated/tolerancias/hdpe-tope.json')
  const tNom = tol.hojas.find((h) => h.hoja === '7').filas.find((f) => f.dimension === 110).valores.t
  const [cota] = construirEspecificacion(producto(1, 'PN-16', [110]), mapeoTol, tol).extremos[0].cotas
  assert.deepEqual([cota.registro, cota.min, cota.max], [false, Number((tNom - 0.5).toFixed(4)), Number((tNom + 1).toFixed(4))])
})

test('HDPE Tope: hoja de tope por PN (incl. 12,5) y Stub End PN-20 → hoja 8 (corrección del VBA)', () => {
  const tol = leerJson('../data/generated/tolerancias/hdpe-tope.json')
  const hoja = (acc, pn, d) => construirEspecificacion(producto(acc, pn, d), hdpeTope, tol).extremos[0].fuente.split(' ·')[0]
  assert.deepEqual(
    [hoja(3, 'PN-10', [110, 90]), hoja(3, 'PN-12,5', [110, 90]), hoja(3, 'PN-16', [110, 90])],
    ['Hoja 1', 'Hoja 2', 'Hoja 3'],
  )
  assert.deepEqual([hoja(6, 'PN-10', [110]), hoja(6, 'PN-16', [110]), hoja(6, 'PN-20', [110])], ['Hoja 4', 'Hoja 5', 'Hoja 8'])
  const stub = construirEspecificacion(producto(6, 'PN-20', [110]), hdpeTope, tol).extremos[0]
  assert.equal(stub.sinTolerancia, false)
  assert.equal(stub.cotas.find((c) => c.codigo === 'E1.D2').min, tol.hojas.find((h) => h.hoja === '8').filas.find((f) => f.dimension === 110).valores.d_4)
})

test('HDPE Electrofusión: reglas especiales (Reg. V, fijo, calculado, otra hoja)', () => {
  const tol = leerJson('../data/generated/tolerancias/hdpe-electrofusion.json')
  const h = (hoja, dn) => tol.hojas.find((x) => x.hoja === hoja).filas.find((f) => f.dimension === dn).valores
  const esp = construirEspecificacion(producto(10, 'PN-16', [63, 32, 63]), hdpeEF, tol)
  const [e1, e2, e3] = esp.extremos
  assert.deepEqual([e1.tipo, e1.dn, e2.tipo, e2.dn, e3.tipo, e3.dn], ['ELECTROFUSION', 63, 'ELECTROFUSION', 63, 'ESPIGA', 32])
  const c = Object.fromEntries(e1.cotas.map((x) => [x.codigo.split('.')[1], x]))
  assert.deepEqual([c.L1.min, c.L1.max], [h('1', 63)['L1 Min - Regulación V'], h('1', 63)['L1 Máx']])
  assert.equal(c.L3.min, 5)
  assert.equal(c.D2.min, Number((h('1', 63).D_nominal - 2 * h('1', 63).e_nominal).toFixed(4)))
  const lin = e3.cotas.find((x) => x.codigo === 'E3.Lin')
  assert.equal(lin.min, h('1', 32)['L1 Min - Regulación V']) // espiga 32 → largo desde hoja 1
})

test('HDPE Electrofusión: silla sin D1/D2; transiciones = boca EF + rosca sin medición', () => {
  const tol = leerJson('../data/generated/tolerancias/hdpe-electrofusion.json')
  const silla = construirEspecificacion(producto(9, 'PN-16', [63, 20, 63]), hdpeEF, tol)
  assert.deepEqual(silla.extremos[0].cotas.map((x) => x.codigo), ['E1.L1', 'E1.L2', 'E1.L3', 'E1.e'])
  assert.equal(silla.extremos[2].tipo, 'ESPIGA')
  for (const acc of [3, 4, 14, 15]) {
    const p = { ...producto(acc, 'PN-16', [20, 0.5]), dimension: '20[mm] x 1/2[in]' }
    const esp = construirEspecificacion(p, hdpeEF, tol)
    assert.deepEqual(esp.extremos.map((e) => [e.tipo, e.medida, e.cotas.length > 0]), [
      ['ELECTROFUSION', '20 mm', true],
      ['ROSCA', '1/2 in', false],
    ])
    assert.equal(esp.extremos[1].sinTolerancia, false)
  }
})

test('PP-RCT Socket tanda 2: Montura mide la salida (D1), Tee con terminal, Flange socket, sin pendientes', () => {
  const tol = leerJson('../data/generated/tolerancias/pp-rct.json')
  const montura = construirEspecificacion(producto(19, 'PN-20', [20, 50]), ppRctSocket, tol)
  assert.deepEqual(montura.extremos.map((e) => [e.tipo, e.dn]), [['SOCKET', 20]])
  const teeHE = construirEspecificacion(
    { ...producto(25, 'PN-20', [20, 20, '1/2']), dimension: '20[mm] x 20[mm] x 1/2[in]' },
    ppRctSocket,
    tol,
  )
  assert.deepEqual(teeHE.extremos.map((e) => [e.tipo, e.medida]), [['SOCKET', '20 mm'], ['SOCKET', '20 mm'], ['ROSCA', '1/2 in']])
  const flange = construirEspecificacion({ ...producto(18, 'PN-16', [110]), producto: 'Flange Alma de Acero' }, ppRctSocket, tol)
  assert.equal(flange.extremos[0].tipo, 'FLANGE_ISO')
  assert.equal(ppRctSocket.pendientes, undefined)
  for (let acc = 1; acc <= 32; acc++) assert.ok(ppRctSocket.accesorios[acc], `accesorio ${acc} sin mapeo`)
})

test('PP-RCT Socket tanda 1: macho por PN, terminal doble, copla red. con ovalidad ≤ máx', () => {
  const tol = leerJson('../data/generated/tolerancias/pp-rct.json')
  const t = (hoja, dn) => tol.hojas.find((h) => h.hoja === hoja).filas.find((f) => f.dimension === dn).valores
  const macho = construirEspecificacion(producto(13, 'PN-20', [25, 25]), ppRctSocket, tol)
  assert.deepEqual(macho.extremos.map((e) => [e.tipo, e.fuente.split(' ·')[0]]), [['SOCKET', 'Hoja 2'], ['MACHO', 'Hoja 5']])
  const doble = construirEspecificacion(
    { ...producto(9, 'PN-20', [20, '1/2', 20, '1/2']), dimension: '20[mm] x 1/2[in]' },
    ppRctSocket,
    tol,
  )
  assert.deepEqual(doble.extremos.map((e) => e.tipo), ['SOCKET', 'ROSCA', 'SOCKET', 'ROSCA'])
  assert.ok(doble.extremos.every((e) => !e.sinTolerancia))
  const red = construirEspecificacion(producto(15, 'PN-20', [25, 20]), ppRctSocket, tol)
  const oval2 = red.extremos[1].cotas.find((c) => c.codigo === 'E2.Oval')
  assert.deepEqual([oval2.min, oval2.max], [null, t('2', 20).Oval_max])
})

test('HDPE Socket: Copla de Reducción = enchufe D1 + espiga D2 (hoja 2)', () => {
  const tol = JSON.parse(fs.readFileSync(new URL('../data/generated/tolerancias/hdpe-socket.json', import.meta.url)))
  const esp = construirEspecificacion(producto(4, 'PN-20', [25, 20]), hdpeSocket, tol)
  assert.deepEqual(esp.extremos.map((e) => [e.tipo, e.dn, e.fuente.split(' ·')[0]]), [
    ['ENCHUFE', 25, 'Hoja 1'],
    ['ESPIGA', 20, 'Hoja 2'],
  ])
})

test('evaluación: registro no afecta; límite de un lado; sin tolerancia', () => {
  const esp = construirEspecificacion(producto(1, 'PN-20', [75, 75]), mapeo, tolerancias)
  const t = fila('1', 75)
  const ok = {}
  for (const n of [1, 2]) Object.assign(ok, { [`E${n}.L1`]: t.L1_min, [`E${n}.L2`]: t.L2_min + 50, [`E${n}.D1`]: t.D1_min + 5 })
  const cotas = { id: 'x', cotas: cotasDe(esp) }
  assert.equal(evaluarEspecificacion(cotas, ok).estadoGlobal, ESTADO.CONFORME)
  assert.equal(evaluarEspecificacion(cotas, { ...ok, 'E2.D1': t.D1_min - 0.1 }).estadoGlobal, ESTADO.NO_CONFORME)

  const sinFila = construirEspecificacion(producto(1, 'PN-20', [999, 75]), mapeo, tolerancias)
  assert.equal(sinFila.extremos[0].sinTolerancia, true)
  assert.equal(evaluarEspecificacion({ id: 'y', cotas: cotasDe(sinFila) }, ok).estadoGlobal, ESTADO.SIN_TOLERANCIA)
})

