"""
Capa de dominio — lógica pura del algoritmo genético.
No depende de estado, HTTP ni frameworks externos.
"""
import random
from itertools import combinations

DURACION_SEMANAS = {
    "relampago":  1,
    "mensual":    4,
    "trimestral": 12,
    "semestral":  24,
}

def hora_a_min(hora: str) -> int:
    """Convierte 'HH:MM' a minutos desde medianoche."""
    h, m = hora.split(":")
    return int(h) * 60 + int(m)


def dias_disponibles(liga: dict) -> list[int]:
    """
    Devuelve todos los días calendario disponibles según el tipo de torneo.
    Los árbitros repiten disponibilidad cada semana (por día-de-semana).
    """
    dias_semana = {int(d) for arb in liga["arbitros"] for d in arb["disponibilidad"]}
    if not dias_semana:
        dias_semana = set(range(1, 8))

    num_semanas = DURACION_SEMANAS.get(liga.get("tipo_torneo", "relampago"), 1)
    dias = []
    for semana in range(num_semanas):
        for dia in sorted(dias_semana):
            dias.append(semana * 7 + dia)
    return dias


def generar_partidos(equipos: list) -> list[dict]:
    """Round-robin: genera todos los enfrentamientos posibles entre equipos."""
    return [
        {"id": i + 1, "local": e1, "visitante": e2}
        for i, (e1, e2) in enumerate(combinations(equipos, 2))
    ]

def generar_individuo(partidos: list, liga: dict) -> list[tuple]:
    """
    Crea un individuo aleatorio.
    Cromosoma: lista de genes (partido_id, cancha_id, dia, franja, arbitro_id).
    """
    canchas  = liga["canchas"]
    arbitros = liga["arbitros"]
    dias     = dias_disponibles(liga)
    individuo = []
    for p in partidos:
        c = random.choice(canchas)
        individuo.append((
            p["id"],
            c["id"],
            random.choice(dias),
            random.choice(c["horarios_disponibles"]),
            random.choice(arbitros)["id"],
        ))
    return individuo

def calcular_aptitud(individuo: list, partidos: list, liga: dict) -> float:
    """
    aptitud = 1 / (1 + W1·P_descanso + W2·B_canchas + W3·B_arbitros + penalizaciones)
    Devuelve 0.0 si hay traslape cancha-día-franja (restricción hard).
    """
    W1, W2, W3 = 5, 2, 2

    # Restricción hard: ninguna cancha puede tener dos partidos en el mismo día-franja
    seen: set = set()
    for _, cid, dia, franja, _ in individuo:
        key = (cid, dia, franja)
        if key in seen:
            return 0.0
        seen.add(key)

    partido_map = {p["id"]: p for p in partidos}

    # P_descanso — horas faltantes acumuladas por todos los equipos
    p_descanso = 0.0
    for eq in liga["equipos"]:
        eq_id   = eq["id"]
        tiempos = sorted(
            dia * 1440 + hora_a_min(franja)
            for pid, _, dia, franja, _ in individuo
            if partido_map[pid]["local"]["id"]     == eq_id
            or partido_map[pid]["visitante"]["id"] == eq_id
        )
        for i in range(1, len(tiempos)):
            diff_h = (tiempos[i] - tiempos[i - 1]) / 60
            if diff_h < liga["descanso_minimo_horas"]:
                p_descanso += liga["descanso_minimo_horas"] - diff_h

    # B_canchas — varianza de distribución de partidos entre canchas
    conteo_c = {c["id"]: 0 for c in liga["canchas"]}
    for _, cid, _, _, _ in individuo:
        if cid in conteo_c:
            conteo_c[cid] += 1
    prom_c   = len(individuo) / len(conteo_c) if conteo_c else 1
    b_canchas = sum((v - prom_c) ** 2 for v in conteo_c.values())

    # B_arbitros — varianza de distribución + penalizaciones por disponibilidad
    conteo_a = {a["id"]: 0 for a in liga["arbitros"]}
    arb_map  = {a["id"]: a for a in liga["arbitros"]}
    arb_dia: dict = {}
    penalizacion  = 0.0

    for _, _, dia, franja, aid in individuo:
        if aid in conteo_a:
            conteo_a[aid] += 1
        arb = arb_map.get(aid)
        if arb:
            dia_semana = (dia - 1) % 7 + 1   # convierte día absoluto → día-de-semana (1-7)
            if franja not in arb["disponibilidad"].get(str(dia_semana), []):
                penalizacion += 100          # árbitro fuera de disponibilidad
            arb_dia.setdefault(aid, {})
            arb_dia[aid][dia] = arb_dia[aid].get(dia, 0) + 1
            if arb_dia[aid][dia] > liga["max_partidos_arbitro_dia"]:
                penalizacion += 50           # excede máximo por día

    prom_a    = len(individuo) / len(conteo_a) if conteo_a else 1
    b_arbitros = sum((v - prom_a) ** 2 for v in conteo_a.values())

    # Restricción: partidos por semana por equipo
    min_sem = liga.get("min_partidos_semana", 0)
    max_sem = liga.get("max_partidos_semana", 999)
    if min_sem > 0 or max_sem < 999:
        for eq in liga["equipos"]:
            eq_id     = eq["id"]
            sem_count: dict = {}
            for pid, _, dia, _, _ in individuo:
                p = partido_map[pid]
                if p["local"]["id"] == eq_id or p["visitante"]["id"] == eq_id:
                    sem = (dia - 1) // 7
                    sem_count[sem] = sem_count.get(sem, 0) + 1
            for count in sem_count.values():
                if count > max_sem:
                    penalizacion += 30 * (count - max_sem)
                if min_sem > 0 and count < min_sem:
                    penalizacion += 30 * (min_sem - count)

    return 1.0 / (1 + W1 * p_descanso + W2 * b_canchas + W3 * b_arbitros + penalizacion)

