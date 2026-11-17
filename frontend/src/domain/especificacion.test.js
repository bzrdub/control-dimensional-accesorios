import { test } from 'node:test'
import { hayDatosReales, MOTIVO_SIN_DATOS } from '../testutil/datosReales.js'

// Las pruebas de mapeo y tablas usan los datos reales de planta (no versionados): ver especificacion.reales.js.
if (hayDatosReales()) await import('./especificacion.reales.js')
else test('especificación con datos reales de planta', { skip: MOTIVO_SIN_DATOS }, () => {})
