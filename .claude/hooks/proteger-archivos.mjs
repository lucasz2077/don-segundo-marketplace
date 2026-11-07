#!/usr/bin/env node
// Hook PreToolUse (Edit|Write|MultiEdit): bloquea cambios en archivos que no
// se tocan a mano. Salir con código 2 cancela la herramienta y le pasa el
// motivo (stderr) a Claude.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const entrada = JSON.parse(readFileSync(0, "utf8"));
const archivo = entrada.tool_input?.file_path;
if (!archivo) process.exit(0);

const raiz = process.env.CLAUDE_PROJECT_DIR ?? entrada.cwd ?? process.cwd();
const relativo = path.relative(raiz, path.resolve(raiz, archivo)).split(path.sep).join("/");
const nombre = path.basename(relativo);

function bloquear(motivo) {
  console.error(`Bloqueado por .claude/hooks/proteger-archivos.mjs: ${relativo}. ${motivo}`);
  process.exit(2);
}

if (nombre.startsWith(".env") && nombre !== ".env.example") {
  bloquear("Los archivos .env tienen secretos; pedile al usuario que los edite.");
}
if (relativo === "package-lock.json") {
  bloquear("El lockfile se actualiza con npm install/npm ci, no a mano.");
}
if (relativo.startsWith("src/generated/")) {
  bloquear("Es código generado por `npx prisma generate`; cambiá prisma/schema.prisma.");
}
if (relativo.startsWith("prisma/migrations/") && existsSync(path.join(raiz, relativo))) {
  bloquear("Las migraciones existentes ya pueden estar aplicadas en producción; creá una nueva con `npx prisma migrate dev`.");
}

process.exit(0);
