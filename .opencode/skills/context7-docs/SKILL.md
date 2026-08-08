---
name: context7-docs
description: Consultar documentación actualizada de librerías, frameworks, SDKs, APIs, CLI y servicios en la nube con Context7 antes de escribir código. Use when the task involves any library, framework, SDK, API, CLI tool, or cloud service — even well-known ones like Next.js, React, Prisma, Tailwind, Supabase, Cloudinary, Better Auth. Trigger: versiones recientes, setup, configuración, migración de versiones, sintaxis de API, debugging de librería, instalación, uso de CLI.
---

# Context7 — Documentación actualizada

Context7 es un servidor MCP que devuelve documentación vigente de librerías y frameworks, más allá de la fecha de corte de entrenamiento del modelo. Usalo SIEMPRE que el trabajo toque una librería, framework, SDK, API, CLI o servicio en la nube — incluso si creés que conocés la respuesta, porque tu training data puede no reflejar cambios recientes (ej. Next.js 16, Prisma 7, React 19, Better Auth 1.6).

## Cuándo NO usar

No usar para: refactorizar, escribir scripts desde cero, debugging de lógica de negocio, code review, o conceptos generales de programación. Esos casos se resuelven con lectura directa del código o la doc local en `node_modules`.

## Protocolo

1. **Resolver el ID de la librería**: llamar `context7_resolve-library-id` con el nombre oficial del paquete/producto (ej. "Next.js", "better-auth", "Prisma"). Elegir el resultado con mejor reputación (High) y benchmark score.
2. **Consultar la doc**: llamar `context7_query-docs` con el libraryId resuelto y UNA consulta acotada a un solo concepto (ej. "Better Auth Next.js integration route handler", "Prisma 7 adapter pg connection").
3. **Máximo 3 llamadas de consulta por pregunta.** Si no encontrás lo que buscás después de 3 consultas, usá el mejor resultado obtenido.
4. **Complementar con doc local cuando aplique**: si el paquete está instalado y trae docs (ej. `node_modules/next/dist/docs/`), leerla también — es la fuente de verdad de la versión instalada.

## Reglas de la consulta

- Consultas específicas y de UN concepto. "Cómo configurar X", no "explícame X e Y y Z".
- No incluir datos sensibles (API keys, passwords, credenciales) en las consultas.
- Si el resultado contradice lo que el modelo creía, la documentación de Context7 gana — reportar el dato correcto.

## Entregable

Al terminar, indicar en el resumen: qué librería/versión se consultó y qué doc se usó como fuente.
