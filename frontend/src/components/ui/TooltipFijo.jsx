// Tooltip con posición fija (no lo recorta el scroll horizontal de una tabla).
// `aviso` = { texto, x, top, bottom } calculado con getBoundingClientRect() del elemento.
export default function TooltipFijo({ id, aviso, className = 'bg-red-800 text-white' }) {
  if (!aviso) return null
  const ancho = 320
  const x = Math.min(Math.max(aviso.x, ancho / 2 + 8), window.innerWidth - ancho / 2 - 8)
  const arriba = aviso.top > 72
  return (
    <div
      id={id}
      role="tooltip"
      style={{
        position: 'fixed',
        left: x,
        top: arriba ? aviso.top - 6 : aviso.bottom + 6,
        transform: `translate(-50%, ${arriba ? '-100%' : '0'})`,
        maxWidth: ancho,
      }}
      className={`pointer-events-none z-50 rounded px-2.5 py-1.5 text-xs leading-snug shadow-lg ${className}`}
    >
      {aviso.texto}
    </div>
  )
}
