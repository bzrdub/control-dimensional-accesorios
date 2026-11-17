"""Especificaciones normativas por producto, leídas de compartido/generated/especificaciones.json.

Ese archivo lo genera `npm run especificaciones` (frontend/) con el mismo código de mapeo que usa
la app, a partir de las tablas extraídas de las planillas. El servidor toma los límites SOLO de aquí;
los que envíe el navegador se usan únicamente para advertir si difieren.

Se recarga solo si el archivo cambia (mtime). `version` = SHA-256 del archivo: se guarda en cada
ensayo para saber con qué versión de la norma se evaluó.
"""
import hashlib
import json
import threading
from pathlib import Path

from django.conf import settings


class NormaNoDisponible(RuntimeError):
    pass


_lock = threading.Lock()
_cache = {'clave': None, 'especificaciones': None, 'version': None}


def cargar():
    """→ (especificaciones: dict productoId → {..., cotas}, version: str)."""
    ruta = Path(settings.ESPECIFICACIONES_PATH)
    try:
        clave = (str(ruta), ruta.stat().st_mtime_ns)
    except FileNotFoundError:
        raise NormaNoDisponible(
            f'No existe el archivo de especificaciones ({ruta}). Ejecutar "npm run especificaciones" en frontend/.'
        ) from None
    with _lock:
        if _cache['clave'] != clave:
            contenido = ruta.read_bytes()
            try:
                especificaciones = json.loads(contenido)['especificaciones']
            except (ValueError, KeyError) as e:
                raise NormaNoDisponible(f'Archivo de especificaciones inválido: {e}') from e
            _cache.update(
                clave=clave,
                especificaciones=especificaciones,
                version=hashlib.sha256(contenido).hexdigest(),
            )
        return _cache['especificaciones'], _cache['version']


def especificacion(producto_id):
    """→ (especificación o None si el producto no tiene, version)."""
    especificaciones, version = cargar()
    return especificaciones.get(producto_id), version
