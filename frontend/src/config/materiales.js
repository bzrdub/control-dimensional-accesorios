// Catálogo de materiales y tipos de fusión.
// `active: false` deja el material previsto en la estructura pero oculto/deshabilitado en la UI.
// Cuando exista backend (Django), este catálogo podrá venir de la API con la misma forma.

export const TIPOS_FUSION = {
  SOCKET: { id: 'SOCKET', nombre: 'Fusión Socket', descripcion: 'Termofusión por encaje' },
  ELECTROFUSION: { id: 'ELECTROFUSION', nombre: 'Electrofusión', descripcion: 'Accesorio con resistencia embebida' },
  TOPE: { id: 'TOPE', nombre: 'Fusión a Tope', descripcion: 'Soldadura a tope (butt fusion)' },
}

// Confirmado: HDPE y PP-RCT admiten los tres tipos de fusión.
export const MATERIALES = [
  {
    id: 'HDPE',
    nombre: 'HDPE',
    descripcion: 'Polietileno de alta densidad',
    active: true,
    fusiones: ['SOCKET', 'ELECTROFUSION', 'TOPE'],
  },
  {
    id: 'PP-RCT',
    nombre: 'PP-RCT',
    descripcion: 'Polipropileno random con cristalinidad y temperatura mejoradas',
    active: true,
    fusiones: ['SOCKET', 'ELECTROFUSION', 'TOPE'],
  },
  {
    id: 'PP-R',
    nombre: 'PP-R',
    descripcion: 'Polipropileno random copolímero',
    active: false,
    fusiones: ['SOCKET', 'ELECTROFUSION'],
  },
]

export const materialesActivos = () => MATERIALES.filter((m) => m.active)

export const getMaterial = (id) => MATERIALES.find((m) => m.id === id) ?? null

export const fusionesDeMaterial = (materialId) =>
  (getMaterial(materialId)?.fusiones ?? []).map((f) => TIPOS_FUSION[f])
