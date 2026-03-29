"""
Capa de servicio — lógica de negocio del algoritmo genético.
Coordina core.genetic con el repositorio (state) y produce las respuestas.
"""
import asyncio
import json

from core.genetic import ag_gen, hora_a_min
import state


# ── Helpers privados ──────────────────────────────────────────────────────────

def _partido_map(partidos: list) -> dict:
    return {p["id"]: p for p in partidos}

def _cancha_map(liga: dict) -> dict:
    return {c["id"]: c for c in liga["canchas"]}

def _arb_map(liga: dict) -> dict:
    return {a["id"]: a for a in liga["arbitros"]}

def _stats_basicas(individuo: list, partidos: list, liga: dict) -> dict:
    """Estadísticas resumidas usadas en el endpoint /ag/resultado."""
    pm = _partido_map(partidos)

    p_descanso = 0.0
    for eq in liga["equipos"]:
        eq_id = eq["id"]
        tiempos = sorted(
            dia * 1440 + hora_a_min(franja)
            for pid, _, dia, franja, _ in individuo
            if pm[pid]["local"]["id"] == eq_id or pm[pid]["visitante"]["id"] == eq_id
        )
        for i in range(1, len(tiempos)):
            diff_h = (tiempos[i] - tiempos[i - 1]) / 60
            if diff_h < liga["descanso_minimo_horas"]:
                p_descanso += liga["descanso_minimo_horas"] - diff_h

    conteo_c = {c["id"]: 0 for c in liga["canchas"]}
    for _, cid, _, _, _ in individuo:
        if cid in conteo_c:
            conteo_c[cid] += 1
    prom_c    = len(individuo) / len(conteo_c) if conteo_c else 1
    b_canchas = sum((v - prom_c) ** 2 for v in conteo_c.values())

    conteo_a = {a["id"]: 0 for a in liga["arbitros"]}
    for _, _, _, _, aid in individuo:
        if aid in conteo_a:
            conteo_a[aid] += 1
    prom_a     = len(individuo) / len(conteo_a) if conteo_a else 1
    b_arbitros = sum((v - prom_a) ** 2 for v in conteo_a.values())

    return {
        "descanso":         round(p_descanso, 2),
        "balance_canchas":  round(b_canchas, 2),
        "balance_arbitros": round(b_arbitros, 2),
    }


# ── Streaming SSE ─────────────────────────────────────────────────────────────

async def ejecutar_ag_stream(params: dict):
    """
    Generador asíncrono para Server-Sent Events.
    Emite una línea JSON por generación y guarda el top-3 al finalizar.
    """
    liga     = state.get_liga()
    partidos = state.get_partidos()

    if not liga or not partidos:
        yield f"data: {json.dumps({'error': 'Liga no configurada'})}\n\n"
        return

    ultima_pob  = None
    ultimas_apts = None

    for gen_n, mejor, pob, apts in ag_gen(params, partidos, liga):
        ultima_pob   = pob
        ultimas_apts = apts
        yield f"data: {json.dumps({'generacion': gen_n, 'mejor_aptitud': round(mejor, 6)})}\n\n"
        await asyncio.sleep(0)

    if ultima_pob and ultimas_apts:
        orden = sorted(range(len(ultimas_apts)), key=lambda i: ultimas_apts[i], reverse=True)
        state.set_mejores([
            {"id": rank, "individuo": list(ultima_pob[idx]), "aptitud": ultimas_apts[idx]}
            for rank, idx in enumerate(orden[:3])
        ])

    yield f"data: {json.dumps({'done': True})}\n\n"


# ── Consultas de resultados ───────────────────────────────────────────────────

def get_resultados() -> dict:
    mejores = state.get_mejores()
    if not mejores:
        return {"mejores": []}
    partidos = state.get_partidos()
    liga     = state.get_liga()
    return {
        "mejores": [
            {"id": m["id"], "aptitud": round(m["aptitud"], 6),
             **_stats_basicas(m["individuo"], partidos, liga)}
            for m in mejores
        ]
    }


