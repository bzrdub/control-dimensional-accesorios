// Mapeo accesorio → extremos → tabla de tolerancia para HDPE · Fusión Socket.
// Origen: Matrices/Códigos VBA/HDPE - FUSIÓN SOCKET/HDPE_Socket_*.frm — replica exacta del VBA.
// (HDPE_Socket_1/2/3.frm son plantillas antiguas no usadas por ningún accesorio del LISTADO.)
// Tolerancias: Matrices/HDPE Termofusión Socket.xlsx. Todos los productos son PN-20 SDR 9.

const ENCHUFE = {
  nombre: 'Enchufe (socket)',
  hoja: () => '1', // "Extremo Enchufe"
  cotas: [
    { codigo: 'D1min', etiqueta: 'D1 mínimo medido', min: 'D1_min [mm]', max: 'D1_max [mm]' },
    { codigo: 'D1max', etiqueta: 'D1 máximo medido', min: 'D1_min [mm]', max: 'D1_max [mm]' },
    { codigo: 'D2min', etiqueta: 'D2 mínimo medido', min: 'D2_min [mm]', max: 'D2_max [mm]' },
    { codigo: 'D2max', etiqueta: 'D2 máximo medido', min: 'D2_min [mm]', max: 'D2_max [mm]' },
    { codigo: 'L1', etiqueta: 'Largo de inserción L1', min: 'L1_min [mm]' },
    { codigo: 'Oval', etiqueta: 'Ovalidad', max: 'Oval_max [mm]' },
  ],
}

const ESPIGA = {
  nombre: 'Espiga',
  hoja: () => '2', // nombrada "Extremo Electrofusión PN20, SDR 9" en la planilla; columnas de espiga
  cotas: [
    { codigo: 'Dmin', etiqueta: 'Diámetro mínimo', min: 'D_min [mm]', max: 'D_max [mm]' },
    { codigo: 'Dmax', etiqueta: 'Diámetro máximo', min: 'D_min [mm]', max: 'D_max [mm]' },
    { codigo: 'emin', etiqueta: 'Espesor mínimo', min: 'e_min [mm]', max: 'e_max [mm]' },
    { codigo: 'emax', etiqueta: 'Espesor máximo', min: 'e_min [mm]', max: 'e_max [mm]' },
    { codigo: 'L1', etiqueta: 'Largo L1', min: 'L1_min [mm]' },
    { codigo: 'Oval', etiqueta: 'Ovalidad', max: 'Oval_max [mm]' },
  ],
}

const UNA_BOCA = [['ENCHUFE', 0]]
const DOS_BOCAS = [
  ['ENCHUFE', 0],
  ['ENCHUFE', 1],
]
const TRES_BOCAS = [
  ['ENCHUFE', 0],
  ['ENCHUFE', 1],
  ['ENCHUFE', 2],
]

export default {
  material: 'HDPE',
  fusion: 'SOCKET',
  tolerancias: 'hdpe-socket', // generated/tolerancias/hdpe-socket.json
  tipos: { ENCHUFE, ESPIGA },
  accesorios: {
    1: DOS_BOCAS, //  Codo 45°
    2: DOS_BOCAS, //  Codo 90°
    3: DOS_BOCAS, //  Copla
    4: [
      ['ENCHUFE', 0],
      ['ESPIGA', 1],
    ], //             Copla de Reducción (Socket - Tope)
    5: UNA_BOCA, //   Tapón
    6: TRES_BOCAS, // Tee
    7: TRES_BOCAS, // Tee de Reducción
    8: UNA_BOCA, //   Terminal Metálico HE (rosca no se mide, igual que el VBA)
    9: UNA_BOCA, //   Terminal Metálico HI (rosca no se mide, igual que el VBA)
  },
}
