import { useState } from 'react'

// Visor de imágenes del accesorio, como el panel derecho de los formularios VBA:
// radio "Puntos de medición" (esquemas de norma) / "Numeración de salidas" (foto del accesorio).
// Montar con key={producto.id} para volver a la primera imagen al cambiar de producto.
const etiquetaOpcion = (img, i, esquemas) => {
  if (img.tipo === 'foto') return 'Numeración de salidas'
  if (esquemas === 1) return 'Puntos de medición'
  return i === 0 ? `Puntos de medición (${img.titulo.toLowerCase()})` : img.titulo
}

export default function DiagramaAccesorio({ imagenes }) {
  const [indice, setIndice] = useState(0)
  if (imagenes.length === 0) {
    return (
      <div className="flex h-full min-h-48 items-center justify-center rounded border border-slate-300 bg-white p-4 text-xs text-slate-500">
        Sin esquema de medición disponible para este accesorio.
      </div>
    )
  }
  const actual = imagenes[Math.min(indice, imagenes.length - 1)]
  const esquemas = imagenes.filter((i) => i.tipo === 'norma').length

  return (
    <figure className="space-y-3">
      <a
        href={actual.src}
        target="_blank"
        rel="noreferrer"
        title="Ver en tamaño completo"
        className="flex items-center justify-center rounded border border-slate-400 bg-white p-2"
      >
        <img src={actual.src} alt={`${actual.titulo} del accesorio`} className="max-h-80 w-full object-contain" />
      </a>
      {imagenes.length > 1 && (
        <figcaption>
          <fieldset className="flex flex-wrap justify-center gap-x-6 gap-y-1">
            <legend className="sr-only">Imagen a mostrar</legend>
            {imagenes.map((img, i) => (
              <label key={img.src} className="flex cursor-pointer items-center gap-1.5 text-sm font-medium text-slate-800">
                <input
                  type="radio"
                  name="imagen-accesorio"
                  checked={i === indice}
                  onChange={() => setIndice(i)}
                  className="accent-slate-800"
                />
                {etiquetaOpcion(img, i, esquemas)}
              </label>
            ))}
          </fieldset>
        </figcaption>
      )}
    </figure>
  )
}
