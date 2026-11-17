export default function Paso({ numero, titulo, children }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-semibold text-slate-700">
        {numero}. {titulo}
      </legend>
      {children}
    </fieldset>
  )
}
