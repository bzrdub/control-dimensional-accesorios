"""Validación del cuerpo JSON de POST /api/ensayos/ (sin dependencias externas).

Contrato (lo arman frontend/src/components/IngresoAccesorio.jsx + FormularioMediciones.jsx):
{
  productoId: "material|fusion|producto|referencia",
  despacho: 1, inspector: "…", marca: "…",                      ← obligatorios (trazabilidad)
  fecha?: "AAAA-MM-DD" (fecha del reporte; por defecto hoy, no futura),
  numeroOperacion?: "…", cantidadLote?: 120, inspeccionVisual?: "Sin Observación",
  (la hora NO se recibe: la pone el servidor)
  mediciones: { "E1.D1": 63.2, ... },   ← puede venir vacío o incompleto (borrador): se guarda igual
  cotas?: [{ codigo, min, max, nominal, registro }]   ← límites que vio el navegador; SOLO para advertir
}
Los límites que cuentan son los del servidor (ensayos/normas.py). El guardado no se bloquea por
mediciones faltantes ni fuera de rango; solo se rechaza un cuerpo mal formado.
"""
from datetime import date
from math import isclose

from django.utils import timezone

from .dominio.validacion import a_numero
from .models import INSPECCION_VISUAL_DEFECTO, EstadoAprobacion, FallaPHI

MAX_ABS = 1_000_000  # cabe en DecimalField(12, 4) con margen
MAX_ADVERTENCIAS = 10


class ErrorEntrada(ValueError):
    pass


def leer_producto_id(d):
    if not isinstance(d, dict):
        raise ErrorEntrada('Se esperaba un objeto JSON.')
    v = d.get('productoId')
    if not isinstance(v, str) or not v.strip():
        raise ErrorEntrada('Falta el campo "productoId".')
    if len(v) > 300:
        raise ErrorEntrada('"productoId" supera 300 caracteres.')
    return v


def leer_mediciones(med, codigos):
    if med is None:
        return {}
    if not isinstance(med, dict):
        raise ErrorEntrada('"mediciones" debe ser un objeto {codigo: valor}.')
    desconocidas = set(med) - codigos
    if desconocidas:
        raise ErrorEntrada(f'Mediciones sin cota en la especificación: {", ".join(sorted(desconocidas))}.')
    for codigo, v in med.items():
        if v is None or v == '':
            continue
        if isinstance(v, bool) or not isinstance(v, (int, float, str)):
            raise ErrorEntrada(f'Medición {codigo}: valor no válido.')
        x = a_numero(v)
        if x is None:
            raise ErrorEntrada(f'Medición {codigo}: "{v}" no es un número.')
        if abs(x) >= MAX_ABS:
            raise ErrorEntrada(f'Medición {codigo}: fuera de rango.')
    return med


def _igual(a, b):
    if a is None or b is None:
        return a is None and b is None
    return isinstance(b, (int, float)) and not isinstance(b, bool) and isclose(a, b, abs_tol=1e-9)


def _rango(c):
    if c.get('registro'):
        return f"registro (nom. {c.get('nominal')})"
    return f"[{c.get('min')} – {c.get('max')}]"


def comparar_cotas(cotas_cliente, cotas_servidor):
    """Advertencias si los límites que vio el navegador difieren de la norma vigente (no bloquea)."""
    if not isinstance(cotas_cliente, list):
        return []
    cliente = {c.get('codigo'): c for c in cotas_cliente if isinstance(c, dict)}
    advertencias = []
    for s in cotas_servidor:
        c = cliente.get(s['codigo'])
        if c is None:
            advertencias.append(f"{s['codigo']}: el navegador no mostró esta cota.")
        elif bool(c.get('registro')) != s['registro'] or not all(
            _igual(s[k], c.get(k)) for k in ('min', 'max', 'nominal')
        ):
            advertencias.append(
                f"{s['codigo']}: el navegador usó {_rango(c)}; la norma vigente es {_rango(s)}."
            )
    extra = set(cliente) - {s['codigo'] for s in cotas_servidor}
    if extra:
        advertencias.append(f"El navegador mostró cotas que la norma vigente no tiene: {', '.join(sorted(map(str, extra)))}.")
    if advertencias:
        advertencias.insert(0, 'Se evaluó con la norma vigente del servidor; recargue la página para ver los límites actualizados.')
    return advertencias[: MAX_ADVERTENCIAS + 1]


# ── Cabecera del ingreso ──────────────────────────────────────────────────────


def _texto(d, campo, largo, obligatorio=False):
    v = d.get(campo)
    if v is None:
        v = ''
    if not isinstance(v, str):
        raise ErrorEntrada(f'"{campo}" debe ser texto.')
    v = v.strip()
    if obligatorio and not v:
        raise ErrorEntrada(f'Falta el campo "{campo}".')
    if len(v) > largo:
        raise ErrorEntrada(f'"{campo}" supera {largo} caracteres.')
    return v


