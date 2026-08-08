import { z } from "zod";

export const signUpSchema = z
  .object({
    name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
    email: z
      .string()
      .trim()
      .email("Ingresa un correo electrónico válido"),
    password: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

export const signInSchema = z.object({
  email: z.string().trim().email("Ingresa un correo electrónico válido"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
