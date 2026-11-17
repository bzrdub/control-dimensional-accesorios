"""Datos de PRUEBA para el registro global: N ingresos por accesorio en todas las combinaciones con norma.

    python manage.py sembrar_pruebas            # reemplaza los datos de prueba anteriores
    python manage.py sembrar_pruebas --borrar   # solo borra los datos de prueba

Las medidas se generan dentro de las tolerancias reales de cada cota (algunas fuera a propósito) y se
guardan por el mismo camino que la API (servicios.crear_ensayo). Todo ingreso de prueba lleva
N° de operación "PRUEBA-…" para poder borrarlo. Se niega a correr fuera de SQLite salvo --forzar.
"""
import math
import random
from collections import defaultdict
from datetime import datetime, time, timedelta

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from ensayos import normas
from ensayos.models import INSPECCION_VISUAL_DEFECTO, Ensayo, EstadoAprobacion, FallaPHI, Inspector, a_decimal
from ensayos.servicios import crear_ensayo

PREFIJO = 'PRUEBA-'


def _dos_decimales_dentro(x, mn, mx):
    """Redondea a 2 decimales sin salirse de [mn, mx] (si el rango es muy estrecho, usa 4)."""
    v = round(x, 2)
    if mx is not None and v > mx:
        v = math.floor(mx * 100) / 100
    if mn is not None and v < mn:
        v = math.ceil(mn * 100) / 100
    if (mx is not None and v > mx) or (mn is not None and v < mn):
        v = round(x, 4)
    return v


def valor_para(c, rnd, fuera=False):
    """Medida plausible para una cota; None si no hay referencia (sin límites ni nominal)."""
    mn, mx, nom = c['min'], c['max'], c['nominal']
    if c['registro']:
        return round(nom + rnd.uniform(-0.3, 0.3), 2) if nom is not None else None
    if mn is None and mx is None:
        return None
    exceso = rnd.uniform(0.05, 0.4)
    if fuera:
        if mx is not None and (mn is None or rnd.random() < 0.5):
            return round(mx + exceso, 2)
        return round(mn - exceso, 2)
    if mn is not None and mx is not None:
        return _dos_decimales_dentro(rnd.uniform(mn, mx), mn, mx)
    if mn is not None:  # solo mínimo (largos, espesores)
        return _dos_decimales_dentro(mn + rnd.uniform(0, max(0.5, abs(mn) * 0.05)), mn, None)
    return _dos_decimales_dentro(rnd.uniform(0, mx), None, mx)  # solo máximo (ovalidad)


