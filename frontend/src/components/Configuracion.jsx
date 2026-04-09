import { useState, useRef } from 'react'
import axios from 'axios'

const API = ''
const FRANJAS = ['06:00','08:00','10:00','12:00','14:00','16:00','18:00','20:00']
const DIAS = [1,2,3,4,5,6,7]

const TIPOS_TORNEO = [
  { id: 'relampago',  label: 'Relámpago', semanas: 1,  desc: '1 semana intensa' },
  { id: 'mensual',    label: 'Mensual',   semanas: 4,  desc: '4 semanas' },
  { id: 'trimestral', label: 'Trimestral',semanas: 12, desc: '12 semanas' },
  { id: 'semestral',  label: 'Semestral', semanas: 24, desc: '24 semanas' },
]

// ── CSV helpers ──────────────────────────────────────────────────────────────

const PLANTILLA_CSV = `# Plantilla de configuracion para CancharIA
# Elimina las lineas que comiencen con # si lo deseas
# Formato horarios: separados por | (ej: 08:00|10:00|12:00)
# Arbitros: una fila por dia disponible

[EQUIPOS]
id,nombre,num_jugadores
1,Aguilas,12
2,Tigres,11
3,Leones,13
4,Panteras,10

[CANCHAS]
id,nombre,horarios_disponibles,max_partidos_por_dia
1,Cancha Norte,08:00|10:00|12:00,3
2,Cancha Sur,10:00|14:00|18:00,2

[ARBITROS]
id,nombre,dia,franjas
1,Juan Perez,1,08:00|10:00
1,Juan Perez,2,10:00|12:00
1,Juan Perez,3,08:00
2,Maria Lopez,1,10:00|12:00
2,Maria Lopez,4,14:00|16:00

[GENERAL]
descanso_minimo_horas,max_partidos_arbitro_dia,min_partidos_semana,max_partidos_semana,tipo_torneo
24,2,0,3,relampago
`

function parseLine(line) {
  const cols = []
  let cur = ''
  let inQ = false
  for (const ch of line) {
    if (ch === '"') { inQ = !inQ }
    else if (ch === ',' && !inQ) { cols.push(cur.trim()); cur = '' }
    else { cur += ch }
  }
  cols.push(cur.trim())
  return cols
}

function parseCSV(text) {
  const sections = {}
  let current = null
  let headers = null
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    if (line.startsWith('[') && line.endsWith(']')) {
      current = line.slice(1, -1).toUpperCase()
      sections[current] = []
      headers = null
      continue
    }
    const cols = parseLine(line)
    if (!headers) { headers = cols.map(h => h.toLowerCase()); continue }
    const row = {}
    headers.forEach((h, i) => { row[h] = cols[i] ?? '' })
    sections[current]?.push(row)
  }
  return sections
}

function csvToConfig(sections) {
  const equipos = (sections['EQUIPOS'] || []).map(r => ({
    id: Number(r.id),
    nombre: r.nombre,
    num_jugadores: Number(r.num_jugadores) || 0,
  }))
  const canchas = (sections['CANCHAS'] || []).map(r => ({
    id: Number(r.id),
    nombre: r.nombre,
    horarios_disponibles: r.horarios_disponibles.split('|').filter(Boolean),
    max_partidos_por_dia: Number(r.max_partidos_por_dia) || 3,
  }))
  const arbMap = {}
  for (const r of (sections['ARBITROS'] || [])) {
    const id = Number(r.id)
    if (!arbMap[id]) arbMap[id] = { id, nombre: r.nombre, disponibilidad: {} }
    if (r.dia && r.franjas)
      arbMap[id].disponibilidad[r.dia] = r.franjas.split('|').filter(Boolean)
  }
  const g = sections['GENERAL']?.[0] || {}
  const tiposValidos = ['relampago', 'mensual', 'trimestral', 'semestral']
  const tipoRaw = (g.tipo_torneo || '').trim().toLowerCase()
  return {
    equipos,
    canchas,
    arbitros: Object.values(arbMap),
    descanso_minimo_horas:    Number(g.descanso_minimo_horas)    || 24,
    max_partidos_arbitro_dia: Number(g.max_partidos_arbitro_dia) || 2,
    min_partidos_semana:      Number(g.min_partidos_semana)      || 0,
    max_partidos_semana:      Number(g.max_partidos_semana)      || 999,
    tipo_torneo:              tiposValidos.includes(tipoRaw) ? tipoRaw : 'relampago',
  }
}

