// Tipos de extremo y utilidades compartidas entre varios mapeos.

/** Rosca metálica/plástica de terminales: se muestra, sin medición dimensional (decisión del usuario 2026-11-16). */
export const ROSCA = {
  nombre: 'Rosca',
  sinMedicion: true,
  nota: 'Sin medición dimensional (igual que los terminales HE/HI)',
}

// ---------- PP-RCT (Matrices/PP-RCT Beta nucleado.xlsx) ----------

/** Hojas "Extremo Tubería PN-10/16/20". */
export const HOJA_TUBERIA_PPRCT_POR_PN = { 'PN-10': '3', 'PN-16': '4', 'PN-20': '5' }

/** Hoja 2 "Extremo Socket". El mínimo de D1 es la columna "D1_min (D3_min)", tal como en el VBA. */
export const SOCKET_PPRCT = {
  nombre: 'Socket',
  hoja: () => '2',
  cotas: [
    { codigo: 'L1', etiqueta: 'Largo L1', min: 'L1_Min' },
    { codigo: 'D1min', etiqueta: 'D1 mínimo medido', min: 'D1_min (D3_min)', max: 'D1_max' },
    { codigo: 'D1max', etiqueta: 'D1 máximo medido', min: 'D1_min (D3_min)', max: 'D1_max' },
    { codigo: 'Oval', etiqueta: 'Ovalidad', max: 'Oval_max' },
  ],
}

/** Espiga de tubería PP-RCT (hoja según PN): diámetro, espesor y ovalidad. */
export const ESPIGA_PPRCT = {
  nombre: 'Espiga',
  hoja: (producto) => HOJA_TUBERIA_PPRCT_POR_PN[producto.pn],
  cotas: [
    { codigo: 'Dmin', etiqueta: 'Diámetro exterior mínimo', min: 'D_mín', max: 'D_máx' },
    { codigo: 'Dmax', etiqueta: 'Diámetro exterior máximo', min: 'D_mín', max: 'D_máx' },
    { codigo: 'emin', etiqueta: 'Espesor mínimo', min: 'e_mín', max: 'e_máx' },
    { codigo: 'emax', etiqueta: 'Espesor máximo', min: 'e_mín', max: 'e_máx' },
    { codigo: 'Oval', etiqueta: 'Ovalidad', max: 'ovalidad' },
  ],
}
