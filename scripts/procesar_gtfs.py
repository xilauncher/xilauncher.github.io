import csv
import json
import os
from collections import defaultdict

CONFIG = {
    "urbano": {
        "dir": "raw_gtfs/urbano",
        "agency": None,
        "usar_stop_code": True,
        "prefijo_quitar": None
    },
    "consorcio": {
        "dir": "raw_gtfs/consorcio",
        "agency": "CTAG",
        "usar_stop_code": False,
        "prefijo_quitar": "3_"
    },
    "metro": {
        "dir": "raw_gtfs/metro",
        "agency": None,
        "usar_stop_code": False,
        "prefijo_quitar": None
    }
}

OUT_BASE = "transporte/data"

def fix_time(time_str):
    if not time_str: return ""
    try:
        h, m, _ = time_str.split(':')
        h = int(h)
        if h >= 24: h -= 24
        return f"{h:02d}:{m}"
    except:
        return time_str[:5]

def get_day_types(cal_row, srv_id):
    dias = []
    if cal_row:
        if cal_row.get('monday') == '1' or cal_row.get('tuesday') == '1': dias.append('L-J')
        if cal_row.get('friday') == '1': dias.append('V')
        if cal_row.get('saturday') == '1': dias.append('S')
        if cal_row.get('sunday') == '1': dias.append('D')
    
    if not dias:
        s = srv_id.lower()
        if 'sab' in s or 'sáb' in s: dias.append('S')
        elif 'dom' in s or 'fes' in s: dias.append('D')
        elif 'vier' in s: dias.append('V')
        elif 'lab' in s or 'lun' in s: dias.extend(['L-J', 'V'])
        else: dias.extend(['L-J', 'V', 'S', 'D'])
        
    return dias

