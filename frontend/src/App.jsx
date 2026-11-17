import { useState } from 'react'
import SelectorMaterial from './components/SelectorMaterial.jsx'
import SelectorFusion from './components/SelectorFusion.jsx'
import RegistroGlobal from './components/RegistroGlobal.jsx'

// Inicio: material y tipo de fusión → registro global de esa combinación
// (equivale a abrir la planilla CONTROL <material> - <fusión>.xlsm).
export default function App() {
  const [material, setMaterial] = useState(undefined)
  const [fusion, setFusion] = useState(undefined)
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 px-6 py-4 text-white">
        <h1 className="text-xl font-bold">Control de Accesorios</h1>
        <p className="text-sm text-slate-300">Registro de ingreso, control dimensional y ensayo PHI</p>
      </header>

      {/* Con el registro abierto se usa todo el ancho para que las tablas entren sin scroll horizontal. */}
      <main className={`mx-auto space-y-6 ${abierto ? 'max-w-none p-2 sm:p-3' : 'max-w-5xl p-4 sm:p-6'}`}>
        {abierto ? (
          <RegistroGlobal key={`${material}|${fusion}`} material={material} fusion={fusion} onInicio={() => setAbierto(false)} />
        ) : (
          <section className="space-y-6 rounded-xl bg-white p-4 shadow-sm sm:p-6">
            <SelectorMaterial
              value={material}
              onChange={(m) => {
                setMaterial(m)
                setFusion(undefined)
              }}
            />
            {material && (
              <SelectorFusion
                materialId={material}
                value={fusion}
                onChange={(f) => {
                  setFusion(f)
                  setAbierto(true)
                }}
              />
            )}
          </section>
        )}
      </main>
    </div>
  )
}
