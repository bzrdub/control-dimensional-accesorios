// Valores del registro global (hoja GLOBAL de las planillas CONTROL *.xlsm).

export const FALLAS_PHI = [
  { id: 'SIN_FALLAS', nombre: 'Sin Fallas' },
  { id: 'RUPTURA', nombre: 'Ruptura' },
  { id: 'FILTRACION', nombre: 'Filtración' },
]
export const nombreFalla = (id) => FALLAS_PHI.find((f) => f.id === id)?.nombre ?? id

// Estado de aprobación: lo define el inspector a mano (no se calcula).
export const ESTADOS_APROBACION = [
  { id: 'EN_PROCESO', nombre: 'EN PROCESO', clase: 'bg-amber-100 text-amber-900 border-amber-300' },
  { id: 'APROBADO', nombre: 'APROBADO', clase: 'bg-green-100 text-green-800 border-green-300' },
  { id: 'RECHAZADO', nombre: 'RECHAZADO', clase: 'bg-red-100 text-red-800 border-red-300' },
]
export const estadoAprobacion = (id) => ESTADOS_APROBACION.find((e) => e.id === id) ?? ESTADOS_APROBACION[0]
