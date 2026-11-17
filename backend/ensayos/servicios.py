"""Operaciones de dominio compartidas por la API y los comandos de gestión."""
from django.db import transaction

from . import normas
from .dominio.validacion import evaluar_especificacion
from .entrada import ErrorEntrada, leer_mediciones
from .models import Ensayo, Medicion, a_decimal


def crear_ensayo(producto_id, cabecera, mediciones):
    """Evalúa con la norma vigente del servidor y guarda el ingreso con sus mediciones.

    `cabecera`: campos de Ensayo ya validados (entrada.leer_cabecera).
    Nunca se bloquea por mediciones faltantes o fuera de rango.
    Lanza normas.NormaNoDisponible (sin archivo de norma) o ErrorEntrada (producto/mediciones inválidos).
    → (ensayo, cotas de la norma)
    """
    espec, version = normas.especificacion(producto_id)
    if espec is None:
        raise ErrorEntrada(f'El servidor no tiene especificación normativa para "{producto_id}".')
    cotas = espec['cotas']
    mediciones = leer_mediciones(mediciones, {c['codigo'] for c in cotas})
    evaluacion = evaluar_especificacion({'id': producto_id, 'cotas': cotas}, mediciones)
    with transaction.atomic():
        ensayo = Ensayo.objects.create(
            **cabecera,
            material=espec['material'],
            fusion=espec['fusion'],
            accesorio=espec['accesorio'],
            producto=espec['producto'],
            referencia=espec['referencia'],
            clave_producto=producto_id,
            estado_global=evaluacion['estadoGlobal'],
            version_norma=version,
        )
        Medicion.objects.bulk_create(
            Medicion(
                ensayo=ensayo,
                orden=i,
                codigo=c['codigo'],
                etiqueta=c['etiqueta'],
                valor=a_decimal(r['valor']),
                minimo=a_decimal(c['min']),
                maximo=a_decimal(c['max']),
                nominal=a_decimal(c['nominal']),
                registro=c['registro'],
                estado=r['estado'],
                desviacion=a_decimal(r['desviacion']),
            )
            for i, (c, r) in enumerate(zip(cotas, evaluacion['resultados']))
        )
    return ensayo, cotas
