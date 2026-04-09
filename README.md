# CancharIA

Sistema web para optimización de calendarios de fútbol amateur mediante algoritmos genéticos.

Proyecto académico — Inteligencia Artificial, Ingeniería en Software, UPChiapas · Ene–Abr 2026.
**Autor:** Chiu Valdivieso Christian Jesús · **Asesor:** Dr. Carlos Alberto Díaz Hernández

---

## Stack

| Capa | Tecnología |
|---|---|
| Backend | FastAPI · Python 3.12 · Pydantic v2 · Uvicorn |
| Frontend | React · Vite · Recharts · Axios · html2canvas |
| Despliegue | Docker Compose |

---

## Requisitos

- [Docker](https://www.docker.com/) y Docker Compose, **o bien**:
- Python 3.12+ y Node.js 18+

---

## Instalación y ejecución

### Con Docker

```bash
docker-compose -f docker-compose.yml up -d
```


| Servicio | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend (API) | http://localhost:8000 |
| Docs interactivos | http://localhost:8000/docs |

# Eliminación de contenedores

```bash
docker-compose -f docker-compose.yml down --rmi all --volumes --remove-orphans
```

### Sin Docker

**Backend:**
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```
 
---

## Uso

1. **Sección 1 — Configuración:** carga un CSV con equipos, canchas y árbitros, o llena el formulario manual. Descarga la plantilla desde la misma pantalla.
2. **Sección 2 — Ejecutar AG:** ajusta los parámetros (población, generaciones, cruce, mutación) y ejecuta. Las gráficas se actualizan en tiempo real vía SSE.
3. **Sección 3 — Resultados:** consulta el top-3 de soluciones, el análisis detallado de descansos/canchas/árbitros y el calendario semanal. Descarga gráficas como PNG.
4. **Sección 4 — Filtros:** busca todos los partidos de un equipo o árbitro específico.

---

## Formato CSV

```
[EQUIPOS]
id,nombre,num_jugadores

[CANCHAS]
id,nombre,horarios_disponibles,max_partidos_por_dia
# horarios separados por | (ej: 08:00|10:00|14:00)

[ARBITROS]
id,nombre,dia,franjas
# una fila por día disponible; franjas separadas por |
# dia = número de día de la semana (1=lun … 7=dom)

[GENERAL]
descanso_minimo_horas,max_partidos_arbitro_dia,min_partidos_semana,max_partidos_semana,tipo_torneo
# tipo_torneo: relampago | mensual | trimestral | semestral
```

---

## Algoritmo Genético

**Cromosoma:** lista de N genes — uno por partido.
Cada gen: `(partido_id, cancha_id, dia, franja, arbitro_id)`

**Función de aptitud:**
```
Aptitud = 1 / (1 + 5·P_descanso + 2·B_canchas + 2·B_arbitros + P)
```

| Componente | Descripción |
|---|---|
| Restricción dura | Traslape cancha-día-franja → aptitud = 0 |
| P_descanso | Horas de descanso faltantes acumuladas |
| B_canchas | Varianza de partidos entre canchas |
| B_arbitros | Varianza de partidos entre árbitros |
| P | Penalizaciones blandas (disponibilidad, máx/día, partidos/semana) |

**Operadores:** selección por torneo binario · cruce de un punto · 4 tipos de mutación · elitismo top-2

---

## Escenarios de prueba

| # | Tipo | Equipos | Canchas | Árbitros | Partidos | Descanso | Semanas |
|---|---|---|---|---|---|---|---|
| 1 | Relámpago | 8 | 2 | 3 | 28 | 4h | 1 |
| 2 | Mensual | 10 | 3 | 4 | 45 | 48h | 4 |
| 3 | Trimestral | 12 | 4 | 5 | 66 | 72h | 12 |

Parámetros recomendados por escenario:

| Escenario | Población | Generaciones | Cruce | Mutación |
|---|---|---|---|---|
| Relámpago | 100 | 200 | 0.80 | 0.05 |
| Mensual | 150 | 300 | 0.80 | 0.10 |
| Trimestral | 200 | 400 | 0.85 | 0.10 |

---

## Estructura del proyecto

```
ag/
├── docker-compose.yml
├── backend/
│   ├── core/genetic.py        # Lógica pura del AG
│   ├── models/schemas.py      # Modelos Pydantic
│   ├── routers/               # ag_router, liga_router
│   ├── services/              # ag_service, liga_service
│   ├── state.py               # Estado en memoria
│   └── main.py                # FastAPI app
└── frontend/src/
    ├── components/
    │   ├── Configuracion.jsx  # Sección 1
    │   ├── EjecucionAG.jsx    # Sección 2
    │   ├── Resultados.jsx     # Sección 3
    │   └── Filtros.jsx        # Sección 4
    └── utils/descargar.js     # Exportar gráficas a PNG
```

---

## API — Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/liga/configurar` | Carga equipos, canchas y árbitros |
| POST | `/ag/ejecutar` | Ejecuta el AG (Server-Sent Events) |
| GET | `/ag/resultado` | Top-3 soluciones |
| GET | `/ag/calendario/{id}` | Calendario del individuo |
| GET | `/ag/detalle/{id}` | Análisis detallado del individuo |
| GET | `/ag/filtrar/equipo/{id}` | Partidos de un equipo |
| GET | `/ag/filtrar/arbitro/{id}` | Partidos de un árbitro |
