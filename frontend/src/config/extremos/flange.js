// Solución estandarizada para Flanges (compartida por HDPE · Tope y PP-RCT · Tope).
//
// Origen: HDPE_Tope_Flange.frm / PPRCT_Tope_Flange.frm. El VBA:
//   - hace elegir al inspector la norma ISO (hoja 6) o ANSI (hoja 7) y la cantidad de orificios (4 u 8);
//   - salvo el diámetro exterior en ISO, exige IGUALDAD EXACTA con valores nominales (d_2, t, d_1, D_min ANSI),
//     lo que marca No Conforme cualquier medición real distinta del nominal.
// Solución (2026-11-16):
//   - La hoja se elige por el producto: "Alma de Acero" → hoja 6, "Acero Carbono" → hoja 7. Hipótesis respaldada
//     por la cobertura de diámetros de ambas hojas en HDPE y PP-RCT; cambiar `hojaFlange` si el inspector debe elegir.
//   - Se evalúa lo que tiene rango real (diámetro exterior en hoja 6). El resto es "solo registro" mostrando el
//     nominal y la desviación informativa, hasta definir tolerancias en TOLERANCIAS_FLANGE.
//   - Orificios: 8 campos de solo registro; se completan solo los existentes (4 u 8).
// Columnas: hoja 6 → D_min, D_max, d, d_1, d_2, t · hoja 7 → D_min, d, d_1, d_2, t
//   (d = círculo de pernos, no se mide en el VBA; d_1 = orificio; d_2 = diámetro central; t = espesor)

/** Tolerancias ± (mm) para cotas con valor nominal. null = solo registro. Completar cuando se definan. */
export const TOLERANCIAS_FLANGE = {
  exteriorANSI: null, // D_min de la hoja 7 (sin D_max en la tabla)
  central: null, //      d_2
  espesor: null, //      t
  orificio: null, //     d_1
}

export const hojaFlange = (producto) => (/alma/i.test(producto.producto) ? '6' : '7')

const orificios = Array.from({ length: 8 }, (_, i) => ({
  codigo: `O${i + 1}`,
  etiqueta: `Orificio ${i + 1}${i >= 4 ? ' (si tiene 8)' : ''}`,
  nominal: 'd_1',
  tolerancia: TOLERANCIAS_FLANGE.orificio,
}))

const comunes = [
  { codigo: 'Cmin', etiqueta: 'Diámetro central mínimo', nominal: 'd_2', tolerancia: TOLERANCIAS_FLANGE.central },
  { codigo: 'Cmax', etiqueta: 'Diámetro central máximo', nominal: 'd_2', tolerancia: TOLERANCIAS_FLANGE.central },
  { codigo: 'tmin', etiqueta: 'Espesor mínimo', nominal: 't', tolerancia: TOLERANCIAS_FLANGE.espesor },
  { codigo: 'tmax', etiqueta: 'Espesor máximo', nominal: 't', tolerancia: TOLERANCIAS_FLANGE.espesor },
  ...orificios,
]

export const FLANGE_ISO = {
  nombre: 'Flange · hoja 6 (Alma de Acero / ISO)',
  hoja: () => '6',
  cotas: [
    { codigo: 'Dmin', etiqueta: 'Diámetro exterior mínimo', min: 'D_min', max: 'D_max' },
    { codigo: 'Dmax', etiqueta: 'Diámetro exterior máximo', min: 'D_min', max: 'D_max' },
    ...comunes,
  ],
}

export const FLANGE_ANSI = {
  nombre: 'Flange · hoja 7 (Acero Carbono / ANSI)',
  hoja: () => '7',
  cotas: [
    { codigo: 'Dmin', etiqueta: 'Diámetro exterior mínimo', nominal: 'D_min', tolerancia: TOLERANCIAS_FLANGE.exteriorANSI },
    { codigo: 'Dmax', etiqueta: 'Diámetro exterior máximo', nominal: 'D_min', tolerancia: TOLERANCIAS_FLANGE.exteriorANSI },
    ...comunes,
  ],
}

export const TIPOS_FLANGE = { FLANGE_ISO, FLANGE_ANSI }

/** Definición del accesorio Flange: un único extremo con el tipo según el producto. */
export const definicionFlange = (producto) => [[hojaFlange(producto) === '6' ? 'FLANGE_ISO' : 'FLANGE_ANSI', 0]]
