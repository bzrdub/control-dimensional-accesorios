import { fusionesDeMaterial } from '../config/materiales.js'
import Paso from './ui/Paso.jsx'
import BotonOpcion from './ui/BotonOpcion.jsx'

export default function SelectorFusion({ materialId, value, onChange }) {
  return (
    <Paso numero={2} titulo="Tipo de fusión">
      <div className="flex flex-wrap gap-2">
        {fusionesDeMaterial(materialId).map((f) => (
          <BotonOpcion key={f.id} selected={value === f.id} title={f.descripcion} onClick={() => onChange(f.id)}>
            {f.nombre}
          </BotonOpcion>
        ))}
      </div>
    </Paso>
  )
}
