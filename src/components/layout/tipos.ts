/** Categoría raíz con subcategorías, en la forma mínima que usa la navegación. */
export type CategoriaNavegacion = {
  id: string;
  name: string;
  slug: string;
  children: Array<{ id: string; name: string; slug: string }>;
};
