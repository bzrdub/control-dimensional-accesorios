import django.db.models.deletion
from django.db import migrations, models

ESTADOS = [
    ('CONFORME', 'Conforme'),
    ('NO_CONFORME', 'No conforme'),
    ('SIN_DATO', 'Sin dato'),
    ('SIN_TOLERANCIA', 'Sin tolerancia'),
    ('REGISTRO', 'Solo registro'),
]


def mm():
    return models.DecimalField(blank=True, decimal_places=4, max_digits=12, null=True)


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='Ensayo',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('creado', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('material', models.CharField(max_length=20)),
                ('fusion', models.CharField(max_length=20)),
                ('accesorio', models.CharField(max_length=50)),
                ('producto', models.CharField(max_length=200)),
                ('referencia', models.CharField(blank=True, max_length=200)),
                ('clave_producto', models.CharField(max_length=300)),
                ('estado_global', models.CharField(choices=ESTADOS, max_length=20)),
            ],
            options={
                'verbose_name': 'ensayo',
                'verbose_name_plural': 'ensayos',
                'ordering': ['-creado'],
                'indexes': [models.Index(fields=['material', 'fusion'], name='ensayo_material_fusion_idx')],
            },
        ),
        migrations.CreateModel(
            name='Medicion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('orden', models.PositiveSmallIntegerField()),
                ('codigo', models.CharField(max_length=30)),
                ('etiqueta', models.CharField(blank=True, max_length=200)),
                ('valor', mm()),
                ('minimo', mm()),
                ('maximo', mm()),
                ('nominal', mm()),
                ('registro', models.BooleanField(default=False)),
                ('estado', models.CharField(choices=ESTADOS, max_length=20)),
                ('desviacion', mm()),
                (
                    'ensayo',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='mediciones',
                        to='ensayos.ensayo',
                    ),
                ),
            ],
            options={
                'verbose_name': 'medición',
                'verbose_name_plural': 'mediciones',
                'ordering': ['orden'],
                'constraints': [
                    models.UniqueConstraint(fields=('ensayo', 'codigo'), name='medicion_unica_por_ensayo'),
                ],
            },
        ),
    ]
