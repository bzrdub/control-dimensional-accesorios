// Mapeo accesorio → extremos → tabla de tolerancia para PP-RCT · Fusión Socket.
// Origen: Matrices/Códigos VBA/PP-RCT FUSIÓN SOCKET/PPRCT_Socket_*.frm (+ Ingreso.frm como despachador).
// Tolerancias: Matrices/PP-RCT Beta nucleado.xlsx (hoja 2 socket; hojas 3/4/5 tubería por PN).
// Tanda 1 (accesorios 1–16), 2026-11-16. Diferencias intencionales con el VBA:
//   - Copla de Reducción: el VBA compara la ovalidad del extremo 2 con "<" (marca error cuando está BAJO el
//     máximo). Aquí: ovalidad ≤ máximo, como en todos los demás extremos.
//   - Codo 90° - Cuello Corto - Terminal Plástico HE: Ingreso.frm no tiene rama para este accesorio (no se puede
//     registrar en el VBA). Se mapea igual que sus equivalentes metálicos: socket + rosca sin medición.
//   - Terminales: la rosca se muestra sin medición dimensional (decisión del usuario).
// Tanda 2 (accesorios 17–32), 2026-11-16:
//   - Montura: el VBA mide solo el socket con Diámetro 1, que en la MATRIZ es la salida (p. ej. "50 x 20" → [20, 50]).
//     El orden invertido es intencional; el extractor no lo corrige. El tubo base (Diámetro 2) no se mide.
//   - Flange Alma de Acero: Ingreso.frm lo lista pero no tiene rama .Show (no se puede registrar en el VBA).
//     Se aplica la solución estandarizada de ./flange.js (Alma de Acero → hoja 6).
//   - Tee/Unión Americana con terminal HE/HI: sockets + rosca sin medición.
import { ESPIGA_PPRCT, ROSCA, SOCKET_PPRCT } from './comun.js'
import { TIPOS_FLANGE, definicionFlange } from './flange.js'

const S = (i) => ['SOCKET', i]
const M = (i) => ['MACHO', i]
const R = (i) => ['ROSCA', i]

const SOCKET_MAS_ROSCA = [S(0), R(1)]

export default {
  material: 'PP-RCT',
  fusion: 'SOCKET',
  tolerancias: 'pp-rct', // generated/tolerancias/pp-rct.json
  tipos: {
    SOCKET: SOCKET_PPRCT,
    MACHO: { ...ESPIGA_PPRCT, nombre: 'Macho (espiga)' },
    ROSCA,
    ...TIPOS_FLANGE,
  },
  accesorios: {
    1: [S(0), S(1)], //            Codo 45°
    2: [S(0), M(1)], //            Codo 45° - Macho
    3: [S(0), S(1)], //            Codo 90°
    4: [S(0), S(1)], //            Codo 90° de Reducción
    5: SOCKET_MAS_ROSCA, //        Codo 90° - Cuello Corto - Terminal Metálico HE
    6: SOCKET_MAS_ROSCA, //        Codo 90° - Cuello Corto - Terminal Metálico HI
    7: SOCKET_MAS_ROSCA, //        ... HE con Soporte
    8: SOCKET_MAS_ROSCA, //        ... HI con Soporte
    9: [S(0), R(1), S(2), R(3)], // Codo 90° - Cuello Corto - Terminal Metálico HI Doble (2 sockets + 2 roscas)
    10: SOCKET_MAS_ROSCA, //       Codo 90° - Cuello Corto - Terminal Plástico HE (sin formulario en el VBA)
    11: SOCKET_MAS_ROSCA, //       Codo 90° - Cuello Largo - Terminal Metálico HI
    12: SOCKET_MAS_ROSCA, //       Codo 90° - Cuello Largo - Terminal Metálico HI - Tuerca Volante
    13: [S(0), M(1)], //           Codo 90° - Macho
    14: [S(0), S(1)], //           Copla
    15: [S(0), S(1)], //           Copla de Reducción (ovalidad extremo 2 corregida)
    16: SOCKET_MAS_ROSCA, //       Copla - Terminal Metálico HI - Tuerca Volante
    17: [S(0), S(1), S(2), S(3)], // Cruz
    18: definicionFlange, //       Flange Alma de Acero (sin formulario en el VBA; solución estandarizada)
    19: [S(0)], //                 Montura (solo la salida socket = Diámetro 1)
    20: [S(0), S(1)], //           Pasatubos
    21: [S(0)], //                 Stub End - Cuello Corto
    22: [S(0)], //                 Tapón
    23: [S(0), S(1), S(2)], //     Tee
    24: [S(0), S(1), S(2)], //     Tee de Reducción
    25: [S(0), S(1), R(2)], //     Tee - Terminal Metálico HE
    26: [S(0), S(1), R(2)], //     Tee - Terminal Metálico HI
    27: SOCKET_MAS_ROSCA, //       Terminal Metálico HE
    28: SOCKET_MAS_ROSCA, //       Terminal Metálico HI
    29: SOCKET_MAS_ROSCA, //       Terminal Plástico HE
    30: [S(0), S(1)], //           Unión Americana - Cuerpo Metálico
    31: SOCKET_MAS_ROSCA, //       Unión Americana - Cuerpo Metálico - Fusión HE
    32: SOCKET_MAS_ROSCA, //       Unión Americana - Cuerpo Metálico - Fusión HI
  },
}
