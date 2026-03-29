const SECCIONES = [
  {
    id: 'configuracion',
    num: '1',
    label: 'Configuración',
    sub: 'Equipos, canchas, árbitros',
    needsLiga: false,
    needsAg: false,
  },
  {
    id: 'ejecucion',
    num: '2',
    label: 'Ejecutar AG',
    sub: 'Optimización genética',
    needsLiga: true,
    needsAg: false,
  },
  {
    id: 'resultados',
    num: '3',
    label: 'Resultados',
    sub: 'Top 3 + calendario',
    needsLiga: true,
    needsAg: true,
  },
  {
    id: 'filtros',
    num: '4',
    label: 'Filtros',
    sub: 'Por equipo o árbitro',
    needsLiga: true,
    needsAg: true,
  },
]

function getStatus(sec, ligaLista, agListo) {
  if (sec.id === 'configuracion') return ligaLista ? 'done' : 'pending'
  if (sec.needsAg) return agListo ? 'done' : ligaLista ? 'pending' : 'idle'
  if (sec.needsLiga) return ligaLista ? (agListo ? 'done' : 'pending') : 'idle'
  return 'idle'
}

export default function Sidebar({ seccion, setSeccion, ligaLista, agListo }) {
  return (
    <nav className="sidebar">
      <div className="sidebar-brand">
        <h1>CancharIA</h1>
        <p>Optimización de calendario</p>
      </div>

      <hr className="sidebar-divider" />

      {SECCIONES.map(s => {
        const status = getStatus(s, ligaLista, agListo)
        return (
          <button
            key={s.id}
            className={`nav-item ${seccion === s.id ? 'active' : ''}`}
            onClick={() => setSeccion(s.id)}
          >
            <span className="nav-num">{s.num}</span>
            <span style={{ flex: 1 }}>
              <span style={{ display: 'block', lineHeight: 1.3 }}>{s.label}</span>
              <span style={{ display: 'block', fontSize: '0.7rem', opacity: 0.65, fontWeight: 400 }}>
                {s.sub}
              </span>
            </span>
            <span className={`nav-status ${status}`} title={
              status === 'done' ? 'Completado' : status === 'pending' ? 'En progreso' : ''
            } />
          </button>
        )
      })}

      <div className="sidebar-footer">
        {ligaLista && !agListo && 'Liga configurada — ejecuta el AG'}
        {agListo && 'AG completado'}
        {!ligaLista && 'Configura la liga para empezar'}
      </div>
    </nav>
  )
}
