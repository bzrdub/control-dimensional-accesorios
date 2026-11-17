# Backend — Control Dimensional de Accesorios

Django. Guarda los ensayos (cabecera + una fila por cota) y **evalúa en el servidor** con
`ensayos/dominio/validacion.py`, port 1:1 de `frontend/src/domain/validacion.js`
(ambos se prueban con los mismos casos: `compartido/casos-validacion.json`).

## Norma (límites) del servidor

Los límites salen **solo** de `compartido/generated/especificaciones.json` (1 entrada por producto),
generado con el mismo código de mapeo de la app:

```powershell
cd frontend; npm run especificaciones   # tras extraer planillas o cambiar src/config/extremos/*.js
```

- Si el archivo queda desactualizado, `npm test` falla (`especificacionesGeneradas.test.js`).
- El servidor lo recarga solo cuando cambia. Cada ensayo guarda `version_norma` (SHA-256 del archivo).
- Las cotas que envía el navegador solo se usan para **advertir** si mostró límites distintos.

## Guardado sin bloqueos

Se guarda siempre, aunque falten medidas (borrador) o haya valores fuera de rango. Solo se rechaza
(400) un cuerpo mal formado o un producto que no existe en la norma; sin archivo de norma → 503.

## Puesta en marcha (Windows, PowerShell)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py test ensayos
python manage.py createsuperuser   # para entrar a /admin/
python manage.py runserver          # http://127.0.0.1:8000
```

Con el backend corriendo, `npm run dev` en `frontend/` reenvía `/api` a `127.0.0.1:8000` (proxy de Vite).

## Datos de prueba

```powershell
.venv\Scripts\python.exe manage.py sembrar_pruebas            # 2 ingresos por accesorio en los 6 registros
.venv\Scripts\python.exe manage.py sembrar_pruebas --borrar   # elimina solo los de prueba
```

Medidas generadas dentro de las tolerancias reales (~25 % con una cota fuera a propósito), PHI en la
mayoría y estados de aprobación simulados. Se marcan con N° de operación `PRUEBA-…`; volver a correrlo
reemplaza los anteriores. Solo corre en SQLite (salvo `--forzar`).

## Cambiar a SQL Server (producción: servidor de la empresa)

Desarrollo y pruebas siguen en SQLite. Para producción:

1. `pip install -r requirements-sqlserver.txt` e instalar el *ODBC Driver 18 for SQL Server*.
2. En `.env`: `DB_ENGINE=mssql` y `DB_HOST`, `DB_NAME`, `DB_USER`/`DB_PASSWORD` (vacío = autenticación de Windows).
3. `python manage.py migrate`.

## API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/salud/` | `{"estado": "ok", "especificaciones": N, "versionNorma": "…"}` · 503 sin norma |
| GET | `/api/catalogos/` | Inspectores activos (editables en `/admin/`), marcas y estados de aprobación |
| POST | `/api/ensayos/` | Ingreso: `{productoId, despacho, inspector, marca, numeroOperacion?, cantidadLote?, inspeccionVisual?, mediciones, cotas?}`. Fecha y hora las pone el servidor. 201 con detalle + `advertencias` |
| GET | `/api/ensayos/?material=&fusion=&fecha=AAAA-MM-DD&despacho=&aprobacion=&limite=200` | Registro global (sin mediciones, con resumen dimensional), más recientes primero |
| GET / PATCH | `/api/ensayos/<id>/` | Detalle con mediciones / cambiar `estadoAprobacion` (manual: EN_PROCESO, APROBADO, RECHAZADO) |
| POST | `/api/ensayos/phi/` | Ensayo PHI: `{presion, temperatura, tiempo, resultados: [{id, falla: SIN_FALLAS/RUPTURA/FILTRACION, tiempoFalla?}]}` |

Zona horaria por defecto `America/Santiago` (`TIME_ZONE` en `.env`); tras cambiar `.env`, reiniciar `runserver`.

Cuerpo del POST: ver docstring de `ensayos/entrada.py`.

Cada medición guarda **copia de los límites** vigentes al medir (min, max, nominal), así un cambio
posterior en las tablas de tolerancia no altera registros históricos.

## Pendiente

- Autenticación / usuarios (hoy la API es abierta y sin CSRF: solo red interna).
- Datos de cabecera del ensayo (operador, lote, OT, equipo de medición…): por definir.
