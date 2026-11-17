// Uso: node inspect.cjs <archivo> [hoja] [filas=8] [cols=20]
// Sin hoja: lista hojas con su rango. Con hoja: imprime las primeras filas (celdas truncadas).
const XLSX = require('./node_modules/xlsx')
const [, , file, sheet, nRows = '8', nCols = '20'] = process.argv
const wb = XLSX.readFile(file, { bookVBA: false, cellFormula: false, sheetStubs: false })
if (!sheet) {
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name]
    console.log(`${name}\t${ws['!ref'] ?? '(vacía)'}${ws['!protect'] ? '\t[protegida]' : ''}`)
  }
} else {
  const ws = wb.Sheets[sheet]
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false, defval: '' })
  for (const r of rows.slice(0, +nRows)) {
    console.log(r.slice(0, +nCols).map((c) => String(c).replace(/\s+/g, ' ').slice(0, 28)).join(' | '))
  }
  console.log(`... total filas no vacías: ${rows.length}`)
}
