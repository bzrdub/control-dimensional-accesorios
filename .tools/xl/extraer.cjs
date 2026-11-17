// Extrae datos reales de las planillas a JSON para el frontend.
// Uso: node .tools/xl/extraer.cjs   (desde la raíz del proyecto o cualquier carpeta)
// Solo lectura: no ejecuta macros ni modifica los Excel.
const fs = require('fs')
const path = require('path')
const XLSX = require('./node_modules/xlsx')

const RAIZ = path.resolve(__dirname, '..', '..')
const SALIDA = path.join(RAIZ, 'frontend', 'src', 'data', 'generated')

const CONTROLES = [
  { material: 'HDPE', fusion: 'ELECTROFUSION', archivo: 'CONTROL HDPE/CONTROL HDPE - ELECTROFUSIÓN.xlsm' },
  { material: 'HDPE', fusion: 'SOCKET', archivo: 'CONTROL HDPE/CONTROL HDPE - FUSIÓN SOCKET.xlsm' },
  { material: 'HDPE', fusion: 'TOPE', archivo: 'CONTROL HDPE/CONTROL HDPE - FUSIÓN TOPE.xlsm' },
  { material: 'PP-RCT', fusion: 'ELECTROFUSION', archivo: 'CONTROL PP-RCT/CONTROL PP-RCT - ELECTROFUSIÓN.xlsm' },
  { material: 'PP-RCT', fusion: 'SOCKET', archivo: 'CONTROL PP-RCT/CONTROL PP-RCT - FUSIÓN SOCKET.xlsm' },
  { material: 'PP-RCT', fusion: 'TOPE', archivo: 'CONTROL PP-RCT/CONTROL PP-RCT - FUSIÓN TOPE.xlsm' },
]

const TOLERANCIAS = [
  { id: 'hdpe-electrofusion', material: 'HDPE', archivo: 'Matrices/HDPE Electrofusión.xlsx' },
  { id: 'hdpe-socket', material: 'HDPE', archivo: 'Matrices/HDPE Termofusión Socket.xlsx' },
  { id: 'hdpe-tope', material: 'HDPE', archivo: 'Matrices/HDPE Termofusión.xlsx' },
  { id: 'pp-rct', material: 'PP-RCT', archivo: 'Matrices/PP-RCT Beta nucleado.xlsx' },
]

// Nombres en MATRIZ DE ACCESORIOS que difieren del LISTADO → código de LISTADO.
// (Inconsistencias de las planillas originales; se conserva el nombre original en `producto`.)
const ALIAS = {
  'HDPE|ELECTROFUSION': {
    'Terminal Metálico HE': 12,
    'Terminal Metálico HI': 13,
    'Terminal de Transición Metálico HE': 14,
    'Terminal de Transición Metálico HI': 15,
  },
  'HDPE|TOPE': { 'Flange Acero Carbono': 5, 'Flange Alma de Acero': 5 },
  'PP-RCT|TOPE': {
    'Copla de Reducción (Tope-Socket)': 3,
    'Copla de Reducción (Tope-Tope)': 4,
    'Flange Acero Carbono': 5,
    'Flange Alma de Acero': 5,
  },
}

const limpiar = (v) => (typeof v === 'string' ? v.replace(/\s+/g, ' ').trim() : v)
const filas = (ws) => XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' }).map((r) => r.map(limpiar))
const num = (v) => (typeof v === 'number' ? Math.round(v * 1e6) / 1e6 : v)
const leer = (rel) => XLSX.readFile(path.join(RAIZ, rel), { bookVBA: false, cellFormula: false })
const escribir = (rel, data) => {
  const destino = path.join(SALIDA, rel)
  fs.mkdirSync(path.dirname(destino), { recursive: true })
  fs.writeFileSync(destino, JSON.stringify(data, null, 1) + '\n')
}

const reporte = []

