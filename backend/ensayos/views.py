import json

from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods, require_POST

from . import normas
from .entrada import (
    ErrorEntrada,
    comparar_cotas,
    leer_cabecera,
    leer_estado_aprobacion,
    leer_fecha,
    leer_phi,
    leer_producto_id,
)
from .models import Ensayo, Estado, EstadoAprobacion, FallaPHI, Inspector, a_decimal
from .servicios import crear_ensayo


# Filtro ?phi= de la lista.
FILTROS_PHI = {
    'pendiente': {'phi_falla': ''},
    'sin_fallas': {'phi_falla': FallaPHI.SIN_FALLAS},
    'con_falla': {'phi_falla__in': [FallaPHI.RUPTURA, FallaPHI.FILTRACION]},
}


def _json(datos, status=200):
    # charset explícito: sin él, algunos clientes (PowerShell 5, Excel/Power Query) decodifican mal los acentos.
    return JsonResponse(
        datos, status=status, json_dumps_params={'ensure_ascii': False}, content_type='application/json; charset=utf-8'
    )


def _error(mensaje, status):
    return _json({'error': mensaje}, status=status)


def _cuerpo(request):
    try:
        return json.loads(request.body or b'null')
    except (json.JSONDecodeError, UnicodeDecodeError):
        raise ErrorEntrada('El cuerpo no es JSON válido.') from None


@require_GET
def salud(request):
    try:
        especificaciones, version = normas.cargar()
    except normas.NormaNoDisponible as e:
        return _json({'estado': 'error', 'error': str(e)}, status=503)
    return _json({'estado': 'ok', 'especificaciones': len(especificaciones), 'versionNorma': version})


@require_GET
def catalogos(request):
    """Listas del formulario de ingreso."""
    return _json(
        {
            'inspectores': list(Inspector.objects.filter(activo=True).values_list('nombre', flat=True)),
            'marcas': settings.MARCAS,  # backend/.env; "OTRO" se escribe a mano en el frontend
            'estadosAprobacion': [{'id': v, 'nombre': n} for v, n in EstadoAprobacion.choices],
        }
    )


# PENDIENTE: autenticación. Mientras no haya usuarios, la API es abierta y sin CSRF
# (solo para uso en red interna / desarrollo).
@csrf_exempt
@require_http_methods(['GET', 'POST'])
def ensayos(request):
    try:
        return _crear(request) if request.method == 'POST' else _listar(request)
    except ErrorEntrada as e:
        return _error(str(e), 400)


@csrf_exempt
@require_http_methods(['GET', 'PATCH'])
def ensayo(request, pk):
    e = Ensayo.objects.filter(pk=pk).first()
    if e is None:
        return _error('Ensayo no encontrado.', 404)
    if request.method == 'PATCH':
        # Solo se edita el estado de aprobación (decisión manual del inspector).
        try:
            e.estado_aprobacion = leer_estado_aprobacion(_cuerpo(request))
        except ErrorEntrada as err:
            return _error(str(err), 400)
        e.save(update_fields=['estado_aprobacion'])
    return _json(e.a_dict(detalle=True))


@csrf_exempt
@require_POST
def ensayo_phi(request):
    """Registra un ensayo PHI (condiciones comunes) sobre varios accesorios de un despacho."""
    try:
        condiciones, resultados = leer_phi(_cuerpo(request))
    except ErrorEntrada as e:
        return _error(str(e), 400)
    ids = [r['id'] for r in resultados]
    with transaction.atomic():
        existentes = {e.pk: e for e in Ensayo.objects.select_for_update().filter(pk__in=ids)}
        faltan = [pk for pk in ids if pk not in existentes]
        if faltan:
            return _error(f'No existen los ensayos: {", ".join(map(str, faltan))}.', 400)
        ahora = timezone.now()
        for r in resultados:
            e = existentes[r['id']]
            e.phi_presion = a_decimal(condiciones['phi_presion'])
            e.phi_temperatura = a_decimal(condiciones['phi_temperatura'])
            e.phi_tiempo = a_decimal(condiciones['phi_tiempo'])
            e.phi_falla = r['phi_falla']
            e.phi_tiempo_falla = a_decimal(r['phi_tiempo_falla'])
            e.phi_registrado = ahora
            e.save(
                update_fields=[
                    'phi_presion', 'phi_temperatura', 'phi_tiempo', 'phi_falla', 'phi_tiempo_falla', 'phi_registrado'
                ]
            )
    return _json({'resultados': [existentes[pk].a_dict() for pk in ids]})


