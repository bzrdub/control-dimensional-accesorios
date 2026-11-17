// Registro de mapeos accesorio → extremos por material/fusión.
// Para habilitar otra combinación: crear su archivo (mismo formato que pp-rct-electrofusion.js) y añadirlo aquí.
import ppRctElectrofusion from './pp-rct-electrofusion.js'
import ppRctTope from './pp-rct-tope.js'
import hdpeSocket from './hdpe-socket.js'
import hdpeElectrofusion from './hdpe-electrofusion.js'
import hdpeTope from './hdpe-tope.js'
import ppRctSocket from './pp-rct-socket.js'

export const MAPEOS = [ppRctElectrofusion, ppRctTope, ppRctSocket, hdpeSocket, hdpeElectrofusion, hdpeTope]

export const getMapeo = (materialId, fusionId) =>
  MAPEOS.find((m) => m.material === materialId && m.fusion === fusionId) ?? null
