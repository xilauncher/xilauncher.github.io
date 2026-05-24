import csv
import json
import os
from collections import defaultdict

def fix_time(time_str):
    if not time_str: return ""
    try:
        h, m, s = time_str.split(':')
        h = int(h)
        if h >= 24:
            h -= 24
        return f"{h:02d}:{m}"
    except:
        return time_str[:5]

def parse_gtfs():
    networks = ['urbano', 'consorcio', 'metro']
    base_raw = 'raw_gtfs'
    base_out = 'transporte/data'

    for net in networks:
        raw_path = os.path.join(base_raw, net)
        out_path = os.path.join(base_out, net)
        detalles_path = os.path.join(out_path, 'detalles')

        if not os.path.exists(raw_path):
            continue
        
        os.makedirs(detalles_path, exist_ok=True)
        print(f"Procesando red: {net.upper()}...")

        rutas = {}
        lineas_resumen = []
        with open(os.path.join(raw_path, 'routes.txt'), 'r', encoding='utf-8-sig') as f:
            for row in csv.DictReader(f):
                if net == 'consorcio' and row.get('agency_id') != 'CTAG':
                    continue

                rid = row['route_id']
                color = row.get('route_color', '0284c7').strip()
                if not color or color == '': color = '0284c7'
                if not color.startswith('#'): color = '#' + color
                
                rutas[rid] = {
                    'id': rid,
                    'short_name': row.get('route_short_name', ''),
                    'long_name': row.get('route_long_name', ''),
                    'color': color
                }
                lineas_resumen.append(rutas[rid])
        
        with open(os.path.join(out_path, 'lineas.json'), 'w', encoding='utf-8') as f:
            json.dump(lineas_resumen, f, ensure_ascii=False)

        paradas = {}
        paradas_resumen = []
        with open(os.path.join(raw_path, 'stops.txt'), 'r', encoding='utf-8-sig') as f:
            for row in csv.DictReader(f):
                sid = row['stop_id']
                display_id = sid

                if net == 'urbano':
                    display_id = row.get('stop_code', sid)
                    if not display_id: display_id = sid
                elif net == 'consorcio':
                    if sid.startswith('3_'): display_id = sid[2:]

                paradas[sid] = {
                    'id': display_id,
                    'name': row.get('stop_name', ''),
                    'lat': float(row['stop_lat']),
                    'lon': float(row['stop_lon'])
                }
                paradas_resumen.append(paradas[sid])
        
        with open(os.path.join(out_path, 'paradas.json'), 'w', encoding='utf-8') as f:
            json.dump(paradas_resumen, f, ensure_ascii=False)

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

        # 4. CALENDARIO
        calendario = {}
        cal_file = os.path.join(raw_path, 'calendar.txt')
        if os.path.exists(cal_file):
            with open(cal_file, 'r', encoding='utf-8-sig') as f:
                for row in csv.DictReader(f):
                    calendario[row['service_id']] = {
                        'L': row.get('monday', '0'),
                        'V': row.get('friday', '0'),
                        'S': row.get('saturday', '0'),
                        'D': row.get('sunday', '0')
                    }

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
                    'stops': []
                }
                rutas_trips[rid].append(tid)

        with open(os.path.join(raw_path, 'stop_times.txt'), 'r', encoding='utf-8-sig') as f:
            for row in csv.DictReader(f):
                tid = row['trip_id']
                if tid in trips:
                    trips[tid]['stops'].append({
                        'stop_id': row['stop_id'],
                        'seq': int(row['stop_sequence']),
                        'time': row['departure_time']
                    })

        for rid in rutas:
            detalle = {
                'info': rutas[rid],
                'ida': {'shape': [], 'paradas': [], 'horarios_cabecera': defaultdict(list), 'horarios_paradas': {}},
                'vuelta': {'shape': [], 'paradas': [], 'horarios_cabecera': defaultdict(list), 'horarios_paradas': {}}
            }

            viajes_ruta = [trips[t] for t in rutas_trips[rid]]
            
            for direc, dir_id in [('ida', '0'), ('vuelta', '1')]:
                viajes_dir = [v for v in viajes_ruta if v['dir'] == dir_id]
                if not viajes_dir: continue
                
                rep_trip = max(viajes_dir, key=lambda x: len(x['stops']))
                
                if rep_trip['shape'] and not detalle[direc]['shape']:
                    detalle[direc]['shape'] = shapes.get(rep_trip['shape'], [])
                
                rep_stop_ids = [s['stop_id'] for s in rep_trip['stops']]
                detalle[direc]['paradas'] = [paradas[sid] for sid in rep_stop_ids if sid in paradas]

                for p in detalle[direc]['paradas']:
                    detalle[direc]['horarios_paradas'][p['id']] = defaultdict(list)

                for v in viajes_dir:
                    v['stops'].sort(key=lambda x: x['seq'])
                    if not v['stops']: continue

                    srv = calendario.get(v['service'], {})
                    srv_id = v['service'].lower()

                    tipo_dia = "Lunes a Viernes"
                    if srv.get('S') == '1' and srv.get('D') == '0': tipo_dia = "Sábados"
                    elif srv.get('D') == '1': tipo_dia = "Domingos y Festivos"
                    elif srv.get('L') == '1' and srv.get('V') == '0': tipo_dia = "Lunes a Jueves"
                    elif srv.get('V') == '1' and srv.get('L') == '0': tipo_dia = "Viernes"
                    else:
                        if 'sab' in srv_id or 'sáb' in srv_id: tipo_dia = "Sábados"
                        elif 'dom' in srv_id or 'fes' in srv_id: tipo_dia = "Domingos y Festivos"
                        elif 'vier' in srv_id: tipo_dia = "Viernes"

                    salida = fix_time(v['stops'][0]['time'])
                    llegada = fix_time(v['stops'][-1]['time'])
                    detalle[direc]['horarios_cabecera'][tipo_dia].append(f"{salida} - {llegada}")

                    for s in v['stops']:
                        if s['stop_id'] in paradas:
                            api_id = paradas[s['stop_id']]['id']
                            if api_id in detalle[direc]['horarios_paradas']:
                                t_stop = fix_time(s['time'])
                                detalle[direc]['horarios_paradas'][api_id][tipo_dia].append(t_stop)

                for tipo in detalle[direc]['horarios_cabecera']:
                    detalle[direc]['horarios_cabecera'][tipo] = sorted(list(set(detalle[direc]['horarios_cabecera'][tipo])))
                
                for api_id in detalle[direc]['horarios_paradas']:
                    for tipo in detalle[direc]['horarios_paradas'][api_id]:
                        detalle[direc]['horarios_paradas'][api_id][tipo] = sorted(list(set(detalle[direc]['horarios_paradas'][api_id][tipo])))

            with open(os.path.join(detalles_path, f"{rid}.json"), 'w', encoding='utf-8') as f:
                json.dump(detalle, f, ensure_ascii=False)

if __name__ == "__main__":
    parse_gtfs()