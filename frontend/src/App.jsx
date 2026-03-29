import { useState } from 'react'
import Sidebar from './components/Sidebar'
import Configuracion from './components/Configuracion'
import EjecucionAG from './components/EjecucionAG'
import Resultados from './components/Resultados'
import Filtros from './components/Filtros'

export default function App() {
  const [seccion, setSeccion] = useState('configuracion')
  const [liga, setLiga] = useState(null)
  const [agListo, setAgListo] = useState(false)

  const handleConfigurar = (l) => {
    setLiga(l)
    setAgListo(false)
  }

  return (
    <div className="app">
      <Sidebar
        seccion={seccion}
        setSeccion={setSeccion}
        ligaLista={!!liga}
        agListo={agListo}
      />
      <main className="contenido">
        {seccion === 'configuracion' && <Configuracion onConfigurar={handleConfigurar} />}
        {seccion === 'ejecucion'    && <EjecucionAG liga={liga} onListo={() => setAgListo(true)} />}
        {seccion === 'resultados'   && <Resultados liga={liga} />}
        {seccion === 'filtros'      && <Filtros liga={liga} />}
      </main>
    </div>
  )
}
