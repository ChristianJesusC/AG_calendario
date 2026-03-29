# CancharIA

Sistema inteligente para la optimización del calendario de partidos, asignación de canchas y distribución de árbitros en ligas de fútbol amateur mediante algoritmos genéticos.

---

## Estructura del proyecto

```
ag/
├── backend/                  ← API REST (Python + FastAPI)
│   ├── main.py               ← Punto de entrada
│   ├── state.py              ← Repositorio en memoria
│   ├── requirements.txt
│   ├── models/
│   │   └── schemas.py        ← Modelos Pydantic
│   ├── core/
│   │   └── genetic.py        ← Algoritmo genético
│   ├── services/
│   │   ├── liga_service.py   ← Lógica de negocio de la liga
│   │   └── ag_service.py     ← Lógica de negocio del AG
│   └── routers/
│       ├── liga_router.py    ← Rutas /liga/*
│       └── ag_router.py      ← Rutas /ag/*
├── frontend/                 ← Interfaz (React + Vite)
│   ├── src/
│   │   ├── App.jsx
│   │   └── components/
│   │       ├── Configuracion.jsx
│   │       ├── EjecucionAG.jsx
│   │       ├── Resultados.jsx
│   │       ├── Filtros.jsx
│   │       └── Sidebar.jsx
│   └── package.json
├── liga_torneo.csv           ← Configuración de ejemplo lista para cargar
└── README.md
```

---

## Requisitos

| Herramienta | Versión mínima |
|---|---|
| Python | 3.11 |
| Node.js | 18 |

---

## Instalación y ejecución

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

La API quedará disponible en `http://localhost:8000`.
Documentación interactiva: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

La interfaz quedará disponible en `http://localhost:5173`.

---

## Endpoints de la API

### Liga

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/liga/configurar` | Recibe equipos, canchas, árbitros y restricciones |

### Algoritmo Genético

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/ag/ejecutar` | Ejecuta el AG y transmite el progreso en tiempo real (SSE) |
| `GET` | `/ag/resultado` | Devuelve los 3 mejores individuos con estadísticas básicas |
| `GET` | `/ag/detalle/{id}` | Análisis completo: descanso por equipo, balance de canchas y árbitros |
| `GET` | `/ag/calendario/{id}` | Calendario semanal en cuadrícula días × franjas × canchas |
| `GET` | `/ag/filtrar/equipo/{id}` | Partidos de un equipo con horas de descanso entre ellos |
| `GET` | `/ag/filtrar/arbitro/{id}` | Partidos de un árbitro con comparativa respecto al promedio |

---

## Algoritmo Genético

### Cromosoma

Cada individuo es una lista de genes, uno por partido:

```
gen = (partido_id, cancha_id, dia, franja_horaria, arbitro_id)
```

Los partidos se generan automáticamente con **round-robin**: cada equipo juega exactamente una vez contra cada otro equipo.

### Función de aptitud

```
aptitud = 1 / (1 + 5·P_descanso + 2·B_canchas + 2·B_arbitros + penalizaciones)
```

| Componente | Descripción | Peso |
|---|---|---|
| `P_descanso` | Horas de descanso insuficiente acumuladas por todos los equipos | 5 |
| `B_canchas` | Varianza de partidos distribuidos entre canchas | 2 |
| `B_arbitros` | Varianza de partidos distribuidos entre árbitros | 2 |
| Traslape cancha | Hard constraint — devuelve aptitud = 0 de inmediato | — |
| Árbitro fuera de disponibilidad | Penalización por partido | +100 |
| Árbitro excede máximo por día | Penalización por partido extra | +50 |
| Equipo fuera de rango semanal | Penalización por partido fuera del rango | +30 |

### Operadores

| Operador | Estrategia |
|---|---|
| Selección | Torneo binario |
| Cruce | Un punto sobre la lista de genes |
| Mutación | Reasignación aleatoria de cancha, franja, árbitro o día |
| Elitismo | Los 2 mejores individuos pasan intactos a la siguiente generación |

---

## Flujo de uso

1. **Sección 1 — Configuración**
   Agrega equipos, canchas y árbitros manualmente, o carga el archivo `liga_torneo.csv` directamente.

2. **Sección 2 — Ejecutar AG**
   Ajusta los parámetros con los sliders (población, generaciones, tasas de cruce y mutación) y ejecuta. La gráfica de evolución se actualiza en tiempo real generación a generación.

3. **Sección 3 — Resultados**
   Visualiza los 3 mejores individuos. Selecciona uno para ver:
   - Análisis detallado: déficit de descanso por equipo, balance de canchas y carga de árbitros.
   - Calendario semanal completo en cuadrícula.

4. **Sección 4 — Filtros**
   Filtra por equipo (muestra sus partidos con horas de descanso entre ellos) o por árbitro (muestra su carga total comparada con el promedio de la liga).

---

## Configuración de ejemplo

El archivo `liga_torneo.csv` contiene una liga lista para usar:

- **8 equipos** — 12 jugadores cada uno
- **2 canchas** — Estadio Central y Anexo Alterno
- **3 árbitros** — con disponibilidades diferenciadas por día y franja
- **28 partidos** generados por round-robin
- Descanso mínimo: 4 h · Máx árbitro/día: 3 · Partidos/semana: 1–3
