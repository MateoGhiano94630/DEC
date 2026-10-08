# Selección multicriterio de modelos de IA con TOPSIS

Trabajo práctico de **Decisiones en Escenarios Complejos**, UTN FRC, curso 5K2, grupo 6.
Integrantes: Fasano, María Luz · Gallino, Gerónimo · Ghiano, Mateo.

Aplicación web que recomienda un modelo de IA (Claude, GPT, Gemini, Grok, DeepSeek, etc.) según las prioridades del usuario, usando el método multicriterio **TOPSIS**. Evalúa seis criterios: costo, calidad de razonamiento, ventana de contexto, velocidad, soporte multimodal y privacidad.

## Documentación

| Documento | Contenido |
| --- | --- |
| [docs/DISENO.md](docs/DISENO.md) | Trazabilidad de requerimientos, decisiones, arquitectura, modelo de datos y API |
| [docs/METODO_TOPSIS.md](docs/METODO_TOPSIS.md) | Fundamento matemático, implementación, casos límite, verificación y ejemplo resuelto |
| [docs/DATOS.md](docs/DATOS.md) | Alternativas, fuentes, rúbricas de C5/C6, perfiles y resultados |

## Stack

- **Frontend:** React 19, Vite, TypeScript, Tailwind CSS, Recharts y KaTeX
- **Backend:** funciones serverless de Vercel (Node.js y TypeScript), validación con zod
- **Base de datos:** Postgres en Neon (driver HTTP serverless)
- **Tests:** Vitest (motor, API y SQL contra PGlite) y una implementación de referencia en Python/numpy

## Desarrollo local

```bash
npm install
npm run dev          # frontend en http://localhost:5173 y API en :3001
npm test             # 75 tests
npm run build        # verificación de tipos y compilación
```

Sin `DATABASE_URL`, la API usa un repositorio **en memoria** con los datos semilla: sirve para desarrollar, pero no guarda los cambios. Para usar Postgres, copiá `.env.example` a `.env.local` y completá `DATABASE_URL`.

Para regenerar los casos de referencia de numpy: `python3 scripts/topsis_reference.py`.

## Despliegue en Vercel (frontend y backend en un solo proyecto)

1. Subir el repositorio a GitHub e importarlo en <https://vercel.com/new>. Vercel detecta Vite y trata cada archivo de `api/` como una función serverless; no hace falta ninguna configuración extra.
2. En el proyecto, ir a **Storage → Create Database → Neon (Postgres)** y conectarla. Esto crea la variable `DATABASE_URL` automáticamente.
3. (Opcional) En **Settings → Environment Variables**, definir `ADMIN_TOKEN` para que solo quien tenga la clave pueda crear, editar o borrar modelos.
4. Hacer **Redeploy**. La tabla se crea y se carga con los datos semilla en el primer acceso.

Alternativa por CLI: `npx vercel` para vincular el proyecto y `npx vercel --prod` para publicar.

Para inicializar o restablecer la base manualmente: `npm run db:setup` o `npm run db:reset` (leen `DATABASE_URL` de `.env.local`).
