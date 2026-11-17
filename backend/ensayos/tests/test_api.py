import json
import tempfile
from datetime import timedelta
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.test import TestCase, override_settings
from django.utils import timezone

from ensayos import normas
from ensayos.models import Ensayo, Inspector

PID = 'HDPE|TOPE|Codo 45°|PN-10 SDR-17 110[mm] x 110[mm]'
COTAS = [
    {'codigo': 'E1.D1', 'etiqueta': 'Diámetro interior', 'min': 63.0, 'max': 63.6, 'nominal': None, 'registro': False},
    {'codigo': 'E1.L1', 'etiqueta': 'Largo', 'min': 39, 'max': 41, 'nominal': None, 'registro': False},
    {'codigo': 'E1.L2', 'etiqueta': 'Largo total', 'min': None, 'max': None, 'nominal': 80, 'registro': True},
]
ESPECIFICACIONES = {
    'especificaciones': {
        PID: {
            'material': 'HDPE',
            'fusion': 'TOPE',
            'accesorio': '1',
            'producto': 'Codo 45°',
            'referencia': 'PN-10 SDR-17 110[mm] x 110[mm]',
            'cotas': COTAS,
        }
    }
}

_tmp = tempfile.TemporaryDirectory()
RUTA = Path(_tmp.name) / 'especificaciones.json'
RUTA.write_text(json.dumps(ESPECIFICACIONES), encoding='utf-8')


def cuerpo(**cambios):
    return {
        'productoId': PID,
        'despacho': 2,
        'inspector': 'BRYAN VÁSQUEZ',  # sembrado por la migración 0004
        'marca': 'MARCA PROPIA',
        'numeroOperacion': 'OP-123',
        'cantidadLote': 120,
        'mediciones': {'E1.D1': 63.8, 'E1.L1': '40', 'E1.L2': 80.5},
        **cambios,
    }


@override_settings(ESPECIFICACIONES_PATH=RUTA)
class ApiEnsayos(TestCase):
    def post(self, datos):
        return self.client.post('/api/ensayos/', datos, content_type='application/json')

    def test_salud_informa_version_de_norma(self):
        d = self.client.get('/api/salud/').json()
        self.assertEqual(d['estado'], 'ok')
        self.assertEqual(d['especificaciones'], 1)
        self.assertEqual(len(d['versionNorma']), 64)

    def test_limites_salen_del_servidor_no_del_navegador(self):
        # El navegador manda límites adulterados: se ignoran para evaluar y se advierte.
        adulteradas = [{**COTAS[0], 'max': 99}, *COTAS[1:]]
        r = self.post(cuerpo(cotas=adulteradas, material='PP-RCT'))
        self.assertEqual(r.status_code, 201, r.content)
        d = r.json()
        self.assertEqual(d['material'], 'HDPE')  # de la especificación, no del cuerpo
        self.assertEqual(d['estadoGlobal'], 'NO_CONFORME')
        por_codigo = {m['codigo']: m for m in d['mediciones']}
        self.assertEqual(por_codigo['E1.D1']['max'], 63.6)
        self.assertEqual(por_codigo['E1.D1']['desviacion'], 0.2)
        self.assertEqual(por_codigo['E1.L2']['estado'], 'REGISTRO')
        self.assertEqual(por_codigo['E1.L2']['desviacion'], 0.5)
        self.assertTrue(any('E1.D1' in a for a in d['advertencias']))

        e = Ensayo.objects.get(pk=d['id'])
        self.assertEqual(e.version_norma, normas.cargar()[1])
        self.assertEqual(e.mediciones.get(codigo='E1.D1').maximo, Decimal('63.6000'))

    def test_sin_advertencias_si_los_limites_coinciden(self):
        r = self.post(cuerpo(cotas=COTAS))
        self.assertEqual(r.json()['advertencias'], [])

    def test_nunca_bloquea_borradores_ni_fuera_de_rango(self):
        for nombre, med in {
            'sin mediciones': {},
            'incompleto': {'E1.D1': 63.2},
            'todo fuera de rango': {'E1.D1': 70, 'E1.L1': 1},
            'veredicto del navegador ignorado': {'E1.D1': 63.2, 'E1.L1': 40},
        }.items():
            with self.subTest(nombre):
                r = self.post(cuerpo(mediciones=med, estadoGlobal='CONFORME'))
                self.assertEqual(r.status_code, 201, r.content)
        estados = list(Ensayo.objects.order_by('id').values_list('estado_global', flat=True))
        self.assertEqual(estados, ['SIN_DATO', 'SIN_DATO', 'NO_CONFORME', 'CONFORME'])

    def test_cuerpos_mal_formados(self):
        casos = {
            'json roto': b'{no es json',
            'sin productoId': {'mediciones': {}},
            'producto sin especificación': cuerpo(productoId='HDPE|TOPE|Inexistente|X'),
            'medición sin cota': cuerpo(mediciones={'E9.X': 1}),
            'medición no numérica': cuerpo(mediciones={'E1.D1': 'abc'}),
            'sin inspector': cuerpo(inspector=''),
            'inspector fuera de la lista': cuerpo(inspector='NADIE'),
            'sin marca': cuerpo(marca=' '),
            'despacho 0': cuerpo(despacho=0),
            'lote no entero': cuerpo(cantidadLote='12a'),
        }
        for nombre, datos in casos.items():
            with self.subTest(nombre):
                r = self.post(datos)
                self.assertEqual(r.status_code, 400, r.content)
                self.assertIn('error', r.json())
        self.assertFalse(Ensayo.objects.exists())

    def test_listar_filtrar_y_detalle(self):
        self.post(cuerpo())
        self.post(cuerpo(mediciones={'E1.D1': 63.2, 'E1.L1': 40}))
        todos = self.client.get('/api/ensayos/').json()['resultados']
        self.assertEqual(len(todos), 2)
        self.assertNotIn('mediciones', todos[0])

        conformes = self.client.get('/api/ensayos/?estado=CONFORME').json()['resultados']
        self.assertEqual(len(conformes), 1)

        detalle = self.client.get(f"/api/ensayos/{conformes[0]['id']}/").json()
        self.assertEqual(len(detalle['mediciones']), 3)
        self.assertEqual(self.client.get('/api/ensayos/999/').status_code, 404)
        self.assertEqual(self.client.get('/api/ensayos/?limite=x').status_code, 400)


