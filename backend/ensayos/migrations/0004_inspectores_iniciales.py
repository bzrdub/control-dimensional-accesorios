from django.conf import settings
from django.db import migrations

# Inspectores con que parte la lista del formulario de ingreso: settings.INSPECTORES_INICIALES
# (variable INSPECTORES_INICIALES de backend/.env; sin ella, nombres de DEMO).
# Después se administran desde /admin/ (agregar o desactivar).


def crear(apps, schema_editor):
    Inspector = apps.get_model('ensayos', 'Inspector')
    for nombre in settings.INSPECTORES_INICIALES:
        Inspector.objects.get_or_create(nombre=nombre)


class Migration(migrations.Migration):
    dependencies = [('ensayos', '0003_registro_global')]
    operations = [migrations.RunPython(crear, migrations.RunPython.noop)]
