import { z } from "zod";

/** Hard limits kept in one place so client + server agree. */
export const COMMENT_MAX_LENGTH = 5000;
export const EMOJI_MAX_LENGTH = 16;

/**
 * Sanitize free-text comment/reply content.
 *
 * Content is rendered as plain text (React escapes by default), but we still
 * defensively:
 *  - strip HTML tags so a value can never be reinterpreted as markup elsewhere,
 *  - remove control characters (except newline/tab),
 *  - collapse excessive blank lines and trim,
 *  - enforce the max length.
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/<[^>]*>/g, "") // strip HTML tags
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "") // control chars (keep \n \t)
    .replace(/\n{3,}/g, "\n\n") // collapse blank-line runs
    .trim()
    .slice(0, COMMENT_MAX_LENGTH);
}

/**
 * Extract @mention id tokens from raw text formatted as `@[Name](id)`.
 * We store the ids the client resolved separately (the `mentions` array), but
 * we also parse the text as a safety net to validate what was actually written.
 */
export function parseMentionHandles(text: string): string[] {
  const matches = text.match(/@\[[^\]]+\]\(([^)]+)\)/g) ?? [];
  return matches
    .map((m) => m.match(/\(([^)]+)\)$/)?.[1] ?? "")
    .filter(Boolean);
}

const idArray = z.array(z.string().min(1).max(200)).max(50).default([]);

export const createCommentSchema = z.object({
  text: z.string().min(1).max(COMMENT_MAX_LENGTH),
  x: z.number().finite(),
  y: z.number().finite(),
  shapeId: z.string().min(1).max(200).nullish(),
  parentCommentId: z.string().min(1).max(200).nullish(),
  mentions: idArray,
  authorName: z.string().min(1).max(200).optional(),
  authorAvatar: z.string().max(2000).optional(),
});

export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = z
  .object({
    text: z.string().min(1).max(COMMENT_MAX_LENGTH).optional(),
    resolved: z.boolean().optional(),
    mentions: idArray.optional(),
  })
  .refine(
    (v) => v.text !== undefined || v.resolved !== undefined,
    "Provide text and/or resolved."
  );

export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

export const reactionSchema = z.object({
  emoji: z.string().min(1).max(EMOJI_MAX_LENGTH),
});

export type ReactionInput = z.infer<typeof reactionSchema>;