def _crear(request):
    cuerpo = _cuerpo(request)
    producto_id = leer_producto_id(cuerpo)
    cabecera = leer_cabecera(cuerpo)
    if not Inspector.objects.filter(nombre=cabecera['inspector'], activo=True).exists():
        raise ErrorEntrada(f'"{cabecera["inspector"]}" no está en la lista de inspectores activos.')

    # Nunca se bloquea por mediciones faltantes o fuera de rango: se guarda y se informa.
    try:
        nuevo, cotas = crear_ensayo(producto_id, cabecera, cuerpo.get('mediciones'))
    except normas.NormaNoDisponible as e:
        return _error(str(e), 503)
    respuesta = nuevo.a_dict(detalle=True)
    respuesta['advertencias'] = comparar_cotas(cuerpo.get('cotas'), cotas)
    return _json(respuesta, status=201)


def _listar(request):
    g = request.GET
    if g.get('estado') and g['estado'] not in Estado.values:
        raise ErrorEntrada('"estado" no es un estado válido.')
    if g.get('aprobacion') and g['aprobacion'] not in EstadoAprobacion.values:
        raise ErrorEntrada('"aprobacion" no es un estado de aprobación válido.')
    try:
        limite = min(max(int(g.get('limite', 200)), 1), 500)
    except ValueError:
        raise ErrorEntrada('"limite" debe ser un entero.') from None

    filtros = {}
    for param, campo in (('material', 'material'), ('fusion', 'fusion'), ('accesorio', 'accesorio'),
                         ('estado', 'estado_global'), ('aprobacion', 'estado_aprobacion'),
                         ('inspector', 'inspector'), ('productoId', 'clave_producto')):
        if g.get(param):
            filtros[campo] = g[param]
    for param, campo in (('fecha', 'fecha'), ('desde', 'fecha__gte'), ('hasta', 'fecha__lte')):
        if g.get(param):
            filtros[campo] = leer_fecha(g[param])
    if g.get('despacho'):
        if not g['despacho'].isdigit():
            raise ErrorEntrada('"despacho" debe ser un entero.')
        filtros['despacho'] = int(g['despacho'])
    phi = g.get('phi')
    if phi:
        if phi not in FILTROS_PHI:
            raise ErrorEntrada(f'"phi" debe ser uno de: {", ".join(FILTROS_PHI)}.')
        filtros.update(FILTROS_PHI[phi])

    filtrados = Ensayo.objects.filter(**filtros)
    texto = g.get('q', '').strip()
    if texto:  # búsqueda libre: producto, dimensión, N° de operación o marca
        filtrados = filtrados.filter(
            Q(producto__icontains=texto) | Q(referencia__icontains=texto)
            | Q(numero_operacion__icontains=texto) | Q(marca__icontains=texto)
        )
    # order_by explícito: Django ignora Meta.ordering en consultas con agregaciones (GROUP BY).
    qs = filtrados.annotate(
        n_fuera=Count('mediciones', filter=Q(mediciones__estado=Estado.NO_CONFORME)),
        n_pendientes=Count('mediciones', filter=Q(mediciones__valor__isnull=True, mediciones__registro=False)),
    ).order_by('-fecha', '-creado', '-id')
    if g.get('fuera') == '1':  # solo ingresos con alguna medida fuera de rango
        qs = qs.filter(n_fuera__gt=0)
    total = qs.count()
    detalle = g.get('detalle') == '1'  # con mediciones (vista "por accesorio")
    if detalle:
        qs = qs.prefetch_related('mediciones')
    return _json({'total': total, 'resultados': [e.a_dict(detalle=detalle) for e in qs[:limite]]})


@require_GET
def por_accesorio(request):
    """Cantidad de ingresos por código de accesorio (pestañas de la vista "mediciones por accesorio")."""
    g = request.GET
    if not g.get('material') or not g.get('fusion'):
        return _error('Faltan "material" y "fusion".', 400)
    filas = (
        Ensayo.objects.filter(material=g['material'], fusion=g['fusion'])
        .values('accesorio')
        .annotate(n=Count('id'))
        .order_by()
    )
    return _json({'cantidades': {f['accesorio']: f['n'] for f in filas}})
