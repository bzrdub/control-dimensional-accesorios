// Mapeo accesorio → extremos → tabla de tolerancia para HDPE · Fusión Tope.
// Origen: Matrices/Códigos VBA/HDPE - FUSIÓN TOPE/HDPE_Tope_*.frm
// Tolerancias: Matrices/HDPE Termofusión.xlsx. Validado/encargado por el usuario (2026-11-16).
// Diferencias intencionales con el VBA:
//   - Stub End PN-20: el VBA no tiene rama para PN-20 (no evalúa nada); aquí usa la hoja 8 "Stub End PN20, SDR 9".
//   - Codo 45°: el extremo 2 usa Diámetro 2 (el VBA usaba Diámetro 1; son iguales en la MATRIZ).
//   - Flange: solución estandarizada de ./flange.js.
// Las columnas "#2" (Medición 2) de las hojas 1 y 3 no las usa el VBA y se ignoran.
import { TIPOS_FLANGE, definicionFlange } from './flange.js'

const HOJA_TOPE_POR_PN = { 'PN-10': '1', 'PN-12,5': '2', 'PN-16': '3' }
const HOJA_STUB_POR_PN = { 'PN-10': '4', 'PN-16': '5', 'PN-20': '8' }

const TOPE = {
  nombre: 'Tope',
  hoja: (producto) => HOJA_TOPE_POR_PN[producto.pn],
  cotas: [
    { codigo: 'Dmin', etiqueta: 'Diámetro exterior mínimo', min: 'D_mín', max: 'D_máx' },
    { codigo: 'Dmax', etiqueta: 'Diámetro exterior máximo', min: 'D_mín', max: 'D_máx' },
    { codigo: 'emin', etiqueta: 'Espesor mínimo', min: 'e_mín', max: 'e_max' },
    { codigo: 'emax', etiqueta: 'Espesor máximo', min: 'e_mín', max: 'e_max' },
    { codigo: 'L1', etiqueta: 'Largo L1', registro: true },
    { codigo: 'Oval', etiqueta: 'Ovalidad', max: 'Oval.' },
  ],
}

const STUB_END = {
  nombre: 'Stub End',
  hoja: (producto) => HOJA_STUB_POR_PN[producto.pn],
  cotas: [
    { codigo: 'Dmin', etiqueta: 'Diámetro exterior mínimo', min: 'D_mín', max: 'D_máx' },
    { codigo: 'Dmax', etiqueta: 'Diámetro exterior máximo', min: 'D_mín', max: 'D_máx' },
    { codigo: 'emin', etiqueta: 'Espesor mínimo', min: 'e_mín', max: 'e_max' },
    { codigo: 'emax', etiqueta: 'Espesor máximo', min: 'e_mín', max: 'e_max' },
    { codigo: 'L', etiqueta: 'Largo (z1)', min: 'z1' },
    { codigo: 'h1', etiqueta: 'Altura h1', min: 'h1' },
    { codigo: 'h2', etiqueta: 'Altura h2', min: 'h2' },
    { codigo: 'D2', etiqueta: 'Diámetro exterior collar (d4)', min: 'd_4' },
    { codigo: 'Oval', etiqueta: 'Ovalidad', max: 'Oval.' },
  ],
}

const T = (i) => ['TOPE', i]

export default {
  material: 'HDPE',
  fusion: 'TOPE',
  tolerancias: 'hdpe-tope', // generated/tolerancias/hdpe-tope.json
  tipos: { TOPE, STUB_END, ...TIPOS_FLANGE },
  accesorios: {
    1: [T(0), T(1)], //             Codo 45°
    2: [T(0), T(1)], //             Codo 90°
    3: [T(0), T(1)], //             Copla de Reducción
    4: [T(0), T(1), T(2), T(3)], // Cruz
    5: definicionFlange, //         Flanges Acero Carbono/Alma de Acero
    6: [['STUB_END', 0]], //        Stub End
    7: [T(0)], //                   Tapón
    8: [T(0), T(1), T(2)], //       Tee
    9: [T(0), T(1), T(2)], //       Tee de Reducción
  },
}