function descargarPlantilla() {
  const blob = new Blob([PLANTILLA_CSV], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'plantilla_cancharia.csv'; a.click()
  URL.revokeObjectURL(url)
}

// ── Tabs de formulario ───────────────────────────────────────────────────────

function EquiposTab({ equipos, setEquipos }) {
  const [nombre, setNombre] = useState('')
  const [jugadores, setJugadores] = useState(11)

  const add = () => {
    if (!nombre.trim()) return
    setEquipos([...equipos, { id: equipos.length + 1, nombre: nombre.trim(), num_jugadores: jugadores }])
    setNombre('')
    setJugadores(11)
  }

  return (
    <div className="col">
      <p className="text-muted">Agrega los equipos que participarán en la liga.</p>
      <div className="row mt-8">
        <div className="col" style={{ gap: 4 }}>
          <label>Nombre del equipo</label>
          <input type="text" placeholder="Ej: Águilas FC" value={nombre}
            onChange={e => setNombre(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            style={{ width: 220 }} />
        </div>
        <div className="col" style={{ gap: 4 }}>
          <label>Núm. jugadores</label>
          <input type="number" value={jugadores} min={5} max={30}
            onChange={e => setJugadores(Number(e.target.value))} style={{ width: 90 }} />
        </div>
        <button className="btn btn-primary" style={{ alignSelf: 'flex-end' }} onClick={add}>
          + Agregar
        </button>
      </div>

      {equipos.length > 0 ? (
        <table style={{ marginTop: 14 }}>
          <thead><tr><th>#</th><th>Nombre</th><th>Jugadores</th><th></th></tr></thead>
          <tbody>
            {equipos.map(eq => (
              <tr key={eq.id}>
                <td>{eq.id}</td>
                <td><strong>{eq.nombre}</strong></td>
                <td>{eq.num_jugadores}</td>
                <td>
                  <button className="btn btn-danger btn-sm"
                    onClick={() => setEquipos(equipos.filter(e => e.id !== eq.id))}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-muted mt-8" style={{ fontStyle: 'italic' }}>Sin equipos aún.</p>
      )}

      {equipos.length >= 2 && (
        <div className="alert alert-info mt-8" style={{ marginBottom: 0 }}>
          Se generarán <strong>{(equipos.length * (equipos.length - 1)) / 2}</strong> partidos (round-robin)
        </div>
      )}
    </div>
  )
}

function CanchasTab({ canchas, setCanchas }) {
  const [form, setForm] = useState({ nombre: '', horarios_disponibles: [], max_partidos_por_dia: 3 })

  const toggle = (f) => {
    const curr = form.horarios_disponibles
    setForm({ ...form, horarios_disponibles: curr.includes(f) ? curr.filter(x => x !== f) : [...curr, f] })
  }

  const add = () => {
    if (!form.nombre.trim() || form.horarios_disponibles.length === 0) return
    setCanchas([...canchas, { ...form, nombre: form.nombre.trim(), id: canchas.length + 1 }])
    setForm({ nombre: '', horarios_disponibles: [], max_partidos_por_dia: 3 })
  }

  return (
    <div className="col">
      <p className="text-muted">Define las canchas disponibles y sus franjas horarias.</p>
      <div className="card mt-8" style={{ background: 'var(--bg)', boxShadow: 'none', border: '1px solid var(--border)' }}>
        <div className="row" style={{ marginBottom: 12 }}>
          <div className="col" style={{ gap: 4 }}>
            <label>Nombre</label>
            <input type="text" placeholder="Ej: Cancha Norte" value={form.nombre}
              onChange={e => setForm({ ...form, nombre: e.target.value })} style={{ width: 220 }} />
          </div>
          <div className="col" style={{ gap: 4 }}>
            <label>Máx partidos / día</label>
            <input type="number" value={form.max_partidos_por_dia} min={1} max={10}
              onChange={e => setForm({ ...form, max_partidos_por_dia: Number(e.target.value) })} style={{ width: 80 }} />
          </div>
        </div>
        <label style={{ display: 'block', marginBottom: 8 }}>Franjas horarias disponibles</label>
        <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
          {FRANJAS.map(f => (
            <label key={f} style={{
              display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer',
              padding: '5px 12px', borderRadius: 20, fontSize: '0.85rem', fontWeight: 500,
              background: form.horarios_disponibles.includes(f) ? 'var(--primary)' : 'white',
              color: form.horarios_disponibles.includes(f) ? 'white' : 'var(--text)',
              border: '1.5px solid',
              borderColor: form.horarios_disponibles.includes(f) ? 'var(--primary)' : 'var(--border)',
              transition: 'all 0.15s',
            }}>
              <input type="checkbox" checked={form.horarios_disponibles.includes(f)}
                onChange={() => toggle(f)} style={{ display: 'none' }} />
              {f}
            </label>
          ))}
        </div>
        <button className="btn btn-primary mt-16" onClick={add}
          disabled={!form.nombre.trim() || form.horarios_disponibles.length === 0}>
          + Agregar cancha
        </button>
      </div>
      {canchas.length > 0 && (
        <table style={{ marginTop: 4 }}>
          <thead><tr><th>#</th><th>Nombre</th><th>Franjas</th><th>Máx/día</th><th></th></tr></thead>
          <tbody>
            {canchas.map(c => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td><strong>{c.nombre}</strong></td>
                <td>{c.horarios_disponibles.map(h => <span key={h} className="badge badge-blue" style={{ marginRight: 3 }}>{h}</span>)}</td>
                <td>{c.max_partidos_por_dia}</td>
                <td><button className="btn btn-danger btn-sm" onClick={() => setCanchas(canchas.filter(x => x.id !== c.id))}>Eliminar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

function ArbitrosTab({ arbitros, setArbitros }) {
  const [nombre, setNombre] = useState('')
  const [disp, setDisp] = useState({})

  const toggle = (dia, franja) => {
    const k = String(dia)
    const curr = disp[k] || []
    setDisp({ ...disp, [k]: curr.includes(franja) ? curr.filter(f => f !== franja) : [...curr, franja] })
  }
  const toggleDia = (dia) => {
    const k = String(dia)
    setDisp({ ...disp, [k]: (disp[k] || []).length === FRANJAS.length ? [] : [...FRANJAS] })
  }

  const add = () => {
    if (!nombre.trim()) return
    setArbitros([...arbitros, { id: arbitros.length + 1, nombre: nombre.trim(), disponibilidad: disp }])
    setNombre(''); setDisp({})
  }

  return (
    <div className="col">
      <p className="text-muted">Registra árbitros y marca su disponibilidad por día y franja.</p>
      <div className="card mt-8" style={{ background: 'var(--bg)', boxShadow: 'none', border: '1px solid var(--border)' }}>
        <div className="row" style={{ marginBottom: 14 }}>
          <div className="col" style={{ gap: 4 }}>
            <label>Nombre del árbitro</label>
            <input type="text" placeholder="Ej: Juan Pérez" value={nombre}
              onChange={e => setNombre(e.target.value)} style={{ width: 240 }} />
          </div>
        </div>
        <label style={{ display: 'block', marginBottom: 8 }}>Disponibilidad (día × franja)</label>
        <div className="disp-grid">
          <table>
            <thead>
              <tr>
                <th>Día</th>
                <th style={{ padding: '6px 4px' }}>Todo</th>
                {FRANJAS.map(f => <th key={f}>{f}</th>)}
              </tr>
            </thead>
            <tbody>
              {DIAS.map(dia => {
                const sel = disp[String(dia)] || []
                return (
                  <tr key={dia}>
                    <td><strong>Día {dia}</strong></td>
                    <td style={{ textAlign: 'center' }}>
                      <input type="checkbox" checked={sel.length === FRANJAS.length} onChange={() => toggleDia(dia)} />
                    </td>
                    {FRANJAS.map(f => (
                      <td key={f}><input type="checkbox" checked={sel.includes(f)} onChange={() => toggle(dia, f)} /></td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <button className="btn btn-primary mt-16" onClick={add} disabled={!nombre.trim()}>
          + Agregar árbitro
        </button>
      </div>
      {arbitros.length > 0 && (
        <table style={{ marginTop: 4 }}>
          <thead><tr><th>#</th><th>Nombre</th><th>Días disponibles</th><th></th></tr></thead>
          <tbody>
            {arbitros.map(a => (
              <tr key={a.id}>
                <td>{a.id}</td>
                <td><strong>{a.nombre}</strong></td>
                <td>
                  {Object.keys(a.disponibilidad)
                    .filter(d => a.disponibilidad[d].length > 0)
                    .map(d => <span key={d} className="badge badge-blue" style={{ marginRight: 3 }}>Día {d}</span>)}
                </td>
                <td><button className="btn btn-danger btn-sm" onClick={() => setArbitros(arbitros.filter(x => x.id !== a.id))}>Eliminar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function Configuracion({ onConfigurar }) {
  const [tab, setTab] = useState('equipos')
  const [equipos, setEquipos]         = useState([])
  const [canchas, setCanchas]         = useState([])
  const [arbitros, setArbitros]       = useState([])
  const [descanso, setDescanso]       = useState(24)
  const [maxArbDia, setMaxArbDia]     = useState(2)
  const [minSem, setMinSem]           = useState(0)
  const [maxSem, setMaxSem]           = useState(3)
  const [tipoTorneo, setTipoTorneo]   = useState('relampago')
  const [mensaje, setMensaje]         = useState(null)
  const [dragOver, setDragOver]       = useState(false)
  const fileRef = useRef()

  const cargarCSV = (text) => {
    try {
      const sections = parseCSV(text)
      const cfg = csvToConfig(sections)
      if (cfg.equipos.length === 0) throw new Error('No se encontraron equipos.')
      if (cfg.canchas.length === 0) throw new Error('No se encontraron canchas.')
      if (cfg.arbitros.length === 0) throw new Error('No se encontraron árbitros.')
      setEquipos(cfg.equipos)
      setCanchas(cfg.canchas)
      setArbitros(cfg.arbitros)
      setDescanso(cfg.descanso_minimo_horas)
      setMaxArbDia(cfg.max_partidos_arbitro_dia)
      setMinSem(cfg.min_partidos_semana)
      setMaxSem(cfg.max_partidos_semana === 999 ? 3 : cfg.max_partidos_semana)
      if (cfg.tipo_torneo) setTipoTorneo(cfg.tipo_torneo)
      setMensaje({ tipo: 'ok', txt: `CSV cargado: ${cfg.equipos.length} equipos, ${cfg.canchas.length} canchas, ${cfg.arbitros.length} árbitros.` })
    } catch (e) {
      setMensaje({ tipo: 'error', txt: `Error al leer CSV: ${e.message}` })
    }
  }

  const onFile = (file) => {
    if (!file) return
    const r = new FileReader()
    r.onload = e => cargarCSV(e.target.result)
    r.readAsText(file)
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragOver(false)
    onFile(e.dataTransfer.files[0])
  }

  const handleSubmit = async () => {
    if (equipos.length < 2) return setMensaje({ tipo: 'error', txt: 'Se necesitan al menos 2 equipos.' })
    if (canchas.length === 0) return setMensaje({ tipo: 'error', txt: 'Agrega al menos una cancha.' })
    if (arbitros.length === 0) return setMensaje({ tipo: 'error', txt: 'Agrega al menos un árbitro.' })

    const body = {
      equipos, canchas, arbitros,
      descanso_minimo_horas: descanso,
      max_partidos_arbitro_dia: maxArbDia,
      min_partidos_semana: minSem,
      max_partidos_semana: maxSem || 999,
      tipo_torneo: tipoTorneo,
    }
    try {
      const res = await axios.post(`${API}/liga/configurar`, body)
      onConfigurar(body)
      setMensaje({ tipo: 'ok', txt: `Liga guardada. ${res.data.partidos_generados} partidos generados.` })
    } catch {
      setMensaje({ tipo: 'error', txt: 'No se pudo conectar con el backend (puerto 8000).' })
    }
  }

  const total = equipos.length >= 2 ? (equipos.length * (equipos.length - 1)) / 2 : 0

  const tipoActual = TIPOS_TORNEO.find(t => t.id === tipoTorneo)

  return (
    <div>
      <div className="section-title">Configuración de la liga</div>

      {/* Tipo de torneo */}
      <div className="card">
        <div className="card-title">Tipo de torneo</div>
        <p className="text-muted" style={{ marginBottom: 14 }}>
          Define la duración total del torneo. Esto determina cuántas semanas tiene el calendario.
        </p>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          {TIPOS_TORNEO.map(t => {
            const sel = tipoTorneo === t.id
            return (
              <button
                key={t.id}
                onClick={() => setTipoTorneo(t.id)}
                style={{
                  flex: '1 1 140px',
                  padding: '14px 16px',
                  borderRadius: 10,
                  border: `2px solid ${sel ? 'var(--primary)' : 'var(--border)'}`,
                  background: sel ? 'var(--primary)' : 'white',
                  color: sel ? 'white' : 'var(--text)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4 }}>{t.label}</div>
                <div style={{ fontSize: '0.82rem', opacity: 0.85 }}>{t.desc}</div>
                <div style={{ fontSize: '0.78rem', marginTop: 6, opacity: 0.7 }}>
                  {t.semanas} {t.semanas === 1 ? 'semana' : 'semanas'} · {t.semanas * 7} días
                </div>
              </button>
            )
          })}
        </div>
        {tipoActual && (
          <div className="alert alert-info" style={{ marginTop: 14, marginBottom: 0 }}>
            Torneo <strong>{tipoActual.label}</strong>: el calendario abarcará hasta{' '}
            <strong>{tipoActual.semanas * 7} días</strong> ({tipoActual.semanas}{' '}
            {tipoActual.semanas === 1 ? 'semana' : 'semanas'}).
          </div>
        )}
      </div>

      {/* CSV */}
      <div className="card">
        <div className="card-title">Cargar configuración desde CSV</div>
        <p className="text-muted" style={{ marginBottom: 14 }}>
          Sube un CSV con el formato de la plantilla para poblar los formularios automáticamente.
        </p>
        <div
          className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current.click()}
        >
          <input ref={fileRef} type="file" accept=".csv,.txt" onChange={e => onFile(e.target.files[0])} />
          <div style={{ fontSize: '2rem', marginBottom: 6 }}>&#8679;</div>
          <p style={{ fontWeight: 600, color: 'var(--primary)' }}>Haz clic o arrastra tu archivo CSV aquí</p>
          <p className="text-muted" style={{ marginTop: 4, fontSize: '0.82rem' }}>Formatos: .csv o .txt</p>
        </div>
        <div className="row mt-8">
          <button className="btn btn-outline btn-sm" onClick={descargarPlantilla}>
            Descargar plantilla CSV
          </button>
          <span className="text-muted" style={{ fontSize: '0.82rem' }}>
            Incluye todos los campos requeridos con ejemplos
          </span>
        </div>
      </div>

      {/* Formulario manual */}
      <div className="card">
        <div className="card-title">Configuración manual</div>
        <div className="tabs">
          {[
            { id: 'equipos',  label: `Equipos (${equipos.length})` },
            { id: 'canchas',  label: `Canchas (${canchas.length})` },
            { id: 'arbitros', label: `Árbitros (${arbitros.length})` },
            { id: 'general',  label: 'General' },
          ].map(t => (
            <button key={t.id} className={`tab ${tab === t.id ? 'active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'equipos'  && <EquiposTab  equipos={equipos}   setEquipos={setEquipos} />}
        {tab === 'canchas'  && <CanchasTab  canchas={canchas}   setCanchas={setCanchas} />}
        {tab === 'arbitros' && <ArbitrosTab arbitros={arbitros} setArbitros={setArbitros} />}
        {tab === 'general'  && (
          <div className="col">
            <p className="text-muted">Restricciones globales de la liga.</p>
            <div className="row mt-8" style={{ flexWrap: 'wrap', gap: 20 }}>
              <div className="col" style={{ gap: 4 }}>
                <label>Descanso mínimo entre partidos (h)</label>
                <input type="number" value={descanso} min={1} max={72}
                  onChange={e => setDescanso(Number(e.target.value))} style={{ width: 100 }} />
              </div>
              <div className="col" style={{ gap: 4 }}>
                <label>Máx partidos por árbitro / día</label>
                <input type="number" value={maxArbDia} min={1} max={10}
                  onChange={e => setMaxArbDia(Number(e.target.value))} style={{ width: 100 }} />
              </div>
              <div className="col" style={{ gap: 4 }}>
                <label>Mín partidos por equipo / semana</label>
                <input type="number" value={minSem} min={0} max={10}
                  onChange={e => setMinSem(Number(e.target.value))} style={{ width: 100 }} />
              </div>
              <div className="col" style={{ gap: 4 }}>
                <label>Máx partidos por equipo / semana</label>
                <input type="number" value={maxSem} min={1} max={10}
                  onChange={e => setMaxSem(Number(e.target.value))} style={{ width: 100 }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Resumen + guardar */}
      <div className="card">
        <div className="card-title">Resumen y guardar</div>
        <div className="stats-row" style={{ marginBottom: 18 }}>
          {[
            { val: equipos.length, lbl: 'Equipos' },
            { val: canchas.length, lbl: 'Canchas' },
            { val: arbitros.length, lbl: 'Árbitros' },
            { val: total, lbl: 'Partidos a generar' },
            { val: `${descanso}h`, lbl: 'Descanso mín.' },
            { val: `${minSem}–${maxSem}`, lbl: 'Partidos/sem.' },
            { val: tipoActual?.label ?? '—', lbl: 'Tipo torneo' },
            { val: `${tipoActual?.semanas ?? 1} sem.`, lbl: 'Duración' },
          ].map(s => (
            <div key={s.lbl} className="stat-box">
              <div className="val">{s.val}</div>
              <div className="lbl">{s.lbl}</div>
            </div>
          ))}
        </div>
        {mensaje && (
          <div className={`alert ${mensaje.tipo === 'ok' ? 'alert-success' : 'alert-error'}`}>
            {mensaje.txt}
          </div>
        )}
        <button className="btn btn-success btn-lg" onClick={handleSubmit}>
          Guardar y enviar al backend
        </button>
      </div>
    </div>
  )
}
