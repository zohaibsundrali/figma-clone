import type { ReactNode } from "react";

/** Mentions are stored inline in text as `@[Display Name](memberId)`. */
export const MENTION_TOKEN = /@\[([^\]]+)\]\(([^)]+)\)/g;

/** All member ids referenced by mention tokens in `text` (deduplicated). */
export function extractMentionIds(text: string): string[] {
  const ids = new Set<string>();
  for (const m of text.matchAll(MENTION_TOKEN)) {
    if (m[2]) ids.add(m[2]);
  }
  return [...ids];
}

/** Render text, turning `@[Name](id)` tokens into highlighted `@Name` chips. */
export function renderTextWithMentions(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const m of text.matchAll(MENTION_TOKEN)) {
    const start = m.index ?? 0;
    if (start > lastIndex) {
      nodes.push(text.slice(lastIndex, start));
    }
    nodes.push(
      <span
        key={`mention-${key++}`}
        className="rounded bg-accent/15 px-1 font-medium text-accent"
      >
        @{m[1]}
      </span>
    );
    lastIndex = start + m[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }
  return nodes;
}
