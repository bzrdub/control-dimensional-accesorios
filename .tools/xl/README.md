# Herramientas de extracción desde Excel

Scripts Node (SheetJS) que leen las planillas de la planta (no incluidas en el repositorio) y generan
los datos de `frontend/src/data/generated/`. Requieren la librería `xlsx`:

```bash
cd .tools/xl
npm install --no-save https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
node extraer.cjs          # catálogo y tolerancias → frontend/src/data/generated/
node imagenes.cjs         # esquemas y fotos → frontend/public/images/ + imagenes.json
node inspect.cjs <archivo.xlsx> [hoja]   # inspección rápida de una planilla
```

Luego: `cd frontend && npm run especificaciones`.
