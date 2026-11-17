// Botón tipo "pill" seleccionable, compartido por los selectores de fusión, accesorio y dimensión.
export default function BotonOpcion({ selected, disabled, onClick, title, children }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      title={title}
      onClick={onClick}
      className={[
        'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition',
        selected
          ? 'border-blue-600 bg-blue-600 text-white'
          : 'border-slate-300 bg-white text-slate-700 hover:border-blue-400',
        disabled && 'cursor-not-allowed opacity-50 hover:border-slate-300',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </button>
  )
}
