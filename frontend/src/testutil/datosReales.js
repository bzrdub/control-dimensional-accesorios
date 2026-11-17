// Para pruebas: ¿hay datos REALES de planta en src/data/generated/? (extraídos de las planillas, no versionados).
// En un clon del repositorio público solo existen los datos DEMO (`npm run datos:demo`), marcados con "demo": true.
import { existsSync, readFileSync } from 'node:fs'

const MUESTRA = new URL('../data/generated/tolerancias/pp-rct.json', import.meta.url)

export function hayDatosReales() {
  if (!existsSync(MUESTRA)) return false
  return !JSON.parse(readFileSync(MUESTRA, 'utf8')).demo
}

export const MOTIVO_SIN_DATOS = 'sin datos reales de planta (repositorio público: solo datos DEMO)'
