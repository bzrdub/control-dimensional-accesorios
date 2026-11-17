// Mapeo accesorio → extremos → tabla de tolerancia para HDPE · Electrofusión.
// Origen: Matrices/Códigos VBA/HDPE - ELECTROFUSIÓN/HDPE_Electrofusion_*.frm
// Validado con el usuario (2026-11-16). Tolerancias: Matrices/HDPE Electrofusión.xlsx (PN-16 SDR 11).
// Reglas replicadas del VBA:
//   - L1: el VBA compara contra Regulación I y Regulación V; como V ≥ I en toda la tabla, el efecto es L1 ≥ Reg. V.
//   - L3 ≥ 5 mm (valor fijo en el código VBA).
//   - D2 (diámetro interior) ≥ D_nominal − 2·e_nominal (límite calculado).
//   - Largo de inserción de la espiga ≥ "L1 Min - Regulación V" de la hoja 1 (otra hoja).
// Diferencias intencionales con el VBA:
//   - Codo 45°/90° y Copla: el extremo 2 usa Diámetro 2 (el VBA usaba Diámetro 1; son iguales en la MATRIZ).
//   - Codo de Transición HE/HI: el VBA (copiado de la Tee) evaluaba 2 bocas EF + 1 espiga. Según el usuario son
//     piezas mixtas: boca(s) plásticas de electrofusión + terminal metálico roscado (sin medición dimensional).
// Collarin.frm no corresponde a ningún accesorio del LISTADO; 1CE/2CE/2CE_1SE no tienen lógica de comparación.
import { ROSCA as ROSCA_COMUN } from './comun.js'

const ELECTROFUSION = {
  nombre: 'Electrofusión',
  hoja: () => '1',
  cotas: [
    { codigo: 'L1', etiqueta: 'Largo de inserción (L1)', min: 'L1 Min - Regulación V', max: 'L1 Máx' },
    { codigo: 'L2', etiqueta: 'Largo espiral (L2)', min: 'L2Min' },
    { codigo: 'L3', etiqueta: 'Largo inicio espiral (L3)', min: 5 },
    { codigo: 'D1', etiqueta: 'Diámetro espiral (D1)', min: 'D_nominal' },
    { codigo: 'D2', etiqueta: 'Diámetro interior (D2)', min: (v) => v.D_nominal - 2 * v.e_nominal },
    { codigo: 'e', etiqueta: 'Espesor de inserción', min: 'e_nominal' },
  ],
}

// Zona de electrofusión tipo silla (Spigot Saddle, Tapping Tee): sin D1/D2.
const ELECTROFUSION_SILLA = {
  nombre: 'Electrofusión (silla)',
  hoja: () => '1',
  cotas: ELECTROFUSION.cotas.filter((c) => !['D1', 'D2'].includes(c.codigo)),
}

const ESPIGA = {
  nombre: 'Espiga',
  hoja: () => '2', // "Extremo Tubería PN-16 SDR 11"
  cotas: [
    { codigo: 'Dmin', etiqueta: 'Diámetro mínimo', min: 'D_min', max: 'D_max' },
    { codigo: 'Dmax', etiqueta: 'Diámetro máximo', min: 'D_min', max: 'D_max' },
    { codigo: 'emin', etiqueta: 'Espesor mínimo', min: 'e_min', max: 'e_max' },
    { codigo: 'emax', etiqueta: 'Espesor máximo', min: 'e_min', max: 'e_max' },
    { codigo: 'Oval', etiqueta: 'Ovalidad', max: 'Ovalidad' },
    { codigo: 'Lin', etiqueta: 'Largo de inserción', min: { hoja: '1', columna: 'L1 Min - Regulación V' } },
  ],
}

const ROSCA = { ...ROSCA_COMUN, nombre: 'Rosca metálica' }

const EF = (i) => ['ELECTROFUSION', i]
const SILLA = (i) => ['ELECTROFUSION_SILLA', i]
const ESP = (i) => ['ESPIGA', i]
const RSC = (i) => ['ROSCA', i]

export default {
  material: 'HDPE',
  fusion: 'ELECTROFUSION',
  tolerancias: 'hdpe-electrofusion', // generated/tolerancias/hdpe-electrofusion.json
  tipos: { ELECTROFUSION, ELECTROFUSION_SILLA, ESPIGA, ROSCA },
  // [tipo, índice en `diametros`]. En Tee/Spigot Saddle/Tapping Tee la derivación es el Diámetro 2.
  accesorios: {
    1: [EF(0), EF(1)], //            Codo 45°
    2: [EF(0), EF(1)], //            Codo 90°
    3: [EF(0), RSC(1)], //           Codo de Transición HE (boca EF + terminal roscado)
    4: [EF(0), RSC(1)], //           Codo de Transición HI
    5: [EF(0), EF(1)], //            Copla
    6: [EF(0), EF(1)], //            Copla de Reducción
    7: [SILLA(0), SILLA(2), ESP(1)], // Spigot Saddle (derivación = espiga)
    8: [EF(0)], //                   Tapón
    9: [SILLA(0), SILLA(2), ESP(1)], // Tapping Tee (derivación = espiga)
    10: [EF(0), EF(2), ESP(1)], //   Tee (derivación = espiga)
    11: [EF(0), EF(2), ESP(1)], //   Tee de Reducción (derivación = espiga)
    12: [ESP(0), RSC(1)], //         Terminal HE (espiga plástica + rosca)
    13: [ESP(0), RSC(1)], //         Terminal HI
    14: [EF(0), RSC(1)], //          Terminal de Transición HE (boca EF + rosca)
    15: [EF(0), RSC(1)], //          Terminal de Transición HI
  },
}
