from django.contrib import admin

from .models import Ensayo, Inspector, Medicion


class MedicionInline(admin.TabularInline):
    model = Medicion
    extra = 0
    can_delete = False
    fields = ('codigo', 'etiqueta', 'valor', 'minimo', 'maximo', 'nominal', 'registro', 'estado', 'desviacion')
    readonly_fields = fields

    def has_add_permission(self, request, obj=None):
        return False


@admin.register(Ensayo)
class EnsayoAdmin(admin.ModelAdmin):
    # Solo lectura: un registro de calidad no se edita después de guardado
    # (el estado de aprobación se cambia desde el registro global de la app).
    list_display = (
        'id', 'creado', 'despacho', 'inspector', 'material', 'fusion', 'producto', 'referencia',
        'phi_falla', 'estado_aprobacion',
    )
    list_filter = ('estado_aprobacion', 'material', 'fusion', 'inspector', 'phi_falla')
    search_fields = ('producto', 'referencia', 'clave_producto', 'numero_operacion')
    date_hierarchy = 'creado'
    inlines = [MedicionInline]

    def get_readonly_fields(self, request, obj=None):
        return [f.name for f in self.model._meta.fields]

    def has_add_permission(self, request):
        return False


@admin.register(Inspector)
class InspectorAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'activo')
    list_editable = ('activo',)
    search_fields = ('nombre',)
