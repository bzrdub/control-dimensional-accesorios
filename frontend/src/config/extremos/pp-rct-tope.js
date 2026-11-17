// Mapeo accesorio → extremos → tabla de tolerancia para PP-RCT · Fusión Tope.
// Origen: Matrices/Códigos VBA/PP-RCT FUSIÓN TOPE/PPRCT_Tope_*.frm
// Validado con el usuario (2026-11-16). Diferencias intencionales con el VBA:
//   - Tee / Tee de Reducción: el VBA evaluaba el extremo 3 con las celdas del extremo 2 desplazadas
//     (ovalidad comparada contra el diámetro mínimo). Aquí el extremo 3 evalúa sus propias medidas.
//   - Tee de Reducción no tiene formulario propio; su hoja de registro es idéntica a la de la Tee.
// Tolerancias: Matrices/PP-RCT Beta nucleado.xlsx.

import { TIPOS_FLANGE, definicionFlange } from './flange.js'
import { ESPIGA_PPRCT, SOCKET_PPRCT } from './comun.js'

// Extremo tope = espiga de tubería (hoja según PN) + largo de inserción como solo registro.
const TOPE = {
  ...ESPIGA_PPRCT,
  nombre: 'Tope (espiga)',
  cotas: [...ESPIGA_PPRCT.cotas.slice(0, 4), { codigo: 'Lin', etiqueta: 'Largo de inserción', registro: true }, ESPIGA_PPRCT.cotas[4]],
}

const SOCKET = SOCKET_PPRCT

const UNA_BOCA = [['TOPE', 0]]
const DOS_BOCAS = [
  ['TOPE', 0],
  ['TOPE', 1],
]
const TRES_BOCAS = [
  ['TOPE', 0],
  ['TOPE', 1],
  ['TOPE', 2],
]

export default {
  material: 'PP-RCT',
  fusion: 'TOPE',
  tolerancias: 'pp-rct', // generated/tolerancias/pp-rct.json
  tipos: { TOPE, SOCKET, ...TIPOS_FLANGE },
  accesorios: {
    1: DOS_BOCAS, //  Codo 45°
    2: DOS_BOCAS, //  Codo 90°
    3: [
      ['TOPE', 0],
      ['SOCKET', 1],
    ], //             Copla de Reducción (Tope - Socket)
    4: DOS_BOCAS, //  Copla de Reducción (Tope - Tope)
    5: definicionFlange, // Flange Acero Carbono/Alma de Acero (solución estandarizada, ./flange.js)
    6: UNA_BOCA, //   Stub End - Cuello Largo
    7: UNA_BOCA, //   Tapón
    8: TRES_BOCAS, // Tee
    9: TRES_BOCAS, // Tee de Reducción
  },
}
