"use client";

import { useRef, useState, useCallback } from "react";
import type { MentionMember } from "@/types";

interface MentionInputProps {
  value: string;
  onChange: (value: string) => void;
  members: MentionMember[];
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  rows?: number;
  /** Submit on Enter (without Shift). */
  onSubmit?: () => void;
}

interface ActiveQuery {
  /** Index of the '@' that started the query. */
  at: number;
  query: string;
}

/**
 * Textarea with @mention autocomplete. Selecting a member inserts the token
 * `@[Name](id)` inline; the parent extracts ids via `extractMentionIds`.
 */
export function MentionInput({
  value,
  onChange,
  members,
  placeholder,
  autoFocus,
  disabled,
  rows = 2,
  onSubmit,
}: MentionInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [active, setActive] = useState<ActiveQuery | null>(null);
  const [highlight, setHighlight] = useState(0);

  const suggestions = active
    ? members
        .filter((m) =>
          m.name.toLowerCase().includes(active.query.toLowerCase())
        )
        .slice(0, 6)
    : [];

  const detectQuery = useCallback((text: string, caret: number) => {
    // Look backwards from the caret for an '@' not preceded by a word char,
    // with no whitespace between it and the caret.
    const upto = text.slice(0, caret);
    const match = upto.match(/(?:^|\s)@([^\s@]*)$/);
    if (match) {
      const at = caret - match[1].length - 1;
      setActive({ at, query: match[1] });
      setHighlight(0);
    } else {
      setActive(null);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
    detectQuery(e.target.value, e.target.selectionStart ?? e.target.value.length);
  };

  const insertMention = useCallback(
    (member: MentionMember) => {
      if (!active) return;
      const before = value.slice(0, active.at);
      const after = value.slice(active.at + 1 + active.query.length);
      const token = `@[${member.name}](${member.id})`;
      const next = `${before}${token} ${after}`;
      onChange(next);
      setActive(null);
      // Restore focus + caret after the inserted token.
      requestAnimationFrame(() => {
        const el = textareaRef.current;
        if (el) {
          const pos = before.length + token.length + 1;
          el.focus();
          el.setSelectionRange(pos, pos);
        }
      });
    },
    [active, value, onChange]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (active && suggestions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => (h + 1) % suggestions.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(suggestions[highlight]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setActive(null);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey && onSubmit) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="relative flex-1">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoFocus={autoFocus}
        disabled={disabled}
        rows={rows}
        className="w-full resize-none rounded border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
      />
      {active && suggestions.length > 0 && (
        <ul className="absolute bottom-full left-0 z-[80] mb-1 max-h-48 w-full overflow-y-auto rounded-lg border border-border bg-surface-elevated py-1 shadow-xl">
          {suggestions.map((m, i) => (
            <li key={m.id}>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  insertMention(m);
                }}
                className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs ${
                  i === highlight
                    ? "bg-accent/20 text-foreground"
                    : "text-muted hover:bg-border"
                }`}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white">
                  {m.name.charAt(0).toUpperCase()}
                </span>
                <span className="truncate">{m.name}</span>
                {m.email && (
                  <span className="ml-auto truncate text-[10px] text-muted">
                    {m.email}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
