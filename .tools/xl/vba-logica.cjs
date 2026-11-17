// Extrae y agrupa la lógica de comparación de formularios VBA (.frm) de una carpeta.
// Uso: node vba-logica.cjs "<carpeta>" [prefijo]
// Imprime, por grupo de formularios con lógica idéntica, las líneas relevantes normalizadas:
//   cN = tb_X           → qué textbox se guarda en la columna N de la fila 17
//   cN < h<hoja>.colM   → comparación de la columna N contra la columna M de la hoja de tolerancias
const fs = require('fs')
const path = require('path')
const [, , carpeta, prefijo = ''] = process.argv

const PAT = /Workbooks\.Open|hojita\s*=|If PN|ElseIf|If .*(cb_Regul|Regulaci|cb_Norma|ISO|ANSI)|Sheets\(.+\)\.Cells\(\w, 2\) = |Cells\(17, \d+\) = (tb_|Ingreso\.diam|PN)|^\s*'[A-ZÁÉÍÓÚ]|If \w+\.Cells\(17, \d+\) [<>]/

const normalizar = (nombreForm, linea) =>
  linea
    .trim()
    .replace(/[A-Z]:\\[^"]*?\\(?=Matrices\\)/, '…\\') // ruta de red de la planta → "…\Matrices\…"
    .replace(/^If \w+\.Cells\(17, (\d+)\) ([<>]) Matriz\.Sheets\(("?\w+"?)\)\.Cells\(\w, (\d+)\) Then.*/, 'c$1 $2 h$3.col$4')
    .replace(/^\w+\.Cells\(17, (\d+)\) = /, 'c$1 = ')
    .replace(/(\.Value)?( \+ 0)?$/, '')
    .replace(new RegExp(nombreForm, 'g'), 'X')

const grupos = new Map()
for (const f of fs.readdirSync(carpeta).filter((f) => f.endsWith('.frm') && f.startsWith(prefijo))) {
  const texto = fs.readFileSync(path.join(carpeta, f), 'latin1')
  const nombre = (texto.match(/Attribute VB_Name = "(.+)"/) || [])[1] || f
  const hoja = (texto.match(/Codo45\.Activate|(\w+)\.Activate/) || [])[1]
  const lineas = texto
    .split(/\r?\n/)
    .filter((l) => PAT.test(l))
    .map((l) => normalizar(hoja || nombre, l))
    .filter((l) => !/^'SE |Font|Comment/.test(l))
  const clave = lineas.join('\n')
  if (!grupos.has(clave)) grupos.set(clave, [])
  grupos.get(clave).push(`${f} (${texto.length} B)`)
}
for (const [clave, forms] of grupos) {
  console.log(`\n===== ${forms.join(' | ')}`)
  console.log(clave || '(sin lógica de comparación)')
}