def get_calendario(individuo_id: int) -> dict:
    ind = next((m for m in state.get_mejores() if m["id"] == individuo_id), None)
    if not ind:
        return {"error": "Individuo no encontrado"}

    liga      = state.get_liga()
    partidos  = state.get_partidos()
    pm        = _partido_map(partidos)
    cm        = _cancha_map(liga)
    am        = _arb_map(liga)
    cuadricula: dict = {}

    for pid, cid, dia, franja, aid in ind["individuo"]:
        p = pm[pid]
        cuadricula.setdefault(str(dia), {}).setdefault(franja, {})[str(cid)] = {
            "partido_id": pid,
            "local":      p["local"]["nombre"],
            "visitante":  p["visitante"]["nombre"],
            "arbitro":    am.get(aid, {}).get("nombre", "N/A"),
            "cancha":     cm.get(cid, {}).get("nombre", "N/A"),
        }
    return {"individuo_id": individuo_id, "calendario": cuadricula}


def get_detalle(individuo_id: int) -> dict:
    ind = next((m for m in state.get_mejores() if m["id"] == individuo_id), None)
    if not ind:
        return {"error": "Individuo no encontrado"}

    liga      = state.get_liga()
    partidos  = state.get_partidos()
    individuo = ind["individuo"]
    pm        = _partido_map(partidos)
    cm        = _cancha_map(liga)
    am        = _arb_map(liga)

    # ── Por equipo ────────────────────────────────────────────────────
    total_deficit   = 0.0
    equipos_detalle = []

    for eq in liga["equipos"]:
        eq_id   = eq["id"]
        matches = []
        for pid, cid, dia, franja, aid in individuo:
            p = pm[pid]
            if p["local"]["id"] == eq_id or p["visitante"]["id"] == eq_id:
                es_local = p["local"]["id"] == eq_id
                matches.append({
                    "partido_id": pid,
                    "rival":      p["visitante"]["nombre"] if es_local else p["local"]["nombre"],
                    "rol":        "Local" if es_local else "Visitante",
                    "dia":        dia,
                    "franja":     franja,
                    "cancha":     cm.get(cid, {}).get("nombre", "N/A"),
                    "arbitro":    am.get(aid, {}).get("nombre", "N/A"),
                    "_min":       dia * 1440 + hora_a_min(franja),
                })

        matches.sort(key=lambda x: x["_min"])
        descansos  = []
        eq_deficit = 0.0

        for i in range(1, len(matches)):
            diff_h = (matches[i]["_min"] - matches[i - 1]["_min"]) / 60
            deficit = max(0.0, liga["descanso_minimo_horas"] - diff_h)
            eq_deficit += deficit
            descansos.append({
                "desde":        f"Día {matches[i-1]['dia']} {matches[i-1]['franja']}",
                "hasta":        f"Día {matches[i]['dia']} {matches[i]['franja']}",
                "horas_reales": round(diff_h, 1),
                "horas_minimo": liga["descanso_minimo_horas"],
                "deficit":      round(deficit, 1),
                "ok":           deficit == 0,
            })

        total_deficit += eq_deficit
        equipos_detalle.append({
            "id":             eq_id,
            "nombre":         eq["nombre"],
            "num_jugadores":  eq.get("num_jugadores", 0),
            "total_partidos": len(matches),
            "deficit_total_h": round(eq_deficit, 1),
            "descansos":      descansos,
            "partidos":       [{k: v for k, v in m.items() if k != "_min"} for m in matches],
        })

    # ── Por cancha ────────────────────────────────────────────────────
    conteo_c = {c["id"]: 0 for c in liga["canchas"]}
    for _, cid, _, _, _ in individuo:
        if cid in conteo_c:
            conteo_c[cid] += 1
    prom_c = len(individuo) / len(conteo_c) if conteo_c else 1

    canchas_detalle = [
        {
            "id":              c["id"],
            "nombre":          c["nombre"],
            "partidos":        conteo_c[c["id"]],
            "promedio_ideal":  round(prom_c, 1),
            "diferencia":      round(conteo_c[c["id"]] - prom_c, 1),
            "porcentaje_uso":  round(conteo_c[c["id"]] / len(individuo) * 100, 1) if individuo else 0,
        }
        for c in liga["canchas"]
    ]

    # ── Por árbitro ───────────────────────────────────────────────────
    conteo_a = {a["id"]: 0 for a in liga["arbitros"]}
    fuera_d  = {a["id"]: 0 for a in liga["arbitros"]}
    excede_d = {a["id"]: False for a in liga["arbitros"]}
    arb_dia_cnt: dict = {}

    for _, _, dia, franja, aid in individuo:
        if aid in conteo_a:
            conteo_a[aid] += 1
        arb = am.get(aid)
        if arb:
            if franja not in arb["disponibilidad"].get(str(dia), []):
                fuera_d[aid] = fuera_d.get(aid, 0) + 1
            arb_dia_cnt.setdefault(aid, {})
            arb_dia_cnt[aid][dia] = arb_dia_cnt[aid].get(dia, 0) + 1
            if arb_dia_cnt[aid][dia] > liga["max_partidos_arbitro_dia"]:
                excede_d[aid] = True

    prom_a = len(individuo) / len(conteo_a) if conteo_a else 1

    arbitros_detalle = [
        {
            "id":                   a["id"],
            "nombre":               a["nombre"],
            "partidos":             conteo_a[a["id"]],
            "promedio_ideal":       round(prom_a, 1),
            "diferencia":           round(conteo_a[a["id"]] - prom_a, 1),
            "fuera_disponibilidad": fuera_d.get(a["id"], 0),
            "excede_maximo_dia":    excede_d.get(a["id"], False),
        }
        for a in liga["arbitros"]
    ]

    return {
        "individuo_id": individuo_id,
        "aptitud":      round(ind["aptitud"], 6),
        "resumen": {
            "total_partidos":                       len(individuo),
            "total_deficit_descanso_h":             round(total_deficit, 2),
            "equipos_con_deficit":                  sum(1 for e in equipos_detalle if e["deficit_total_h"] > 0),
            "penalizaciones_arbitro_disponibilidad": sum(fuera_d.values()),
            "arbitros_exceden_maximo_dia":           sum(1 for v in excede_d.values() if v),
            "descanso_minimo_configurado_h":         liga["descanso_minimo_horas"],
        },
        "equipos":   equipos_detalle,
        "canchas":   canchas_detalle,
        "arbitros":  arbitros_detalle,
    }


