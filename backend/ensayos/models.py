from decimal import ROUND_HALF_UP, Decimal

from django.db import models
from django.utils import timezone

from .dominio import validacion as v


class Estado(models.TextChoices):
    """Resultado dimensional de una cota (y resumen interno del ensayo)."""

    CONFORME = v.CONFORME, 'Conforme'
    NO_CONFORME = v.NO_CONFORME, 'No conforme'
    SIN_DATO = v.SIN_DATO, 'Sin dato'
    SIN_TOLERANCIA = v.SIN_TOLERANCIA, 'Sin tolerancia'
    REGISTRO = v.REGISTRO, 'Solo registro'


class EstadoAprobacion(models.TextChoices):
    """Lo define el inspector a mano en el registro global (no se calcula)."""

    EN_PROCESO = 'EN_PROCESO', 'En proceso'
    APROBADO = 'APROBADO', 'Aprobado'
    RECHAZADO = 'RECHAZADO', 'Rechazado'


class FallaPHI(models.TextChoices):
    SIN_FALLAS = 'SIN_FALLAS', 'Sin fallas'
    RUPTURA = 'RUPTURA', 'Ruptura'
    FILTRACION = 'FILTRACION', 'Filtración'


INSPECCION_VISUAL_DEFECTO = 'Sin Observación'

_CUATRO = Decimal('0.0001')


def a_decimal(x):
    return None if x is None else Decimal(str(x)).quantize(_CUATRO, rounding=ROUND_HALF_UP)


def _a_float(d):
    return None if d is None else float(d)


def _milimetros():
    # DecimalField (no float) para guardar exactamente lo medido; compatible con SQL Server.
    return models.DecimalField(max_digits=12, decimal_places=4, null=True, blank=True)


def _magnitud():
    return models.DecimalField(max_digits=10, decimal_places=3, null=True, blank=True)


class Inspector(models.Model):
    """Lista de inspectores del formulario de ingreso (editable en /admin/)."""

    nombre = models.CharField(max_length=100, unique=True)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ['nombre']
        verbose_name = 'inspector'
        verbose_name_plural = 'inspectores'

    def __str__(self):
        return self.nombre