def procesar_todo():
    for net, conf in CONFIG.items():
        raw_path = conf["dir"]
        if not os.path.exists(raw_path):
            continue
            
        out_path = os.path.join(OUT_BASE, net)
        detalles_path = os.path.join(out_path, 'detalles')
        os.makedirs(detalles_path, exist_ok=True)
        print(f"\n🚀 Procesando red: {net.upper()}...")

        rutas = {}
        lineas_resumen = []
        with open(os.path.join(raw_path, 'routes.txt'), 'r', encoding='utf-8-sig') as f:
            for row in csv.DictReader(f):
                if conf["agency"] and row.get('agency_id') != conf["agency"]:
                    continue

                rid = row['route_id']
                short = row.get('route_short_name', '').strip()
                
                if net == 'consorcio' and short.startswith('0'):
                    short = short.lstrip('0')
                    if not short: short = '0'

                color = row.get('route_color', '0284c7').strip()
                if not color or color == '': color = '0284c7'
                if not color.startswith('#'): color = '#' + color
                
                rutas[rid] = {
                    'id': rid,
                    'short_name': short,
                    'long_name': row.get('route_long_name', ''),
                    'color': color
                }
                lineas_resumen.append(rutas[rid])
        
        with open(os.path.join(out_path, 'lineas.json'), 'w', encoding='utf-8') as f:
            json.dump(lineas_resumen, f, ensure_ascii=False)

        paradas_crudas = {}
        paradas_limpias = {}
        
        with open(os.path.join(raw_path, 'stops.txt'), 'r', encoding='utf-8-sig') as f:
            for row in csv.DictReader(f):
                raw_id = row['stop_id']
                proc_id = raw_id
                
                if conf["usar_stop_code"] and row.get('stop_code'):
                    proc_id = row['stop_code']
                if conf["prefijo_quitar"] and proc_id.startswith(conf["prefijo_quitar"]):
                    proc_id = proc_id[len(conf["prefijo_quitar"]):]

                datos_parada = {
                    'id': proc_id,
                    'name': row.get('stop_name', ''),
                    'lat': float(row['stop_lat']),
                    'lon': float(row['stop_lon'])
                }
                paradas_crudas[raw_id] = datos_parada
                paradas_limpias[proc_id] = datos_parada
                
        with open(os.path.join(out_path, 'paradas.json'), 'w', encoding='utf-8') as f:
            json.dump(list(paradas_limpias.values()), f, ensure_ascii=False)

        shapes = defaultdict(list)
        shape_file = os.path.join(raw_path, 'shapes.txt')
        if os.path.exists(shape_file):
            with open(shape_file, 'r', encoding='utf-8-sig') as f:
                for row in csv.DictReader(f):
                    shapes[row['shape_id']].append({
                        'lat': float(row['shape_pt_lat']),
                        'lon': float(row['shape_pt_lon']),
                        'seq': int(row['shape_pt_sequence'])
                    })
            for sid in shapes:
                shapes[sid].sort(key=lambda x: x['seq'])
                shapes[sid] = [[pt['lat'], pt['lon']] for pt in shapes[sid]]

        calendario = {}
        cal_file = os.path.join(raw_path, 'calendar.txt')
        if os.path.exists(cal_file):
            with open(cal_file, 'r', encoding='utf-8-sig') as f:
                for row in csv.DictReader(f):
                    calendario[row['service_id']] = row

        trips = {}
        rutas_trips = defaultdict(list)
        with open(os.path.join(raw_path, 'trips.txt'), 'r', encoding='utf-8-sig') as f:
            for row in csv.DictReader(f):
                rid = row['route_id']
                if rid not in rutas: continue 
                
                tid = row['trip_id']
                trips[tid] = {
                    'route_id': rid,
                    'dir': row.get('direction_id', '0'),
                    'shape': row.get('shape_id', ''),
                    'service': row.get('service_id', ''),
                    'dias': get_day_types(calendario.get(row.get('service_id')), row.get('service_id')),
                    'stops': []
                }
                rutas_trips[rid].append(tid)

        tiempos_offline = defaultdict(lambda: defaultdict(lambda: {"L-J": [], "V": [], "S": [], "D": []}))
        parada_a_rutas = defaultdict(set)
        
        with open(os.path.join(raw_path, 'stop_times.txt'), 'r', encoding='utf-8-sig') as f:
            for row in csv.DictReader(f):
                tid = row['trip_id']
                if tid in trips:
                    raw_stop_id = row['stop_id']
                    hora = fix_time(row['departure_time'])
                    rid = trips[tid]['route_id']
                    
                    trips[tid]['stops'].append({
                        'raw_id': raw_stop_id,
                        'seq': int(row['stop_sequence']),
                        'time': hora
                    })

                    if raw_stop_id in paradas_crudas:
                        proc_id = paradas_crudas[raw_stop_id]['id']
                        parada_a_rutas[proc_id].add(rid)
                        
                        for dia in trips[tid]['dias']:
                            tiempos_offline[proc_id][rid][dia].append(hora)

        for pid in tiempos_offline:
            for rid in tiempos_offline[pid]:
                for dia in ["L-J", "V", "S", "D"]:
                    tiempos_offline[pid][rid][dia] = sorted(list(set(tiempos_offline[pid][rid][dia])))
        
        with open(os.path.join(out_path, 'tiempos_offline.json'), 'w', encoding='utf-8') as f:
            json.dump(tiempos_offline, f, ensure_ascii=False)

        for rid in rutas:
            detalle = {
                'info': rutas[rid],
                'ida': {'shape': [], 'paradas': [], 'horarios_cabecera': {"L-J": [], "V": [], "S": [], "D": []}},
                'vuelta': {'shape': [], 'paradas': [], 'horarios_cabecera': {"L-J": [], "V": [], "S": [], "D": []}}
            }

            viajes_ruta = [trips[t] for t in rutas_trips[rid]]
            
            for direc, dir_id in [('ida', '0'), ('vuelta', '1')]:
                viajes_dir = [v for v in viajes_ruta if v['dir'] == dir_id]
                if not viajes_dir: continue
                
                viaje_maestro = max(viajes_dir, key=lambda x: len(x['stops']))
                viaje_maestro['stops'].sort(key=lambda x: x['seq'])
                
                if viaje_maestro['shape']:
                    detalle[direc]['shape'] = shapes.get(viaje_maestro['shape'], [])

                for s in viaje_maestro['stops']:
                    if s['raw_id'] in paradas_crudas:
                        p_base = paradas_crudas[s['raw_id']]
                        proc_id = p_base['id']

                        if not detalle[direc]['paradas'] or detalle[direc]['paradas'][-1]['id'] != proc_id:
                            p_copy = p_base.copy()

                            trans = []
                            for t_rid in parada_a_rutas[proc_id]:
                                if t_rid != rid and t_rid in rutas:
                                    trans.append({
                                        'short_name': rutas[t_rid]['short_name'],
                                        'color': rutas[t_rid]['color']
                                    })

                            trans.sort(key=lambda x: x['short_name'])
                            p_copy['transbordos'] = trans
                            
                            detalle[direc]['paradas'].append(p_copy)

                for v in viajes_dir:
                    v['stops'].sort(key=lambda x: x['seq'])
                    if not v['stops']: continue
                    
                    hora_salida = v['stops'][0]['time']
                    hora_llegada = v['stops'][-1]['time']
                    if not hora_salida or not hora_llegada: continue

                    rango = f"{hora_salida} - {hora_llegada}"
                    for dia in v['dias']:
                        detalle[direc]['horarios_cabecera'][dia].append(rango)

                for dia in ["L-J", "V", "S", "D"]:
                    detalle[direc]['horarios_cabecera'][dia] = sorted(list(set(detalle[direc]['horarios_cabecera'][dia])))

            with open(os.path.join(detalles_path, f"{rid}.json"), 'w', encoding='utf-8') as f:
                json.dump(detalle, f, ensure_ascii=False)
                
        print(f"✅ Completado {net.upper()}: {len(rutas)} líneas y {len(paradas_limpias)} paradas extraídas.")

if __name__ == "__main__":
    procesar_todo()