# Frontend — Control Dimensional de Accesorios

React 19 + Vite 8 + Tailwind CSS 4. Ver el [README principal](../README.md) para la arquitectura completa.

```bash
npm install
npm run datos:demo        # datos ficticios para ejecutar sin las planillas de la planta
npm run dev               # http://localhost:5173  (/api → Django en :8000)
npm test                  # pruebas con node:test
npm run lint              # oxlint
npm run build
```

| Script | Qué hace |
|---|---|
| `npm run especificaciones` | Genera `compartido/generated/especificaciones.json` (norma que usa el backend) a partir de los datos en `src/data/generated/` |
| `npm run datos:demo` | Copia `datos-demo/` a `src/data/generated/` y genera la norma. No reemplaza datos reales salvo `-- --forzar` |