class Ensayo(models.Model):
    """Una fila del registro global: ingreso del accesorio + control dimensional + ensayo PHI."""

    # ── Ingreso (formulario "Ingrese Tipo de Accesorio") ──
    creado = models.DateTimeField(auto_now_add=True, db_index=True)  # instante real de ingreso (de aquí sale la hora)
    fecha = models.DateField(default=timezone.localdate)  # fecha del reporte (editable al ingresar)
    despacho = models.PositiveIntegerField(default=1)
    inspector = models.CharField(max_length=100, blank=True)
    material = models.CharField(max_length=20)
    fusion = models.CharField(max_length=20)
    accesorio = models.CharField(max_length=50)  # código del LISTADO
    producto = models.CharField(max_length=200)
    referencia = models.CharField(max_length=200, blank=True)
    clave_producto = models.CharField(max_length=300)  # material|fusion|producto|referencia
    marca = models.CharField(max_length=100, blank=True)
    numero_operacion = models.CharField(max_length=50, blank=True)
    cantidad_lote = models.PositiveIntegerField(null=True, blank=True)
    inspeccion_visual = models.TextField(blank=True, default=INSPECCION_VISUAL_DEFECTO)

    # ── Control dimensional ──
    # Resumen interno (SIN_DATO = borrador incompleto); la UI no lo muestra como etiqueta global.
    estado_global = models.CharField(max_length=20, choices=Estado.choices)
    version_norma = models.CharField(max_length=64, blank=True, default='')  # SHA-256 de especificaciones.json

    # ── Ensayo PHI (presión hidrostática interna) ──
    phi_presion = _magnitud()  # MPa
    phi_temperatura = _magnitud()  # °C
    phi_tiempo = _magnitud()  # h
    phi_falla = models.CharField(max_length=20, choices=FallaPHI.choices, blank=True)  # '' = sin ensayo
    phi_tiempo_falla = _magnitud()  # h; solo si hubo falla
    phi_registrado = models.DateTimeField(null=True, blank=True)

    # ── Aprobación (manual) ──
    estado_aprobacion = models.CharField(
        max_length=20, choices=EstadoAprobacion.choices, default=EstadoAprobacion.EN_PROCESO
    )

    class Meta:
        ordering = ['-fecha', '-creado', '-id']  # por fecha del reporte; -id desempata (reloj de Windows)
        indexes = [
            models.Index(fields=['material', 'fusion'], name='ensayo_material_fusion_idx'),
            models.Index(fields=['material', 'fusion', 'fecha', 'despacho'], name='ensayo_despacho_idx'),
        ]
        verbose_name = 'ensayo'
        verbose_name_plural = 'ensayos'

    def __str__(self):
        return f'#{self.pk} {self.producto} {self.referencia} — {self.get_estado_aprobacion_display()}'

    def _resumen_dimensional(self):
        # Usa las anotaciones de la lista si existen; si no, consulta.
        fuera = getattr(self, 'n_fuera', None)
        pendientes = getattr(self, 'n_pendientes', None)
        if fuera is None or pendientes is None:
            ms = list(self.mediciones.all())
            fuera = sum(m.estado == Estado.NO_CONFORME for m in ms)
            pendientes = sum(m.valor is None and not m.registro for m in ms)
        return {'fueraDeRango': fuera, 'pendientes': pendientes}

    def a_dict(self, detalle=False):
        local = timezone.localtime(self.creado)
        d = {
            'id': self.pk,
            'creado': self.creado.isoformat(),
            'fecha': self.fecha.strftime('%d-%m-%Y'),  # fecha del reporte
            'hora': local.strftime('%H:%M'),
            'despacho': self.despacho,
            'inspector': self.inspector,
            'material': self.material,
            'fusion': self.fusion,
            'accesorio': self.accesorio,
            'producto': self.producto,
            'referencia': self.referencia,
            'productoId': self.clave_producto,
            'marca': self.marca,
            'numeroOperacion': self.numero_operacion,
            'cantidadLote': self.cantidad_lote,
            'inspeccionVisual': self.inspeccion_visual,
            'estadoGlobal': self.estado_global,
            'versionNorma': self.version_norma,
            'dimensional': self._resumen_dimensional(),
            'phi': None
            if not self.phi_falla
            else {
                'presion': _a_float(self.phi_presion),
                'temperatura': _a_float(self.phi_temperatura),
                'tiempo': _a_float(self.phi_tiempo),
                'falla': self.phi_falla,
                'tiempoFalla': _a_float(self.phi_tiempo_falla),
            },
            'estadoAprobacion': self.estado_aprobacion,
        }
        if detalle:
            d['mediciones'] = [m.a_dict() for m in self.mediciones.all()]
        return d


class Medicion(models.Model):
    """Una cota del ensayo con los límites vigentes al momento de medir (copia, no referencia)."""

    ensayo = models.ForeignKey(Ensayo, on_delete=models.CASCADE, related_name='mediciones')
    orden = models.PositiveSmallIntegerField()
    codigo = models.CharField(max_length=30)  # p. ej. "E1.D1min"
    etiqueta = models.CharField(max_length=200, blank=True)
    valor = _milimetros()
    minimo = _milimetros()
    maximo = _milimetros()
    nominal = _milimetros()
    registro = models.BooleanField(default=False)
    estado = models.CharField(max_length=20, choices=Estado.choices)
    desviacion = _milimetros()

    class Meta:
        ordering = ['orden']
        constraints = [models.UniqueConstraint(fields=('ensayo', 'codigo'), name='medicion_unica_por_ensayo')]
        verbose_name = 'medición'
        verbose_name_plural = 'mediciones'

    def __str__(self):
        return f'{self.codigo} = {self.valor} ({self.get_estado_display()})'

    def a_dict(self):
        return {
            'codigo': self.codigo,
            'etiqueta': self.etiqueta,
            'valor': _a_float(self.valor),
            'min': _a_float(self.minimo),
            'max': _a_float(self.maximo),
            'nominal': _a_float(self.nominal),
            'registro': self.registro,
            'estado': self.estado,
            'desviacion': _a_float(self.desviacion),
        }
