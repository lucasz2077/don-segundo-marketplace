import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

// Cliente propio del seed (fuera del contexto de Next.js).
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

type CategoriaHija = {
  nombre: string;
  slug: string;
};

type CategoriaRaiz = CategoriaHija & {
  sortOrder: number;
  hijos: CategoriaHija[];
};

// Árbol de categorías del campo argentino.
const arbolCategorias: CategoriaRaiz[] = [
  {
    nombre: "Maquinaria agrícola",
    slug: "maquinaria-agricola",
    sortOrder: 10,
    hijos: [
      { nombre: "Tractores", slug: "tractores" },
      { nombre: "Cosechadoras", slug: "cosechadoras" },
      { nombre: "Sembradoras", slug: "sembradoras" },
      { nombre: "Implementos", slug: "implementos" },
      { nombre: "Motores", slug: "motores" },
    ],
  },
  {
    nombre: "Herramientas y equipos",
    slug: "herramientas-equipos",
    sortOrder: 20,
    hijos: [
      { nombre: "Manuales", slug: "manuales" },
      { nombre: "Eléctricas", slug: "electricas" },
      { nombre: "De medición", slug: "de-medicion" },
    ],
  },
  {
    nombre: "Insumos",
    slug: "insumos",
    sortOrder: 30,
    hijos: [
      { nombre: "Semillas", slug: "semillas" },
      { nombre: "Fertilizantes", slug: "fertilizantes" },
      { nombre: "Agroquímicos", slug: "agroquimicos" },
      { nombre: "Forrajes", slug: "forrajes" },
    ],
  },
  {
    nombre: "Hacienda y ganado",
    slug: "hacienda-ganado",
    sortOrder: 40,
    hijos: [
      { nombre: "Bovinos", slug: "bovinos" },
      { nombre: "Equinos", slug: "equinos" },
      { nombre: "Ovinos", slug: "ovinos" },
      { nombre: "Porcinos", slug: "porcinos" },
    ],
  },
  {
    nombre: "Repuestos",
    slug: "repuestos",
    sortOrder: 50,
    hijos: [
      { nombre: "De maquinaria", slug: "de-maquinaria" },
      { nombre: "De vehículos", slug: "de-vehiculos" },
    ],
  },
  {
    nombre: "Servicios rurales",
    slug: "servicios-rurales",
    sortOrder: 60,
    hijos: [
      { nombre: "Fletes", slug: "fletes" },
      { nombre: "Siembra y cosecha", slug: "siembra-y-cosecha" },
      { nombre: "Veterinarios", slug: "veterinarios" },
      { nombre: "Alquiler de maquinaria", slug: "alquiler-de-maquinaria" },
    ],
  },
  {
    nombre: "Otros",
    slug: "otros",
    sortOrder: 70,
    hijos: [],
  },
];

/**
 * Inserta o actualiza una categoría por slug. En el update no se toca el
 * parentId para preservar la jerarquía si ya existe.
 */
async function upsertarCategoria(
  nombre: string,
  slug: string,
  sortOrder: number,
  parentId: string | null = null
) {
  await prisma.category.upsert({
    where: { slug },
    update: { name: nombre, sortOrder },
    create: { name: nombre, slug, sortOrder, parentId },
  });
}

async function main() {
  // Primer pase: categorías de nivel superior.
  for (const categoria of arbolCategorias) {
    await upsertarCategoria(categoria.nombre, categoria.slug, categoria.sortOrder);
  }

  // Segundo pase: subcategorías, usando el id del padre ya persistido.
  for (const categoria of arbolCategorias) {
    const padre = await prisma.category.findUnique({
      where: { slug: categoria.slug },
      select: { id: true },
    });

    if (!padre) {
      continue;
    }

    let sortOrder = 10;
    for (const hijo of categoria.hijos) {
      await upsertarCategoria(hijo.nombre, hijo.slug, sortOrder, padre.id);
      sortOrder += 10;
    }
  }

  const totalCategorias = await prisma.category.count();
  const categoriasRaiz = await prisma.category.count({
    where: { parentId: null },
  });

  console.log(
    `Seed de categorías completado: ${totalCategorias} categorías en total (${categoriasRaiz} de nivel superior).`
  );
}

main()
  .catch((error) => {
    console.error("Error al ejecutar el seed de categorías:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
