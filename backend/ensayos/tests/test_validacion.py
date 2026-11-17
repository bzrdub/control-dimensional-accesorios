"""Mismos casos que frontend/src/domain/validacion.test.js (compartido/casos-validacion.json)."""
import json

from django.conf import settings
from django.test import SimpleTestCase

from ensayos.dominio.validacion import evaluar_cota, evaluar_especificacion

CASOS = json.loads((settings.BASE_DIR.parent / 'compartido' / 'casos-validacion.json').read_text(encoding='utf-8'))


class CasosCompartidos(SimpleTestCase):
    def test_cotas(self):
        for c in CASOS['cotas']:
            with self.subTest(c['nombre']):
                r = evaluar_cota(c['cota'], c['valor'])
                self.assertEqual(r['estado'], c['esperado']['estado'])
                self.assertEqual(r['desviacion'], c['esperado']['desviacion'])
                if 'valor' in c['esperado']:
                    self.assertEqual(r['valor'], c['esperado']['valor'])

    def test_especificaciones(self):
        for c in CASOS['especificaciones']:
            with self.subTest(c['nombre']):
                r = evaluar_especificacion({'id': 'X', 'cotas': c['cotas']}, c['mediciones'])
                self.assertEqual(r['estadoGlobal'], c['esperado'])