def _entero(d, campo, minimo, maximo, defecto=None):
    v = d.get(campo)
    if v is None or v == '':
        return defecto
    if isinstance(v, str):
        v = v.strip()
        if not (v.isascii() and v.isdigit()):
            raise ErrorEntrada(f'"{campo}" debe ser un número entero.')
        v = int(v)
    if isinstance(v, bool) or not isinstance(v, int) or not minimo <= v <= maximo:
        raise ErrorEntrada(f'"{campo}" debe ser un entero entre {minimo} y {maximo}.')
    return v


def leer_fecha_reporte(d):
    """Fecha del reporte (editable; por defecto hoy). No puede ser futura. La hora la asigna el servidor."""
    hoy = timezone.localdate()
    v = d.get('fecha')
    if v is None or v == '':
        return hoy
    fecha = leer_fecha(v)
    if fecha > hoy:
        raise ErrorEntrada('La fecha del reporte no puede ser posterior a hoy.')
    if fecha.year < 2000:
        raise ErrorEntrada('La fecha del reporte no es válida.')
    return fecha


def leer_cabecera(d):
    """Datos del formulario de ingreso. La hora la asigna el servidor."""
    return {
        'fecha': leer_fecha_reporte(d),
        'despacho': _entero(d, 'despacho', 1, 9999, defecto=1),
        'inspector': _texto(d, 'inspector', 100, obligatorio=True),
        'marca': _texto(d, 'marca', 100, obligatorio=True),
        'numero_operacion': _texto(d, 'numeroOperacion', 50),
        'cantidad_lote': _entero(d, 'cantidadLote', 1, 10_000_000),
        'inspeccion_visual': _texto(d, 'inspeccionVisual', 1000) or INSPECCION_VISUAL_DEFECTO,
    }


# ── Estado de aprobación (manual) ─────────────────────────────────────────────


def leer_estado_aprobacion(d):
    if not isinstance(d, dict):
        raise ErrorEntrada('Se esperaba un objeto JSON.')
    v = d.get('estadoAprobacion')
    if v not in EstadoAprobacion.values:
        raise ErrorEntrada(f'"estadoAprobacion" debe ser uno de: {", ".join(EstadoAprobacion.values)}.')
    return v


# ── Ensayo PHI ────────────────────────────────────────────────────────────────


def _magnitud(d, campo, donde, obligatorio=True):
    v = d.get(campo)
    if v is None or v == '':
        if obligatorio:
            raise ErrorEntrada(f'Falta {donde} (ponga 0 si lo desconoce).')
        return None
    x = None if isinstance(v, bool) else a_numero(v)
    if x is None or not 0 <= x < MAX_ABS:
        raise ErrorEntrada(f'{donde} debe ser un número mayor o igual a 0.')
    return x


def leer_phi(d):
    """{presion, temperatura, tiempo, resultados: [{id, falla, tiempoFalla?}]} → condiciones + resultados."""
    if not isinstance(d, dict):
        raise ErrorEntrada('Se esperaba un objeto JSON.')
    condiciones = {
        'phi_presion': _magnitud(d, 'presion', 'la presión de ensayo [MPa]'),
        'phi_temperatura': _magnitud(d, 'temperatura', 'la temperatura de ensayo [°C]'),
        'phi_tiempo': _magnitud(d, 'tiempo', 'el tiempo de ensayo [h]'),
    }
    lista = d.get('resultados')
    if not isinstance(lista, list) or not lista:
        raise ErrorEntrada('Seleccione al menos un accesorio ensayado.')
    resultados, vistos = [], set()
    for i, r in enumerate(lista):
        if not isinstance(r, dict):
            raise ErrorEntrada(f'resultados[{i}] debe ser un objeto.')
        pk = r.get('id')
        if isinstance(pk, bool) or not isinstance(pk, int):
            raise ErrorEntrada(f'resultados[{i}].id debe ser un entero.')
        if pk in vistos:
            raise ErrorEntrada(f'El ensayo {pk} está repetido.')
        vistos.add(pk)
        falla = r.get('falla')
        if falla not in FallaPHI.values:
            raise ErrorEntrada(f'resultados[{i}].falla debe ser uno de: {", ".join(FallaPHI.values)}.')
        tiempo_falla = None
        if falla != FallaPHI.SIN_FALLAS:
            tiempo_falla = _magnitud(r, 'tiempoFalla', f'el tiempo de fallo del ensayo {pk} [h]')
        resultados.append({'id': pk, 'phi_falla': falla, 'phi_tiempo_falla': tiempo_falla})
    return condiciones, resultados


def leer_fecha(texto):
    """'YYYY-MM-DD' → date (filtros de la lista)."""
    try:
        return date.fromisoformat(texto)
    except (TypeError, ValueError):
        raise ErrorEntrada('"fecha" debe tener formato AAAA-MM-DD.') from None
