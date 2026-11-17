import json
import tempfile
from io import StringIO
from pathlib import Path

from django.core.management import call_command
from django.test import TestCase, override_settings

from ensayos.models import Ensayo

COTAS = [
    {'codigo': 'E1.D1', 'etiqueta': 'D', 'min': 63.0, 'max': 63.6, 'nominal': None, 'registro': False},
    {'codigo': 'E1.e', 'etiqueta': 'e', 'min': 5.8, 'max': None, 'nominal': None, 'registro': False},
    {'codigo': 'E1.ov', 'etiqueta': 'ov', 'min': None, 'max': 1.2, 'nominal': None, 'registro': False},
    {'codigo': 'E1.L', 'etiqueta': 'L', 'min': None, 'max': None, 'nominal': 80, 'registro': True},
]


def espec(acc, producto, ref):
    return {'material': 'HDPE', 'fusion': 'TOPE', 'accesorio': acc, 'producto': producto, 'referencia': ref, 'cotas': COTAS}


_tmp = tempfile.TemporaryDirectory()
RUTA = Path(_tmp.name) / 'especificaciones.json'
RUTA.write_text(json.dumps({'especificaciones': {
    'HDPE|TOPE|Codo|63': espec('1', 'Codo', '63'),
    'HDPE|TOPE|Codo|75': espec('1', 'Codo', '75'),
    'HDPE|TOPE|Codo|90': espec('1', 'Codo', '90'),
    'HDPE|TOPE|Tee|63': espec('2', 'Tee', '63'),  # un solo producto: se repite
}}), encoding='utf-8')


@override_settings(ESPECIFICACIONES_PATH=RUTA)
class SembrarPruebas(TestCase):
    def test_crea_n_por_accesorio_y_borra_solo_pruebas(self):
        real = Ensayo.objects.create(material='HDPE', fusion='TOPE', accesorio='1', producto='Codo',
                                     clave_producto='x', estado_global='CONFORME', numero_operacion='OP-1')
        call_command('sembrar_pruebas', stdout=StringIO())
        pruebas = Ensayo.objects.filter(numero_operacion__startswith='PRUEBA-')
        self.assertEqual(pruebas.filter(accesorio='1').count(), 2)
        self.assertEqual(pruebas.filter(accesorio='2').count(), 2)
        self.assertEqual(len({e.clave_producto for e in pruebas.filter(accesorio='1')}), 2)  # dimensiones distintas
        self.assertEqual(set(pruebas.values_list('inspector', flat=True)), {'BRYAN VÁSQUEZ'})  # inspector por defecto

        # Las medidas "dentro" lo están: a lo más una cota fuera por ingreso (la elegida a propósito).
        for e in pruebas:
            self.assertLessEqual(e.mediciones.filter(estado='NO_CONFORME').count(), 1)
            self.assertEqual(e.mediciones.filter(valor__isnull=True).count(), 0)

        call_command('sembrar_pruebas', stdout=StringIO())  # reemplaza, no acumula
        self.assertEqual(Ensayo.objects.filter(numero_operacion__startswith='PRUEBA-').count(), 4)
        call_command('sembrar_pruebas', '--borrar', stdout=StringIO())
        self.assertEqual(list(Ensayo.objects.values_list('pk', flat=True)), [real.pk])