def torneo(pob: list, apts: list) -> list:
    """Selección por torneo binario."""
    i, j = random.sample(range(len(pob)), 2)
    return pob[i] if apts[i] >= apts[j] else pob[j]


def cruce(p1: list, p2: list) -> tuple[list, list]:
    """Cruce de un punto."""
    pt = random.randint(1, len(p1) - 1)
    return p1[:pt] + p2[pt:], p2[:pt] + p1[pt:]


def mutar(individuo: list, liga: dict) -> list:
    """
    Mutación de un gen aleatorio con cuatro tipos:
      0 — cambia cancha y franja
      1 — cambia solo la franja (dentro de la misma cancha)
      2 — cambia el árbitro
      3 — cambia el día
    """
    idx     = random.randint(0, len(individuo) - 1)
    g       = list(individuo[idx])
    op      = random.randint(0, 3)
    canchas = liga["canchas"]

    if op == 0:
        c    = random.choice(canchas)
        g[1] = c["id"]
        g[3] = random.choice(c["horarios_disponibles"])
    elif op == 1:
        c    = next((x for x in canchas if x["id"] == g[1]), None)
        if c is None:
            c    = random.choice(canchas)
            g[1] = c["id"]
        g[3] = random.choice(c["horarios_disponibles"])
    elif op == 2:
        g[4] = random.choice(liga["arbitros"])["id"]
    else:
        g[2] = random.choice(dias_disponibles(liga))

    ind      = list(individuo)
    ind[idx] = tuple(g)
    return ind


def ag_gen(params: dict, partidos: list, liga: dict):
    """
    Generador que ejecuta el AG y hace yield por cada generación:
    yield (gen_num, mejor_aptitud, poblacion, aptitudes)

    Elitismo: los 2 mejores individuos pasan sin modificación.
    """
    tam  = params["poblacion"]
    gens = params["generaciones"]
    tc   = params["tasa_cruce"]
    tm   = params["tasa_mutacion"]

    pob = [generar_individuo(partidos, liga) for _ in range(tam)]

    for gen_n in range(gens):
        apts  = [calcular_aptitud(ind, partidos, liga) for ind in pob]
        orden = sorted(range(len(apts)), key=lambda i: apts[i], reverse=True)
        nueva = [pob[orden[0]], pob[orden[1]]]          # élite

        while len(nueva) < tam:
            p1 = torneo(pob, apts)
            p2 = torneo(pob, apts)
            h1, h2 = cruce(p1, p2) if random.random() < tc else (list(p1), list(p2))
            if random.random() < tm:
                h1 = mutar(h1, liga)
            if random.random() < tm:
                h2 = mutar(h2, liga)
            nueva.extend([h1, h2])

        pob = nueva[:tam]
        yield gen_n + 1, max(apts), pob, apts
