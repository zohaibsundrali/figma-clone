import { z } from "zod";

export const shareRoleSchema = z.enum(["viewer", "commenter", "editor"]);
export const memberRoleSchema = z.enum(["admin", "editor", "commenter", "viewer"]);

/** PATCH body for public-link settings. All fields optional; only provided keys change. */
export const shareSettingsSchema = z
  .object({
    enabled: z.boolean().optional(),
    regenerate: z.boolean().optional(),
    role: shareRoleSchema.optional(),
    // password: string sets it, null removes it, undefined leaves unchanged.
    password: z.string().min(4).max(200).nullable().optional(),
    // expiresAt: ISO string sets it, null removes it, undefined leaves unchanged.
    expiresAt: z
      .string()
      .datetime()
      .refine((s) => new Date(s).getTime() > Date.now(), "Expiration must be in the future")
      .nullable()
      .optional(),
  })
  .refine(
    (v) => Object.keys(v).length > 0,
    "No settings provided."
  );

export type ShareSettingsInput = z.infer<typeof shareSettingsSchema>;

const emailSchema = z.string().trim().toLowerCase().email().max(320);

export const inviteSchema = z.object({
  emails: z.array(emailSchema).min(1).max(50),
  role: memberRoleSchema.default("viewer"),
});

export type InviteInput = z.infer<typeof inviteSchema>;

export const roleChangeSchema = z.object({
  role: memberRoleSchema,
});

export const verifyPasswordSchema = z.object({
  password: z.string().min(1).max(200),
});

/** Canvas/file PATCH — separates editable content from owner-only settings. */
export const filePatchSchema = z.object({
  title: z.string().min(1).max(300).optional(),
  canvasData: z.unknown().optional(),
  thumbnail: z.string().max(5_000_000).nullable().optional(),
  isStarred: z.boolean().optional(),
});

export type FilePatchInput = z.infer<typeof filePatchSchema>;
