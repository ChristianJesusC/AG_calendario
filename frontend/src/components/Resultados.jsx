import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { descargarCalendario } from '../utils/descargar'

const API = ''
const CANCHA_COLORS = ['#e3f2fd','#f3e5f5','#e8f5e9','#fff8e1','#fce4ec','#e0f7fa','#f9fbe7']

// ── Tabla comparativa ────────────────────────────────────────────────────────

function TablaComparativa({ mejores }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Individuo</th>
          <th>Aptitud</th>
          <th>Déficit descanso (h)</th>
          <th>Balance canchas (var²)</th>
          <th>Balance árbitros (var²)</th>
        </tr>
      </thead>
      <tbody>
        {mejores.map(m => (
          <tr key={m.id}>
            <td><strong>#{m.id + 1}</strong></td>
            <td><strong style={{ color: 'var(--primary)' }}>{m.aptitud.toFixed(6)}</strong></td>
            <td style={{ color: m.descanso > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
              {m.descanso > 0 ? `-${m.descanso}h` : '0h'}
            </td>
            <td>{m.balance_canchas.toFixed(2)}</td>
            <td>{m.balance_arbitros.toFixed(2)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Detalle completo ─────────────────────────────────────────────────────────

function DetalleIndividuo({ individuoId }) {
  const [detalle, setDetalle] = useState(null)
  const [expandEq, setExpandEq] = useState(null)

  useEffect(() => {
    if (individuoId === null) return
    setDetalle(null)
    axios.get(`${API}/ag/detalle/${individuoId}`).then(res => setDetalle(res.data))
  }, [individuoId])

  if (!detalle) return <p className="text-muted">Cargando detalles...</p>

  const r = detalle.resumen

  return (
    <div>
      {/* ── Métricas globales ── */}
      <div className="stats-row" style={{ marginBottom: 22 }}>
        <div className="stat-box">
          <div className="val">{detalle.aptitud.toFixed(4)}</div>
          <div className="lbl">Aptitud</div>
        </div>
        <div className="stat-box">
          <div className="val">{r.total_partidos}</div>
          <div className="lbl">Total partidos</div>
        </div>
        <div className="stat-box">
          <div className="val" style={{ color: r.total_deficit_descanso_h > 0 ? 'var(--danger)' : 'var(--success)' }}>
            {r.total_deficit_descanso_h > 0 ? `-${r.total_deficit_descanso_h}h` : '0h'}
          </div>
          <div className="lbl">Déficit descanso total</div>
        </div>
        <div className="stat-box">
          <div className="val" style={{ color: r.equipos_con_deficit > 0 ? 'var(--warning)' : 'var(--success)' }}>
            {r.equipos_con_deficit}
          </div>
          <div className="lbl">Equipos con déficit</div>
        </div>
        <div className="stat-box">
          <div className="val" style={{ color: r.penalizaciones_arbitro_disponibilidad > 0 ? 'var(--danger)' : 'var(--success)' }}>
            {r.penalizaciones_arbitro_disponibilidad}
          </div>
          <div className="lbl">Árb. fuera disponib.</div>
        </div>
        <div className="stat-box">
          <div className="val" style={{ color: r.arbitros_exceden_maximo_dia > 0 ? 'var(--danger)' : 'var(--success)' }}>
            {r.arbitros_exceden_maximo_dia}
          </div>
          <div className="lbl">Árb. exceden máx/día</div>
        </div>
        <div className="stat-box">
          <div className="val">{r.descanso_minimo_configurado_h}h</div>
          <div className="lbl">Descanso mín. config.</div>
        </div>
      </div>

      <hr className="divider" />

      {/* ── Descanso por equipo ── */}
      <h4 style={{ color: 'var(--primary)', margin: '16px 0 10px' }}>
        Descanso entre partidos por equipo
      </h4>
      <table>
        <thead>
          <tr>
            <th>Equipo</th>
            <th>Jugadores</th>
            <th>Partidos</th>
            <th>Déficit total (h)</th>
            <th>Estado</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {detalle.equipos.map(eq => (
            <>
              <tr key={eq.id} style={{ background: eq.deficit_total_h > 0 ? 'var(--warning-light)' : undefined }}>
                <td><strong>{eq.nombre}</strong></td>
                <td>{eq.num_jugadores > 0 ? eq.num_jugadores : '—'}</td>
                <td>{eq.total_partidos}</td>
                <td style={{ fontWeight: 700, color: eq.deficit_total_h > 0 ? 'var(--danger)' : 'var(--success)' }}>
                  {eq.deficit_total_h > 0 ? `-${eq.deficit_total_h}h` : '0h'}
                </td>
                <td>
                  {eq.deficit_total_h === 0
                    ? <span className="badge badge-green">OK</span>
                    : <span className="badge badge-red">Déficit</span>}
                </td>
                <td>
                  {eq.descansos.length > 0 && (
                    <button className="btn btn-outline btn-sm"
                      onClick={() => setExpandEq(expandEq === eq.id ? null : eq.id)}>
                      {expandEq === eq.id ? 'Ocultar' : `Ver ${eq.descansos.length} descanso(s)`}
                    </button>
                  )}
                </td>
              </tr>

              {expandEq === eq.id && (
                <>
                  {/* Encabezado de sub-tabla */}
                  <tr style={{ background: '#f5f5f5' }}>
                    <td colSpan={2} style={{ paddingLeft: 28, fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>DESDE</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>HASTA</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>DESCANSO REAL</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>MÍNIMO</td>
                    <td style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 700 }}>ESTADO</td>
                  </tr>
                  {eq.descansos.map((d, i) => (
                    <tr key={i} style={{ background: d.ok ? '#f9fff9' : '#fff5f5' }}>
                      <td colSpan={2} style={{ paddingLeft: 28, fontSize: '0.83rem', color: '#555' }}>
                        {d.desde}
                      </td>
                      <td style={{ fontSize: '0.83rem', color: '#555' }}>{d.hasta}</td>
                      <td style={{ fontWeight: 700, color: d.ok ? 'var(--success)' : 'var(--danger)' }}>
                        {d.horas_reales}h {!d.ok && <span style={{ fontSize: '0.78rem' }}>(falta {d.deficit}h)</span>}
                      </td>
                      <td style={{ fontSize: '0.83rem', color: 'var(--text-muted)' }}>{d.horas_minimo}h</td>
                      <td>
                        {d.ok
                          ? <span className="badge badge-green">OK</span>
                          : <span className="badge badge-red">Insuficiente</span>}
                      </td>
                    </tr>
                  ))}
                </>
              )}
            </>
          ))}
        </tbody>
      </table>

      <hr className="divider" />

      {/* ── Balance de canchas ── */}
      <h4 style={{ color: 'var(--primary)', margin: '16px 0 10px' }}>
        Balance de uso de canchas
      </h4>
      <table>
        <thead>
          <tr>
            <th>Cancha</th>
            <th>Partidos asignados</th>
            <th>Promedio ideal</th>
            <th>Diferencia</th>
            <th>% de uso</th>
            <th>Distribución</th>
          </tr>
        </thead>
        <tbody>
          {detalle.canchas.map(c => (
            <tr key={c.id}>
              <td><strong>{c.nombre}</strong></td>
              <td>{c.partidos}</td>
              <td>{c.promedio_ideal}</td>
              <td>
                <span className={`badge ${Math.abs(c.diferencia) <= 1 ? 'badge-green' : 'badge-orange'}`}>
                  {c.diferencia > 0 ? '+' : ''}{c.diferencia}
                </span>
              </td>
              <td>{c.porcentaje_uso}%</td>
              <td style={{ width: 160 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ flex: 1, height: 8, background: '#eee', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${c.porcentaje_uso}%`, height: '100%', background: 'var(--primary)', borderRadius: 4 }} />
                  </div>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <hr className="divider" />

      {/* ── Distribución de árbitros ── */}
      <h4 style={{ color: 'var(--primary)', margin: '16px 0 10px' }}>
        Distribución de carga por árbitro
      </h4>
      <table>
        <thead>
          <tr>
            <th>Árbitro</th>
            <th>Partidos asignados</th>
            <th>Promedio ideal</th>
            <th>Diferencia</th>
            <th>Fuera de disponib.</th>
            <th>Excede máx/día</th>
          </tr>
        </thead>
        <tbody>
          {detalle.arbitros.map(a => (
            <tr key={a.id}
                style={{ background: (a.fuera_disponibilidad > 0 || a.excede_maximo_dia) ? 'var(--warning-light)' : undefined }}>
              <td><strong>{a.nombre}</strong></td>
              <td>{a.partidos}</td>
              <td>{a.promedio_ideal}</td>
              <td>
                <span className={`badge ${Math.abs(a.diferencia) <= 1 ? 'badge-green' : 'badge-orange'}`}>
                  {a.diferencia > 0 ? '+' : ''}{a.diferencia}
                </span>
              </td>
              <td>
                {a.fuera_disponibilidad === 0
                  ? <span className="badge badge-green">0 — OK</span>
                  : <span className="badge badge-red">{a.fuera_disponibilidad} partido(s)</span>}
              </td>
              <td>
                {a.excede_maximo_dia
                  ? <span className="badge badge-red">Sí</span>
                  : <span className="badge badge-green">No</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Calendario semanal completo ───────────────────────────────────────────────

function Calendario({ individuoId, liga }) {
  const [cal,         setCal]         = useState(null)
  const [descargando, setDescargando] = useState(false)
  const calRef = useRef(null)

  useEffect(() => {
    if (individuoId === null) return
    setCal(null)
    axios.get(`${API}/ag/calendario/${individuoId}`).then(res => setCal(res.data.calendario))
  }, [individuoId])

  const handleDescargar = async () => {
    setDescargando(true)
    await descargarCalendario(calRef, 'calendario.png')
    setDescargando(false)
  }

  if (!cal) return <p className="text-muted">Cargando calendario...</p>

  const dias   = Object.keys(cal).sort((a, b) => Number(a) - Number(b))
  const franjas = [...new Set(Object.values(cal).flatMap(d => Object.keys(d)))].sort()
  const canchas = liga?.canchas || []
  const canchaColor = Object.fromEntries(canchas.map((c, i) => [c.id, CANCHA_COLORS[i % CANCHA_COLORS.length]]))

  if (dias.length === 0) return <p className="text-muted">Sin datos de calendario.</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10 }}>
        <button
          className="btn btn-outline btn-sm"
          onClick={handleDescargar}
          disabled={descargando}
          title="Descargar calendario completo como PNG de alta resolución"
        >
          {descargando ? 'Generando...' : 'Descargar PNG'}
        </button>
      </div>
    <div ref={calRef} style={{ overflowX: 'auto' }}>
      <div className="row" style={{ marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <strong>Canchas:</strong>
        {canchas.map(c => (
          <span key={c.id} style={{ background: canchaColor[c.id], border: '1px solid #ccc', borderRadius: 5, padding: '3px 10px', fontSize: '0.82rem', fontWeight: 500 }}>
            {c.nombre}
          </span>
        ))}
      </div>
      <table style={{ borderCollapse: 'collapse', minWidth: dias.length * 170 + 80 }}>
        <thead>
          <tr>
            <th style={thS}>Franja</th>
            {dias.map(d => <th key={d} style={{ ...thS, textAlign: 'center', minWidth: 170 }}>Día {d}</th>)}
          </tr>
        </thead>
        <tbody>
          {franjas.map(f => (
            <tr key={f}>
              <td style={{ ...tdS, fontWeight: 700, background: '#f5f5f5', whiteSpace: 'nowrap' }}>{f}</td>
              {dias.map(d => {
                const partidos = Object.entries(cal[d]?.[f] || {})
                return (
                  <td key={d} style={{ ...tdS, verticalAlign: 'top', padding: 6 }}>
                    {partidos.length === 0
                      ? <span style={{ color: '#ddd', fontSize: '0.8rem' }}>—</span>
                      : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                          {partidos.map(([cid, cell]) => (
                            <div key={cid} style={{ background: canchaColor[Number(cid)] || '#f5f5f5', border: '1px solid #ddd', borderRadius: 5, padding: '5px 8px', fontSize: '0.82rem' }}>
                              <div style={{ fontWeight: 700 }}>{cell.local} <span style={{ color: '#888' }}>vs</span> {cell.visitante}</div>
                              <div style={{ color: '#555', marginTop: 2 }}>{cell.cancha}</div>
                              <div style={{ color: '#777', fontSize: '0.75rem' }}>Árb: {cell.arbitro}</div>
                            </div>
                          ))}
                        </div>
                      )
                    }
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </div>
  )
}

const thS = { background: '#1a237e', color: 'white', padding: '10px 12px', textAlign: 'left', fontWeight: 600, fontSize: '0.88rem', border: '1px solid #283593' }
const tdS = { border: '1px solid #e0e0e0', padding: '8px 10px', fontSize: '0.88rem' }

// ── Componente principal ─────────────────────────────────────────────────────

export default function Resultados({ liga }) {
  const [mejores,      setMejores]     = useState([])
  const [seleccionado, setSeleccionado] = useState(null)
  const [vista,        setVista]       = useState('detalle')   // 'detalle' | 'calendario'
  const [cargando,     setCargando]    = useState(false)

  const fetchResultados = () => {
    setCargando(true)
    axios.get(`${API}/ag/resultado`)
      .then(res => { setMejores(res.data.mejores); setCargando(false) })
      .catch(() => setCargando(false))
  }

  const seleccionar = (id) => {
    setSeleccionado(id)
    setVista('detalle')
  }

  return (
    <div>
      <div className="section-title">Resultados</div>

      <div className="row" style={{ marginBottom: 20 }}>
        <button className="btn btn-primary" onClick={fetchResultados} disabled={cargando}>
          {cargando ? 'Cargando...' : 'Cargar resultados'}
        </button>
        {mejores.length === 0 && !cargando && (
          <span className="text-muted">Ejecuta el AG primero (Sección 2).</span>
        )}
      </div>

      {mejores.length > 0 && (
        <>
          {/* Tarjetas top 3 */}
          <div className="result-cards">
            {mejores.map(m => (
              <div
                key={m.id}
                className={`result-card ${seleccionado === m.id ? 'selected' : ''}`}
                onClick={() => seleccionar(m.id)}
              >
                <div style={{ fontWeight: 800, fontSize: '1.05rem', marginBottom: 10, color: 'var(--primary)' }}>
                  #{m.id + 1} {m.id === 0 ? '— Mejor' : ''}
                </div>
                <div style={{ fontSize: '0.85rem', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <div>
                    <span className="text-muted">Aptitud: </span>
                    <strong>{m.aptitud.toFixed(6)}</strong>
                  </div>
                  <div>
                    <span className="text-muted">Déficit descanso: </span>
                    <span style={{ color: m.descanso > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
                      {m.descanso > 0 ? `-${m.descanso}h` : '0h'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted">Bal. canchas: </span>
                    <strong>{m.balance_canchas.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-muted">Bal. árbitros: </span>
                    <strong>{m.balance_arbitros.toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Tabla comparativa */}
          <div className="card">
            <div className="card-title">Tabla comparativa de los 3 mejores individuos</div>
            <TablaComparativa mejores={mejores} />
          </div>

          {/* Detalle / Calendario del individuo seleccionado */}
          {seleccionado !== null && (
            <div className="card">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div className="card-title" style={{ marginBottom: 0, paddingBottom: 0, borderBottom: 'none' }}>
                  Individuo #{seleccionado + 1}
                </div>
                <div className="tabs" style={{ marginBottom: 0 }}>
                  <button className={`tab ${vista === 'detalle' ? 'active' : ''}`} onClick={() => setVista('detalle')}>
                    Análisis detallado
                  </button>
                  <button className={`tab ${vista === 'calendario' ? 'active' : ''}`} onClick={() => setVista('calendario')}>
                    Calendario semanal
                  </button>
                </div>
              </div>

              {vista === 'detalle'    && <DetalleIndividuo individuoId={seleccionado} />}
              {vista === 'calendario' && <Calendario individuoId={seleccionado} liga={liga} />}
            </div>
          )}
        </>
      )}
    </div>
  )
}