class Command(BaseCommand):
    help = 'Crea (o borra) ingresos de PRUEBA: N por accesorio en todos los registros con norma.'

    def add_arguments(self, parser):
        parser.add_argument('--por-accesorio', type=int, default=2)
        parser.add_argument('--borrar', action='store_true', help='Solo borra los datos de prueba.')
        parser.add_argument('--semilla', type=int, default=42)
        parser.add_argument('--forzar', action='store_true', help='Permite correr fuera de SQLite.')
        parser.add_argument(
            '--inspector', default='BRYAN VÁSQUEZ',
            help='Inspector de todos los ingresos de prueba ("" = al azar entre los activos).',
        )

    def handle(self, *args, por_accesorio, borrar, semilla, forzar, inspector, **kw):
        motor = settings.DATABASES['default']['ENGINE']
        if 'sqlite' not in motor and not forzar:
            raise CommandError(f'La base es {motor}: los datos de prueba solo se crean en SQLite (use --forzar).')

        previos = Ensayo.objects.filter(numero_operacion__startswith=PREFIJO)
        n_previos = previos.count()
        previos.delete()
        if n_previos:
            self.stdout.write(f'Borrados {n_previos} ingresos de prueba anteriores.')
        if borrar:
            return

        inspectores = list(Inspector.objects.filter(activo=True).values_list('nombre', flat=True))
        if inspector:
            if inspector not in inspectores:
                raise CommandError(f'"{inspector}" no está en la lista de inspectores activos.')
            inspectores = [inspector]
        if not inspectores:
            raise CommandError('No hay inspectores activos.')
        especificaciones, _ = normas.cargar()

        # Productos con norma agrupados por registro (material, fusión) y accesorio.
        grupos = defaultdict(list)
        for pid, e in sorted(especificaciones.items()):
            grupos[(e['material'], e['fusion'], e['accesorio'])].append(pid)

        rnd = random.Random(semilla)
        hoy = timezone.localdate()
        resumen = defaultdict(lambda: {'accesorios': 0, 'ingresos': 0, 'fuera': 0})
        with transaction.atomic():
            for (material, fusion, accesorio), pids in sorted(grupos.items(), key=lambda kv: (kv[0][0], kv[0][1], int(kv[0][2]))):
                elegidos = rnd.sample(pids, k=min(por_accesorio, len(pids)))
                elegidos += rnd.choices(pids, k=por_accesorio - len(elegidos))
                resumen[(material, fusion)]['accesorios'] += 1
                for pid in elegidos:
                    self._ingreso(pid, especificaciones[pid]['cotas'], rnd, hoy, inspectores, resumen[(material, fusion)])

        for (material, fusion), r in sorted(resumen.items()):
            self.stdout.write(
                f'{material:7} {fusion:13} {r["accesorios"]:3} accesorios · {r["ingresos"]:3} ingresos · '
                f'{r["fuera"]} con medidas fuera de rango'
            )
        total = sum(r['ingresos'] for r in resumen.values())
        self.stdout.write(self.style.SUCCESS(f'{total} ingresos de prueba creados (N° de operación {PREFIJO}…).'))

    def _ingreso(self, pid, cotas, rnd, hoy, inspectores, resumen):
        medibles = [c for c in cotas if not c['registro'] and (c['min'] is not None or c['max'] is not None)]
        fuera = rnd.choice(medibles)['codigo'] if medibles and rnd.random() < 0.25 else None
        mediciones = {}
        for c in cotas:
            v = valor_para(c, rnd, fuera=c['codigo'] == fuera)
            if v is not None:
                mediciones[c['codigo']] = v

        fecha = hoy - timedelta(days=rnd.randint(0, 14))
        cabecera = {
            'fecha': fecha,
            'despacho': rnd.randint(1, 3),
            'inspector': rnd.choice(inspectores),
            # Marca principal (la primera de settings.MARCAS) en el 80 % de los ingresos.
            'marca': settings.MARCAS[0] if rnd.random() < 0.8 or len(settings.MARCAS) == 1 else rnd.choice(settings.MARCAS[1:]),
            'numero_operacion': f'{PREFIJO}{rnd.randint(1000, 9999)}',
            'cantidad_lote': rnd.choice([50, 100, 120, 200, 250, 500]),
            'inspeccion_visual': INSPECCION_VISUAL_DEFECTO,
        }
        ensayo, _ = crear_ensayo(pid, cabecera, mediciones)

        # Hora de ingreso plausible dentro de la jornada de la fecha del reporte.
        hora = time(rnd.randint(8, 17), rnd.randint(0, 59))
        creado = timezone.make_aware(datetime.combine(fecha, hora))
        cambios = {'creado': creado}

        # PHI en la mayoría; alguna falla. Estado de aprobación: decisión simulada de un inspector.
        if rnd.random() < 0.8:
            falla = rnd.choices([FallaPHI.SIN_FALLAS, FallaPHI.RUPTURA, FallaPHI.FILTRACION], weights=[92, 4, 4])[0]
            cambios.update(
                phi_presion=a_decimal(44.1),
                phi_temperatura=a_decimal(20),
                phi_tiempo=a_decimal(1),
                phi_falla=falla,
                phi_tiempo_falla=None if falla == FallaPHI.SIN_FALLAS else a_decimal(round(rnd.uniform(0.1, 0.9), 2)),
                phi_registrado=creado + timedelta(hours=2),
            )
            malo = fuera or falla != FallaPHI.SIN_FALLAS
            cambios['estado_aprobacion'] = EstadoAprobacion.RECHAZADO if malo else EstadoAprobacion.APROBADO
        Ensayo.objects.filter(pk=ensayo.pk).update(**cambios)

        resumen['ingresos'] += 1
        resumen['fuera'] += bool(fuera)
