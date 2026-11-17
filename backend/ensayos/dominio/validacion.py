"""Validación dimensional pura (sin Django). Port 1:1 de frontend/src/domain/validacion.js.

Ambas implementaciones se prueban con los mismos casos: compartido/casos-validacion.json.
Si cambias una, cambia la otra y agrega el caso al JSON.
"""
from decimal import ROUND_HALF_UP, Decimal
from math import isfinite

CONFORME = 'CONFORME'
NO_CONFORME = 'NO_CONFORME'
SIN_DATO = 'SIN_DATO'
SIN_TOLERANCIA = 'SIN_TOLERANCIA'  # la cota debería evaluarse pero no hay límite en la tabla
REGISTRO = 'REGISTRO'  # solo se registra, no se evalúa

ESTADOS = (CONFORME, NO_CONFORME, SIN_DATO, SIN_TOLERANCIA, REGISTRO)

# Global: NO_CONFORME > SIN_TOLERANCIA > SIN_DATO > CONFORME
_PRIORIDAD_GLOBAL = (NO_CONFORME, SIN_TOLERANCIA, SIN_DATO)

_CUATRO_DECIMALES = Decimal('0.0001')


def a_numero(valor):
    """Número float o None si el valor está vacío o no es numérico."""
    if valor is None or isinstance(valor, bool):
        return None
    if isinstance(valor, str):
        valor = valor.strip()
        if not valor or '_' in valor:
            return None
    try:
        x = float(valor)
    except (TypeError, ValueError):
        return None
    return x if isfinite(x) else None


def redondear4(x):
    """Igual que Number(x.toFixed(4)) en JS: valor binario exacto, empates alejándose de cero."""
    return float(Decimal(x).quantize(_CUATRO_DECIMALES, rounding=ROUND_HALF_UP)) + 0.0  # +0.0 evita -0.0


def evaluar_cota(cota, valor):
    """Evalúa una medición contra una cota. Límites inclusivos; min o max pueden ser None."""
    minimo = cota.get('min')
    maximo = cota.get('max')
    v = a_numero(valor)
    base = {'codigo': cota['codigo'], 'valor': v, 'min': minimo, 'max': maximo, 'desviacion': None}

    if cota.get('registro'):
        # Desviación solo informativa respecto del nominal, si existe.
        nominal = cota.get('nominal')
        desviacion = redondear4(v - nominal) if nominal is not None and v is not None else None
        return {**base, 'estado': REGISTRO, 'desviacion': desviacion}
    if minimo is None and maximo is None:
        return {**base, 'estado': SIN_TOLERANCIA}
    if v is None:
        return {**base, 'estado': SIN_DATO}

    desviacion = 0.0
    if minimo is not None and v < minimo:
        desviacion = v - minimo
    elif maximo is not None and v > maximo:
        desviacion = v - maximo
    return {
        **base,
        'estado': CONFORME if desviacion == 0 else NO_CONFORME,
        'desviacion': redondear4(desviacion),
    }


def evaluar_especificacion(especificacion, mediciones=None):
    """Evalúa todas las cotas. Las de solo registro no influyen en el resultado global."""
    mediciones = mediciones or {}
    resultados = [evaluar_cota(c, mediciones.get(c['codigo'])) for c in especificacion['cotas']]
    estados = {r['estado'] for r in resultados}
    estado_global = next((e for e in _PRIORIDAD_GLOBAL if e in estados), CONFORME)
    return {
        'especificacionId': especificacion.get('id'),
        'estadoGlobal': estado_global,
        'resultados': resultados,
    }
