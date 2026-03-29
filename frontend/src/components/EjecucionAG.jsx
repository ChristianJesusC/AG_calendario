import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'

const API = 'http://localhost:8000'

const SLIDERS = [
  { key: 'poblacion',     label: 'Tamaño de población', min: 50,   max: 500,  step: 10,   fmt: v => v,           hint: 'Individuos por generación' },
  { key: 'generaciones',  label: 'Generaciones',         min: 50,   max: 500,  step: 10,   fmt: v => v,           hint: 'Iteraciones del algoritmo' },
  { key: 'tasa_cruce',    label: 'Tasa de cruce',        min: 0.1,  max: 1.0,  step: 0.05, fmt: v => v.toFixed(2), hint: 'Probabilidad de recombinar padres' },
  { key: 'tasa_mutacion', label: 'Tasa de mutación',     min: 0.01, max: 0.5,  step: 0.01, fmt: v => v.toFixed(2), hint: 'Probabilidad de alterar un gen' },
]

function TooltipCustom({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 12px', boxShadow: 'var(--shadow)', fontSize: '0.82rem' }}>
      <div style={{ fontWeight: 700, marginBottom: 2 }}>Generación {label}</div>
      <div style={{ color: 'var(--primary)' }}>Aptitud: <strong>{Number(payload[0].value).toFixed(6)}</strong></div>
    </div>
  )
}

export default function EjecucionAG({ liga, onListo }) {
  const [params, setParams] = useState({ poblacion: 100, generaciones: 200, tasa_cruce: 0.8, tasa_mutacion: 0.05 })
  const [datos, setDatos] = useState([])
  const [corriendo, setCorriendo] = useState(false)
  const [genActual, setGenActual] = useState(0)
  const [aptActual, setAptActual] = useState(0)
  const [aptMax, setAptMax]     = useState(0)
  const [error, setError]       = useState(null)
  const [listo, setListo]       = useState(false)

  const set = (key, val) => setParams(p => ({ ...p, [key]: val }))

  const progreso = params.generaciones > 0 ? Math.round((genActual / params.generaciones) * 100) : 0

  const ejecutar = async () => {
    if (!liga) return setError('Configura la liga primero en la Sección 1.')
    setError(null); setDatos([]); setGenActual(0); setAptActual(0); setAptMax(0)
    setListo(false); setCorriendo(true)

    try {
      const res = await fetch(`${API}/ag/ejecutar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let localMax = 0

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.error) { setError(data.error); break }
            if (data.done) {
              setListo(true)
              onListo?.()
              break
            }
            if (data.generacion) {
              const apt = data.mejor_aptitud
              if (apt > localMax) localMax = apt
              setGenActual(data.generacion)
              setAptActual(apt)
              setAptMax(localMax)
              setDatos(prev => [...prev, { gen: data.generacion, aptitud: apt }])
            }
          } catch (_) {}
        }
      }
    } catch {
      setError('No se pudo conectar con el backend. ¿Está corriendo en el puerto 8000?')
    }
    setCorriendo(false)
  }

  return (
    <div>
      <div className="section-title">Ejecutar Algoritmo Genético</div>

      {!liga && (
        <div className="alert alert-warning">
          Debes configurar la liga antes de ejecutar el AG. Ve a la Sección 1.
        </div>
      )}

      {/* ── Parámetros ── */}
      <div className="card">
        <div className="card-title">Parámetros del algoritmo</div>

        {SLIDERS.map(s => (
          <div key={s.key} className="slider-row">
            <div>
              <label style={{ display: 'block' }}>{s.label}</label>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{s.hint}</span>
            </div>
            <input
              type="range" min={s.min} max={s.max} step={s.step}
              value={params[s.key]}
              onChange={e => set(s.key, Number(e.target.value))}
              disabled={corriendo}
            />
            <span className="slider-val">{s.fmt(params[s.key])}</span>
          </div>
        ))}

        {error && <div className="alert alert-error">{error}</div>}

        <button
          className="btn btn-primary btn-lg"
          onClick={ejecutar}
          disabled={corriendo || !liga}
          style={{ marginTop: 4 }}
        >
          {corriendo ? 'Ejecutando...' : 'Ejecutar optimización'}
        </button>
      </div>

      {/* ── Progreso ── */}
      {(datos.length > 0 || corriendo) && (
        <div className="card">
          <div className="card-title">
            Evolución de la aptitud
            {listo && <span className="badge badge-green" style={{ marginLeft: 10 }}>Completado</span>}
            {corriendo && <span className="badge badge-blue" style={{ marginLeft: 10 }}>En curso...</span>}
          </div>

          {/* Barra de progreso */}
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${progreso}%` }} />
          </div>

          {/* Métricas */}
          <div className="stats-row" style={{ marginBottom: 18 }}>
            <div className="stat-box">
              <div className="val">{genActual}</div>
              <div className="lbl">Generación actual</div>
            </div>
            <div className="stat-box">
              <div className="val">{params.generaciones}</div>
              <div className="lbl">Total generaciones</div>
            </div>
            <div className="stat-box">
              <div className="val">{aptActual.toFixed(5)}</div>
              <div className="lbl">Aptitud actual</div>
            </div>
            <div className="stat-box">
              <div className="val" style={{ color: 'var(--success)' }}>{aptMax.toFixed(5)}</div>
              <div className="lbl">Mejor aptitud</div>
            </div>
            <div className="stat-box">
              <div className="val">{progreso}%</div>
              <div className="lbl">Progreso</div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={datos} margin={{ top: 5, right: 24, left: 10, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="gen"
                label={{ value: 'Generación', position: 'insideBottom', offset: -12, fontSize: 12 }}
                tick={{ fontSize: 11 }}
              />
              <YAxis
                tickFormatter={v => v.toFixed(4)}
                tick={{ fontSize: 11 }}
                label={{ value: 'Aptitud', angle: -90, position: 'insideLeft', offset: 12, fontSize: 12 }}
              />
              <Tooltip content={<TooltipCustom />} />
              {listo && aptMax > 0 && (
                <ReferenceLine y={aptMax} stroke="var(--success)" strokeDasharray="4 2"
                  label={{ value: `Máx: ${aptMax.toFixed(4)}`, position: 'right', fontSize: 11, fill: 'var(--success)' }} />
              )}
              <Line
                type="monotone" dataKey="aptitud"
                stroke="var(--primary)" dot={false} strokeWidth={2}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>

          {listo && (
            <div className="alert alert-success" style={{ marginTop: 14, marginBottom: 0 }}>
              Optimización completada. Ve a la Sección 3 para ver los resultados.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
