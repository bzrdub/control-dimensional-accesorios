// Mapeo accesorio → extremos → tabla de tolerancia para PP-RCT · Electrofusión.
// Origen: Matrices/Códigos VBA/PP-RCT ELECTROFUSIÓN/PPRCT_Electrofusion_*.frm
// Validado con el usuario (2026-11-16). Diferencia intencional con el VBA:
//   Tee / Tee de Reducción → la espiga es la DERIVACIÓN (Diámetro 2) y la boca 2 del
//   tramo principal es el Diámetro 3. El VBA usaba D2/D3 al revés.
//
// Reglas de cota:
//   min / max  → nombre de la columna en la tabla de tolerancias (generated/tolerancias/<archivo>.json)
//   registro   → se ingresa y guarda, pero no se evalúa (igual que en el VBA)

const HOJA_ESPIGA_POR_PN = { 'PN-10': '3', 'PN-16': '4', 'PN-20': '5' }

const ELECTROFUSION = {
  nombre: 'Electrofusión (espiral)',
  hoja: () => '1',
  cotas: [
    { codigo: 'L1', etiqueta: 'Largo L1', min: 'L1_min', max: 'L1_Máx' },
    { codigo: 'L2', etiqueta: 'Largo L2', min: 'L2_min' },
    { codigo: 'L3', etiqueta: 'Largo L3', registro: true },
    { codigo: 'D1', etiqueta: 'Diámetro D1', min: 'D1_min' },
    { codigo: 'D2', etiqueta: 'Diámetro D2', registro: true },
    { codigo: 'D3', etiqueta: 'Diámetro D3', registro: true },
  ],
}

const ESPIGA = {
  nombre: 'Espiga',
  hoja: (producto) => HOJA_ESPIGA_POR_PN[producto.pn],
  cotas: [
    { codigo: 'Dmin', etiqueta: 'Diámetro mínimo', min: 'D_mín', max: 'D_máx' },
    { codigo: 'Dmax', etiqueta: 'Diámetro máximo', min: 'D_mín', max: 'D_máx' },
    { codigo: 'emin', etiqueta: 'Espesor mínimo', min: 'e_mín', max: 'e_máx' },
    { codigo: 'emax', etiqueta: 'Espesor máximo', min: 'e_mín', max: 'e_máx' },
    { codigo: 'Oval', etiqueta: 'Ovalidad', max: 'ovalidad' },
  ],
}

const DOS_BOCAS_EF = [
  ['ELECTROFUSION', 0],
  ['ELECTROFUSION', 1],
]
const TEE = [
  ['ELECTROFUSION', 0], // boca principal 1 → Diámetro 1
  ['ELECTROFUSION', 2], // boca principal 2 → Diámetro 3
  ['ESPIGA', 1], //        derivación      → Diámetro 2
]

export default {
  material: 'PP-RCT',
  fusion: 'ELECTROFUSION',
  tolerancias: 'pp-rct', // generated/tolerancias/pp-rct.json  (Matrices/PP-RCT Beta nucleado.xlsx)
  tipos: { ELECTROFUSION, ESPIGA },
  // clave = código del LISTADO; valor = extremos en orden: [tipo, índice en `diametros`]
  accesorios: {
    1: DOS_BOCAS_EF, // Codo 45°
    2: DOS_BOCAS_EF, // Codo 90°
    3: DOS_BOCAS_EF, // Copla
    4: DOS_BOCAS_EF, // Copla de Reducción
    5: TEE, //          Tee
    6: TEE, //          Tee de Reducción
  },
}