// ---------- Productos (LISTADO + MATRIZ DE ACCESORIOS) ----------
for (const c of CONTROLES) {
  const wb = leer(c.archivo)

  const listado = filas(wb.Sheets['LISTADO'])
    .filter((r) => typeof r[0] === 'number' && r[1])
    .map((r) => ({ codigo: r[0], nombre: r[1] }))
  const porNombre = new Map(listado.map((a) => [a.nombre.toLowerCase(), a]))

  const matriz = filas(wb.Sheets['MATRIZ DE ACCESORIOS'])
  const iHead = matriz.findIndex((r) => r.includes('Producto') && r.includes('Presión Nominal'))
  const head = matriz[iHead]
  const col = (nombre) => head.indexOf(nombre)
  const C = {
    producto: col('Producto'),
    pn: col('Presión Nominal'),
    dimension: col('Dimensión Nominal'),
    referencia: head.findIndex((h) => String(h).startsWith('Dimensión Nominal Ref')),
    sdr: col('SDR'),
    codigo: col('Código'),
    d: [1, 2, 3, 4].map((n) => col(`Diámetro ${n}`)),
  }

  const productos = []
  const fueraDeListado = new Set()
  const vistos = new Set()
  for (const r of matriz.slice(iHead + 1)) {
    if (!r[C.producto]) continue
    const nombre = r[C.producto]
    const alias = ALIAS[`${c.material}|${c.fusion}`]?.[nombre]
    const acc = alias ? listado.find((a) => a.codigo === alias) : porNombre.get(String(nombre).toLowerCase())
    if (!acc) fueraDeListado.add(nombre)
    const diametros = C.d.map((i) => r[i]).filter((v) => v !== '' && v !== 'N/A').map(num)
    const p = {
      accesorio: acc ? acc.codigo : null,
      producto: nombre,
      pn: r[C.pn] || null,
      sdr: C.sdr >= 0 && r[C.sdr] !== '' ? num(r[C.sdr]) : null,
      dimension: r[C.dimension],
      referencia: r[C.referencia],
      diametros,
      codigo: C.codigo >= 0 && r[C.codigo] !== '' ? String(r[C.codigo]) : null,
    }
    const clave = `${nombre}|${p.referencia}`
    if (vistos.has(clave)) reporte.push(`[${c.material} ${c.fusion}] fila duplicada: ${clave}`)
    vistos.add(clave)
    productos.push(p)
  }

  // Coherencia "Diámetro N" ↔ "Dimensión Nominal" (p. ej. 32[mm] x 1 1/4[in]). La Dimensión Nominal es la
  // fuente de verdad. Regla:
  //   - misma cantidad de valores y algún valor que NO aparece en la dimensión → CORREGIR posición a posición
  //     con el valor de la dimensión (se guarda `correccion` con el original para trazabilidad);
  //   - mismos valores en otro orden (p. ej. Montura) o distinta cantidad (p. ej. terminal Doble) → NO tocar,
  //     el orden/cantidad puede ser intencional; solo se informa.
  const aNumero = (s) =>
    s.replace(/\[(mm|in)\]/, '').trim().split(' ').reduce((a, t) => a + (t.includes('/') ? t.split('/')[0] / t.split('/')[1] : +t), 0)
  const igual = (a, b) => Math.abs(a - b) < 1e-6
  const corregidos = {}
  const informados = {}
  for (const p of productos) {
    const esperados = String(p.dimension).split(/\s+x\s+/).map(aNumero)
    const actuales = p.diametros.map((d) => aNumero(String(d)))
    if (esperados.length === actuales.length && esperados.every((v, i) => igual(v, actuales[i]))) continue

    const ordenados = (xs) => [...xs].sort((a, b) => a - b)
    const esPermutacion =
      esperados.length === actuales.length && ordenados(esperados).every((v, i) => igual(v, ordenados(actuales)[i]))
    if (esperados.length !== actuales.length || esPermutacion) {
      const motivo = esPermutacion ? 'orden distinto' : 'distinta cantidad'
      ;(informados[`${p.producto} (${motivo})`] ??= []).push(`${p.dimension} → ${JSON.stringify(p.diametros)}`)
      continue
    }
    const original = p.diametros
    p.diametros = original.map((d, i) => (igual(actuales[i], esperados[i]) ? d : num(esperados[i])))
    p.correccion = { campo: 'diametros', original, motivo: `Diámetro N no coincide con Dimensión Nominal "${p.dimension}"` }
    ;(corregidos[p.producto] ??= []).push(`${p.dimension}: ${JSON.stringify(original)} → ${JSON.stringify(p.diametros)}`)
  }
  for (const [nombre, casos] of Object.entries(corregidos))
    reporte.push(`[${c.material} ${c.fusion}] ✎ CORREGIDO "${nombre}": ${casos.join(' | ')}`)
  for (const [nombre, casos] of Object.entries(informados))
    reporte.push(`[${c.material} ${c.fusion}] ⚠ sin corregir "${nombre}": ${casos.length} fila(s) (ej. ${casos[0]})`)

  const conteo = new Map()
  for (const p of productos) conteo.set(p.accesorio, (conteo.get(p.accesorio) ?? 0) + 1)
  for (const a of listado) if (!conteo.get(a.codigo)) reporte.push(`[${c.material} ${c.fusion}] en LISTADO sin productos en MATRIZ: ${a.codigo}. ${a.nombre}`)
  for (const n of fueraDeListado) reporte.push(`[${c.material} ${c.fusion}] producto en MATRIZ que no está en LISTADO: "${n}"`)

  escribir(`productos/${c.material.toLowerCase()}/${c.fusion.toLowerCase()}.json`, {
    schemaVersion: 4,
    material: c.material,
    fusion: c.fusion,
    fuente: c.archivo,
    accesorios: listado,
    productos,
  })
  reporte.push(`[${c.material} ${c.fusion}] ${listado.length} accesorios, ${productos.length} productos`)
}

