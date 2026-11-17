import { useEffect, useState } from 'react'

/** Devuelve `valor` después de `ms` sin cambios (evita una consulta al servidor por cada tecla). */
export function useDebounce(valor, ms = 300) {
  const [estable, setEstable] = useState(valor)
  useEffect(() => {
    const t = setTimeout(() => setEstable(valor), ms)
    return () => clearTimeout(t)
  }, [valor, ms])
  return estable
}
