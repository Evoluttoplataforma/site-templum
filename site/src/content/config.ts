import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: z.object({
    titulo: z.string(),
    descricao: z.string(),
    categoria: z.string(),
    data: z.string(), // "15 jun 2026"
    dataISO: z.string(), // "2026-06-15" para schema.org
    autor: z.string().default("Equipe Templum"),
    capa: z.string().optional(), // "/assets/img/blog/slug.webp"
    destaque: z.boolean().default(false),
    keywords: z.array(z.string()).default([]),
  }),
});

export const collections = { blog };
