// Copia los esquemas de norma y fotos de accesorios usados por la app a frontend/public/images
// y genera frontend/src/data/generated/imagenes.json (accesorio → imágenes).
// Uso: node .tools/xl/imagenes.cjs
//
// Relación (derivada de los formularios VBA: ob1 = esquema de norma, ob2 = foto del accesorio):
//   Matrices/Imágenes/Fotos norma/<norma>/<fusión>/<Form>.JPG   (HDPE → NCh 398, PP-RCT → NCh 3151)
//   Matrices/Imágenes/Fotos accesorios/<material>/<fusión>/<Nombre>.JPG
// Los nombres no son 100 % uniformes entre carpetas, por eso la tabla es explícita.
// Una ruta que empieza con "../" sale de la carpeta por defecto de la combinación (p. ej. fotos de Socket en TOPE).
const fs = require('fs')
const path = require('path')

const RAIZ = path.resolve(__dirname, '..', '..')
const ORIGEN = path.join(RAIZ, 'Matrices', 'Imágenes')
const PUBLICO = path.join(RAIZ, 'frontend', 'public', 'images')
const JSON_SALIDA = path.join(RAIZ, 'frontend', 'src', 'data', 'generated', 'imagenes.json')

// norma: lista de esquemas (el primero es el principal). foto: archivo, o { [nombreProducto]: archivo } por variante.
const COMBINACIONES = {
  'HDPE|ELECTROFUSION': {
    norma: 'Fotos norma/NCh 398/Electrofusión',
    foto: 'Fotos accesorios/HDPE/Electrofusión',
    accesorios: {
      1: { norma: ['Codo45', 'Extremo'], foto: 'Codo45' },
      2: { norma: ['Codo90', 'Extremo'], foto: 'Codo90' },
      3: { norma: ['CodoTHE', 'Extremo'], foto: 'CodoTHE' },
      4: { norma: ['CodoTHI', 'Extremo'], foto: 'CodoTHI' },
      5: { norma: ['Copla', 'Extremo'], foto: 'Copla' },
      6: { norma: ['CoplaReduccion', 'Extremo'], foto: 'CoplaReduccion' },
      7: { norma: ['SpigotEspiral', 'SpigotEspiga', 'ExtremoSinEspiral'], foto: 'Spigot' },
      8: { norma: ['Tapon', 'Extremo'], foto: 'Tapon' },
      9: { norma: ['TappingTeeEspiral', 'TappingTeeEspiga', 'ExtremoSinEspiral'], foto: 'TappingTee' },
      10: { norma: ['TeeEspiral', 'TeeEspiga', 'Extremo'], foto: 'Tee' },
      11: { norma: ['TeeRedEspiral', 'TeeRedEspiga', 'Extremo'], foto: 'TeeReduccion' },
      12: { norma: ['TerminalHE'], foto: 'TerminalHE' },
      13: { norma: ['TerminalHI'], foto: 'TerminalHI' },
      14: { norma: ['TerminalTHE', 'Extremo'], foto: 'TerminalTHE' },
      15: { norma: ['TerminalTHI', 'Extremo'], foto: 'TerminalTHI' },
    },
  },
  'HDPE|SOCKET': {
    norma: 'Fotos norma/NCh 398/Termofusión Socket',
    foto: 'Fotos accesorios/HDPE/Termofusión Socket',
    accesorios: {
      1: { norma: ['Codo45'], foto: 'Codo45' },
      2: { norma: ['Codo90'], foto: 'Codo90' },
      3: { norma: ['Copla'] },
      4: { norma: ['CoplaRedST'], foto: 'CoplaRed' },
      5: { norma: ['Tapon'], foto: 'Tapon' },
      6: { norma: ['Tee'], foto: 'Tee' },
      7: { norma: ['TeeRed'], foto: 'TeeRed' },
      8: { norma: ['TerminalHE'] },
      9: { norma: ['TerminalHI'] },
    },
  },
  'HDPE|TOPE': {
    norma: 'Fotos norma/NCh 398/Termofusión',
    foto: 'Fotos accesorios/HDPE/Termofusión',
    accesorios: {
      1: { norma: ['Codo45', 'Extremo'], foto: 'Codo45' },
      2: { norma: ['Codo90', 'Extremo'], foto: 'Codo90' },
      3: { norma: ['CoplaRed', 'Extremo'], foto: 'CoplaRed' },
      4: { norma: ['Cruz', 'Extremo'], foto: 'Cruz' },
      5: { norma: ['Flange'], foto: { 'Flange Acero Carbono': 'FlangeAceroCarbono', 'Flange Alma de Acero': 'FlangeAlmaAcero' } },
      6: { norma: ['StubEnd'], foto: 'StubEnd' },
      7: { norma: ['Tapon', 'Extremo'], foto: 'Tapon' },
      8: { norma: ['Tee', 'Extremo'], foto: 'Tee' },
      9: { norma: ['TeeRed', 'Extremo'], foto: 'TeeRed' },
    },
  },
  'PP-RCT|ELECTROFUSION': {
    norma: 'Fotos norma/NCh 3151/Electrofusión',
    foto: 'Fotos accesorios/PP-RCT/ELECTROFUSIÓN',
    accesorios: {
      1: { norma: ['Codo45'], foto: 'Codo45' },
      2: { norma: ['Codo90'], foto: 'Codo90' },
      3: { norma: ['Copla'], foto: 'Copla' },
      4: { norma: ['CoplaReduccion'], foto: 'CoplaReduccion' },
      5: { norma: ['Tee'], foto: 'Tee' },
      6: { norma: ['TeeReduccion'], foto: 'TeeReduccion' },
    },
  },
  'PP-RCT|SOCKET': {
    norma: 'Fotos norma/NCh 3151/Socket',
    foto: 'Fotos accesorios/PP-RCT/SOCKET',
    accesorios: {
      1: { norma: ['Codo45'], foto: 'Codo45' },
      2: { norma: ['Codo45Macho'], foto: 'Codo45Macho' },
      3: { norma: ['Codo90'], foto: 'Codo90' },
      4: { norma: ['Codo90Red'], foto: 'Codo90Reduccion' },
      5: { norma: ['Codo90CCMHE'], foto: 'Codo90CCMHE' },
      6: { norma: ['Codo90CCMHI'], foto: 'Codo90CCMHI' },
      7: { norma: ['Codo90CCMHESop'], foto: 'Codo90CCMHESop' },
      8: { norma: ['Codo90CCMHISop'], foto: 'Codo90CCMHISop' },
      9: { norma: ['Codo90CCMHIDoble'], foto: 'Codo90CCMHIDoble' },
      // 10: Codo 90° - Cuello Corto - Terminal Plástico HE → sin imágenes en las carpetas
      11: { norma: ['Codo90CLMHI'], foto: 'Codo90CLMHI' },
      12: { norma: ['Codo90CLMHITV'], foto: 'Codo90CLMHITV' },
      13: { norma: ['Codo90Macho'], foto: 'Codo90Macho' },
      14: { norma: ['Copla'], foto: 'Copla' },
      15: { norma: ['CoplaRed'], foto: 'CoplaReduccion' },
      16: { norma: ['CoplaMHITV'], foto: 'CoplaMHITV' },
      17: { norma: ['Cruz'], foto: 'Cruz' },
      18: { norma: ['../Tope/Flange'], foto: '../TOPE/FlangeAlmaAcero' },
      19: { norma: ['Montura'], foto: 'Montura' },
      20: { norma: ['Pasatubos'], foto: 'Pasatubos' },
      21: { norma: ['StubEnd'], foto: 'StubEnd' },
      22: { norma: ['Tapon'], foto: 'Tapon' },
      23: { norma: ['Tee'], foto: 'Tee' },
      24: { norma: ['TeeRed'], foto: 'TeeReduccion' },
      25: { norma: ['TeeMHE'], foto: 'TeeTHE' },
      26: { norma: ['TeeMHI'], foto: 'TeeTHI' },
      27: { norma: ['TerminalMHE'], foto: 'TerminalMHE' },
      28: { norma: ['TerminalMHI'], foto: 'TerminalMHI' },
      29: { norma: ['TerminalPHE'], foto: 'TerminalPHE' },
      30: { norma: ['UnionA'], foto: '../TOPE/UnionA' },
      31: { norma: ['UnionAHE'], foto: '../TOPE/UnionAHE' },
      32: { norma: ['UnionAHI'], foto: '../TOPE/UnionAHI' },
    },
  },
  'PP-RCT|TOPE': {
    norma: 'Fotos norma/NCh 3151/Tope',
    foto: 'Fotos accesorios/PP-RCT/TOPE',
    accesorios: {
      1: { norma: ['Codo45'], foto: 'Codo45' },
      2: { norma: ['Codo90'], foto: 'Codo90' },
      3: { norma: ['CoplaReduccionTS'], foto: 'CoplaReduccionTS' },
      4: { norma: ['CoplaReduccionTT'], foto: 'CoplaReduccionTT' },
      5: { norma: ['Flange'], foto: { 'Flange Acero Carbono': 'FlangeAceroCarbono', 'Flange Alma de Acero': 'FlangeAlmaAcero' } },
      6: { norma: ['StubEnd'], foto: 'StubEnd' },
      7: { norma: ['Tapon'], foto: 'Tapon' },
      8: { norma: ['Tee'], foto: 'Tee' },
      9: { norma: ['TeeReduccion'], foto: 'TeeReduccion' },
    },
  },
}