// ---------- Tablas de tolerancias por tipo de extremo (Matrices/*.xlsx) ----------
for (const t of TOLERANCIAS) {
  const wb = leer(t.archivo)
  const hojas = []
  for (const nombreHoja of wb.SheetNames.filter((n) => n !== 'Principal')) {
    const rs = filas(wb.Sheets[nombreHoja])
    const iHead = rs.findIndex((r) => r.some((v) => /^(Dimensión \[mm\]|D_nominal)$/i.test(String(v))))
    if (iHead < 0) {
      reporte.push(`[${t.id}] hoja ${nombreHoja}: sin fila de encabezado reconocible`)
      continue
    }
    const textoTitulo = rs.slice(0, iHead).flat().find((v) => typeof v === 'string' && v && !/^Medici/i.test(v)) ?? ''
    const nombre = textoTitulo.replace(/^Nombre:\s*/i, '')
    const head = rs[iHead]
    const iDim = head.findIndex((v) => v !== '')
    // Columnas válidas: con encabezado, nombres únicos (#2, #3 para repetidos entre mediciones)
    const usados = {}
    const columnas = []
    head.forEach((h, i) => {
      if (i <= iDim || h === '') return
      usados[h] = (usados[h] ?? 0) + 1
      columnas.push({ i, nombre: usados[h] > 1 ? `${h} #${usados[h]}` : h })
    })
    const datos = []
    for (const r of rs.slice(iHead + 1)) {
      const dim = num(r[iDim])
      if (dim === '' || dim === undefined) continue
      const valores = {}
      for (const cdef of columnas) if (r[cdef.i] !== '' && r[cdef.i] !== undefined) valores[cdef.nombre] = num(r[cdef.i])
      datos.push({ dimension: dim, valores })
    }
    hojas.push({ hoja: nombreHoja, nombre, columnas: columnas.map((c) => c.nombre), filas: datos })
  }
  escribir(`tolerancias/${t.id}.json`, { schemaVersion: 1, material: t.material, fuente: t.archivo, hojas })
  reporte.push(`[tolerancias ${t.id}] ${hojas.length} tablas: ${hojas.map((h) => `${h.hoja}=${h.nombre} (${h.filas.length})`).join('; ')}`)
}

console.log(reporte.join('\n'))
