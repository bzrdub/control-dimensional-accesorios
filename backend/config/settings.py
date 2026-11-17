"""Configuración Django. Todo lo que cambia entre equipos va en backend/.env (ver .env.example)."""
import os
from pathlib import Path

from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent


def _cargar_env(ruta):
    """Lector mínimo de .env (CLAVE=valor). Las variables ya definidas en el sistema tienen prioridad."""
    if not ruta.exists():
        return
    for linea in ruta.read_text(encoding='utf-8-sig').splitlines():  # -sig: tolera BOM (Notepad/PowerShell)
        linea = linea.strip()
        if not linea or linea.startswith('#') or '=' not in linea:
            continue
        clave, valor = linea.split('=', 1)
        os.environ.setdefault(clave.strip(), valor.strip().strip('"\''))


_cargar_env(BASE_DIR / '.env')


def env(clave, defecto=None):
    return os.environ.get(clave, defecto)


def env_bool(clave, defecto=False):
    return env(clave, str(defecto)).lower() in ('1', 'true', 'si', 'sí', 'yes')


DEBUG = env_bool('DEBUG', True)

SECRET_KEY = env('SECRET_KEY')
if not SECRET_KEY:
    if not DEBUG:
        raise ImproperlyConfigured('Define SECRET_KEY en backend/.env cuando DEBUG=False.')
    SECRET_KEY = 'solo-desarrollo-no-usar-en-produccion'

ALLOWED_HOSTS = [h.strip() for h in env('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',') if h.strip()]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'ensayos',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# ── Base de datos ─────────────────────────────────────────────────────────────
# DB_ENGINE=sqlite (por defecto, desarrollo) o mssql (SQL Server; requiere requirements-sqlserver.txt
# y el "ODBC Driver 18 for SQL Server" instalado en Windows).
DB_ENGINE = env('DB_ENGINE', 'sqlite').lower()

if DB_ENGINE == 'sqlite':
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / env('DB_NAME', 'db.sqlite3'),
        }
    }
elif DB_ENGINE == 'mssql':
    # Sin DB_USER, mssql-django se conecta con autenticación de Windows (Trusted_Connection).
    DATABASES = {
        'default': {
            'ENGINE': 'mssql',
            'NAME': env('DB_NAME', 'ControlDimensional'),
            'HOST': env('DB_HOST', 'localhost'),
            'PORT': env('DB_PORT', ''),
            'USER': env('DB_USER', ''),
            'PASSWORD': env('DB_PASSWORD', ''),
            'OPTIONS': {
                'driver': env('DB_DRIVER', 'ODBC Driver 18 for SQL Server'),
                'extra_params': env('DB_EXTRA_PARAMS', 'TrustServerCertificate=yes'),
            },
        }
    }
else:
    raise ImproperlyConfigured(f'DB_ENGINE desconocido: {DB_ENGINE!r} (usar sqlite o mssql).')

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

def env_lista(clave, defecto):
    """Lista separada por comas desde el entorno."""
    return [x.strip() for x in env(clave, ','.join(defecto)).split(',') if x.strip()]


# Datos propios de la planta: se definen en backend/.env (no versionado). Los valores por defecto son de DEMO.
MARCAS = env_lista('MARCAS', ['MARCA PROPIA', 'MARCA EXTERNA'])
INSPECTORES_INICIALES = env_lista(
    'INSPECTORES_INICIALES', ['BRYAN VÁSQUEZ', 'INSPECTOR DEMO 1', 'INSPECTOR DEMO 2', 'INSPECTOR DEMO 3']
)

# Especificaciones normativas por producto (generado por `npm run especificaciones` en frontend/).
ESPECIFICACIONES_PATH = Path(
    env('ESPECIFICACIONES_PATH', BASE_DIR.parent / 'compartido' / 'generated' / 'especificaciones.json')
)

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'es'
# Se guarda en UTC; la fecha/hora de ingreso se muestra y agrupa (despacho del día) en hora local.
TIME_ZONE = env('TIME_ZONE', 'America/Santiago')
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
