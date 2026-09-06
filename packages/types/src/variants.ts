import { z } from "zod";

export const productVariantSchema = z.object({
  name: z.string().trim().min(1, "Give each variant a name.").max(100),
  imageUrl: z.string().trim().url("Enter a valid image URL.")
    .refine((url) => /^https?:\/\//i.test(url), "Use an HTTP or HTTPS image URL.")
    .nullable().optional(),
}).strict();

export const productVariantsSchema = z.array(productVariantSchema).max(50)
  .superRefine((variants, ctx) => {
    const names = new Set<string>();
    variants.forEach((variant, index) => {
      const name = variant.name.toLowerCase();
      if (names.has(name)) ctx.addIssue({ code: z.ZodIssueCode.custom,
        path: [index, "name"], message: "Each variant needs a unique name." });
      names.add(name);
    });
  });

export type ProductVariant = z.infer<typeof productVariantSchema>;