@override_settings(ESPECIFICACIONES_PATH=Path(_tmp.name) / 'no-existe.json')
class SinArchivoDeNorma(TestCase):
    def test_responde_503_y_no_guarda(self):
        self.assertEqual(self.client.get('/api/salud/').status_code, 503)
        r = self.client.post('/api/ensayos/', cuerpo(), content_type='application/json')
        self.assertEqual(r.status_code, 503)
        self.assertFalse(Ensayo.objects.exists())


class ArchivoRealDeNorma(TestCase):
    """El archivo generado del proyecto (datos reales o DEMO) carga y tiene la forma esperada."""

    def test_forma(self):
        if not Path(settings.ESPECIFICACIONES_PATH).exists():
            self.skipTest('sin compartido/generated/especificaciones.json: ejecute "npm run datos:demo" en frontend/')
        especificaciones, _ = normas.cargar()
        self.assertGreater(len(especificaciones), 0)
        for pid, e in list(especificaciones.items())[:50]:
            self.assertEqual(pid.split('|')[:2], [e['material'], e['fusion']])
            for c in e['cotas']:
                self.assertEqual(set(c), {'codigo', 'etiqueta', 'min', 'max', 'nominal', 'registro'})
        self.assertEqual(Path(settings.ESPECIFICACIONES_PATH).name, 'especificaciones.json')


