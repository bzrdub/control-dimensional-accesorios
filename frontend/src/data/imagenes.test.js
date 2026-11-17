import { test } from 'node:test'
import { hayDatosReales, MOTIVO_SIN_DATOS } from '../testutil/datosReales.js'

if (hayDatosReales()) await import('./imagenes.reales.js')
else test('imágenes de cada accesorio', { skip: MOTIVO_SIN_DATOS }, () => {})