const TITULOS = { Extremo: 'Detalle de extremo', ExtremoSinEspiral: 'Extremo sin espiral' }
const titulo = (nombre) => TITULOS[nombre] ?? (/Espiga$/.test(nombre) ? 'Espiga' : /Espiral$/.test(nombre) ? 'Espiral' : 'Esquema')

const slug = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const faltantes = []
let copiadas = 0
const resultado = {}

function copiar(carpetaBase, nombre, destinoRel) {
  const origen = path.join(ORIGEN, carpetaBase, `${nombre}.JPG`)
  if (!fs.existsSync(origen)) {
    faltantes.push(path.relative(ORIGEN, origen))
    return null
  }
  const destino = path.join(PUBLICO, destinoRel)
  fs.mkdirSync(path.dirname(destino), { recursive: true })
  fs.copyFileSync(origen, destino)
  copiadas++
  return `/images/${destinoRel.split(path.sep).join('/')}`
}

fs.rmSync(PUBLICO, { recursive: true, force: true })
for (const [clave, combo] of Object.entries(COMBINACIONES)) {
  const [material, fusion] = clave.split('|')
  const dir = `${slug(material)}/${slug(fusion)}`
  resultado[clave] = {}
  for (const [codigo, def] of Object.entries(combo.accesorios)) {
    const norma = (def.norma ?? [])
      .map((n) => {
        const src = copiar(combo.norma, n, `${dir}/norma/${slug(path.basename(n))}.jpg`)
        return src && { src, titulo: titulo(path.basename(n)) }
      })
      .filter(Boolean)
    let foto = null
    if (typeof def.foto === 'string') foto = copiar(combo.foto, def.foto, `${dir}/foto/${slug(path.basename(def.foto))}.jpg`)
    else if (def.foto)
      foto = Object.fromEntries(
        Object.entries(def.foto).map(([prod, f]) => [prod, copiar(combo.foto, f, `${dir}/foto/${slug(f)}.jpg`)]),
      )
    resultado[clave][codigo] = { norma, foto }
  }
}

fs.writeFileSync(JSON_SALIDA, JSON.stringify(resultado, null, 1) + '\n')
const peso = (d) => (fs.existsSync(d) ? fs.readdirSync(d, { recursive: true }).reduce((s, f) => {
  const p = path.join(d, f)
  return fs.statSync(p).isFile() ? s + fs.statSync(p).size : s
}, 0) : 0)
console.log(`Copiadas ${copiadas} imágenes (${(peso(PUBLICO) / 1048576).toFixed(1)} MB) → frontend/public/images`)
if (faltantes.length) console.log(`No encontradas (${faltantes.length}):\n  ${faltantes.join('\n  ')}`)
