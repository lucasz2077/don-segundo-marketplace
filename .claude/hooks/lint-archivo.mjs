#!/usr/bin/env node
// Hook PostToolUse (Edit|Write|MultiEdit): corre ESLint sobre el archivo
// recién editado. Si hay errores sale con código 2 para que Claude los vea y
// los corrija; las advertencias no bloquean.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const entrada = JSON.parse(readFileSync(0, "utf8"));
const archivo = entrada.tool_input?.file_path;
if (!archivo || !/\.(ts|tsx|js|jsx|mjs|cjs)$/.test(archivo)) process.exit(0);

const raiz = process.env.CLAUDE_PROJECT_DIR ?? entrada.cwd ?? process.cwd();
const relativo = path.relative(raiz, path.resolve(raiz, archivo));
if (relativo.startsWith("..") || relativo.split(path.sep)[0] === "node_modules") process.exit(0);
if (relativo.split(path.sep).join("/").startsWith("src/generated/")) process.exit(0);

const eslint = spawnSync("npx", ["--no-install", "eslint", "--quiet", relativo], {
  cwd: raiz,
  encoding: "utf8",
  shell: process.platform === "win32",
});

if (eslint.error) process.exit(0); // ESLint no disponible (falta npm ci): no bloquear.
if (eslint.status === 1) {
  console.error(`ESLint encontró errores en ${relativo}:\n${eslint.stdout}${eslint.stderr}`);
  process.exit(2);
}
process.exit(0);
