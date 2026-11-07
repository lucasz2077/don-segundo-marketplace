---
name: actualizar-docs
description: Mantiene los "documentos vivos" de Don Segundo en sincronía con el código. Revisa el diff (o lo que se le indique) y actualiza docs/requirements.md (RF/RNF/CA), docs/database.md (modelos, enums, índices y el esquema Prisma copiado), docs/architecture.md (flujos, capas, seguridad) y CLAUDE.md cuando cambian comandos o patrones. Usala al terminar un cambio de comportamiento, de esquema o de arquitectura, antes del commit o del PR. Argumento opcional: el rango o los archivos a considerar (por defecto, lo que difiere de main).
argument-hint: "[rango git o archivos, p. ej. main...HEAD]"
---

# Actualizar documentos vivos — Don Segundo

Alcance: $ARGUMENTS (si está vacío: `git diff main...HEAD` más los cambios sin commitear).

Regla del proyecto (`docs/ROADMAP.md`): `vision.md`, `requirements.md`, `architecture.md` y `database.md` se actualizan en el mismo trabajo que introduce el cambio; nunca queda implementado algo que no esté documentado. Todo en español argentino profesional.

## 1. Relevar qué cambió

```bash
git diff --stat main...HEAD
git diff main...HEAD -- prisma/ src/lib src/app/api src/proxy.ts vercel.json package.json .env.example
git status --short
```

Clasificá cada cambio y anotá qué documento toca, según la tabla:

| Si cambió... | Revisá |
| --- | --- |
| Comportamiento visible, reglas de negocio, validaciones, permisos, endpoints | `docs/requirements.md` §2 (RF por dominio) y §5 (CA) |
| Seguridad, performance, montos, idempotencia, secretos | `docs/requirements.md` §3 (RNF) |
| `prisma/schema.prisma` o `prisma/migrations/` | `docs/database.md` §2 (tabla de la entidad), §3 (esquema Prisma copiado: tiene que quedar **idéntico** al real), §4 (índices) y §5 (enums, soft delete) |
| Flujos entre capas, pagos, auth, cron, integraciones (MP, Cloudinary), carpetas | `docs/architecture.md` (§3 estructura, §4 capas, §6.x flujos, §7 seguridad, §8 deploy) |
| Comandos, scripts, variables de entorno, patrones de la casa, stack | `CLAUDE.md` y `.env.example` |
| Alcance o fases | `docs/ROADMAP.md` / `docs/vision.md`, solo si el usuario lo confirma |

Si el cambio es solo de estilo, refactor sin efecto o tests, decilo y no toques la documentación.

## 2. Leer antes de editar

- Leé la sección completa a modificar y la siguiente: los RF se numeran en orden y se referencian entre sí ("modificado en Fase 3, Slice 3", "ver RF-49").
- Buscá referencias cruzadas: `grep -rn "RF-49" docs src` para encontrar código, tests y docs que citan el requisito.

## 3. Cómo escribir cada cambio

- **Requisito nuevo**: el próximo número libre de su tipo (`grep -o "RF-[0-9]*" docs/requirements.md | sort -t- -k2 -n | tail -1`), en la subsección de su dominio, con el formato existente: `- **RF-xx — Título corto:** el sistema <hace qué>, <condiciones y casos borde>.` Si nace en una fase o slice, indicalo como los demás.
- **Requisito modificado**: editá el texto en el lugar y agregá `(modificado en <fase/slice>)` al título si el comportamiento previo cambió. No renumeres ni borres requisitos: si uno queda obsoleto, marcalo así y explicá qué lo reemplaza.
- **Decisiones del sponsor**: si el cambio responde a una decisión de producto, citala con fecha como hacen RF-51 y D1..D9.
- **database.md §3**: copiá los bloques `model`/`enum` cambiados textualmente de `prisma/schema.prisma`. Después verificá que no haya divergencias:

  ```bash
  diff <(sed -n '/^```prisma/,/^```/p' docs/database.md | sed '1d;$d') prisma/schema.prisma
  ```

  Si el diff marca más de lo que cambiaste, ya estaba desfasado: avisalo y alineá solo si el usuario quiere.
- **architecture.md**: describí el flujo (quién llama a quién, qué se valida dónde, qué es atómico, qué es best-effort) y no el código línea por línea. Mantené las referencias a RF/RNF.
- **Código ↔ docs**: si el código cita un requisito que cambió de número o de sentido, actualizá el comentario o el nombre del test que lo cita.

## 4. Verificar y cerrar

1. Releé el diff de `docs/`: tiene que poder leerse sin mirar el código.
2. Confirmá que cada `RF-xx`/`RNF-xx` nuevo citado en código o tests exista en `docs/requirements.md`:

   ```bash
   comm -23 <(git diff main...HEAD -- src | grep -o "R[N]*F-[0-9]*" | sort -u) <(grep -o "R[N]*F-[0-9]*" docs/requirements.md | sort -u)
   ```

   Cualquier línea que salga es un requisito citado y no documentado.
3. Commit separado o junto al cambio, en español: `docs(<dominio>): documenta <qué> (RF-xx)`.
4. Resumí al usuario qué documentos tocaste, qué requisitos agregaste o modificaste y si encontraste desfasajes previos que no corregiste.
