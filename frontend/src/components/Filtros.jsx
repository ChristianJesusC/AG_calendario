import { useState } from 'react'
import axios from 'axios'

const API = 'http://localhost:8000'

function FiltroEquipo({ liga }) {
  const [equipoId, setEquipoId] = useState('')
  const [partidos, setPartidos] = useState([])
  const [cargando, setCargando] = useState(false)

  const buscar = async () => {
    if (!equipoId) return
    setCargando(true)
    try {
      const res = await axios.get(`${API}/ag/filtrar/equipo/${equipoId}`)
      setPartidos(res.data.partidos)
    } finally {
      setCargando(false)
    }
  }

  const equipos = liga?.equipos || []

  return (
    <div className="card">
      <h3 style={{ marginBottom: 14 }}>Filtrar por equipo</h3>
      <div className="row" style={{ marginBottom: 16 }}>
        <select value={equipoId} onChange={e => setEquipoId(e.target.value)} style={{ width: 200 }}>
          <option value="">Selecciona un equipo</option>
          {equipos.map(e => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <button className="btn btn-primary" onClick={buscar} disabled={!equipoId || cargando}>
          {cargando ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {partidos.length > 0 && (
        <>
          <p style={{ marginBottom: 10, color: '#555' }}>
            {partidos.length} partidos encontrados
          </p>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Partido</th>
                <th>Día</th>
                <th>Franja</th>
                <th>Cancha</th>
                <th>Árbitro</th>
                <th>Descanso desde anterior</th>
              </tr>
            </thead>
            <tbody>
              {partidos.map((p, i) => (
                <tr key={p.partido_id}
                    style={{ background: p.horas_descanso !== null && p.horas_descanso < 24 ? '#fff3e0' : undefined }}>
                  <td>{i + 1}</td>
                  <td><strong>{p.local} vs {p.visitante}</strong></td>
                  <td>Día {p.dia}</td>
                  <td>{p.franja}</td>
                  <td>{p.cancha}</td>
                  <td>{p.arbitro}</td>
                  <td>
                    {p.horas_descanso === null ? (
                      <span className="badge badge-blue">Primer partido</span>
                    ) : p.horas_descanso < 24 ? (
                      <span className="badge badge-red">{p.horas_descanso}h ⚠</span>
                    ) : (
                      <span className="badge badge-green">{p.horas_descanso}h</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {partidos.length === 0 && equipoId && !cargando && (
        <p style={{ color: '#888' }}>Sin resultados. Ejecuta el AG primero.</p>
      )}
    </div>
  )
}

function FiltroArbitro({ liga }) {
  const [arbitroId, setArbitroId] = useState('')
  const [data, setData] = useState(null)
  const [cargando, setCargando] = useState(false)

  const buscar = async () => {
    if (!arbitroId) return
    setCargando(true)
    try {
      const res = await axios.get(`${API}/ag/filtrar/arbitro/${arbitroId}`)
      setData(res.data)
    } finally {
      setCargando(false)
    }
  }

  const arbitros = liga?.arbitros || []

  return (
    <div className="card">
      <h3 style={{ marginBottom: 14 }}>Filtrar por árbitro</h3>
      <div className="row" style={{ marginBottom: 16 }}>
        <select value={arbitroId} onChange={e => setArbitroId(e.target.value)} style={{ width: 200 }}>
          <option value="">Selecciona un árbitro</option>
          {arbitros.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>
        <button className="btn btn-primary" onClick={buscar} disabled={!arbitroId || cargando}>
          {cargando ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {data && (
        <>
          <div className="row" style={{ marginBottom: 14, gap: 20 }}>
            <span>Total asignados: <strong>{data.total}</strong></span>
            <span>Promedio liga: <strong>{data.promedio_liga}</strong></span>
            <span>
              Diferencia:{' '}
              <span className={`badge ${data.diferencia_promedio >= 0 ? 'badge-blue' : 'badge-red'}`}>
                {data.diferencia_promedio > 0 ? '+' : ''}{data.diferencia_promedio}
              </span>
            </span>
          </div>

          {data.partidos.length > 0 ? (
            <table>
              <thead>
                <tr><th>#</th><th>Partido</th><th>Día</th><th>Franja</th><th>Cancha</th></tr>
              </thead>
              <tbody>
                {data.partidos.map((p, i) => (
                  <tr key={p.partido_id}>
                    <td>{i + 1}</td>
                    <td><strong>{p.local} vs {p.visitante}</strong></td>
                    <td>Día {p.dia}</td>
                    <td>{p.franja}</td>
                    <td>{p.cancha}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: '#888' }}>Este árbitro no tiene partidos asignados.</p>
          )}
        </>
      )}

      {!data && arbitroId && !cargando && (
        <p style={{ color: '#888' }}>Sin resultados. Ejecuta el AG primero.</p>
      )}
    </div>
  )
}

export default function Filtros({ liga }) {
  if (!liga) {
    return (
      <div>
        <div className="section-title">Filtros</div>
        <p style={{ color: '#888' }}>Configura la liga y ejecuta el AG primero.</p>
      </div>
    )
  }

  return (
    <div>
      <div className="section-title">Filtros</div>
      <FiltroEquipo liga={liga} />
      <FiltroArbitro liga={liga} />
    </div>
  )
}
