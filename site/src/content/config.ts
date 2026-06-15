import { defineCollection, z } from "astro:content";

const blog = defineCollection({
  type: "content",
  schema: z.object({
    titulo: z.string(),
    descricao: z.string(),
    categoria: z.string(),
    data: z.string(),
    dataISO: z.string(),
    autor: z.string().optional(),
    capa: z.string().optional(),
    destaque: z.boolean().optional(),
    keywords: z.array(z.string()).optional(),
  }),
});

export const collections = { blog };