@override_settings(ESPECIFICACIONES_PATH=RUTA)
class RegistroGlobal(TestCase):
    def crear(self, **cambios):
        r = self.client.post('/api/ensayos/', cuerpo(**cambios), content_type='application/json')
        self.assertEqual(r.status_code, 201, r.content)
        return r.json()

    def test_cabecera_fecha_editable_hora_automatica_y_estado_inicial(self):
        ayer = timezone.localdate() - timedelta(days=1)
        d = self.crear(inspeccionVisual='', fecha=ayer.isoformat(), hora='00:00')  # la hora del cliente se ignora
        self.assertEqual(d['fecha'], ayer.strftime('%d-%m-%Y'))
        self.assertEqual(d['hora'], timezone.localtime(Ensayo.objects.get(pk=d['id']).creado).strftime('%H:%M'))
        self.assertEqual(self.crear()['fecha'], timezone.localdate().strftime('%d-%m-%Y'))  # sin fecha → hoy
        for invalida in [(timezone.localdate() + timedelta(days=1)).isoformat(), '16-11-2026', '1999-12-31']:
            with self.subTest(invalida):
                r = self.client.post('/api/ensayos/', cuerpo(fecha=invalida), content_type='application/json')
                self.assertEqual(r.status_code, 400, r.content)
        self.assertEqual(
            {k: d[k] for k in ('despacho', 'inspector', 'marca', 'numeroOperacion', 'cantidadLote', 'inspeccionVisual')},
            {'despacho': 2, 'inspector': 'BRYAN VÁSQUEZ', 'marca': 'MARCA PROPIA', 'numeroOperacion': 'OP-123',
             'cantidadLote': 120, 'inspeccionVisual': 'Sin Observación'},
        )
        self.assertEqual(d['estadoAprobacion'], 'EN_PROCESO')
        self.assertIsNone(d['phi'])
        self.assertEqual(d['dimensional'], {'fueraDeRango': 1, 'pendientes': 0})

    @override_settings(MARCAS=['MARCA PROPIA', 'MARCA EXTERNA'])  # independiente del .env local
    def test_catalogos(self):
        d = self.client.get('/api/catalogos/').json()
        self.assertIn('BRYAN VÁSQUEZ', d['inspectores'])
        self.assertEqual(d['marcas'], ['MARCA PROPIA', 'MARCA EXTERNA'])
        Inspector.objects.filter(nombre='BRYAN VÁSQUEZ').update(activo=False)
        self.assertNotIn('BRYAN VÁSQUEZ', self.client.get('/api/catalogos/').json()['inspectores'])

    def test_estado_aprobacion_manual(self):
        pk = self.crear()['id']
        url = f'/api/ensayos/{pk}/'
        r = self.client.patch(url, {'estadoAprobacion': 'RECHAZADO'}, content_type='application/json')
        self.assertEqual(r.json()['estadoAprobacion'], 'RECHAZADO')
        self.assertEqual(self.client.patch(url, {'estadoAprobacion': 'OK'}, content_type='application/json').status_code, 400)
        self.assertEqual(Ensayo.objects.get(pk=pk).estado_aprobacion, 'RECHAZADO')

    def test_phi_condiciones_comunes_y_fallas(self):
        a, b = self.crear()['id'], self.crear()['id']
        r = self.client.post('/api/ensayos/phi/', {
            'presion': 4.41, 'temperatura': 20, 'tiempo': 1,
            'resultados': [{'id': a, 'falla': 'SIN_FALLAS', 'tiempoFalla': 99}, {'id': b, 'falla': 'RUPTURA', 'tiempoFalla': 0.5}],
        }, content_type='application/json')
        self.assertEqual(r.status_code, 200, r.content)
        phi = {x['id']: x['phi'] for x in r.json()['resultados']}
        self.assertEqual(phi[a], {'presion': 4.41, 'temperatura': 20.0, 'tiempo': 1.0, 'falla': 'SIN_FALLAS', 'tiempoFalla': None})
        self.assertEqual(phi[b]['falla'], 'RUPTURA')
        self.assertEqual(phi[b]['tiempoFalla'], 0.5)
        # El PHI no cambia el estado de aprobación (es manual).
        self.assertEqual(Ensayo.objects.get(pk=b).estado_aprobacion, 'EN_PROCESO')

    def test_phi_entradas_invalidas_no_modifican_nada(self):
        a = self.crear()['id']
        base = {'presion': 4.4, 'temperatura': 20, 'tiempo': 1, 'resultados': [{'id': a, 'falla': 'SIN_FALLAS'}]}
        casos = {
            'falta presión': {**base, 'presion': None},
            'temperatura negativa': {**base, 'temperatura': -1},
            'sin accesorios': {**base, 'resultados': []},
            'falla sin tiempo': {**base, 'resultados': [{'id': a, 'falla': 'FILTRACION'}]},
            'falla inválida': {**base, 'resultados': [{'id': a, 'falla': 'ROTO'}]},
            'id inexistente': {**base, 'resultados': [{'id': a, 'falla': 'SIN_FALLAS'}, {'id': 999, 'falla': 'SIN_FALLAS'}]},
        }
        for nombre, datos in casos.items():
            with self.subTest(nombre):
                r = self.client.post('/api/ensayos/phi/', datos, content_type='application/json')
                self.assertEqual(r.status_code, 400, r.content)
        self.assertEqual(Ensayo.objects.get(pk=a).phi_falla, '')

    def test_lista_por_fecha_y_despacho(self):
        self.crear(despacho=1)
        self.crear(despacho=2)
        self.crear(despacho=2, mediciones={})
        hoy = timezone.localdate().isoformat()
        d = self.client.get(f'/api/ensayos/?material=HDPE&fusion=TOPE&fecha={hoy}&despacho=2').json()
        self.assertEqual(d['total'], 2)
        self.assertEqual(d['resultados'][0]['dimensional'], {'fueraDeRango': 0, 'pendientes': 2})  # el más reciente
        self.assertEqual(self.client.get('/api/ensayos/?fecha=2026-13-01').status_code, 400)
        self.assertEqual(self.client.get('/api/ensayos/?fecha=2000-01-01').json()['total'], 0)

    def test_mediciones_por_accesorio(self):
        self.crear()
        self.crear(mediciones={'E1.D1': 63.2})
        cant = self.client.get('/api/ensayos/por-accesorio/?material=HDPE&fusion=TOPE').json()['cantidades']
        self.assertEqual(cant, {'1': 2})
        self.assertEqual(self.client.get('/api/ensayos/por-accesorio/').status_code, 400)
        d = self.client.get('/api/ensayos/?material=HDPE&fusion=TOPE&accesorio=1&detalle=1').json()
        self.assertEqual(d['total'], 2)
        primero = d['resultados'][0]  # el más reciente
        self.assertEqual([m['codigo'] for m in primero['mediciones']], ['E1.D1', 'E1.L1', 'E1.L2'])
        self.assertEqual(primero['mediciones'][0]['valor'], 63.2)
        self.assertNotIn('mediciones', self.client.get('/api/ensayos/?accesorio=1').json()['resultados'][0])
        self.assertEqual(self.client.get('/api/ensayos/?accesorio=99').json()['total'], 0)

    def test_filtros_de_la_lista(self):
        hoy = timezone.localdate()
        a = self.crear(fecha=(hoy - timedelta(days=5)).isoformat(), despacho=1, numeroOperacion='OP-AAA')['id']
        b = self.crear(fecha=(hoy - timedelta(days=1)).isoformat(), despacho=2, mediciones={'E1.D1': 63.2}, marca='MARCA EXTERNA')['id']
        c = self.crear(despacho=2, mediciones={})['id']
        self.client.post('/api/ensayos/phi/', {'presion': 4, 'temperatura': 20, 'tiempo': 1, 'resultados': [
            {'id': a, 'falla': 'RUPTURA', 'tiempoFalla': 0.5}, {'id': b, 'falla': 'SIN_FALLAS'}]}, content_type='application/json')
        self.client.patch(f'/api/ensayos/{b}/', {'estadoAprobacion': 'APROBADO'}, content_type='application/json')

        def ids(query):
            r = self.client.get(f'/api/ensayos/?material=HDPE&fusion=TOPE&{query}')
            self.assertEqual(r.status_code, 200, r.content)
            d = r.json()
            self.assertEqual(d['total'], len(d['resultados']))
            return sorted(e['id'] for e in d['resultados'])

        self.assertEqual(ids(f'desde={(hoy - timedelta(days=2)).isoformat()}'), sorted([b, c]))
        self.assertEqual(ids(f'hasta={(hoy - timedelta(days=2)).isoformat()}'), [a])
        self.assertEqual(ids('despacho=2'), sorted([b, c]))
        self.assertEqual(ids('phi=pendiente'), [c])
        self.assertEqual(ids('phi=con_falla'), [a])
        self.assertEqual(ids('phi=sin_fallas'), [b])
        self.assertEqual(ids('aprobacion=APROBADO'), [b])
        self.assertEqual(ids('q=op-aaa'), [a])  # sin distinguir mayúsculas
        self.assertEqual(ids('q=externa'), [b])
        self.assertEqual(ids('fuera=1'), [a])  # a tiene E1.D1=63.8 > 63.6
        self.assertEqual(ids('inspector=BRYAN%20V%C3%81SQUEZ'), sorted([a, b, c]))
        self.assertEqual(ids(f'productoId={PID}&fuera=1&despacho=1'), [a])
        self.assertEqual(self.client.get('/api/ensayos/?phi=raro').status_code, 400)
        self.assertEqual(self.client.get('/api/ensayos/?desde=01-01-2026').status_code, 400)