# ── Filtros ───────────────────────────────────────────────────────────────────

def filtrar_equipo(equipo_id: int) -> dict:
    mejores = state.get_mejores()
    if not mejores:
        return {"partidos": []}
    liga      = state.get_liga()
    partidos  = state.get_partidos()
    pm        = _partido_map(partidos)
    cm        = _cancha_map(liga)
    am        = _arb_map(liga)
    individuo = mejores[0]["individuo"]

    matches = []
    for pid, cid, dia, franja, aid in individuo:
        p = pm[pid]
        if p["local"]["id"] == equipo_id or p["visitante"]["id"] == equipo_id:
            matches.append({
                "partido_id": pid,
                "local":      p["local"]["nombre"],
                "visitante":  p["visitante"]["nombre"],
                "cancha":     cm.get(cid, {}).get("nombre", "N/A"),
                "dia":        dia,
                "franja":     franja,
                "arbitro":    am.get(aid, {}).get("nombre", "N/A"),
                "_min":       dia * 1440 + hora_a_min(franja),
            })

    matches.sort(key=lambda x: x["_min"])
    result = []
    for i, m in enumerate(matches):
        descanso = round((m["_min"] - matches[i - 1]["_min"]) / 60, 1) if i > 0 else None
        entry    = {k: v for k, v in m.items() if k != "_min"}
        entry["horas_descanso"] = descanso
        result.append(entry)

    return {"equipo_id": equipo_id, "partidos": result}


def filtrar_arbitro(arbitro_id: int) -> dict:
    mejores = state.get_mejores()
    if not mejores:
        return {"partidos": []}
    liga      = state.get_liga()
    partidos  = state.get_partidos()
    pm        = _partido_map(partidos)
    cm        = _cancha_map(liga)
    individuo = mejores[0]["individuo"]

    promedio = len(individuo) / len(liga["arbitros"]) if liga["arbitros"] else 0
    result   = [
        {
            "partido_id": pid,
            "local":      pm[pid]["local"]["nombre"],
            "visitante":  pm[pid]["visitante"]["nombre"],
            "cancha":     cm.get(cid, {}).get("nombre", "N/A"),
            "dia":        dia,
            "franja":     franja,
        }
        for pid, cid, dia, franja, aid in individuo
        if aid == arbitro_id
    ]

    return {
        "arbitro_id":          arbitro_id,
        "partidos":            result,
        "total":               len(result),
        "promedio_liga":       round(promedio, 1),
        "diferencia_promedio": round(len(result) - promedio, 1),
    }
