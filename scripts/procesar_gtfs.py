import csv
import json
import os
from collections import defaultdict

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
                paradas[sid] = {
                    'id': sid,
                    'name': row.get('stop_name', ''),
                    'lat': float(row['stop_lat']),
                    'lon': float(row['stop_lon'])
                }
                paradas_resumen.append(paradas[sid])

        with open(os.path.join(out_path, 'paradas.json'), 'w', encoding='utf-8') as f:
            json.dump(paradas_resumen, f, ensure_ascii=False)

        shapes = defaultdict(list)
        if os.path.exists(os.path.join(raw_path, 'shapes.txt')):
            with open(os.path.join(raw_path, 'shapes.txt'), 'r', encoding='utf-8-sig') as f:
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
        if os.path.exists(os.path.join(raw_path, 'calendar.txt')):
            with open(os.path.join(raw_path, 'calendar.txt'), 'r', encoding='utf-8-sig') as f:
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
                tid = row['trip_id']
                rid = row['route_id']
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
                'ida': {'shape': [], 'paradas': [], 'horarios': defaultdict(list)},
                'vuelta': {'shape': [], 'paradas': [], 'horarios': defaultdict(list)}
            }

            viajes_ruta = [trips[t] for t in rutas_trips[rid]]
            
            for v in viajes_ruta:
                v['stops'].sort(key=lambda x: x['seq'])
                d = 'ida' if v['dir'] == '0' else 'vuelta'
                
                if v['shape'] and not detalle[d]['shape']:
                    detalle[d]['shape'] = shapes.get(v['shape'], [])
                
                if len(v['stops']) > len(detalle[d]['paradas']):
                    detalle[d]['paradas'] = [paradas[s['stop_id']] for s in v['stops'] if s['stop_id'] in paradas]

                if v['stops']:
                    salida = v['stops'][0]['time'][:5]
                    srv_id = v['service'].lower()
                    srv = calendario.get(v['service'], {})
                    
                    tipo_dia = "Laborables"
                    if 'sab' in srv_id or 'sáb' in srv_id or srv.get('S') == '1' and srv.get('D') == '0':
                        tipo_dia = "Sábados"
                    elif 'dom' in srv_id or 'fes' in srv_id or srv.get('D') == '1':
                        tipo_dia = "Domingos y Festivos"
                    elif 'vier' in srv_id:
                        tipo_dia = "Viernes"
                    elif srv.get('L') == '1' and srv.get('V') == '0':
                        tipo_dia = "Lunes a Jueves"

                    detalle[d]['horarios'][tipo_dia].append(salida)

            for d in ['ida', 'vuelta']:
                for tipo in detalle[d]['horarios']:
                    detalle[d]['horarios'][tipo] = sorted(list(set(detalle[d]['horarios'][tipo])))

            # Guardar el JSON súper ligero para la PWA
            with open(os.path.join(detalles_path, f"{rid}.json"), 'w', encoding='utf-8') as f:
                json.dump(detalle, f, ensure_ascii=False)

if __name__ == "__main__":
    parse_gtfs()