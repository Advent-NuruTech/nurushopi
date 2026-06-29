import { z } from "zod";

// ---------------------------------------------------------------------------
// Sabbath messages
//
// A devotional message scheduled for a given Friday (the Sabbath, kept Friday
// sunset → Saturday sunset). The public store surfaces the message for the
// current Sabbath plus a paginated history; senior admins author/edit them.
// `sabbathDate` is the YYYY-MM-DD of the Friday and must fall on a Friday.
// ---------------------------------------------------------------------------

export const MAX_SABBATH_MESSAGE_LENGTH = 5000;

/** True when `value` is a YYYY-MM-DD date that falls on a Friday (UTC). */
export function isFridayDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  return date.getUTCDay() === 5;
}

const sabbathDateSchema = z
  .string()
  .trim()
  .refine(isFridayDate, "Sabbath date must be a Friday (YYYY-MM-DD).");

const messageSchema = z
  .string()
  .trim()
  .min(1, "Message is required.")
  .max(MAX_SABBATH_MESSAGE_LENGTH, "Message is too long.");

/** Admin payload to schedule a new Sabbath message. */
export const sabbathMessageCreateSchema = z
  .object({
    message: messageSchema,
    sabbathDate: sabbathDateSchema,
  })
  .strict();
export type SabbathMessageCreateInput = z.infer<typeof sabbathMessageCreateSchema>;

/** Admin payload to edit an existing Sabbath message (both fields optional). */
export const sabbathMessageUpdateSchema = z
  .object({
    message: messageSchema.optional(),
    sabbathDate: sabbathDateSchema.optional(),
  })
  .strict()
  .refine((v) => v.message !== undefined || v.sabbathDate !== undefined, {
    message: "Nothing to update.",
  });
export type SabbathMessageUpdateInput = z.infer<typeof sabbathMessageUpdateSchema>;

/** Public listing of Sabbath messages: optional current-date lookup + keyset page. */
export const sabbathMessageQuerySchema = z
  .object({
    date: z
      .string()
      .trim()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date.")
      .optional(),
    limit: z.coerce.number().int().min(1).max(20).default(5),
    cursorDate: z.string().trim().optional(),
    cursorCreatedAt: z.string().trim().optional(),
  })
  .strict();
export type SabbathMessageQuery = z.infer<typeof sabbathMessageQuerySchema>;

/** Admin listing of Sabbath messages (newest Sabbath first). */
export const sabbathMessageAdminQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(500).default(200),
  })
  .strict();
export type SabbathMessageAdminQuery = z.infer<typeof sabbathMessageAdminQuerySchema>;

export interface SabbathMessageDTO {
  id: string;
  message: string;
  sabbathDate: string;
  createdAt: string;
  updatedAt: string;
}

/** Opaque keyset cursor for paging Sabbath message history. */
export interface SabbathCursor {
  sabbathDate: string;
  createdAt: string;
}

export interface SabbathMessageListDTO {
  /** The message for the requested `date`, if one was requested and exists. */
  currentMessage: SabbathMessageDTO | null;
  messages: SabbathMessageDTO[];
  nextCursor: SabbathCursor | null;
}
